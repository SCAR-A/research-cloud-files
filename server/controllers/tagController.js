import pool from '../config/database.js';
import { log } from '../utils/logger.js';

export async function getTags(req, res) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT tagname, tagtype
      FROM tags
      WHERE deleted_at IS NULL
      ORDER BY tagtype, tagname
    `);

    const tags = {
      projectTypes: result.rows
        .filter(tag => tag.tagtype === 'projectType')
        .map(tag => tag.tagname),
      pythonVersions: result.rows
        .filter(tag => tag.tagtype === 'pythonVersion')
        .map(tag => tag.tagname)
    };

    res.json(tags);
  } catch (error) {
    log('error', '获取标签失败:', error);
    res.status(500).json({ error: '获取标签失败' });
  } finally {
    client.release();
  }
}

export async function addTag(req, res) {
  const { tagname, tagtype } = req.body;
  
  if (!tagname || !tagtype) {
    return res.status(400).json({ error: '标签名称和类型不能为空' });
  }

  if (!['projectType', 'pythonVersion'].includes(tagtype)) {
    return res.status(400).json({ error: '无效的标签类型' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 检查标签是否已存在
    const existingTag = await client.query(
      'SELECT id FROM tags WHERE tagname = $1 AND tagtype = $2 AND deleted_at IS NULL',
      [tagname, tagtype]
    );

    if (existingTag.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: '标签已存在' });
    }

    // 插入新标签
    await client.query(
      'INSERT INTO tags (tagname, tagtype) VALUES ($1, $2)',
      [tagname, tagtype]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: '标签添加成功' });
  } catch (error) {
    await client.query('ROLLBACK');
    log('error', '添加标签失败:', error);
    res.status(500).json({ error: '添加标签失败' });
  } finally {
    client.release();
  }
}

export async function deleteTag(req, res) {
  const { tagname, tagtype } = req.query;

  if (!tagname || !tagtype) {
    return res.status(400).json({ error: '标签名称和类型不能为空' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 软删除标签
    const result = await client.query(
      `UPDATE tags 
       SET deleted_at = CURRENT_TIMESTAMP 
       WHERE tagname = $1 AND tagtype = $2 AND deleted_at IS NULL
       RETURNING id`,
      [tagname, tagtype]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '标签不存在' });
    }

    await client.query('COMMIT');
    res.json({ message: '标签删除成功' });
  } catch (error) {
    await client.query('ROLLBACK');
    log('error', '删除标签失败:', error);
    res.status(500).json({ error: '删除标签失败' });
  } finally {
    client.release();
  }
}

export async function updateTags(req, res) {
  const { projectTypes, pythonVersions } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 软删除所有现有标签
    await client.query(
      `UPDATE tags 
       SET deleted_at = CURRENT_TIMESTAMP 
       WHERE deleted_at IS NULL`
    );

    // 插入新的项目类型标签
    for (const tagname of projectTypes) {
      await client.query(
        `INSERT INTO tags (tagname, tagtype)
         VALUES ($1, 'projectType')`,
        [tagname]
      );
    }

    // 插入新的Python版本标签
    for (const tagname of pythonVersions) {
      await client.query(
        `INSERT INTO tags (tagname, tagtype)
         VALUES ($1, 'pythonVersion')`,
        [tagname]
      );
    }

    await client.query('COMMIT');
    res.json({ projectTypes, pythonVersions });
  } catch (error) {
    await client.query('ROLLBACK');
    log('error', '更新标签失败:', error);
    res.status(500).json({ error: '更新标签失败' });
  } finally {
    client.release();
  }
}