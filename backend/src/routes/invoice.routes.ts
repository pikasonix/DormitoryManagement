import express from 'express';
import { InvoiceController } from '../controllers/invoice.controller';
import { authMiddleware, checkRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = express.Router();
const invoiceController = new InvoiceController();

router.use(authMiddleware);

// GET /api/invoices - Lấy danh sách hóa đơn (Admin/Staff xem tất cả)
router.get(
    '/',
    checkRole([Role.ADMIN, Role.STAFF]),
    invoiceController.getAllInvoices
);

// GET /api/invoices/:id - Lấy chi tiết hóa đơn
router.get(
    '/:id',
    invoiceController.getInvoiceById
);

// POST /api/invoices - Tạo hóa đơn mới (Admin/Staff)
router.post(
    '/',
    checkRole([Role.ADMIN, Role.STAFF]),
    invoiceController.createInvoice
);

// PUT /api/invoices/:id - Cập nhật hóa đơn (Admin/Staff)
router.put(
    '/:id',
    checkRole([Role.ADMIN, Role.STAFF]),
    invoiceController.updateInvoice
);

// DELETE /api/invoices/:id - Xóa hóa đơn (Admin/Staff)
router.delete(
    '/:id',
    checkRole([Role.ADMIN, Role.STAFF]),
    invoiceController.deleteInvoice
);

export default router;