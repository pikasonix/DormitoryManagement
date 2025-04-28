import express from 'express';
import { InvoiceController } from '../controllers/invoice.controller';
import { authMiddleware, checkRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = express.Router();
const invoiceController = new InvoiceController();

// --- Áp dụng Middleware ---
// Yêu cầu đăng nhập cho tất cả các route hóa đơn
router.use(authMiddleware);

// --- CRUD Routes (Thường dành cho Admin/Staff) ---

// GET /api/invoices - Lấy danh sách hóa đơn (Admin/Staff xem tất cả)
// Sinh viên cần route riêng hoặc logic lọc trong controller/service để xem hóa đơn của mình
router.get(
    '/',
    checkRole([Role.ADMIN, Role.STAFF]),
    invoiceController.getAllInvoices
);

// GET /api/invoices/:id - Lấy chi tiết hóa đơn (Admin/Staff + Sinh viên liên quan?)
// Cần kiểm tra quyền cụ thể hơn trong controller/service nếu cần
router.get(
    '/:id',
    // authMiddleware đã áp dụng
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