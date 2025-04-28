import express from 'express';
import { MaintenanceController } from '../controllers/maintenance.controller';
import { authMiddleware, checkRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = express.Router();
const maintenanceController = new MaintenanceController();

// --- Áp dụng Middleware ---
// Yêu cầu đăng nhập cho tất cả các route bảo trì
router.use(authMiddleware);

// --- CRUD Routes ---

// GET /api/maintenances - Lấy danh sách yêu cầu (Admin/Staff xem tất cả, Student xem của mình?)
// Cần logic phức tạp hơn nếu student chỉ xem của mình -> có thể cần route riêng /api/students/me/maintenances
router.get(
    '/',
    checkRole([Role.ADMIN, Role.STAFF]), // Tạm thời chỉ cho Admin/Staff xem danh sách tổng
    maintenanceController.getAllMaintenances
);

// GET /api/maintenances/:id - Lấy chi tiết yêu cầu
// Cần kiểm tra quyền ở controller/service nếu student chỉ xem của mình
router.get(
    '/:id',
    // authMiddleware đã áp dụng
    maintenanceController.getMaintenanceById
);

// POST /api/maintenances - Tạo yêu cầu mới (Sinh viên có thể tạo)
router.post(
    '/',
    // authMiddleware đã áp dụng, không cần checkRole cụ thể nếu mọi người dùng đăng nhập đều có thể tạo
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