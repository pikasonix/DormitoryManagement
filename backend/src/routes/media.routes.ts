import express from 'express';
import { MediaController } from '../controllers/media.controller';
import { authMiddleware, checkRole } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware'; // Import multer instance đã config
import { Role } from '@prisma/client';

const router = express.Router();
const mediaController = new MediaController();

// --- Áp dụng Middleware ---
// Yêu cầu đăng nhập cho hầu hết các thao tác media
router.use(authMiddleware);

// --- Routes ---

// POST /api/media/upload - Endpoint chính để tải file lên
// 1. Xác thực người dùng (authMiddleware đã chạy)
// 2. Sử dụng multer để xử lý file upload (trường tên là 'file')
// 3. Gọi controller để tạo bản ghi Media
router.post(
    '/upload',
    upload.single('file'), // Sử dụng multer instance đã cấu hình, field name là 'file'
    mediaController.uploadMedia
);

// GET /api/media - Lấy danh sách Media (Admin/Staff)
router.get(
    '/',
    checkRole([Role.ADMIN, Role.STAFF]), // Giới hạn quyền xem danh sách
    mediaController.getAllMedia
);

// GET /api/media/:id - Lấy chi tiết Media (Có thể cho mọi user đăng nhập?)
router.get(
    '/:id',
    // authMiddleware đã áp dụng
    mediaController.getMediaById
);

// PUT /api/media/:id - Cập nhật metadata Media (Admin/Staff)
router.put(
    '/:id',
    checkRole([Role.ADMIN, Role.STAFF]),
    mediaController.updateMedia
);

// DELETE /api/media/:id - Xóa Media (Admin/Staff)
router.delete(
    '/:id',
    checkRole([Role.ADMIN, Role.STAFF]),
    mediaController.deleteMedia
);

export default router;