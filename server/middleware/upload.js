import multer from 'multer';
import { log } from '../utils/logger.js';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Store the original filename in the request object
  req.originalFileName = file.originalname;
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  }
});