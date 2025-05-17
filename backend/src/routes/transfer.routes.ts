import express from 'express';
import { TransferController } from '../controllers/transfer.controller';
import { authMiddleware, checkRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = express.Router();
const transferController = new TransferController();

router.use(authMiddleware);

// GET /api/transfers - Lấy danh sách yêu cầu (Admin/Staff xem tất cả)
router.get(
    '/',
    transferController.getAllTransfers
);

// GET /api/transfers/:id - Lấy chi tiết yêu cầu
router.get(
    '/:id',
    transferController.getTransferById
);

// POST /api/transfers/request - Sinh viên tạo yêu cầu chuyển phòng mới
router.post(
    '/request',
    transferController.createTransferRequest
);

// PUT /api/transfers/:id/status - Admin/Staff cập nhật trạng thái (approve/reject/complete)
router.put(
    '/:id/status',
    checkRole([Role.ADMIN, Role.STAFF]),
    transferController.updateTransferStatus
);

// DELETE /api/transfers/:id - Xóa yêu cầu
router.delete(
    '/:id',
    transferController.deleteTransfer
);

export default router;