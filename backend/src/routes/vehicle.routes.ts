import express from 'express';
import { VehicleController } from '../controllers/vehicle.controller';
import { authMiddleware, checkRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = express.Router();
const vehicleController = new VehicleController();

router.use(authMiddleware);

// GET /api/vehicles - Lấy danh sách đăng ký xe (Admin/Staff xem tất cả)
router.get(
    '/',
    checkRole([Role.ADMIN, Role.STAFF]),
    vehicleController.getAllRegistrations
);

// GET /api/vehicles/:id - Lấy chi tiết đăng ký xe
router.get(
    '/:id',
    vehicleController.getRegistrationById
);

// POST /api/vehicles - Tạo đăng ký xe mới
router.post(
    '/',
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