"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const transfer_controller_1 = require("../controllers/transfer.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
const transferController = new transfer_controller_1.TransferController();
router.use(auth_middleware_1.authMiddleware);
// GET /api/transfers - Lấy danh sách yêu cầu (Admin/Staff xem tất cả)
router.get('/', (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), transferController.getAllTransfers);
// GET /api/transfers/:id - Lấy chi tiết yêu cầu
router.get('/:id', transferController.getTransferById);
// POST /api/transfers/request - Sinh viên tạo yêu cầu chuyển phòng mới
router.post('/request', transferController.createTransferRequest);
// PUT /api/transfers/:id/status - Admin/Staff cập nhật trạng thái (approve/reject/complete)
router.put('/:id/status', (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), transferController.updateTransferStatus);
// DELETE /api/transfers/:id - Xóa yêu cầu
router.delete('/:id', (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), transferController.deleteTransfer);
exports.default = router;
