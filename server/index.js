import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { rateLimit } from 'express-rate-limit';
import { initDatabase, checkDatabaseConnection } from './config/database.js';
import filesRouter from './routes/files.js';
import { promises as fs } from 'fs';
import { log } from './utils/logger.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.API_PORT || 3000;

// 定期检查数据库连接
function startHealthCheck() {
  setInterval(async () => {
    const isHealthy = await checkDatabaseConnection();
    if (!isHealthy) {
      log('warn', '数据库连接异常，尝试重新连接...');
    }
  }, 30000); // 每30秒检查一次
}

async function startServer() {
  try {
    // 创建上传目录
    const uploadDir = join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    log('info', `上传目录创建成功: ${uploadDir}`);

    // 初始化数据库
    // await initDatabase();
    log('info', '数据库初始化成功');

    // 启动健康检查
    //startHealthCheck();

    // 中间件配置
    app.use(cors());
    app.use(express.json());
    app.use('/uploads', express.static(uploadDir));

    // API访问频率限制
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100
    });
    app.use('/api/', limiter);

    // API路由
    app.use('/api/v1/files', filesRouter);

    // 健康检查端点
    app.get('/health', async (req, res) => {
      const dbHealthy = await checkDatabaseConnection();
      res.json({
        status: dbHealthy ? 'ok' : 'error',
        database: dbHealthy ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
      });
    });

    // 错误处理中间件
    app.use((err, req, res, next) => {
      log('error', '服务器错误:', err);
      res.status(500).json({ error: '服务器内部错误' });
    });

    // 启动服务器
    const server = app.listen(port, () => {
      log('info', `API服务器运行在 http://localhost:${port}`);
      log('info', `上传目录: ${uploadDir}`);
    });

    // 优雅关闭
    async function gracefulShutdown(signal) {
      log('info', `收到 ${signal} 信号，开始优雅关闭...`);
      
      server.close(() => {
        log('info', 'HTTP服务器已关闭');
        process.exit(0);
      });

      // 如果15秒内没有完成关闭，强制退出
      setTimeout(() => {
        log('warn', '强制关闭服务器');
        process.exit(1);
      }, 15000);
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // 处理未捕获的异常
    process.on('uncaughtException', (error) => {
      log('error', '未捕获的异常:', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      log('error', '未处理的Promise拒绝:', reason);
    });

  } catch (error) {
    log('error', '服务器启动失败:', error);
    process.exit(1);
  }
}

// 启动服务器
startServer().catch((error) => {
  log('error', '启动过程中发生错误:', error);
  process.exit(1);
});