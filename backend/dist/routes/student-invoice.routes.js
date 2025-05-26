"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const student_invoice_controller_1 = require("../controllers/student-invoice.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
const studentInvoiceController = new student_invoice_controller_1.StudentInvoiceController();
router.use(auth_middleware_1.authMiddleware);
router.use((0, auth_middleware_1.checkRole)([client_1.Role.STUDENT]));
// GET /api/student/invoices - Lấy danh sách hóa đơn của sinh viên hiện tại
router.get('/', studentInvoiceController.getMyInvoices);
// GET /api/student/invoices/:id - Lấy chi tiết hóa đơn của sinh viên hiện tại
router.get('/:id', studentInvoiceController.getMyInvoiceById);
exports.default = router;
