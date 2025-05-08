"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const invoice_controller_1 = require("../controllers/invoice.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
const invoiceController = new invoice_controller_1.InvoiceController();
router.use(auth_middleware_1.authMiddleware);
// GET /api/invoices - Lấy danh sách hóa đơn (Admin/Staff xem tất cả)
router.get('/', (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), invoiceController.getAllInvoices);
// GET /api/invoices/:id - Lấy chi tiết hóa đơn
router.get('/:id', invoiceController.getInvoiceById);
// POST /api/invoices - Tạo hóa đơn mới (Admin/Staff)
router.post('/', (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), invoiceController.createInvoice);
// PUT /api/invoices/:id - Cập nhật hóa đơn (Admin/Staff)
router.put('/:id', (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), invoiceController.updateInvoice);
// DELETE /api/invoices/:id - Xóa hóa đơn (Admin/Staff)
router.delete('/:id', (0, auth_middleware_1.checkRole)([client_1.Role.ADMIN, client_1.Role.STAFF]), invoiceController.deleteInvoice);
exports.default = router;
