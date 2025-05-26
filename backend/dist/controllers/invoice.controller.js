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
                const { studentProfileId, roomId, status, month, year, page, limit, invoiceNumber, identifier, invoiceType, buildingId // Thêm tham số tìm kiếm mới: loại hóa đơn và building
                 } = req.query;
                const options = { where: {} }; // Nếu người dùng là STUDENT, chỉ cho phép xem hóa đơn của bản thân hoặc phòng của họ
                if (req.user && typeof req.user === 'object' && 'role' in req.user && req.user.role === 'STUDENT') {
                    console.log('User object:', req.user); // Debug
                    const studentProfileId = 'profileId' in req.user ? Number(req.user.profileId) : undefined;
                    if (studentProfileId) {
                        // Lấy thông tin phòng của sinh viên
                        const student = yield prisma.studentProfile.findUnique({
                            where: { id: studentProfileId },
                            select: { roomId: true }
                        });
                        // Chỉ cho phép xem hóa đơn của bản thân hoặc phòng của họ
                        options.where.OR = [
                            { studentProfileId: studentProfileId },
                            { roomId: (student === null || student === void 0 ? void 0 : student.roomId) || -1 } // Nếu không có phòng thì dùng -1 (không tồn tại)
                        ];
                    }
                    else {
                        // Nếu không có profileId, không cho phép xem hóa đơn nào
                        options.where.id = -1;
                    }
                }
                else {
                    // Đối với ADMIN/STAFF, xây dựng bộ lọc bình thường
                    if (studentProfileId)
                        options.where.studentProfileId = parseInt(studentProfileId);
                    if (roomId)
                        options.where.roomId = parseInt(roomId);
                }
                // Lọc theo buildingId cho STAFF (tương tự như maintenance)
                if (buildingId) {
                    console.log(`[API] Filtering invoices by buildingId: ${buildingId}`);
                    const buildingIdNum = parseInt(buildingId);
                    if (!isNaN(buildingIdNum)) {
                        // Đảm bảo options.where tồn tại
                        options.where = options.where || {};
                        // Lọc invoices có liên quan đến tòa nhà thông qua room
                        // Bao gồm cả invoice cá nhân (qua studentProfile.room) và invoice phòng (qua room trực tiếp)
                        const existingWhere = options.where;
                        options.where = Object.assign(Object.assign({}, existingWhere), { OR: [
                                // Invoice phòng: có roomId và room thuộc building
                                {
                                    roomId: { not: null },
                                    room: { buildingId: buildingIdNum }
                                },
                                // Invoice cá nhân: có studentProfileId và student ở trong phòng thuộc building
                                {
                                    studentProfileId: { not: null },
                                    studentProfile: {
                                        room: { buildingId: buildingIdNum }
                                    }
                                }
                            ] });
                        console.log(`[API] Applied buildingId filter for invoices: ${buildingIdNum}`);
                    }
                } // Lọc theo loại hóa đơn (cá nhân hoặc phòng)
                if (invoiceType === 'personal') {
                    // Chỉ lấy hóa đơn cá nhân (có studentProfileId)
                    options.where.studentProfileId = { not: null };
                    options.where.roomId = null;
                }
                else if (invoiceType === 'room') {
                    // Chỉ lấy hóa đơn phòng (có roomId)
                    options.where.roomId = { not: null };
                    options.where.studentProfileId = null;
                }
                // Các bộ lọc chung cho tất cả vai trò
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
                if (!invoice) {
                    return res.status(404).json({
                        status: 'error',
                        message: `Không tìm thấy hóa đơn với ID ${id}`
                    });
                }
                // Kiểm tra quyền truy cập cho STUDENT role
                if (req.user && typeof req.user === 'object' && 'role' in req.user && req.user.role === 'STUDENT' && 'profileId' in req.user) {
                    const studentProfileId = Number(req.user.profileId);
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
    createInvoice(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { studentProfileId, roomId, studentCode, roomNumber, buildingName, billingMonth, billingYear, dueDate, paymentDeadline, notes, items, status } = req.body;
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
                    studentCode,
                    roomNumber,
                    buildingName,
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
    createBulkInvoices(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { month, year } = req.body;
                // Sử dụng tháng và năm hiện tại nếu không được cung cấp
                const currentDate = new Date();
                const targetMonth = month || (currentDate.getMonth() + 1);
                const targetYear = year || currentDate.getFullYear();
                // Kiểm tra xem đã có hóa đơn cho tháng này chưa
                const existingInvoices = yield prisma.invoice.findFirst({
                    where: {
                        billingMonth: targetMonth,
                        billingYear: targetYear
                    }
                });
                if (existingInvoices) {
                    return res.status(400).json({
                        status: 'error',
                        message: `Đã có hóa đơn cho tháng ${targetMonth}/${targetYear}. Không thể tạo hóa đơn trùng lặp.`
                    });
                }
                const result = yield invoiceService.createBulkMonthlyInvoices(targetMonth, targetYear);
                res.status(201).json({
                    status: 'success',
                    message: `Đã tạo thành công hóa đơn cho tháng ${targetMonth}/${targetYear}`,
                    data: {
                        month: targetMonth,
                        year: targetYear,
                        totalInvoicesCreated: result.totalCreated,
                        roomFeeInvoices: result.roomFeeCount,
                        parkingInvoices: result.parkingCount,
                        utilityInvoices: result.utilityCount,
                        details: result.details
                    }
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    createRoomFeeInvoices(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { month, year } = req.body;
                // Sử dụng tháng và năm hiện tại nếu không được cung cấp
                const currentDate = new Date();
                const targetMonth = month || (currentDate.getMonth() + 1);
                const targetYear = year || currentDate.getFullYear();
                // Kiểm tra xem đã có hóa đơn tiền phòng cho tháng này chưa
                const existingRoomFeeInvoices = yield prisma.invoice.findFirst({
                    where: {
                        billingMonth: targetMonth,
                        billingYear: targetYear,
                        studentProfileId: { not: null },
                        items: {
                            some: { type: 'ROOM_FEE' }
                        }
                    }
                });
                if (existingRoomFeeInvoices) {
                    return res.status(400).json({
                        status: 'error',
                        message: `Đã có hóa đơn tiền phòng cho tháng ${targetMonth}/${targetYear}. Không thể tạo hóa đơn trùng lặp.`
                    });
                }
                const result = yield invoiceService.createRoomFeeInvoices(targetMonth, targetYear);
                res.status(201).json({
                    status: 'success',
                    message: `Đã tạo thành công ${result.totalCreated} hóa đơn tiền phòng cho tháng ${targetMonth}/${targetYear}`,
                    data: {
                        month: targetMonth,
                        year: targetYear,
                        type: 'ROOM_FEE',
                        totalInvoicesCreated: result.totalCreated,
                        invoiceIds: result.invoiceIds,
                        details: result.details
                    }
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    createParkingFeeInvoices(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { month, year } = req.body;
                // Sử dụng tháng và năm hiện tại nếu không được cung cấp
                const currentDate = new Date();
                const targetMonth = month || (currentDate.getMonth() + 1);
                const targetYear = year || currentDate.getFullYear();
                // Kiểm tra xem đã có hóa đơn phí gửi xe cho tháng này chưa
                const existingParkingInvoices = yield prisma.invoice.findFirst({
                    where: {
                        billingMonth: targetMonth,
                        billingYear: targetYear,
                        studentProfileId: { not: null },
                        items: {
                            some: { type: 'PARKING' }
                        }
                    }
                });
                if (existingParkingInvoices) {
                    return res.status(400).json({
                        status: 'error',
                        message: `Đã có hóa đơn phí gửi xe cho tháng ${targetMonth}/${targetYear}. Không thể tạo hóa đơn trùng lặp.`
                    });
                }
                const result = yield invoiceService.createParkingFeeInvoices(targetMonth, targetYear);
                res.status(201).json({
                    status: 'success',
                    message: `Đã tạo thành công ${result.totalCreated} hóa đơn phí gửi xe cho tháng ${targetMonth}/${targetYear}`,
                    data: {
                        month: targetMonth,
                        year: targetYear,
                        type: 'PARKING',
                        totalInvoicesCreated: result.totalCreated,
                        invoiceIds: result.invoiceIds,
                        details: result.details
                    }
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    createUtilityInvoices(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { month, year } = req.body;
                // Sử dụng tháng và năm hiện tại nếu không được cung cấp
                const currentDate = new Date();
                const targetMonth = month || (currentDate.getMonth() + 1);
                const targetYear = year || currentDate.getFullYear();
                // Kiểm tra xem đã có hóa đơn tiện ích cho tháng này chưa
                const existingUtilityInvoices = yield prisma.invoice.findFirst({
                    where: {
                        billingMonth: targetMonth,
                        billingYear: targetYear,
                        roomId: { not: null },
                        items: {
                            some: {
                                type: { in: ['ELECTRICITY', 'WATER'] }
                            }
                        }
                    }
                });
                if (existingUtilityInvoices) {
                    return res.status(400).json({
                        status: 'error',
                        message: `Đã có hóa đơn tiện ích cho tháng ${targetMonth}/${targetYear}. Không thể tạo hóa đơn trùng lặp.`
                    });
                }
                const result = yield invoiceService.createUtilityInvoices(targetMonth, targetYear);
                res.status(201).json({
                    status: 'success',
                    message: `Đã tạo thành công ${result.totalCreated} hóa đơn tiện ích cho tháng ${targetMonth}/${targetYear}`,
                    data: {
                        month: targetMonth,
                        year: targetYear,
                        type: 'UTILITY',
                        totalInvoicesCreated: result.totalCreated,
                        invoiceIds: result.invoiceIds,
                        details: result.details
                    }
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
}
exports.InvoiceController = InvoiceController;
