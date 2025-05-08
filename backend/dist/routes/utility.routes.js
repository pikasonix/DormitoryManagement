"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const utility_controller_1 = require("../controllers/utility.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
const utilityController = new utility_controller_1.UtilityController();
router.use(auth_middleware_1.authMiddleware);
router.use((0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]));
// GET /api/utilities - Lấy danh sách các lần ghi chỉ số (endpoint mới cho frontend)
router.get('/', utilityController.getAllReadings);
// GET /api/utilities/:id - Lấy chi tiết một lần ghi chỉ số (endpoint mới cho frontend)
router.get('/:id', utilityController.getReadingById);
// POST /api/utilities - Tạo bản ghi chỉ số mới (endpoint mới cho frontend)
router.post('/', utilityController.createReading);
// PUT /api/utilities/:id - Cập nhật bản ghi chỉ số (endpoint mới cho frontend)
router.put('/:id', utilityController.updateReading);
// DELETE /api/utilities/:id - Xóa bản ghi chỉ số (endpoint mới cho frontend)
router.delete('/:id', utilityController.deleteReading);
// Giữ lại các routes cũ với tiền tố /readings để đảm bảo tương thích ngược
// GET /api/utilities/readings - Lấy danh sách các lần ghi chỉ số
router.get('/readings', utilityController.getAllReadings);
// GET /api/utilities/readings/:id - Lấy chi tiết một lần ghi chỉ số
router.get('/readings/:id', utilityController.getReadingById);
// POST /api/utilities/readings - Tạo bản ghi chỉ số mới
router.post('/readings', utilityController.createReading);
// PUT /api/utilities/readings/:id - Cập nhật bản ghi chỉ số
router.put('/readings/:id', utilityController.updateReading);
// DELETE /api/utilities/readings/:id - Xóa bản ghi chỉ số
router.delete('/readings/:id', utilityController.deleteReading);
exports.default = router;
