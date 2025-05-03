import express from 'express';
import { MediaController } from '../controllers/media.controller';
import { authMiddleware, checkRole } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import { Role } from '@prisma/client';

const router = express.Router();
const mediaController = new MediaController();

router.use(authMiddleware);

// POST /api/media/upload - Endpoint chính để tải file lên
router.post(
    '/upload',
    upload.single('file'),
    mediaController.uploadMedia
);

// GET /api/media - Lấy danh sách Media (Admin/Staff)
router.get(
    '/',
    checkRole([Role.ADMIN, Role.STAFF]),
    mediaController.getAllMedia
);

// GET /api/media/:id - Lấy chi tiết Media
router.get(
    '/:id',
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