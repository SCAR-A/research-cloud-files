import { Router } from 'express';
import { validateApiKey } from '../middleware/auth.js';
import * as tagController from '../controllers/tagController.js';

const router = Router();

// 获取所有标签
router.get('/', tagController.getTags);

// 添加标签
router.post('/', validateApiKey, tagController.addTag);

// 删除标签
router.delete('/', validateApiKey, tagController.deleteTag);

// 更新标签
router.put('/', validateApiKey, tagController.updateTags);

export default router;