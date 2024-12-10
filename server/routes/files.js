import { Router } from 'express';
import { upload } from '../middleware/upload.js';
import { validateApiKey } from '../middleware/auth.js';
import * as fileController from '../controllers/fileController.js';

const router = Router();

// 文件上传
router.post('/', validateApiKey, upload.single('file'), fileController.uploadFile);

// 获取文件列表
router.get('/', validateApiKey, fileController.getFiles);

// 按project_type和original_name下载文件
router.get('/download-by-type', validateApiKey, fileController.downloadFileByTypeAndName);

// 获取文件详情
router.get('/:id', validateApiKey, fileController.getFileById);

// 下载文件
router.get('/:id/download', validateApiKey, fileController.downloadFile);

// 删除文件
router.delete('/:id', validateApiKey, fileController.deleteFile);

export default router;