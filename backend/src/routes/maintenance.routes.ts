import express from 'express';
import { MaintenanceController } from '../controllers/maintenance.controller';
import { authMiddleware, checkRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = express.Router();
const maintenanceController = new MaintenanceController();

router.use(authMiddleware);

// GET /api/maintenances - Lấy danh sách yêu cầu (Admin/Staff xem tất cả, Student xem của mình)
router.get(
    '/',
    maintenanceController.getAllMaintenances
);

// GET /api/maintenances/:id - Lấy chi tiết yêu cầu
router.get(
    '/:id',
    maintenanceController.getMaintenanceById
);

// POST /api/maintenances - Tạo yêu cầu mới
router.post(
    '/',
    maintenanceController.createMaintenance
);

// PUT /api/maintenances/:id - Cập nhật yêu cầu (Chỉ Admin/Staff)
router.put(
    '/:id',
    checkRole([Role.ADMIN, Role.STAFF]),
    maintenanceController.updateMaintenance
);

// DELETE /api/maintenances/:id - Xóa yêu cầu (Tất cả các vai trò, controller sẽ kiểm tra quyền)
router.delete(
    '/:id',
    checkRole([Role.ADMIN, Role.STAFF, Role.STUDENT]),
    maintenanceController.deleteMaintenance
);

export default router;