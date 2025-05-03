import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configuration constants
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const AVATAR_DIR = path.resolve(UPLOADS_DIR, 'avatar');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;

// Ensure upload directories exist
if (!fs.existsSync(UPLOADS_DIR)) {
  console.log(`[Multer Config] Creating uploads directory at: ${UPLOADS_DIR}`);
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch (error) {
    console.error(`[Multer Config] Failed to create uploads directory:`, error);
  }
} else {
  console.log(`[Multer Config] Uploads directory confirmed at: ${UPLOADS_DIR}`);
}

// Ensure avatar directory exists
if (!fs.existsSync(AVATAR_DIR)) {
  console.log(`[Multer Config] Creating avatar directory at: ${AVATAR_DIR}`);
  try {
    fs.mkdirSync(AVATAR_DIR, { recursive: true });
  } catch (error) {
    console.error(`[Multer Config] Failed to create avatar directory:`, error);
  }
} else {
  console.log(`[Multer Config] Avatar directory confirmed at: ${AVATAR_DIR}`);
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    if (file.fieldname === 'avatar' || file.mimetype.startsWith('image/')) {
      cb(null, AVATAR_DIR);
    } else {
      cb(null, UPLOADS_DIR);
    }
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const extension = path.extname(file.originalname);
    const baseName = file.fieldname || 'file';
    cb(null, `${baseName}-${uniqueSuffix}${extension}`);
  }
});

// File filter function
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const mimetypeIsValid = ALLOWED_FILE_TYPES.test(file.mimetype);
  const extensionIsValid = ALLOWED_FILE_TYPES.test(path.extname(file.originalname).toLowerCase());

  if (mimetypeIsValid && extensionIsValid) {
    cb(null, true);
  } else {
    cb(new Error(`Loại file không hợp lệ. Chỉ chấp nhận: ${ALLOWED_FILE_TYPES}`));
  }
};

// Create and export multer instance
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});