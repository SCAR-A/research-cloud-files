import pg from 'pg';
import dotenv from 'dotenv';
import { log } from '../utils/logger.js';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 监听连接错误
pool.on('error', (err) => {
  log('error', '数据库连接池错误:', err);
});

export async function initDatabase() {
  let client;
  try {
    client = await pool.connect();
    
    // 测试数据库连接
    await client.query('SELECT NOW()');
    log('info', '数据库连接成功');

    // 创建UUID扩展
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // 创建文件表
    await client.query(`
      CREATE TABLE IF NOT EXISTS files (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size BIGINT NOT NULL,
        hash_value VARCHAR(64) NOT NULL,
        download_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE
      )
    `);

    // 创建API密钥表
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        key_name VARCHAR(100) NOT NULL,
        api_key VARCHAR(64) NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP WITH TIME ZONE
      )
    `);

    // 创建文件访问日志表
    await client.query(`
      CREATE TABLE IF NOT EXISTS file_access_logs (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        file_id UUID REFERENCES files(id),
        api_key_id UUID REFERENCES api_keys(id),
        access_type VARCHAR(20) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建索引
    await client.query('CREATE INDEX IF NOT EXISTS idx_files_original_name ON files(original_name)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_file_access_logs_file_id ON file_access_logs(file_id)');

    // 创建默认API密钥（用于内部测试）
    const defaultApiKey = 'test_api_key_' + Math.random().toString(36).substring(7);
    await client.query(`
      INSERT INTO api_keys (key_name, api_key)
      SELECT 'Default Test Key', $1
      WHERE NOT EXISTS (
        SELECT 1 FROM api_keys WHERE key_name = 'Default Test Key'
      )
    `, [defaultApiKey]);

    log('info', '数据库表和索引创建成功');
  } catch (error) {
    log('error', '数据库初始化错误:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// 导出一个用于健康检查的函数
export async function checkDatabaseConnection() {
  let client;
  try {
    client = await pool.connect();
    await client.query('SELECT 1');
    return true;
  } catch (error) {
    log('error', '数据库连接检查失败:', error);
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}

export default pool;