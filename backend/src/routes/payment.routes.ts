import express from 'express';
import { getPayments, getPaymentById, createPayment, updatePayment, deletePayment } from '../controllers/payment.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

// Tất cả các routes đều cần authentication
router.use(authMiddleware);

// GET /api/payments - Lấy danh sách thanh toán (có thể lọc)
router.get('/', getPayments);

// GET /api/payments/:id - Lấy chi tiết một thanh toán
router.get('/:id', getPaymentById);

// POST /api/payments - Tạo thanh toán mới
router.post('/', createPayment);

// PUT /api/payments/:id - Cập nhật thanh toán
router.put('/:id', updatePayment);

// DELETE /api/payments/:id - Xóa thanh toán
router.delete('/:id', deletePayment);

export default router;