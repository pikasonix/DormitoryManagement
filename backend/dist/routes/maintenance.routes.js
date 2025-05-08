"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const maintenance_controller_1 = require("../controllers/maintenance.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
const maintenanceController = new maintenance_controller_1.MaintenanceController();
router.use(auth_middleware_1.authMiddleware);
// GET /api/maintenances - Lấy danh sách yêu cầu (Admin/Staff xem tất cả)
router.get('/', (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), maintenanceController.getAllMaintenances);
// GET /api/maintenances/:id - Lấy chi tiết yêu cầu
router.get('/:id', maintenanceController.getMaintenanceById);
// POST /api/maintenances - Tạo yêu cầu mới
router.post('/', maintenanceController.createMaintenance);
// PUT /api/maintenances/:id - Cập nhật yêu cầu (Chỉ Admin/Staff)
router.put('/:id', (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), maintenanceController.updateMaintenance);
// DELETE /api/maintenances/:id - Xóa yêu cầu (Chỉ Admin/Staff)
router.delete('/:id', (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), maintenanceController.deleteMaintenance);
exports.default = router;
