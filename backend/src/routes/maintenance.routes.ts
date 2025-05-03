import express from 'express';
import { MaintenanceController } from '../controllers/maintenance.controller';
import { authMiddleware, checkRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = express.Router();
const maintenanceController = new MaintenanceController();

router.use(authMiddleware);

// GET /api/maintenances - Lấy danh sách yêu cầu (Admin/Staff xem tất cả)
router.get(
    '/',
    checkRole([Role.ADMIN, Role.STAFF]),
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

// DELETE /api/maintenances/:id - Xóa yêu cầu (Chỉ Admin/Staff)
router.delete(
    '/:id',
    checkRole([Role.ADMIN, Role.STAFF]),
    maintenanceController.deleteMaintenance
);

export default router;