"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentInvoiceController = void 0;
const invoice_service_1 = require("../services/invoice.service");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const invoiceService = new invoice_service_1.InvoiceService();
class StudentInvoiceController {
    // Hàm để lấy danh sách hóa đơn của sinh viên đang đăng nhập
    getMyInvoices(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { status, month, year, page, limit } = req.query;
                // Lấy studentProfileId từ user đã xác thực
                const studentProfileId = req.user && typeof req.user === 'object' && 'profileId' in req.user
                    ? Number(req.user.profileId)
                    : undefined;
                if (!studentProfileId) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Không tìm thấy thông tin sinh viên.'
                    });
                }
                const options = { where: {} };
                // Lọc hóa đơn theo sinh viên đang đăng nhập
                options.where.studentProfileId = studentProfileId;
                // Thêm các bộ lọc khác
                if (status)
                    options.where.status = status;
                if (month)
                    options.where.billingMonth = parseInt(month);
                if (year)
                    options.where.billingYear = parseInt(year);
                // Phân trang
                const pageNum = parseInt(page) || 1;
                const limitNum = parseInt(limit) || 10;
                options.skip = (pageNum - 1) * limitNum;
                options.take = limitNum;
                options.orderBy = { issueDate: 'desc' };
                // Lấy tổng số bản ghi
                const totalRecords = yield prisma.invoice.count({ where: options.where });
                const invoices = yield invoiceService.findAll(options);
                res.status(200).json({
                    status: 'success',
                    results: invoices.length,
                    total: totalRecords,
                    data: invoices
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    // Lấy thông tin chi tiết của một hóa đơn của sinh viên đang đăng nhập
    getMyInvoiceById(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                const studentProfileId = req.user && typeof req.user === 'object' && 'profileId' in req.user
                    ? Number(req.user.profileId)
                    : undefined;
                if (!studentProfileId) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Không tìm thấy thông tin sinh viên.'
                    });
                }
                // Lấy hóa đơn và kiểm tra xem có thuộc về sinh viên hiện tại không
                const invoice = yield invoiceService.findById(id);
                if (!invoice) {
                    return res.status(404).json({
                        status: 'error',
                        message: `Không tìm thấy hóa đơn với ID ${id}`
                    });
                }
                // Kiểm tra xem hóa đơn có thuộc về sinh viên hiện tại hoặc phòng của họ không
                if (invoice.studentProfileId !== studentProfileId) {
                    // Nếu không phải hóa đơn cá nhân, kiểm tra xem có phải hóa đơn của phòng mà sinh viên đang ở không
                    const student = yield prisma.studentProfile.findUnique({
                        where: { id: studentProfileId },
                        select: { roomId: true }
                    });
                    if (!(student === null || student === void 0 ? void 0 : student.roomId) || invoice.roomId !== student.roomId) {
                        return res.status(403).json({
                            status: 'error',
                            message: 'Bạn không có quyền xem hóa đơn này.'
                        });
                    }
                }
                res.status(200).json({
                    status: 'success',
                    data: invoice
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
}
exports.StudentInvoiceController = StudentInvoiceController;
