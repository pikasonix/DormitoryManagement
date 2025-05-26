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
exports.deletePayment = exports.updatePayment = exports.createPayment = exports.getPaymentById = exports.getPayments = void 0;
const client_1 = require("@prisma/client"); // Import Prisma và Enums
const library_1 = require("@prisma/client/runtime/library"); // Import Decimal
// Lưu ý: Nên sử dụng instance PrismaClient singleton
const prisma = new client_1.PrismaClient();
// Lấy danh sách thanh toán (có thể lọc)
const getPayments = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try { // Lấy tất cả các tham số lọc từ query params
        const { id, studentId, studentProfileId, invoiceId, method, // Tham số từ frontend
        page, limit, transactionCode, buildingId } = req.query;
        // Lọc và phân trang
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const skip = (pageNum - 1) * limitNum;
        // Xây dựng mệnh đề lọc (where)
        const whereClause = {};
        // Lọc theo ID payment
        if (id) {
            whereClause.id = parseInt(id);
        }
        // Lọc theo sinh viên (mã sinh viên)
        if (studentId) {
            whereClause.studentProfile = {
                studentId: {
                    contains: studentId,
                    mode: 'insensitive'
                }
            };
        }
        // Lọc theo sinh viên (ID profile)
        if (studentProfileId) {
            whereClause.studentProfileId = parseInt(studentProfileId);
        }
        // Lọc theo hóa đơn
        if (invoiceId) {
            whereClause.invoiceId = parseInt(invoiceId);
        }
        // Lọc theo phương thức thanh toán
        if (method) {
            whereClause.paymentMethod = method; // Sử dụng giá trị chính xác từ frontend
        } // Lọc theo mã giao dịch (nếu có)
        if (transactionCode) {
            whereClause.transactionCode = {
                contains: transactionCode,
                mode: 'insensitive' // Tìm kiếm không phân biệt chữ hoa/thường
            };
        }
        // Lọc theo tòa nhà (building filter for STAFF users)
        if (buildingId) {
            console.log('=== BUILDING FILTER DEBUG ===');
            console.log('Building ID received:', buildingId);
            const buildingIdNum = parseInt(buildingId);
            console.log('Building ID parsed:', buildingIdNum);
            // For payments, we need to filter by studentProfile.room.buildingId
            // We need to handle existing studentProfile filters carefully
            if (whereClause.studentProfile) {
                // If there's already a studentProfile filter (e.g., from studentId search)
                console.log('Existing studentProfile filter found:', JSON.stringify(whereClause.studentProfile, null, 2));
                // We need to merge them using AND
                const existingStudentProfileFilter = whereClause.studentProfile;
                whereClause.studentProfile = {
                    AND: [
                        existingStudentProfileFilter,
                        {
                            room: {
                                buildingId: buildingIdNum
                            }
                        }
                    ]
                };
            }
            else {
                // If no existing studentProfile filter, just add the building filter
                console.log('No existing studentProfile filter, adding building filter only');
                whereClause.studentProfile = {
                    room: {
                        buildingId: buildingIdNum
                    }
                };
            }
            console.log('Final whereClause.studentProfile:', JSON.stringify(whereClause.studentProfile, null, 2));
            console.log('=== END BUILDING FILTER DEBUG ===');
        }
        // Đếm tổng số bản ghi phù hợp với điều kiện lọc
        const totalRecords = yield prisma.payment.count({
            where: whereClause
        });
        // Lấy danh sách thanh toán với phân trang và lọc
        const payments = yield prisma.payment.findMany({
            where: whereClause,
            skip,
            take: limitNum,
            include: {
                studentProfile: {
                    select: {
                        id: true,
                        fullName: true,
                        studentId: true,
                        room: { select: { id: true, number: true, building: { select: { id: true, name: true } } } }
                    }
                },
                invoice: {
                    select: {
                        id: true,
                        billingMonth: true,
                        billingYear: true,
                        totalAmount: true,
                        status: true
                    }
                }
            },
            orderBy: {
                paymentDate: 'desc'
            }
        });
        // Debug: Log the payments and their building info
        if (buildingId) {
            console.log('=== PAYMENT RESULTS DEBUG ===');
            console.log(`Total payments found: ${payments.length}`);
            payments.forEach((payment, index) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                console.log(`Payment ${index + 1}:`, {
                    id: payment.id,
                    studentId: (_a = payment.studentProfile) === null || _a === void 0 ? void 0 : _a.studentId,
                    roomNumber: (_c = (_b = payment.studentProfile) === null || _b === void 0 ? void 0 : _b.room) === null || _c === void 0 ? void 0 : _c.number,
                    buildingId: (_f = (_e = (_d = payment.studentProfile) === null || _d === void 0 ? void 0 : _d.room) === null || _e === void 0 ? void 0 : _e.building) === null || _f === void 0 ? void 0 : _f.id,
                    buildingName: (_j = (_h = (_g = payment.studentProfile) === null || _g === void 0 ? void 0 : _g.room) === null || _h === void 0 ? void 0 : _h.building) === null || _j === void 0 ? void 0 : _j.name
                });
            });
            console.log('=== END PAYMENT RESULTS DEBUG ===');
        }
        res.status(200).json({
            status: 'success',
            results: payments.length,
            total: totalRecords,
            meta: {
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(totalRecords / limitNum),
                total: totalRecords
            },
            payments: payments
        });
    }
    catch (error) {
        console.error('Lỗi khi lấy danh sách thanh toán:', error);
        next(error);
    }
});
exports.getPayments = getPayments;
// Lấy thông tin chi tiết một thanh toán
const getPaymentById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            // Sử dụng return để đảm bảo không chạy code phía dưới
            return next(new Error('ID thanh toán không hợp lệ')); // Dịch và dùng next
        }
        const payment = yield prisma.payment.findUnique({
            where: { id },
            include: {
                studentProfile: {
                    select: { id: true, fullName: true, studentId: true, room: { select: { number: true } } }
                },
                invoice: {
                    include: {
                        items: true
                    }
                }
            }
        });
        if (!payment) {
            return next(new Error(`Không tìm thấy thanh toán với ID ${id}`)); // Dịch và dùng next
        }
        res.status(200).json({
            status: 'success',
            data: payment
        });
    }
    catch (error) {
        console.error('Lỗi khi lấy chi tiết thanh toán:', error);
        next(error); // Chuyển lỗi
    }
});
exports.getPaymentById = getPaymentById;
// Tạo thanh toán mới (Quan trọng: Cần Transaction)
const createPayment = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Các trường cần thiết từ body theo schema mới
        const { studentProfileId, invoiceId, amount, paymentMethod, transactionCode, notes } = req.body;
        // --- Validation cơ bản ---
        if (!studentProfileId || !invoiceId || amount === undefined || amount === null) {
            return next(new Error('Thiếu thông tin bắt buộc: studentProfileId, invoiceId, amount')); // Dịch và dùng next
        }
        const numericAmount = new library_1.Decimal(amount);
        if (numericAmount.isNaN() || numericAmount.isNegative()) {
            return next(new Error('Số tiền (amount) không hợp lệ'));
        }
        const profileId = parseInt(studentProfileId);
        const invId = parseInt(invoiceId);
        if (isNaN(profileId) || isNaN(invId)) {
            return next(new Error('StudentProfileId hoặc InvoiceId không hợp lệ'));
        }
        // --- Kết thúc Validation ---
        // *** SỬ DỤNG TRANSACTION ***
        const newPayment = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // 1. Lấy thông tin hóa đơn cần cập nhật
            const invoice = yield tx.invoice.findUnique({
                where: { id: invId }
            });
            if (!invoice) {
                // Throw lỗi để rollback transaction
                throw new Error(`Không tìm thấy hóa đơn với ID ${invId}`);
            }
            // Kiểm tra xem sinh viên thanh toán có khớp với hóa đơn không (nếu là hóa đơn cá nhân)
            if (invoice.studentProfileId && invoice.studentProfileId !== profileId) {
                throw new Error(`Hóa đơn ${invId} không thuộc về sinh viên ${profileId}`);
            }
            // 2. Tạo bản ghi thanh toán mới
            const createdPayment = yield tx.payment.create({
                data: {
                    studentProfileId: profileId,
                    invoiceId: invId,
                    amount: numericAmount, // Sử dụng Decimal
                    paymentMethod: paymentMethod || null, // Cho phép null
                    transactionCode: transactionCode || null, // Cho phép null
                    notes: notes || null, // Cho phép null
                    paymentDate: new Date() // Ngày thanh toán là hiện tại
                },
                include: {
                    studentProfile: { select: { id: true, fullName: true } },
                    invoice: { select: { id: true, totalAmount: true } }
                }
            });
            // 3. Cập nhật hóa đơn
            const currentPaidAmount = invoice.paidAmount;
            const newPaidAmount = currentPaidAmount.add(numericAmount); // Cộng dồn số tiền đã trả
            let newStatus = invoice.status; // Mặc định giữ nguyên status
            // Xác định trạng thái mới của hóa đơn
            if (newPaidAmount.greaterThanOrEqualTo(invoice.totalAmount)) {
                newStatus = client_1.InvoiceStatus.PAID; // Đã trả đủ
            }
            else if (newPaidAmount.isPositive()) {
                newStatus = client_1.InvoiceStatus.PARTIALLY_PAID; // Trả một phần
            }
            else {
                // Trường hợp này ít xảy ra khi tạo mới, nhưng để logic đầy đủ
                newStatus = client_1.InvoiceStatus.UNPAID;
            }
            // Cập nhật paidAmount và status cho hóa đơn
            yield tx.invoice.update({
                where: { id: invId },
                data: {
                    paidAmount: newPaidAmount,
                    status: newStatus
                }
            });
            // Transaction thành công, trả về thanh toán đã tạo
            return createdPayment;
        }));
        // *** KẾT THÚC TRANSACTION ***
        res.status(201).json({
            status: 'success',
            data: newPayment
        });
    }
    catch (error) {
        console.error('Lỗi khi tạo thanh toán:', error);
        // Trả về lỗi cụ thể hơn nếu là lỗi trong transaction
        if (error.message.includes('Không tìm thấy hóa đơn') || error.message.includes('Hóa đơn không thuộc về sinh viên')) {
            next(new Error(error.message)); // Hoặc AppError(..., 400/404)
        }
        else {
            next(error); // Chuyển lỗi chung
        }
    }
});
exports.createPayment = createPayment;
// Cập nhật thanh toán (Quan trọng: Cần Transaction)
const updatePayment = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return next(new Error('ID thanh toán không hợp lệ'));
        }
        // Chỉ cho phép cập nhật amount, paymentMethod, transactionCode, notes
        const { amount, paymentMethod, transactionCode, notes } = req.body;
        // --- Validation ---
        let numericAmount = undefined;
        if (amount !== undefined && amount !== null) {
            numericAmount = new library_1.Decimal(amount);
            if (numericAmount.isNaN() || numericAmount.isNegative()) {
                return next(new Error('Số tiền (amount) không hợp lệ'));
            }
        }
        else {
            // Không cho phép cập nhật thành null/undefined nếu amount được gửi lên
            // Nếu không gửi amount thì không cập nhật
        }
        // --- Kết thúc Validation ---
        // *** SỬ DỤNG TRANSACTION ***
        const updatedPayment = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // 1. Lấy thông tin thanh toán hiện tại và hóa đơn liên quan
            const currentPayment = yield tx.payment.findUnique({
                where: { id },
                include: {
                    invoice: true // Cần thông tin hóa đơn để cập nhật
                }
            });
            if (!currentPayment || !currentPayment.invoice) {
                throw new Error(`Không tìm thấy thanh toán với ID ${id} hoặc hóa đơn liên quan`);
            }
            const invoice = currentPayment.invoice;
            let amountDifference = new library_1.Decimal(0); // Khởi tạo chênh lệch số tiền
            // Tạo data để update payment
            const paymentUpdateData = {
                paymentMethod: paymentMethod !== undefined ? paymentMethod : undefined, // Chỉ update nếu được cung cấp
                transactionCode: transactionCode !== undefined ? transactionCode : undefined,
                notes: notes !== undefined ? notes : undefined,
            };
            // Chỉ cập nhật amount và tính difference nếu amount mới được cung cấp và khác amount cũ
            if (numericAmount !== undefined && !numericAmount.equals(currentPayment.amount)) {
                amountDifference = numericAmount.sub(currentPayment.amount); // Tính chênh lệch
                paymentUpdateData.amount = numericAmount; // Cập nhật amount trong payment
            }
            // 2. Cập nhật bản ghi Payment
            const paymentAfterUpdate = yield tx.payment.update({
                where: { id },
                data: paymentUpdateData,
                include: {
                    studentProfile: { select: { id: true, fullName: true } },
                    invoice: { select: { id: true, totalAmount: true, status: true } }
                }
            });
            // 3. Nếu số tiền thay đổi -> Cập nhật hóa đơn
            if (!amountDifference.isZero()) {
                const currentPaidAmount = invoice.paidAmount;
                const newPaidAmount = currentPaidAmount.add(amountDifference); // Cộng/trừ chênh lệch
                let newStatus = invoice.status;
                if (newPaidAmount.greaterThanOrEqualTo(invoice.totalAmount)) {
                    newStatus = client_1.InvoiceStatus.PAID;
                }
                else if (newPaidAmount.isPositive()) {
                    newStatus = client_1.InvoiceStatus.PARTIALLY_PAID;
                }
                else {
                    newStatus = client_1.InvoiceStatus.UNPAID; // Có thể về lại UNPAID nếu trừ tiền
                }
                yield tx.invoice.update({
                    where: { id: invoice.id },
                    data: {
                        paidAmount: newPaidAmount,
                        status: newStatus
                    }
                });
            }
            // Transaction thành công
            return paymentAfterUpdate;
        }));
        // *** KẾT THÚC TRANSACTION ***
        res.status(200).json({
            status: 'success',
            data: updatedPayment
        });
    }
    catch (error) {
        console.error('Lỗi khi cập nhật thanh toán:', error);
        if (error.message.includes('Không tìm thấy thanh toán')) {
            next(new Error(error.message)); // Hoặc AppError(..., 404)
        }
        else {
            next(error); // Chuyển lỗi chung
        }
    }
});
exports.updatePayment = updatePayment;
// Xóa thanh toán (Quan trọng: Cần Transaction)
const deletePayment = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return next(new Error('ID thanh toán không hợp lệ'));
        }
        // *** SỬ DỤNG TRANSACTION ***
        yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // 1. Lấy thông tin thanh toán và hóa đơn liên quan
            const paymentToDelete = yield tx.payment.findUnique({
                where: { id },
                include: { invoice: true }
            });
            if (!paymentToDelete || !paymentToDelete.invoice) {
                throw new Error(`Không tìm thấy thanh toán với ID ${id} hoặc hóa đơn liên quan`);
            }
            const invoice = paymentToDelete.invoice;
            const amountToDelete = paymentToDelete.amount;
            // 2. Cập nhật hóa đơn: Trừ số tiền đã xóa khỏi paidAmount
            const currentPaidAmount = invoice.paidAmount;
            const newPaidAmount = currentPaidAmount.sub(amountToDelete); // Trừ đi số tiền của payment bị xóa
            let newStatus = invoice.status;
            if (newPaidAmount.greaterThanOrEqualTo(invoice.totalAmount)) {
                // Ít xảy ra khi xóa, nhưng để logic đầy đủ
                newStatus = client_1.InvoiceStatus.PAID;
            }
            else if (newPaidAmount.isPositive()) {
                newStatus = client_1.InvoiceStatus.PARTIALLY_PAID;
            }
            else {
                newStatus = client_1.InvoiceStatus.UNPAID; // Có thể về lại UNPAID
            }
            yield tx.invoice.update({
                where: { id: invoice.id },
                data: {
                    paidAmount: newPaidAmount,
                    status: newStatus
                }
            });
            // 3. Xóa bản ghi Payment
            yield tx.payment.delete({
                where: { id }
            });
            // Transaction thành công, không cần trả về gì cụ thể từ transaction
        }));
        // *** KẾT THÚC TRANSACTION ***
        res.status(200).json({
            status: 'success',
            message: 'Thanh toán đã được xóa thành công',
            data: null
        });
    }
    catch (error) {
        console.error('Lỗi khi xóa thanh toán:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            next(new Error(`Không tìm thấy thanh toán với ID ${req.params.id}`)); // Hoặc AppError(..., 404)
        }
        else if (error.message.includes('Không tìm thấy thanh toán')) {
            next(new Error(error.message)); // Hoặc AppError(..., 404)
        }
        else {
            next(error); // Chuyển lỗi chung
        }
    }
});
exports.deletePayment = deletePayment;
