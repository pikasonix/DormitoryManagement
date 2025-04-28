import express from 'express';
import { TransferController } from '../controllers/transfer.controller';
import { authMiddleware, checkRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = express.Router();
const transferController = new TransferController();

// --- Áp dụng Middleware ---
// Yêu cầu đăng nhập cho tất cả các route chuyển phòng
router.use(authMiddleware);

// --- Routes ---

// GET /api/transfers - Lấy danh sách yêu cầu (Admin/Staff xem tất cả)
// Sinh viên cần route riêng để xem yêu cầu của mình: /api/students/me/transfers
router.get(
    '/',
    checkRole([Role.ADMIN, Role.STAFF]),
    transferController.getAllTransfers
);

// GET /api/transfers/:id - Lấy chi tiết yêu cầu (Admin/Staff + Sinh viên tạo yêu cầu?)
// Cần kiểm tra quyền cụ thể trong controller/service
router.get(
    '/:id',
    // authMiddleware đã áp dụng
    transferController.getTransferById
);

// POST /api/transfers/request - Sinh viên tạo yêu cầu chuyển phòng mới
// Đặt tên route rõ ràng hơn là chỉ POST /
router.post(
    '/request',
    // authMiddleware đã áp dụng, không cần checkRole vì sinh viên tạo
    transferController.createTransferRequest
);

// PUT /api/transfers/:id/status - Admin/Staff cập nhật trạng thái (approve/reject/complete)
router.put(
    '/:id/status',
    checkRole([Role.ADMIN, Role.STAFF]),
    transferController.updateTransferStatus
);

// DELETE /api/transfers/:id - Xóa yêu cầu (Admin/Staff hoặc Sinh viên hủy yêu cầu PENDING?)
// Cần logic phân quyền rõ ràng hơn trong controller/service
router.delete(
    '/:id',
    // Tạm thời cho Admin/Staff xóa
    checkRole([Role.ADMIN, Role.STAFF]),
    transferController.deleteTransfer
);

export default router;