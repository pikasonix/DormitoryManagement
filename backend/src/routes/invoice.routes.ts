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
    checkRole([Role.ADMIN, Role.STAFF, Role.STUDENT]),
    invoiceController.getAllInvoices
);

// GET /api/invoices/:id - Lấy chi tiết hóa đơn
router.get(
    '/:id',
    checkRole([Role.ADMIN, Role.STAFF, Role.STUDENT]),
    invoiceController.getInvoiceById
);

// POST /api/invoices - Tạo hóa đơn mới (Admin/Staff)
router.post(
    '/',
    checkRole([Role.ADMIN, Role.STAFF]),
    invoiceController.createInvoice
);

// POST /api/invoices/bulk - Tạo hóa đơn hàng loạt cho tháng (Admin only)
router.post(
    '/bulk',
    checkRole([Role.ADMIN]),
    invoiceController.createBulkInvoices
);

// POST /api/invoices/bulk/room-fee - Tạo hóa đơn tiền phòng cho tháng (Admin only)
router.post(
    '/bulk/room-fee',
    checkRole([Role.ADMIN]),
    invoiceController.createRoomFeeInvoices
);

// POST /api/invoices/bulk/parking-fee - Tạo hóa đơn phí gửi xe cho tháng (Admin only)
router.post(
    '/bulk/parking-fee',
    checkRole([Role.ADMIN]),
    invoiceController.createParkingFeeInvoices
);

// POST /api/invoices/bulk/utility - Tạo hóa đơn tiện ích cho tháng (Admin only)
router.post(
    '/bulk/utility',
    checkRole([Role.ADMIN]),
    invoiceController.createUtilityInvoices
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