import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import pool from '../config/database.js';
import { log } from '../utils/logger.js';
import obsService from '../services/obsService.js';

// 计算文件哈希值
async function calculateFileHash(fileBuffer) {
  if (!Buffer.isBuffer(fileBuffer)) {
    throw new TypeError('The argument must be a Buffer');
  }
  return createHash('sha256').update(fileBuffer).digest('hex');
}

// 记录文件访问日志
async function logFileAccess(client, fileId, apiKeyId, accessType, req) {
  try {
    await client.query(
      `INSERT INTO file_access_logs (file_id, api_key_id, access_type, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [fileId, apiKeyId, accessType, req.ip, req.headers['user-agent']]
    );
  } catch (error) {
    log('error', '记录访问日志失败:', error);
    throw error;
  }
}

export async function uploadFile(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: '没有上传文件' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      originalname,
      mimetype,
      size,
      buffer
    } = req.file;

    const projectTypes = JSON.parse(req.body.project_types || '[]').sort();
    const projectTypesString = projectTypes.join('-');
    
    const pythonVersion = req.body.python_version || '';
    const hashValue = await calculateFileHash(buffer);

    // Upload to Huawei OBS
    const obsResult = await obsService.uploadFile(buffer, originalname);
    
    if (!obsResult.success) {
      throw new Error('Failed to upload to OBS');
    }

    const fileResult = await client.query(
      `INSERT INTO files (
        original_name, file_path, mime_type, file_size, hash_value,
        project_type, python_version
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, original_name, mime_type, file_size, created_at`,
      [
        originalname,
        obsResult.key,
        mimetype,
        size,
        hashValue,
        projectTypesString,
        pythonVersion
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: '文件上传成功',
      file: {
        ...fileResult.rows[0],
        project_types: projectTypes,
        python_version: pythonVersion,
        url: obsResult.url
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    log('error', '文件上传失败:', error);
    res.status(500).json({ error: '文件上传失败' });
  } finally {
    client.release();
  }
}

export async function getFiles(req, res) {
  const { page = 1, limit = 10, search = '', sortBy = 'created_at', order = 'desc' } = req.query;
  const offset = (page - 1) * limit;

  const client = await pool.connect();
  try {
    let query = `
      SELECT id, original_name, mime_type, file_size, download_count, 
             project_type, python_version, created_at, file_path
      FROM files 
      WHERE deleted_at IS NULL
    `;
    const queryParams = [];

    if (search) {
      query += ` AND original_name ILIKE $1 OR project_type ILIKE $1`;
      queryParams.push(`%${search}%`);
    }

    query += ` ORDER BY ${sortBy} ${order.toUpperCase()}`;
    query += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const result = await client.query(query, queryParams);

    const countQuery = `
      SELECT COUNT(*) 
      FROM files 
      WHERE deleted_at IS NULL
      ${search ? ` AND original_name ILIKE $1` : ''}
    `;
    const countResult = await client.query(
      countQuery,
      search ? [`%${search}%`] : []
    );

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    // Generate presigned URLs for each file
    const files = await Promise.all(result.rows.map(async (file) => {
      const presignedUrl = await obsService.generatePresignedUrl(file.file_path);
      return {
        ...file,
        project_types: file.project_type,
        url: presignedUrl
      };
    }));

    res.json({
      files,
      pagination: {
        total,
        totalPages,
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    log('error', '获取文件列表失败:', error);
    res.status(500).json({ error: '获取文件列表失败' });
  } finally {
    client.release();
  }
}

export async function getFileById(req, res) {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    const result = await client.query(
      'SELECT * FROM files WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '文件不存在' });
    }

    const file = result.rows[0];
    const presignedUrl = await obsService.generatePresignedUrl(file.file_path);

    res.json({
      ...file,
      project_types: file.project_type,
      url: presignedUrl
    });
  } catch (error) {
    log('error', '获取文件详情失败:', error);
    res.status(500).json({ error: '获取文件详情失败' });
  } finally {
    client.release();
  }
}

export async function downloadFile(req, res) {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    const result = await client.query(
      'SELECT * FROM files WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '文件不存在' });
    }

    const file = result.rows[0];

    // 生成预签名URL，默认10分钟有效期
    const presignedUrl = await obsService.generatePresignedUrl(file.file_path);

    // 更新下载计数
    await client.query(
      'UPDATE files SET download_count = download_count + 1 WHERE id = $1',
      [id]
    );

    // 返回预签名URL
    res.json({
      url: presignedUrl,
      filename: file.original_name
    });
  } catch (error) {
    log('error', '文件下载失败:', error);
    res.status(500).json({ error: '文件下载失败' });
  } finally {
    client.release();
  }
}


export async function deleteFile(req, res) {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      'UPDATE files SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING file_path',
      [id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '文件不存在' });
    }

    // Delete from OBS
    const filePath = result.rows[0].file_path;
    await obsService.deleteFile(filePath);

    await client.query('COMMIT');
    res.json({ message: '文件删除成功' });
  } catch (error) {
    await client.query('ROLLBACK');
    log('error', '删除文件失败:', error);
    res.status(500).json({ error: '删除文件失败' });
  } finally {
    client.release();
  }
}

export async function downloadFileByTypeAndName(req, res) {
  const { project_type} = req.query;

  // 验证必填参数
  if (!project_type) {
    return res.status(400).json({ error: 'project_type 为必填参数' });
  }

  const client = await pool.connect();

  try {
    // 转换 project_type 为排序一致的字符串
    const sortedProjectType = project_type.split('-').sort().join('-');
    console.log('sortedProjectType:', sortedProjectType);
    // 先查询文件ID
    const result = await client.query(
      `SELECT id 
       FROM files 
       WHERE project_type = $1 
       AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [sortedProjectType]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '未找到匹配的文件' });
    }

    const fileId = result.rows[0].id;
    
    // 调用现有的下载方法
    req.params.id = fileId;
    return downloadFile(req, res);
  } catch (error) {
    log('error', '文件下载失败:', error);
    res.status(500).json({ error: '文件下载失败' });
  } finally {
    client.release();
  }
}