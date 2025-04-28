import express from 'express';
import { VehicleController } from '../controllers/vehicle.controller';
import { authMiddleware, checkRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = express.Router();
const vehicleController = new VehicleController();

// --- Áp dụng Middleware ---
// Yêu cầu đăng nhập cho tất cả các route đăng ký xe
router.use(authMiddleware);

// --- Routes ---

// GET /api/vehicles - Lấy danh sách đăng ký xe (Admin/Staff xem tất cả)
// Sinh viên cần route riêng: /api/students/me/vehicles
router.get(
    '/',
    checkRole([Role.ADMIN, Role.STAFF]),
    vehicleController.getAllRegistrations
);

// GET /api/vehicles/:id - Lấy chi tiết đăng ký xe (Admin/Staff + Sinh viên sở hữu?)
// Cần kiểm tra quyền cụ thể trong controller/service
router.get(
    '/:id',
    // authMiddleware đã áp dụng
    vehicleController.getRegistrationById
);

// POST /api/vehicles - Tạo đăng ký xe mới (Mọi user đăng nhập có thể tạo?)
// Controller sẽ xác định là sinh viên tự tạo hay Admin/Staff tạo hộ
router.post(
    '/',
    // authMiddleware đã áp dụng
    vehicleController.createRegistration
);

// PUT /api/vehicles/:id - Cập nhật đăng ký xe (Chỉ Admin/Staff)
router.put(
    '/:id',
    checkRole([Role.ADMIN, Role.STAFF]),
    vehicleController.updateRegistration
);

// DELETE /api/vehicles/:id - Xóa đăng ký xe (Chỉ Admin/Staff)
router.delete(
    '/:id',
    checkRole([Role.ADMIN, Role.STAFF]),
    vehicleController.deleteRegistration
);

export default router;