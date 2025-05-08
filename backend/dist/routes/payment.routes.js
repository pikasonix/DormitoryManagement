"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const payment_controller_1 = require("../controllers/payment.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
// Tất cả các routes đều cần authentication
router.use(auth_middleware_1.authMiddleware);
// GET /api/payments - Lấy danh sách thanh toán (có thể lọc)
router.get('/', payment_controller_1.getPayments);
// GET /api/payments/:id - Lấy chi tiết một thanh toán
router.get('/:id', payment_controller_1.getPaymentById);
// POST /api/payments - Tạo thanh toán mới
router.post('/', payment_controller_1.createPayment);
// PUT /api/payments/:id - Cập nhật thanh toán
router.put('/:id', payment_controller_1.updatePayment);
// DELETE /api/payments/:id - Xóa thanh toán
router.delete('/:id', payment_controller_1.deletePayment);
exports.default = router;
