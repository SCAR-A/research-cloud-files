import pool from '../config/database.js';

export async function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  // 如果是内部前端请求，跳过API密钥验证
  if (req.headers['x-internal-request'] === 'true') {
    return next();
  }

  if (!apiKey) {
    return res.status(401).json({ error: '缺少API密钥' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM api_keys WHERE api_key = $1 AND is_active = true',
      [apiKey]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: '无效的API密钥' });
    }

    // 更新最后使用时间
    await pool.query(
      'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE api_key = $1',
      [apiKey]
    );

    req.apiKeyId = result.rows[0].id;
    next();
  } catch (error) {
    console.error('API密钥验证失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
}