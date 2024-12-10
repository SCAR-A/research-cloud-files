import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import pool from '../config/database.js';
import { log } from '../utils/logger.js';

// 计算文件哈希值
async function calculateFileHash(filePath) {
  const fileBuffer = await fs.readFile(filePath);
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
      filename,
      mimetype,
      size,
      path
    } = req.file;

    const { project_type, python_version } = req.body;
    const hashValue = await calculateFileHash(path);

    // 先插入文件记录
    const fileResult = await client.query(
      `INSERT INTO files (original_name, file_path, mime_type, file_size, hash_value, project_type, python_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, original_name, mime_type, file_size, project_type, python_version, created_at`,
      [originalname, filename, mimetype, size, hashValue, project_type, python_version]
    );

    const fileId = fileResult.rows[0].id;

    // 记录访问日志
    await logFileAccess(client, fileId, req.apiKeyId, 'UPLOAD', req);

    // 提交事务
    await client.query('COMMIT');

    res.status(201).json({
      message: '文件上传成功',
      file: fileResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    log('error', '文件上传失败:', error);
    
    // 如果文件已经保存到磁盘，尝试删除它
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        log('error', '清理上传文件失败:', unlinkError);
      }
    }
    
    res.status(500).json({ error: '文件上传失败' });
  } finally {
    client.release();
  }
}

export async function getFiles(req, res) {
  const { page = 1, limit = 10, search, sortBy = 'created_at', order = 'desc', project_type, python_version } = req.query;
  const offset = (page - 1) * limit;

  const client = await pool.connect();
  try {
    let query = `
      SELECT id, original_name, mime_type, file_size, download_count, project_type, python_version, created_at
      FROM files
      WHERE deleted_at IS NULL
    `;
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND original_name ILIKE $${paramCount}`;
      params.push(`%${search}%`);
    }

    if (project_type) {
      paramCount++;
      query += ` AND project_type = $${paramCount}`;
      params.push(project_type);
    }

    if (python_version) {
      paramCount++;
      query += ` AND python_version = $${paramCount}`;
      params.push(python_version);
    }

    query += ` ORDER BY ${sortBy} ${order} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await client.query(query, params);
    
    let countQuery = 'SELECT COUNT(*) FROM files WHERE deleted_at IS NULL';
    const countParams = [];
    
    if (search) {
      countQuery += ` AND original_name ILIKE $1`;
      countParams.push(`%${search}%`);
    }
    
    if (project_type) {
      countQuery += ` AND project_type = $${countParams.length + 1}`;
      countParams.push(project_type);
    }

    if (python_version) {
      countQuery += ` AND python_version = $${countParams.length + 1}`;
      countParams.push(python_version);
    }

    const countResult = await client.query(countQuery, countParams);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    res.json({
      files: result.rows,
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
      `SELECT id, original_name, mime_type, file_size, hash_value, project_type, python_version, download_count, created_at
       FROM files
       WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '文件不存在' });
    }

    await logFileAccess(client, id, req.apiKeyId, 'VIEW', req);
    res.json(result.rows[0]);
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
    await client.query('BEGIN');

    const result = await client.query(
      'SELECT * FROM files WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '文件不存在' });
    }

    const file = result.rows[0];
    const filePath = join(process.env.UPLOAD_DIR || 'uploads', file.file_path);

    // 更新下载次数
    await client.query(
      'UPDATE files SET download_count = download_count + 1 WHERE id = $1',
      [id]
    );

    // 记录下载日志
    await logFileAccess(client, id, req.apiKeyId, 'DOWNLOAD', req);
    
    await client.query('COMMIT');

    res.download(filePath, file.original_name);
  } catch (error) {
    await client.query('ROLLBACK');
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
      'UPDATE files SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '文件不存在' });
    }

    // 记录删除日志
    await logFileAccess(client, id, req.apiKeyId, 'DELETE', req);
    
    await client.query('COMMIT');

    res.json({ message: '文件删除成功' });
  } catch (error) {
    await client.query('ROLLBACK');
    log('error', '文件删除失败:', error);
    res.status(500).json({ error: '文件删除失败' });
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
    // 先查询文件ID
    const result = await client.query(
      `SELECT id 
       FROM files 
       WHERE project_type = $1 
       AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [project_type]
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