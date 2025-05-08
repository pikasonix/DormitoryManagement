"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const room_controller_1 = require("../controllers/room.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
const roomController = new room_controller_1.RoomController();
router.use(auth_middleware_1.authMiddleware);
// GET /api/rooms - Lấy danh sách phòng (có thể lọc)
router.get('/', roomController.getAllRooms);
// GET /api/rooms/:id - Lấy chi tiết một phòng
router.get('/:id', roomController.getRoomById);
// POST /api/rooms - Tạo phòng mới
router.post('/', (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), roomController.createRoom);
// PUT /api/rooms/:id - Cập nhật thông tin phòng
router.put('/:id', (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), roomController.updateRoom);
// DELETE /api/rooms/:id - Xóa phòng
router.delete('/:id', (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), roomController.deleteRoom);
exports.default = router;
