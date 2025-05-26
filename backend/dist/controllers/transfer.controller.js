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
            var _a, _b;
            try {
                const { studentProfileId, fromRoomId, toRoomId, status, page, limit, identifier, studentId } = req.query;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
                if (!userId) {
                    return next(new Error('Không tìm thấy thông tin người dùng.'));
                }
                const options = { where: {} }; // Nếu là sinh viên, chỉ cho xem yêu cầu của chính mình
                if (userRole === client_1.Role.STUDENT) {
                    const studentProfile = yield prisma.studentProfile.findUnique({
                        where: { userId },
                        select: { id: true }
                    });
                    if (!studentProfile) {
                        return next(new Error('Không tìm thấy hồ sơ sinh viên của bạn.'));
                    }
                    options.where.studentProfileId = studentProfile.id;
                }
                // Nếu là STAFF, chỉ xem yêu cầu chuyển đến tòa nhà mà STAFF quản lý
                else if (userRole === client_1.Role.STAFF) {
                    const staffProfile = yield prisma.staffProfile.findUnique({
                        where: { userId },
                        select: { managedBuildingId: true }
                    });
                    if (!staffProfile || !staffProfile.managedBuildingId) {
                        return next(new Error('Bạn không được phân công quản lý tòa nhà nào.'));
                    }
                    // Lọc theo toRoom thuộc tòa nhà mà STAFF quản lý
                    options.where.toRoom = {
                        buildingId: staffProfile.managedBuildingId
                    };
                    // Các bộ lọc khác cho STAFF
                    if (studentProfileId)
                        options.where.studentProfileId = parseInt(studentProfileId);
                    if (fromRoomId)
                        options.where.fromRoomId = parseInt(fromRoomId);
                    if (toRoomId)
                        options.where.toRoomId = parseInt(toRoomId);
                    // Xử lý khi có tham số studentId (mã số sinh viên)
                    if (studentId) {
                        const matchingStudents = yield prisma.studentProfile.findMany({
                            where: {
                                studentId: {
                                    contains: studentId,
                                    mode: 'insensitive'
                                }
                            },
                            select: { id: true }
                        });
                        if (matchingStudents.length > 0) {
                            const studentIds = matchingStudents.map(student => student.id);
                            options.where.studentProfileId = { in: studentIds };
                        }
                        else {
                            options.where.id = -1;
                        }
                    }
                }
                // ADMIN có thể xem tất cả
                else {
                    // Xây dựng bộ lọc cho ADMIN
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
                }
                // Validate và xử lý trạng thái (áp dụng cho cả admin và student)
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
    } // Admin/Staff cập nhật trạng thái yêu cầu
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
                // Cho phép admin không có staff profile cũng có thể phê duyệt
                const updateData = {
                    status: status,
                    // Chỉ gán approvedById nếu có staffProfile và đang duyệt hoặc hoàn thành
                    approvedById: staffProfile && (status === client_1.TransferStatus.APPROVED || status === client_1.TransferStatus.COMPLETED)
                        ? staffProfile.id
                        : null
                };
                const updatedTransfer = yield transferService.updateStatus(id, updateData);
                // Trả về thông báo tùy chỉnh dựa trên trạng thái
                const successMessage = status === client_1.TransferStatus.APPROVED
                    ? 'Yêu cầu chuyển phòng đã được phê duyệt thành công'
                    : status === client_1.TransferStatus.REJECTED
                        ? 'Yêu cầu chuyển phòng đã bị từ chối'
                        : 'Trạng thái yêu cầu chuyển phòng đã được cập nhật';
                res.status(200).json({
                    status: 'success',
                    message: successMessage,
                    data: updatedTransfer
                });
            }
            catch (error) {
                console.error(`[updateTransferStatus] Error:`, error);
                // Xử lý thông báo lỗi cụ thể
                const errorMessage = error instanceof Error ? error.message : 'Không thể cập nhật trạng thái yêu cầu';
                next(new Error(errorMessage)); // Chuyển lỗi từ service hoặc validation
            }
        });
    }
    // Admin/Staff (hoặc sinh viên) xóa yêu cầu (chỉ PENDING/REJECTED)
    deleteTransfer(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const id = parseInt(req.params.id);
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
                if (!userId) {
                    return next(new Error('Không tìm thấy thông tin người dùng.'));
                }
                // Kiểm tra quyền: Chỉ Admin/Staff hoặc sinh viên sở hữu request đó mới được xóa
                if (userRole === client_1.Role.STUDENT) {
                    // Nếu là sinh viên, kiểm tra xem request có phải của họ không
                    const transfer = yield prisma.roomTransfer.findUnique({
                        where: { id },
                        include: { studentProfile: { select: { userId: true } } }
                    });
                    if (!transfer) {
                        return next(new Error('Không tìm thấy yêu cầu chuyển phòng.'));
                    }
                    if (((_c = transfer.studentProfile) === null || _c === void 0 ? void 0 : _c.userId) !== userId) {
                        return next(new Error('Bạn không có quyền xóa yêu cầu này.'));
                    }
                    // Sinh viên chỉ được xóa yêu cầu PENDING hoặc REJECTED
                    if (transfer.status !== client_1.TransferStatus.PENDING && transfer.status !== client_1.TransferStatus.REJECTED) {
                        return next(new Error('Chỉ có thể xóa yêu cầu đang chờ duyệt hoặc đã bị từ chối.'));
                    }
                }
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
