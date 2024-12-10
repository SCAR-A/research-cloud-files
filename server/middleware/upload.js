import multer from 'multer';
import crypto from 'crypto';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads'));
  },
  filename: (req, file, cb) => {
    // Generate a unique hash for the file
    const fileHash = crypto.randomBytes(16).toString('hex');
    const ext = extname(file.originalname);
    
    // Store the original filename in the request object
    req.originalFileName = file.originalname;
    
    cb(null, `${fileHash}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  }
});