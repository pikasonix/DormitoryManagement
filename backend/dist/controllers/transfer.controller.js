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
exports.TransferController = void 0;
const transfer_service_1 = require("../services/transfer.service");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const transferService = new transfer_service_1.TransferService();
class TransferController {
    getAllTransfers(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { studentProfileId, fromRoomId, toRoomId, status, page, limit, identifier, studentId } = req.query;
                const options = { where: {} };
                // Xây dựng bộ lọc
                if (studentProfileId)
                    options.where.studentProfileId = parseInt(studentProfileId);
                if (fromRoomId)
                    options.where.fromRoomId = parseInt(fromRoomId);
                if (toRoomId)
                    options.where.toRoomId = parseInt(toRoomId);
                // Xử lý khi có tham số studentId (mã số sinh viên)
                if (studentId) {
                    // Tìm studentProfile có studentId chứa studentId
                    const matchingStudents = yield prisma.studentProfile.findMany({
                        where: {
                            studentId: {
                                contains: studentId,
                                mode: 'insensitive' // Case-insensitive search
                            }
                        },
                        select: { id: true }
                    });
                    if (matchingStudents.length > 0) {
                        const studentIds = matchingStudents.map(student => student.id);
                        options.where.studentProfileId = { in: studentIds };
                    }
                    else {
                        // Nếu không tìm thấy kết quả nào, trả về mảng rỗng
                        options.where.id = -1; // Không có ID nào là -1, đảm bảo không có kết quả trả về
                    }
                }
                // Xử lý tìm kiếm theo mã SV/phòng qua tham số identifier
                if (identifier) {
                    const searchTerm = identifier.trim();
                    // Tìm studentProfile có studentId chứa searchTerm
                    const matchingStudents = yield prisma.studentProfile.findMany({
                        where: {
                            studentId: {
                                contains: searchTerm,
                                mode: 'insensitive' // Case-insensitive search
                            }
                        },
                        select: { id: true }
                    });
                    // Tìm phòng có số phòng hoặc tên tòa nhà chứa searchTerm
                    const matchingRooms = yield prisma.room.findMany({
                        where: {
                            OR: [
                                { number: { contains: searchTerm, mode: 'insensitive' } },
                                { building: { name: { contains: searchTerm, mode: 'insensitive' } } }
                            ]
                        },
                        select: { id: true }
                    });
                    const orConditions = [];
                    if (matchingStudents.length > 0) {
                        orConditions.push(...matchingStudents.map(student => ({ studentProfileId: student.id })));
                    }
                    // Add room conditions for both fromRoomId and toRoomId
                    if (matchingRooms.length > 0) {
                        orConditions.push(...matchingRooms.map(room => ({ fromRoomId: room.id })));
                        orConditions.push(...matchingRooms.map(room => ({ toRoomId: room.id })));
                    }
                    if (orConditions.length > 0) {
                        if (options.where.OR) {
                            options.where.AND = [
                                { OR: options.where.OR },
                                { OR: orConditions }
                            ];
                            delete options.where.OR;
                        }
                        else {
                            options.where.OR = orConditions;
                        }
                    }
                    else {
                        // Nếu không tìm thấy kết quả nào, trả về mảng rỗng
                        options.where.id = -1; // Không có ID nào là -1, đảm bảo không có kết quả trả về
                    }
                }
                // Validate và xử lý trạng thái
                if (status) {
                    if (Object.values(client_1.TransferStatus).includes(status)) {
                        options.where.status = status;
                    }
                    else {
                        return next(new Error(`Trạng thái chuyển phòng không hợp lệ: ${status}`));
                    }
                }
                // Phân trang
                const pageNum = parseInt(page) || 1;
                const limitNum = parseInt(limit) || 10;
                options.skip = (pageNum - 1) * limitNum;
                options.take = limitNum;
                options.orderBy = { createdAt: 'desc' };
                // Lấy tổng số bản ghi
                const totalRecords = yield prisma.roomTransfer.count({ where: options.where });
                const transfers = yield transferService.findAll(options);
                res.status(200).json({
                    status: 'success',
                    results: transfers.length,
                    total: totalRecords,
                    data: transfers
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    getTransferById(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                const transfer = yield transferService.findById(id); // Service xử lý not found
                res.status(200).json({
                    status: 'success',
                    data: transfer
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    // Sinh viên tạo yêu cầu chuyển phòng
    createTransferRequest(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const studentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                const { toRoomId, transferDate, reason } = req.body;
                if (!studentUserId) {
                    return next(new Error('Không tìm thấy thông tin người dùng yêu cầu.')); // Hoặc AppError 401
                }
                if (!toRoomId || !transferDate) {
                    return next(new Error('Thiếu thông tin bắt buộc: toRoomId, transferDate.')); // Hoặc AppError 400
                }
                // Tìm StudentProfile ID của người yêu cầu
                const studentProfile = yield prisma.studentProfile.findUnique({
                    where: { userId: studentUserId },
                    select: { id: true }
                });
                if (!studentProfile) {
                    return next(new Error('Không tìm thấy hồ sơ sinh viên của bạn.')); // Hoặc AppError 404
                }
                const createData = {
                    studentProfileId: studentProfile.id, // Dùng ID profile
                    toRoomId: parseInt(toRoomId),
                    transferDate, // Service sẽ chuyển thành Date
                    reason
                };
                const newTransfer = yield transferService.create(createData);
                res.status(201).json({
                    status: 'success',
                    data: newTransfer
                });
            }
            catch (error) {
                next(error); // Chuyển lỗi từ service hoặc validation
            }
        });
    }
    // Admin/Staff cập nhật trạng thái yêu cầu
    updateTransferStatus(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const id = parseInt(req.params.id);
                const { status } = req.body; // Chỉ nhận status từ body
                const approverUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId; // ID của Staff/Admin đang thực hiện
                if (!status || !Object.values(client_1.TransferStatus).includes(status)) {
                    return next(new Error(`Trạng thái chuyển phòng không hợp lệ: ${status}`));
                }
                if (!approverUserId) {
                    return next(new Error('Không tìm thấy thông tin người duyệt.')); // Hoặc AppError 401
                }
                // Tìm StaffProfile ID của người duyệt
                const staffProfile = yield prisma.staffProfile.findUnique({
                    where: { userId: approverUserId },
                    select: { id: true }
                });
                if (!staffProfile) {
                    // Nếu là Admin không có staff profile thì sao? Cần xử lý logic này
                    // Tạm thời báo lỗi nếu không phải staff có profile
                    return next(new Error('Không tìm thấy hồ sơ nhân viên của người duyệt.')); // Hoặc AppError 404/403
                }
                const updateData = {
                    status: status,
                    // Chỉ gán approvedById nếu đang duyệt hoặc hoàn thành
                    approvedById: (status === client_1.TransferStatus.APPROVED || status === client_1.TransferStatus.COMPLETED) ? staffProfile.id : null
                };
                const updatedTransfer = yield transferService.updateStatus(id, updateData);
                res.status(200).json({
                    status: 'success',
                    data: updatedTransfer
                });
            }
            catch (error) {
                next(error); // Chuyển lỗi từ service hoặc validation
            }
        });
    }
    // Admin/Staff (hoặc sinh viên?) xóa yêu cầu (chỉ PENDING/REJECTED)
    deleteTransfer(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                // Service kiểm tra trạng thái trước khi xóa
                yield transferService.delete(id);
                res.status(200).json({
                    status: 'success',
                    message: 'Yêu cầu chuyển phòng đã được xóa.',
                    data: null
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
}
exports.TransferController = TransferController;
