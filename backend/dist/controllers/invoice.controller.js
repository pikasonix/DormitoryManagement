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
exports.InvoiceController = void 0;
const invoice_service_1 = require("../services/invoice.service");
const client_1 = require("@prisma/client"); // Import Prisma và Enums
const client_2 = require("@prisma/client");
const prisma = new client_2.PrismaClient();
const invoiceService = new invoice_service_1.InvoiceService();
class InvoiceController {
    getAllInvoices(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { studentProfileId, roomId, status, month, year, page, limit, invoiceNumber, identifier // Thêm tham số tìm kiếm mới
                 } = req.query;
                const options = { where: {} };
                // Xây dựng bộ lọc
                if (studentProfileId)
                    options.where.studentProfileId = parseInt(studentProfileId);
                if (roomId)
                    options.where.roomId = parseInt(roomId);
                if (status)
                    options.where.status = status; // Cần validate enum
                if (month)
                    options.where.billingMonth = parseInt(month);
                if (year)
                    options.where.billingYear = parseInt(year);
                // Xử lý tìm kiếm theo số hợp đồng
                if (invoiceNumber) {
                    const invoiceId = parseInt(invoiceNumber);
                    if (!isNaN(invoiceId)) {
                        options.where.id = invoiceId;
                    }
                }
                // Xử lý tìm kiếm theo mã SV/phòng
                if (identifier) {
                    const searchTerm = identifier.trim();
                    // Tìm studentProfile có studentId chứa searchTerm
                    const matchingStudents = yield prisma.studentProfile.findMany({
                        where: {
                            studentId: {
                                contains: searchTerm
                            }
                        },
                        select: { id: true }
                    });
                    // Tìm phòng có số phòng chứa searchTerm
                    const matchingRooms = yield prisma.room.findMany({
                        where: {
                            OR: [
                                { number: { contains: searchTerm } },
                                { building: { name: { contains: searchTerm } } }
                            ]
                        },
                        select: { id: true }
                    });
                    if (matchingStudents.length > 0 || matchingRooms.length > 0) {
                        options.where.OR = [
                            ...matchingStudents.map(student => ({ studentProfileId: student.id })),
                            ...matchingRooms.map(room => ({ roomId: room.id }))
                        ];
                    }
                    else {
                        // Nếu không tìm thấy kết quả nào, trả về mảng rỗng
                        options.where.id = -1; // Không có ID hóa đơn nào là -1, đảm bảo không có kết quả trả về
                    }
                }
                // Validate Enums nếu cần
                if (status && !Object.values(client_1.InvoiceStatus).includes(status)) {
                    return next(new Error(`Trạng thái hóa đơn không hợp lệ: ${status}`));
                }
                // Phân trang
                const pageNum = parseInt(page) || 1;
                const limitNum = parseInt(limit) || 10;
                options.skip = (pageNum - 1) * limitNum;
                options.take = limitNum;
                options.orderBy = { issueDate: 'desc' }; // Sắp xếp theo ngày phát hành
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
    getInvoiceById(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                const invoice = yield invoiceService.findById(id); // Service xử lý not found
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
    createInvoice(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { studentProfileId, roomId, billingMonth, billingYear, dueDate, paymentDeadline, notes, items, status } = req.body;
                // Validation cơ bản đã được service xử lý, nhưng có thể thêm validate ở đây nếu muốn
                if (!items || !Array.isArray(items) || items.length === 0) {
                    return next(new Error('Hóa đơn phải có ít nhất một mục (items).'));
                }
                // Validate các items
                for (const item of items) {
                    if (!item.type || !item.description || item.amount === undefined || item.amount === null) {
                        return next(new Error('Mỗi mục trong hóa đơn phải có type, description, và amount.'));
                    }
                    if (!Object.values(client_1.PaymentType).includes(item.type)) {
                        return next(new Error(`Loại thanh toán không hợp lệ trong items: ${item.type}`));
                    }
                    if (isNaN(parseFloat(item.amount))) {
                        return next(new Error(`Số tiền không hợp lệ trong items cho mục: ${item.description}`));
                    }
                }
                const createData = {
                    studentProfileId,
                    roomId,
                    billingMonth: parseInt(billingMonth),
                    billingYear: parseInt(billingYear),
                    dueDate, // Service sẽ chuyển thành Date
                    paymentDeadline, // Service sẽ chuyển thành Date
                    notes,
                    items, // Service sẽ xử lý và tính totalAmount
                    status: status // Service sẽ validate enum
                };
                const newInvoice = yield invoiceService.create(createData);
                res.status(201).json({
                    status: 'success',
                    data: newInvoice
                });
            }
            catch (error) {
                next(error); // Chuyển lỗi từ service hoặc validation
            }
        });
    }
    updateInvoice(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                // Chỉ cho phép cập nhật các trường metadata và items
                const { billingMonth, billingYear, dueDate, paymentDeadline, notes, items, status } = req.body;
                // Validate items nếu được cung cấp
                if (items !== undefined) {
                    if (!Array.isArray(items)) {
                        return next(new Error('Items phải là một mảng.'));
                    }
                    for (const item of items) {
                        if (!item.type || !item.description || item.amount === undefined || item.amount === null) {
                            return next(new Error('Mỗi mục trong hóa đơn phải có type, description, và amount.'));
                        }
                        if (!Object.values(client_1.PaymentType).includes(item.type)) {
                            return next(new Error(`Loại thanh toán không hợp lệ trong items: ${item.type}`));
                        }
                        if (isNaN(parseFloat(item.amount))) {
                            return next(new Error(`Số tiền không hợp lệ trong items cho mục: ${item.description}`));
                        }
                    }
                }
                const updateData = {
                    billingMonth: billingMonth ? parseInt(billingMonth) : undefined,
                    billingYear: billingYear ? parseInt(billingYear) : undefined,
                    dueDate, // Service sẽ chuyển thành Date
                    paymentDeadline, // Service sẽ chuyển thành Date
                    notes,
                    items, // Service sẽ xử lý, tính lại total, xóa/tạo items
                    status: status // Service sẽ validate enum
                };
                const updatedInvoice = yield invoiceService.update(id, updateData);
                res.status(200).json({
                    status: 'success',
                    data: updatedInvoice
                });
            }
            catch (error) {
                next(error); // Chuyển lỗi từ service hoặc validation
            }
        });
    }
    deleteInvoice(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                yield invoiceService.delete(id); // Service xử lý not found và transaction xóa
                res.status(200).json({
                    status: 'success',
                    message: 'Hóa đơn đã được xóa thành công.',
                    data: null
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
}
exports.InvoiceController = InvoiceController;
