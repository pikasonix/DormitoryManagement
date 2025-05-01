import multer from 'multer';
import path from 'path';
import fs from 'fs'; // Import fs để kiểm tra/tạo thư mục

// --- Configuration Constants ---
// Xác định thư mục uploads một cách đáng tin cậy, thường là ở gốc dự án
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const AVATAR_DIR = path.resolve(UPLOADS_DIR, 'avatar');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (khớp với server.ts)
// Regex cho các loại file được phép (linh hoạt hơn mảng mimetype)
const ALLOWED_FILE_TYPES = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;

// --- Ensure Upload Directories Exist ---
// Thực hiện một lần khi middleware được load
if (!fs.existsSync(UPLOADS_DIR)) {
  console.log(`[Multer Config] Creating uploads directory at: ${UPLOADS_DIR}`);
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch (error) {
    console.error(`[Multer Config] Failed to create uploads directory:`, error);
    // Cân nhắc throw lỗi ở đây nếu thư mục upload là bắt buộc để server hoạt động
  }
} else {
  console.log(`[Multer Config] Uploads directory confirmed at: ${UPLOADS_DIR}`);
}

// Đảm bảo thư mục avatar tồn tại
if (!fs.existsSync(AVATAR_DIR)) {
  console.log(`[Multer Config] Creating avatar directory at: ${AVATAR_DIR}`);
  try {
    fs.mkdirSync(AVATAR_DIR, { recursive: true });
  } catch (error) {
    console.error(`[Multer Config] Failed to create avatar directory:`, error);
    // Cân nhắc throw lỗi ở đây nếu thư mục avatar là bắt buộc để server hoạt động
  }
} else {
  console.log(`[Multer Config] Avatar directory confirmed at: ${AVATAR_DIR}`);
}

// --- Multer Storage Configuration ---
// Sử dụng diskStorage để lưu file vào thư mục uploads
const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    // Nếu là avatar, lưu vào thư mục avatar
    if (file.fieldname === 'avatar' || file.mimetype.startsWith('image/')) {
      cb(null, AVATAR_DIR);
    } else {
      cb(null, UPLOADS_DIR); // Các file khác lưu vào uploads
    }
  },
  filename: (_req, file, cb) => {
    // Tạo tên file duy nhất để tránh ghi đè
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const extension = path.extname(file.originalname);
    // Giữ fieldname để dễ nhận biết mục đích upload (nếu dùng upload.fields)
    // Hoặc dùng một tiền tố cố định nếu chỉ dùng upload.single('file')
    const baseName = file.fieldname || 'file'; // Mặc định là 'file' nếu fieldname không có
    cb(null, `${baseName}-${uniqueSuffix}${extension}`);
  }
});

// --- Multer File Filter ---
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Kiểm tra cả mimetype và phần mở rộng file
  const mimetypeIsValid = ALLOWED_FILE_TYPES.test(file.mimetype);
  const extensionIsValid = ALLOWED_FILE_TYPES.test(path.extname(file.originalname).toLowerCase());

  if (mimetypeIsValid && extensionIsValid) {
    cb(null, true); // Chấp nhận file
  } else {
    // Từ chối file với lỗi cụ thể
    cb(new Error(`Loại file không hợp lệ. Chỉ chấp nhận: ${ALLOWED_FILE_TYPES}`));
    // cb(null, false); // Cách khác: chỉ từ chối mà không báo lỗi rõ ràng
  }
};

// --- Create and Export Multer Instance ---
// Instance này sẽ được import và sử dụng trong các route cần upload file
// ví dụ: upload.single('file'), upload.array('files'), upload.fields(...)
export const upload = multer({
  storage: storage,       // Sử dụng diskStorage đã định nghĩa
  fileFilter: fileFilter, // Sử dụng fileFilter đã định nghĩa
  limits: {
    fileSize: MAX_FILE_SIZE // Giới hạn kích thước file
  }
});

// Lưu ý: File này chỉ cấu hình và export instance `multer`.
// Việc sử dụng nó (ví dụ: `upload.single('file')`) sẽ diễn ra trong file route
// cụ thể (như `media.routes.ts`).