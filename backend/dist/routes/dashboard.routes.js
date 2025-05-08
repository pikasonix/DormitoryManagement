"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const dashboardController = new dashboard_controller_1.DashboardController();
router.use(auth_middleware_1.authMiddleware);
router.use((0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]));
// GET /api/dashboard/stats - Lấy thống kê tổng quan
router.get('/stats', dashboardController.getStats);
// GET /api/dashboard/students/gender - Lấy thống kê sinh viên theo giới tính
router.get('/students/gender', dashboardController.getStudentsByGender);
// GET /api/dashboard/rooms/occupancy - Lấy tình trạng sử dụng phòng
router.get('/rooms/occupancy', dashboardController.getRoomsOccupancy);
// GET /api/dashboard/recent-activities - Lấy hoạt động gần đây
router.get('/recent-activities', dashboardController.getRecentActivities);
exports.default = router;
