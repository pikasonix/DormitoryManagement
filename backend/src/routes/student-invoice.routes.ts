import express from 'express';
import { StudentInvoiceController } from '../controllers/student-invoice.controller';
import { authMiddleware, checkRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = express.Router();
const studentInvoiceController = new StudentInvoiceController();

router.use(authMiddleware);
router.use(checkRole([Role.STUDENT]));

// GET /api/student/invoices - Lấy danh sách hóa đơn của sinh viên hiện tại
router.get(
    '/',
    studentInvoiceController.getMyInvoices
);

// GET /api/student/invoices/:id - Lấy chi tiết hóa đơn của sinh viên hiện tại
router.get(
    '/:id',
    studentInvoiceController.getMyInvoiceById
);

export default router;
