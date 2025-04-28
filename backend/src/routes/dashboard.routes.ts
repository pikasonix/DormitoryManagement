import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authMiddleware, checkRole } from '../middleware/auth.middleware'; // Import thêm checkRole
import { Role } from '@prisma/client'; // Import Role

const router = Router();
const dashboardController = new DashboardController();

// Áp dụng middleware xác thực cho tất cả các route dashboard
router.use(authMiddleware);

// (Optional) Áp dụng kiểm tra quyền cho tất cả các route dashboard
// Đảm bảo chỉ ADMIN hoặc STAFF mới xem được dashboard
router.use(checkRole([Role.ADMIN, Role.STAFF]));

// GET /api/dashboard/stats - Lấy thống kê tổng quan
router.get('/stats', dashboardController.getStats);

// GET /api/dashboard/students/gender - Lấy thống kê sinh viên theo giới tính
// Đổi tên route và tên hàm controller cho nhất quán
router.get('/students/gender', dashboardController.getStudentsByGender);
// Hoặc giữ tên cũ nếu muốn:
// router.get('/residents/gender', dashboardController.getStudentsByGender);


// GET /api/dashboard/rooms/occupancy - Lấy tình trạng sử dụng phòng
router.get('/rooms/occupancy', dashboardController.getRoomsOccupancy);

// GET /api/dashboard/recent-activities - Lấy hoạt động gần đây (vd: sinh viên mới)
router.get('/recent-activities', dashboardController.getRecentActivities);

export default router;