"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const vehicle_controller_1 = require("../controllers/vehicle.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
const vehicleController = new vehicle_controller_1.VehicleController();
router.use(auth_middleware_1.authMiddleware);
// GET /api/vehicles - Lấy danh sách đăng ký xe (Admin/Staff xem tất cả)
router.get('/', (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), vehicleController.getAllRegistrations);
// GET /api/vehicles/:id - Lấy chi tiết đăng ký xe
router.get('/:id', vehicleController.getRegistrationById);
// POST /api/vehicles - Tạo đăng ký xe mới
router.post('/', vehicleController.createRegistration);
// PUT /api/vehicles/:id - Cập nhật đăng ký xe (Chỉ Admin/Staff)
router.put('/:id', (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), vehicleController.updateRegistration);
// DELETE /api/vehicles/:id - Xóa đăng ký xe (Chỉ Admin/Staff)
router.delete('/:id', (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), vehicleController.deleteRegistration);
exports.default = router;
