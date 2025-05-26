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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const enums_1 = require("../vnpay/enums");
const utils_1 = require("../vnpay/utils");
const vnpay_1 = require("../vnpay/vnpay");
const library_1 = require("@prisma/client/runtime/library");
const constants_1 = require("../vnpay/constants");
const prisma_1 = __importDefault(require("../lib/prisma"));
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
const vnpay = new vnpay_1.VNPay({
    tmnCode: (_a = process.env.VNPAY_TMN_CODE) !== null && _a !== void 0 ? _a : 'ZAVGV1VT',
    secureSecret: (_b = process.env.VNPAY_SECURE_SECRET) !== null && _b !== void 0 ? _b : 'OR92SDL9CRPL5TOXFICMKRVASZ4FXJ4M',
    vnpayHost: 'https://sandbox.vnpayment.vn',
    testMode: true,
    hashAlgorithm: enums_1.HashAlgorithm.SHA512,
    enableLog: true,
    loggerFn: utils_1.ignoreLogger,
    endpoints: {
        paymentEndpoint: 'paymentv2/vpcpay.html',
        queryDrRefundEndpoint: 'merchant_webapi/api/transaction',
        getBankListEndpoint: 'qrpayauth/api/merchant/get_bank_list',
    },
});
// Tạo payment url
router.post('/payment-url', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { invoice_id } = req.body;
        // Kiểm tra invoice_id có tồn tại
        if (!invoice_id) {
            return res.status(400).json({
                success: false,
                message: 'Invoice ID is required'
            });
        }
        // Lấy thông tin hóa đơn từ database
        const invoice = yield prisma_1.default.invoice.findUnique({
            where: { id: Number(invoice_id) }
        });
        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }
        if (invoice.status === client_1.InvoiceStatus.PAID) {
            return res.status(400).json({
                success: false,
                message: 'Invoice already paid'
            });
        } // Determine studentProfileId: from invoice or from authenticated user
        let studentId = invoice.studentProfileId;
        // Fallback 1: if invoice has no studentId, try get from req.user.profileId
        if (!studentId && 'user' in req && req.user && typeof req.user === 'object') {
            // Existing profileId field from frontend
            if ('profileId' in req.user) {
                console.log('Found profileId in req.user:', req.user.profileId);
                studentId = Number(req.user.profileId);
            }
        }
        // Fallback 2: fetch studentProfile by userId in JWT token
        if (!studentId && 'user' in req && req.user && typeof req.user === 'object') {
            const userId = req.user.id;
            if (userId) {
                const profile = yield prisma_1.default.studentProfile.findUnique({ where: { userId } });
                if (profile) {
                    console.log('Found studentProfile by userId:', profile.id);
                    studentId = profile.id;
                }
            }
        }
        // Fallback 3: if this is a room invoice, find a student in the room to be the payer
        if (!studentId && invoice.roomId) {
            const roomStudents = yield prisma_1.default.studentProfile.findMany({
                where: { roomId: invoice.roomId },
                take: 1
            });
            if (roomStudents.length > 0) {
                console.log('Found student in room to be payer:', roomStudents[0].id);
                studentId = roomStudents[0].id;
            }
        }
        // Fallback 4: Look for direct association from Invoice to Room to Student
        if (!studentId && invoice.roomId) {
            console.log('Attempting to find room and associated students');
            const room = yield prisma_1.default.room.findUnique({
                where: { id: invoice.roomId },
                include: {
                    residents: {
                        select: { id: true },
                        take: 1
                    }
                }
            });
            if (room && room.residents && room.residents.length > 0) {
                console.log('Found student through room association:', room.residents[0].id);
                studentId = room.residents[0].id;
            }
        }
        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xác định sinh viên cho hóa đơn này. Vui lòng liên hệ quản trị viên.'
            });
        } // Tạo một bản ghi payment với status = 'pending'
        const payment = yield prisma_1.default.payment.create({
            data: {
                invoiceId: invoice.id,
                studentProfileId: studentId,
                amount: invoice.totalAmount,
                paymentMethod: 'vnpay',
                transactionCode: '',
                paymentDate: new Date()
            }
        });
        // Sử dụng invoice ID làm mã đơn hàng (txnRef) gửi cho VNPay
        const txnRef = invoice.id.toString();
        // Cập nhật transaction_id trong payment
        yield prisma_1.default.payment.update({
            where: { id: payment.id },
            data: { transactionCode: txnRef }
        }); // Debug số tiền
        console.log('Invoice amount before conversion:', invoice.totalAmount);
        // Chuyển đổi số tiền và kiểm tra tính hợp lệ
        // Convert totalAmount (Decimal) to number
        let amountValue;
        if (invoice.totalAmount instanceof library_1.Decimal) {
            amountValue = invoice.totalAmount.toNumber();
        }
        else {
            // Fallback parse string/number
            const amountStr = String(invoice.totalAmount);
            amountValue = parseFloat(amountStr.replace(/,/g, ''));
        }
        console.log('Amount after parsing:', amountValue);
        // Đảm bảo số tiền là số nguyên - VNPay quy định
        // Xử lý đặc biệt để loại bỏ phần thập phân và đảm bảo không có vấn đề với VNPay
        const integerAmount = Math.floor(amountValue); // Lấy phần nguyên
        // VNPay library multiplies amount by 100 internally, so supply raw VND integer
        const vnpAmount = integerAmount;
        // Kiểm tra tính hợp lệ của số tiền
        if (isNaN(vnpAmount) || vnpAmount <= 0) {
            console.error('Invalid VNPay amount after conversion:', vnpAmount);
            return res.status(400).json({
                success: false,
                message: 'Số tiền không hợp lệ cho thanh toán VNPay'
            });
        }
        console.log('Amount being sent to VNPay:', vnpAmount);
        // Tạo URL thanh toán
        const urlString = vnpay.buildPaymentUrl({
            vnp_Amount: vnpAmount, // VNPay yêu cầu số nguyên đơn vị đồng
            vnp_IpAddr: req.ip || '127.0.0.1',
            vnp_TxnRef: txnRef,
            vnp_OrderInfo: `Thanh toan hoa don #${invoice.id}`,
            vnp_OrderType: enums_1.ProductCode.Other,
            vnp_ReturnUrl: `${(_a = process.env.VNPAY_RETURN_URL) !== null && _a !== void 0 ? _a : 'http://localhost:8000/api/vnpay/return'}`,
        }, {
            logger: {
                type: 'all', // Thay đổi từ 'pick' sang 'all' để log nhiều thông tin hơn
                loggerFn: (data) => {
                    console.log('VNPay payload:', data);
                    return (0, utils_1.consoleLogger)(data);
                },
            },
        });
        return res.json({
            success: true,
            paymentUrl: urlString,
            payment_id: payment.id,
            transaction_id: txnRef
        });
    }
    catch (error) {
        console.error('Error creating payment URL:', error);
        // Cung cấp thông tin lỗi chi tiết hơn để debug
        let errorMessage = 'Không thể tạo URL thanh toán';
        if (error instanceof Error) {
            errorMessage = error.message;
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
        }
        return res.status(500).json({
            success: false,
            message: errorMessage,
            errorDetail: process.env.NODE_ENV === 'production' ? undefined : String(error)
        });
    }
}));
// Xử lý IPN từ VNPay
router.get('/ipn', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    console.log('=== IPN Request Received ===');
    console.log('Query params:', req.query);
    console.log('Headers:', req.headers);
    try {
        const verify = vnpay.verifyIpnCall(Object.assign({}, req.query), {
            logger: {
                type: 'all',
                loggerFn: utils_1.consoleLogger,
            },
        });
        console.log('IPN Verification result:', {
            isVerified: verify.isVerified,
            isSuccess: verify.isSuccess,
            responseCode: verify.vnp_ResponseCode,
            message: verify.message
        });
        if (!verify.isVerified) {
            console.error('IPN verification failed:', verify.message);
            return res.json(constants_1.IpnFailChecksum);
        } // Phân tích mã giao dịch để lấy invoice_id
        const txnRef = verify.vnp_TxnRef;
        console.log('Processing transaction reference:', txnRef);
        // Txnref giờ chỉ là invoice ID
        const invoiceId = parseInt(txnRef);
        if (isNaN(invoiceId)) {
            console.error('Invalid transaction reference format:', txnRef);
            return res.json(constants_1.IpnOrderNotFound);
        }
        console.log('Extracted invoice ID:', invoiceId);
        // Tìm payment trong database theo invoice ID
        const payment = yield prisma_1.default.payment.findFirst({
            where: {
                invoiceId: invoiceId,
                paymentMethod: 'vnpay'
            },
            include: { invoice: true },
            orderBy: { id: 'desc' } // Lấy payment mới nhất nếu có nhiều
        });
        if (!payment) {
            console.error('Payment not found for invoice:', invoiceId);
            return res.json(constants_1.IpnOrderNotFound);
        }
        console.log('Found payment:', {
            id: payment.id,
            amount: payment.amount,
            invoiceId: payment.invoiceId,
            currentInvoiceStatus: payment.invoice.status
        });
        // Xử lý số tiền đúng cách cho việc kiểm tra
        // Convert payment.amount (Decimal) to number
        let paymentAmountNumber;
        if (payment.amount instanceof library_1.Decimal) {
            paymentAmountNumber = payment.amount.toNumber();
        }
        else {
            // Fallback parse string/number
            const amountStr = String(payment.amount);
            paymentAmountNumber = parseFloat(amountStr.replace(/,/g, ''));
        }
        const integerAmount = Math.floor(paymentAmountNumber);
        // VNPay trả về số tiền đã nhân 100, nên ta cần nhân payment amount với 100 để so sánh
        const expectedAmount = integerAmount * 100;
        // Convert received amount from VNPay to number
        const receivedAmount = typeof verify.vnp_Amount === 'string'
            ? parseInt(verify.vnp_Amount.replace(/,/g, ''), 10)
            : verify.vnp_Amount;
        console.log('IPN Amount check:', {
            paymentAmount: payment.amount,
            paymentAmountNumber,
            integerAmount,
            expectedAmount,
            receivedAmount,
            isMatch: receivedAmount === expectedAmount
        });
        // So sánh chính xác số tiền
        if (receivedAmount !== expectedAmount) {
            console.error(`Amount mismatch: expected ${expectedAmount}, got ${receivedAmount}`);
            return res.json(constants_1.IpnInvalidAmount);
        }
        // Kiểm tra nếu payment đã được xử lý
        if (payment.invoice.status === client_1.InvoiceStatus.PAID) {
            console.log('Payment already confirmed for:', payment.id);
            return res.json(constants_1.InpOrderAlreadyConfirmed);
        }
        // Cập nhật trạng thái payment và invoice
        if (verify.vnp_ResponseCode === '00') {
            // Thanh toán thành công
            console.log('Payment successful, updating invoice status for payment:', payment.id);
            // Cập nhật payment với transaction number từ VNPay
            yield prisma_1.default.payment.update({
                where: { id: payment.id },
                data: {
                    transactionCode: ((_a = verify.vnp_TransactionNo) === null || _a === void 0 ? void 0 : _a.toString()) || txnRef
                }
            });
            // Cập nhật trạng thái invoice
            yield prisma_1.default.invoice.update({
                where: { id: payment.invoiceId },
                data: {
                    status: client_1.InvoiceStatus.PAID,
                    paidAmount: {
                        increment: payment.amount
                    }
                }
            });
            console.log('Invoice status updated to PAID for invoice:', payment.invoiceId);
        }
        else {
            console.log('Payment failed with response code:', verify.vnp_ResponseCode);
            // Cập nhật payment với thông tin lỗi
            yield prisma_1.default.payment.update({
                where: { id: payment.id },
                data: {
                    transactionCode: ((_b = verify.vnp_TransactionNo) === null || _b === void 0 ? void 0 : _b.toString()) || txnRef
                }
            });
        }
        console.log('Payment processed successfully:', payment.id);
        return res.json(constants_1.IpnSuccess);
    }
    catch (error) {
        console.error(`IPN error: ${error}`);
        return res.json(constants_1.IpnUnknownError);
    }
}));
// Xử lý return url (redirect sau thanh toán)
router.get('/return', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    let verify;
    try {
        verify = vnpay.verifyReturnUrl(Object.assign({}, req.query), {
            logger: {
                type: 'pick',
                fields: ['createdAt', 'method', 'isVerified', 'message'],
                loggerFn: (data) => console.log(data),
            },
        });
        console.log('Return URL verify result:', {
            isVerified: verify.isVerified,
            isSuccess: verify.isSuccess,
            responseCode: verify.vnp_ResponseCode,
            txnRef: verify.vnp_TxnRef
        }); // Lấy invoice_id từ txnRef
        const txnRef = req.query.vnp_TxnRef || '';
        const invoiceId = parseInt(txnRef.toString());
        // Nếu thanh toán thành công và được verify, hãy cập nhật trạng thái
        if (verify.isVerified && verify.isSuccess && !isNaN(invoiceId)) {
            console.log('Return URL: Payment successful, updating status...');
            try {
                const payment = yield prisma_1.default.payment.findFirst({
                    where: {
                        invoiceId: invoiceId,
                        paymentMethod: 'vnpay'
                    },
                    include: { invoice: true },
                    orderBy: { id: 'desc' }
                });
                if (payment && payment.invoice.status !== client_1.InvoiceStatus.PAID) {
                    // Cập nhật payment
                    yield prisma_1.default.payment.update({
                        where: { id: payment.id },
                        data: {
                            transactionCode: ((_a = verify.vnp_TransactionNo) === null || _a === void 0 ? void 0 : _a.toString()) || txnRef.toString()
                        }
                    });
                    // Cập nhật invoice
                    yield prisma_1.default.invoice.update({
                        where: { id: payment.invoiceId },
                        data: {
                            status: client_1.InvoiceStatus.PAID,
                            paidAmount: {
                                increment: payment.amount
                            }
                        }
                    });
                    console.log('Return URL: Invoice status updated to PAID for invoice:', payment.invoiceId);
                }
            }
            catch (updateError) {
                console.error('Error updating payment status in return URL:', updateError);
            }
        }
        // Redirect to our frontend PaymentResult page
        let redirectUrl = process.env.FRONTEND_PAYMENT_RESULT_URL || '/payments/result'; // Thêm query params vào URL redirect
        redirectUrl += `?status=${verify.isSuccess ? 'success' : 'failed'}`;
        if (!isNaN(invoiceId)) {
            redirectUrl += `&invoiceId=${invoiceId}`;
        }
        if (verify.vnp_ResponseCode) {
            redirectUrl += `&responseCode=${verify.vnp_ResponseCode}`;
            // Thêm mã lỗi rõ ràng hơn nếu có lỗi
            if (verify.vnp_ResponseCode !== '00') {
                console.log(`VNPay Error: Response code ${verify.vnp_ResponseCode}`);
                // Xử lý các mã lỗi phổ biến
                if (verify.vnp_ResponseCode === '72') {
                    redirectUrl += '&errorMessage=So_tien_khong_hop_le';
                }
                else if (verify.vnp_ResponseCode === '07') {
                    redirectUrl += '&errorMessage=Giao_dich_bi_nghi_ngo_gian_lan';
                }
                else if (verify.vnp_ResponseCode === '09') {
                    redirectUrl += '&errorMessage=The_hoac_TK_bi_khoa';
                }
                else if (verify.vnp_ResponseCode === '11') {
                    redirectUrl += '&errorMessage=Giao_dich_da_het_han';
                }
                else if (verify.vnp_ResponseCode === '12') {
                    redirectUrl += '&errorMessage=Giao_dich_bi_huy';
                }
                else if (verify.vnp_ResponseCode === '24') {
                    redirectUrl += '&errorMessage=Khach_hang_huy_giao_dich';
                }
                else {
                    redirectUrl += '&errorMessage=Loi_thanh_toan';
                }
            }
        }
        // Chuyển hướng người dùng về frontend với kết quả thanh toán
        return res.redirect(redirectUrl);
    }
    catch (error) {
        console.error(`Return URL error: ${error}`);
        const redirectUrl = `${process.env.FRONTEND_PAYMENT_RESULT_URL || '/payments/result'}?status=error`;
        return res.redirect(redirectUrl);
    }
}));
// API lấy thông tin thanh toán
router.get('/payment/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const paymentId = parseInt(req.params.id);
        if (isNaN(paymentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment ID'
            });
        }
        const payment = yield prisma_1.default.payment.findUnique({
            where: { id: paymentId },
            include: {
                invoice: true,
                studentProfile: {
                    select: {
                        fullName: true,
                        studentId: true
                    }
                }
            }
        });
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }
        // Lấy chi tiết invoice
        const invoice = yield prisma_1.default.invoice.findUnique({
            where: { id: payment.invoiceId }
        });
        return res.json({
            success: true,
            payment: {
                id: payment.id,
                invoiceId: payment.invoiceId,
                amount: payment.amount,
                paymentMethod: payment.paymentMethod,
                transactionCode: payment.transactionCode,
                paymentDate: payment.paymentDate,
                studentProfile: payment.studentProfile,
                invoice: invoice ? {
                    id: invoice.id,
                    totalAmount: invoice.totalAmount,
                    status: invoice.status
                } : null
            }
        });
    }
    catch (error) {
        console.error('Error fetching payment:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch payment details'
        });
    }
}));
// API lấy danh sách thanh toán theo sinh viên
router.get('/payments/student/:studentId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const studentProfileId = parseInt(req.params.studentId);
        if (isNaN(studentProfileId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid student ID'
            });
        }
        const invoices = yield prisma_1.default.invoice.findMany({
            where: {
                studentProfileId: studentProfileId
            },
            include: {
                payments: true
            }
        });
        return res.json({
            success: true,
            invoices: invoices.map(invoice => ({
                id: invoice.id,
                totalAmount: invoice.totalAmount,
                paidAmount: invoice.paidAmount,
                status: invoice.status,
                dueDate: invoice.dueDate,
                billingMonth: invoice.billingMonth,
                billingYear: invoice.billingYear,
                payments: invoice.payments.map(payment => ({
                    id: payment.id,
                    amount: payment.amount,
                    paymentMethod: payment.paymentMethod,
                    transactionCode: payment.transactionCode,
                    paymentDate: payment.paymentDate
                }))
            }))
        });
    }
    catch (error) {
        console.error('Error fetching student payments:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch student payments'
        });
    }
}));
// API lấy thông tin thanh toán theo invoice ID
router.get('/payments/invoice/:invoiceId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const invoiceId = parseInt(req.params.invoiceId);
        if (isNaN(invoiceId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid invoice ID'
            });
        }
        // Tìm payment mới nhất theo invoice ID
        const payment = yield prisma_1.default.payment.findFirst({
            where: {
                invoiceId: invoiceId,
                paymentMethod: 'vnpay'
            },
            include: {
                invoice: true,
                studentProfile: {
                    select: {
                        fullName: true,
                        studentId: true
                    }
                }
            },
            orderBy: { id: 'desc' } // Lấy payment mới nhất
        });
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found for this invoice'
            });
        }
        return res.json({
            success: true,
            payment: {
                id: payment.id,
                invoiceId: payment.invoiceId,
                amount: payment.amount,
                paymentMethod: payment.paymentMethod,
                transactionCode: payment.transactionCode,
                paymentDate: payment.paymentDate,
                studentProfile: payment.studentProfile, invoice: payment.invoice ? {
                    id: payment.invoice.id,
                    totalAmount: payment.invoice.totalAmount,
                    paidAmount: payment.invoice.paidAmount,
                    status: payment.invoice.status,
                    dueDate: payment.invoice.dueDate,
                    billingMonth: payment.invoice.billingMonth,
                    billingYear: payment.invoice.billingYear
                } : null
            }
        });
    }
    catch (error) {
        console.error('Error fetching payment by invoice ID:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch payment details'
        });
    }
}));
// Debug endpoint - kiểm tra trạng thái giao dịch
router.get('/debug/payment/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const paymentId = parseInt(req.params.id);
        if (isNaN(paymentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment ID'
            });
        }
        const payment = yield prisma_1.default.payment.findUnique({
            where: { id: paymentId },
            include: {
                invoice: true,
                studentProfile: {
                    select: {
                        fullName: true,
                        studentId: true
                    }
                }
            }
        });
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }
        return res.json({
            success: true,
            debug: {
                payment: {
                    id: payment.id,
                    invoiceId: payment.invoiceId,
                    amount: payment.amount,
                    paymentMethod: payment.paymentMethod,
                    transactionCode: payment.transactionCode,
                    paymentDate: payment.paymentDate
                },
                invoice: {
                    id: payment.invoice.id,
                    totalAmount: payment.invoice.totalAmount,
                    paidAmount: payment.invoice.paidAmount,
                    status: payment.invoice.status,
                    roomId: payment.invoice.roomId,
                    studentProfileId: payment.invoice.studentProfileId
                },
                student: payment.studentProfile
            }
        });
    }
    catch (error) {
        console.error('Error in debug endpoint:', error);
        return res.status(500).json({
            success: false,
            message: 'Debug endpoint error',
            error: String(error)
        });
    }
}));
// Endpoint để test IPN manually (chỉ dùng cho development)
router.post('/debug/test-ipn', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
            success: false,
            message: 'This endpoint is only available in development'
        });
    }
    try {
        const { paymentId, responseCode = '00' } = req.body;
        const payment = yield prisma_1.default.payment.findUnique({
            where: { id: paymentId },
            include: { invoice: true }
        });
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }
        // Simulate successful payment
        if (responseCode === '00') {
            yield prisma_1.default.payment.update({
                where: { id: payment.id },
                data: {
                    transactionCode: `TEST_${Date.now()}`
                }
            });
            yield prisma_1.default.invoice.update({
                where: { id: payment.invoiceId },
                data: {
                    status: client_1.InvoiceStatus.PAID,
                    paidAmount: {
                        increment: payment.amount
                    }
                }
            });
            return res.json({
                success: true,
                message: 'Payment marked as successful',
                paymentId,
                invoiceId: payment.invoiceId
            });
        }
        return res.json({
            success: true,
            message: 'Payment test completed',
            responseCode
        });
    }
    catch (error) {
        console.error('Error in test IPN:', error);
        return res.status(500).json({
            success: false,
            message: 'Test IPN error',
            error: String(error)
        });
    }
}));
// Endpoint kiểm tra cấu hình VNPay
router.get('/config', (req, res) => {
    return res.json({
        success: true,
        config: {
            tmnCode: process.env.VNPAY_TMN_CODE,
            returnUrl: process.env.VNPAY_RETURN_URL,
            frontendResultUrl: process.env.FRONTEND_PAYMENT_RESULT_URL,
            ipnUrl: `${req.protocol}://${req.get('host')}/api/vnpay/ipn`,
            vnpayHost: 'https://sandbox.vnpayment.vn',
            testMode: true
        }
    });
});
exports.default = router;
