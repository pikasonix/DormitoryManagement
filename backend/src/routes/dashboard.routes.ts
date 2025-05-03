import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authMiddleware, checkRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();
const dashboardController = new DashboardController();

router.use(authMiddleware);
router.use(checkRole([Role.ADMIN, Role.STAFF]));

// GET /api/dashboard/stats - Lấy thống kê tổng quan
router.get('/stats', dashboardController.getStats);

// GET /api/dashboard/students/gender - Lấy thống kê sinh viên theo giới tính
router.get('/students/gender', dashboardController.getStudentsByGender);

// GET /api/dashboard/rooms/occupancy - Lấy tình trạng sử dụng phòng
router.get('/rooms/occupancy', dashboardController.getRoomsOccupancy);

// GET /api/dashboard/recent-activities - Lấy hoạt động gần đây
router.get('/recent-activities', dashboardController.getRecentActivities);

export default router;