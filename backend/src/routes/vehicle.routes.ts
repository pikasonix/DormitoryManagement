import express from 'express';
import { VehicleController } from '../controllers/vehicle.controller';
import { authMiddleware, checkRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = express.Router();
const vehicleController = new VehicleController();

router.use(authMiddleware);

// GET /api/vehicles - Lấy danh sách đăng ký xe (Tất cả người dùng đều có thể truy cập, nhưng sẽ lọc dựa trên quyền)
router.get(
    '/',
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

// DELETE /api/vehicles/:id - Xóa đăng ký xe (Admin/Staff và sinh viên xóa xe của chính mình)
router.delete(
    '/:id',
    vehicleController.deleteRegistration
);

export default router;