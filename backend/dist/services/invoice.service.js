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
exports.InvoiceService = void 0;
const client_1 = require("@prisma/client");
const library_1 = require("@prisma/client/runtime/library");
const prisma = new client_1.PrismaClient();
class InvoiceService {
    /**
     * Tìm kiếm và lấy danh sách hóa đơn.
     * @param options Tùy chọn tìm kiếm Prisma (where, include, orderBy, etc.)
     */
    findAll(options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const invoices = yield prisma.invoice.findMany(Object.assign(Object.assign({}, options), { include: Object.assign({ studentProfile: {
                            select: { id: true, fullName: true, studentId: true }
                        }, room: {
                            select: { id: true, number: true, building: { select: { id: true, name: true } } }
                        }, items: true, payments: {
                            select: { id: true, amount: true, paymentDate: true },
                            orderBy: { paymentDate: 'desc' }
                        } }, ((options === null || options === void 0 ? void 0 : options.include) || {})), orderBy: (options === null || options === void 0 ? void 0 : options.orderBy) || { issueDate: 'desc' } }));
                return invoices;
            }
            catch (error) {
                console.error("[InvoiceService.findAll] Error:", error);
                throw error;
            }
        });
    }
    /**
     * Tìm một hóa đơn bằng ID.
     * @param id ID của Invoice
     * @param options Tùy chọn Prisma findUnique
     * @throws Error nếu không tìm thấy
     */
    findById(id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNaN(id)) {
                throw new Error('ID hóa đơn không hợp lệ');
            }
            try {
                const invoice = yield prisma.invoice.findUnique(Object.assign(Object.assign({ where: { id } }, options), { include: Object.assign({ studentProfile: { include: { user: { select: { email: true, avatar: true } } } }, room: { include: { building: true } }, items: true, payments: { include: { studentProfile: { select: { id: true, fullName: true } } }, orderBy: { paymentDate: 'desc' } } }, ((options === null || options === void 0 ? void 0 : options.include) || {})) }));
                if (!invoice) {
                    throw new Error(`Không tìm thấy hóa đơn với ID ${id}`);
                }
                return invoice;
            }
            catch (error) {
                console.error(`[InvoiceService.findById] Error fetching invoice ${id}:`, error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    throw new Error(`Không tìm thấy hóa đơn với ID ${id}`);
                }
                throw error;
            }
        });
    }
    /**
     * Tạo một hóa đơn mới.
     * @param data Dữ liệu hóa đơn và các mục chi tiết.
     * @throws Error nếu dữ liệu không hợp lệ hoặc lỗi tạo.
     */
    create(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if ((!data.studentProfileId && !data.roomId) || (data.studentProfileId && data.roomId)) {
                throw new Error('Hóa đơn phải thuộc về một Sinh viên hoặc một Phòng, không phải cả hai hoặc không có.');
            }
            if (!data.billingMonth || !data.billingYear || !data.dueDate || !data.paymentDeadline || !data.items || data.items.length === 0) {
                throw new Error('Thiếu thông tin bắt buộc: tháng/năm thanh toán, hạn thanh toán, và ít nhất một mục chi tiết.');
            }
            if (data.studentProfileId && isNaN(parseInt(data.studentProfileId)))
                throw new Error('studentProfileId không hợp lệ.');
            if (data.roomId && isNaN(parseInt(data.roomId)))
                throw new Error('roomId không hợp lệ.');
            try {
                let totalAmount = new library_1.Decimal(0);
                const invoiceItemsData = data.items.map(item => {
                    const itemAmount = new library_1.Decimal(item.amount);
                    if (itemAmount.isNaN() || itemAmount.isNegative()) {
                        throw new Error(`Số tiền không hợp lệ cho mục: ${item.description}`);
                    }
                    if (!Object.values(client_1.PaymentType).includes(item.type)) {
                        throw new Error(`Loại thanh toán không hợp lệ: ${item.type}`);
                    }
                    totalAmount = totalAmount.add(itemAmount);
                    return {
                        type: item.type,
                        description: item.description,
                        amount: itemAmount
                    };
                });
                const newInvoice = yield prisma.invoice.create({
                    data: {
                        studentProfileId: data.studentProfileId ? parseInt(data.studentProfileId) : null,
                        roomId: data.roomId ? parseInt(data.roomId) : null,
                        billingMonth: data.billingMonth,
                        billingYear: data.billingYear,
                        dueDate: new Date(data.dueDate),
                        paymentDeadline: new Date(data.paymentDeadline),
                        totalAmount: totalAmount,
                        paidAmount: 0,
                        status: data.status || client_1.InvoiceStatus.UNPAID,
                        notes: data.notes,
                        items: {
                            createMany: {
                                data: invoiceItemsData,
                                skipDuplicates: false
                            }
                        }
                    },
                    include: {
                        studentProfile: { select: { id: true, fullName: true } },
                        room: { select: { id: true, number: true } },
                        items: true,
                        payments: true
                    }
                });
                return newInvoice;
            }
            catch (error) {
                console.error("[InvoiceService.create] Error:", error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                    if (error.code === 'P2003') {
                        throw new Error('Không tìm thấy Sinh viên hoặc Phòng được chỉ định.');
                    }
                }
                else if (error instanceof Error && (error.message.includes('Số tiền không hợp lệ') || error.message.includes('Loại thanh toán không hợp lệ'))) {
                    throw error;
                }
                throw new Error('Không thể tạo hóa đơn.');
            }
        });
    }
    /**
     * Cập nhật một hóa đơn (chỉ các trường metadata và items).
     * Việc cập nhật paidAmount/status được xử lý khi tạo/sửa/xóa Payment.
     * @param id ID của Invoice
     * @param data Dữ liệu cập nhật (chỉ các trường cho phép và items)
     */
    update(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNaN(id)) {
                throw new Error('ID hóa đơn không hợp lệ');
            }
            if (data.status && !Object.values(client_1.InvoiceStatus).includes(data.status)) {
                throw new Error(`Trạng thái hóa đơn không hợp lệ: ${data.status}`);
            }
            try {
                const updatedInvoice = yield prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    const invoiceUpdateData = {
                        billingMonth: data.billingMonth,
                        billingYear: data.billingYear,
                        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
                        paymentDeadline: data.paymentDeadline ? new Date(data.paymentDeadline) : undefined,
                        notes: data.notes,
                        status: data.status,
                    };
                    if (data.items !== undefined) {
                        let newTotalAmount = new library_1.Decimal(0);
                        const newItemsData = [];
                        if (Array.isArray(data.items) && data.items.length > 0) {
                            for (const item of data.items) {
                                const itemAmount = new library_1.Decimal(item.amount);
                                if (itemAmount.isNaN() || itemAmount.isNegative()) {
                                    throw new Error(`Số tiền không hợp lệ cho mục: ${item.description}`);
                                }
                                if (!Object.values(client_1.PaymentType).includes(item.type)) {
                                    throw new Error(`Loại thanh toán không hợp lệ: ${item.type}`);
                                }
                                newTotalAmount = newTotalAmount.add(itemAmount);
                                newItemsData.push({
                                    type: item.type,
                                    description: item.description,
                                    amount: itemAmount
                                });
                            }
                        }
                        else if (Array.isArray(data.items) && data.items.length === 0) {
                            newTotalAmount = new library_1.Decimal(0);
                        }
                        invoiceUpdateData.totalAmount = newTotalAmount;
                        invoiceUpdateData.items = {
                            deleteMany: {},
                            createMany: newItemsData.length > 0 ? { data: newItemsData } : undefined
                        };
                        const currentInvoice = yield tx.invoice.findUnique({ where: { id }, select: { paidAmount: true } });
                        if (currentInvoice) {
                            const currentPaid = currentInvoice.paidAmount;
                            if (newTotalAmount.isZero()) {
                                invoiceUpdateData.status = currentPaid.isZero() ? client_1.InvoiceStatus.CANCELLED : client_1.InvoiceStatus.PAID;
                                invoiceUpdateData.paidAmount = new library_1.Decimal(0);
                            }
                            else if (currentPaid.greaterThanOrEqualTo(newTotalAmount)) {
                                invoiceUpdateData.status = client_1.InvoiceStatus.PAID;
                            }
                            else if (currentPaid.isPositive()) {
                                invoiceUpdateData.status = client_1.InvoiceStatus.PARTIALLY_PAID;
                            }
                            else {
                                invoiceUpdateData.status = client_1.InvoiceStatus.UNPAID;
                            }
                            if (data.status === undefined) {
                                invoiceUpdateData.status = invoiceUpdateData.status;
                            }
                            else {
                                invoiceUpdateData.status = data.status;
                            }
                        }
                    }
                    else if (data.status !== undefined) {
                        invoiceUpdateData.status = data.status;
                    }
                    const invoiceAfterUpdate = yield tx.invoice.update({
                        where: { id },
                        data: invoiceUpdateData,
                        include: {
                            studentProfile: { select: { id: true, fullName: true } },
                            room: { select: { id: true, number: true } },
                            items: true,
                            payments: true
                        }
                    });
                    return invoiceAfterUpdate;
                }));
                return updatedInvoice;
            }
            catch (error) {
                console.error(`[InvoiceService.update] Error updating invoice ${id}:`, error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    throw new Error(`Không tìm thấy hóa đơn với ID ${id}`);
                }
                else if (error instanceof Error && (error.message.includes('Số tiền không hợp lệ') || error.message.includes('Loại thanh toán không hợp lệ'))) {
                    throw error;
                }
                throw new Error(`Không thể cập nhật hóa đơn với ID ${id}.`);
            }
        });
    }
    /**
     * Xóa một hóa đơn và các mục liên quan.
     * @param id ID của Invoice cần xóa
     * @throws Error nếu không tìm thấy hoặc lỗi xóa
     */
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNaN(id)) {
                throw new Error('ID hóa đơn không hợp lệ');
            }
            try {
                yield prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    const invoiceExists = yield tx.invoice.findUnique({ where: { id } });
                    if (!invoiceExists) {
                        throw new Error(`Không tìm thấy hóa đơn với ID ${id}`);
                    }
                    yield tx.payment.deleteMany({ where: { invoiceId: id } });
                    yield tx.invoice.delete({ where: { id } });
                }));
            }
            catch (error) {
                console.error(`[InvoiceService.delete] Error deleting invoice ${id}:`, error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    throw new Error(`Không tìm thấy hóa đơn với ID ${id}`);
                }
                throw new Error(`Không thể xóa hóa đơn với ID ${id}.`);
            }
        });
    }
}
exports.InvoiceService = InvoiceService;
