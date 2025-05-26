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
exports.MaintenanceController = void 0;
const maintenance_service_1 = require("../services/maintenance.service");
const file_service_1 = require("../services/file.service"); // Import hàm xóa file
const client_1 = require("@prisma/client"); // Import PrismaClient, Prisma và Enum
const prisma = new client_1.PrismaClient(); // Initialize PrismaClient
const maintenanceService = new maintenance_service_1.MaintenanceService();
class MaintenanceController {
    getAllMaintenances(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                // Lấy các tham số lọc từ query string
                const { roomId, roomNumber, buildingName, status, assignedToId, buildingId, page, limit, id } = req.query;
                // Get user info and role from request object
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
                console.log('[API] Maintenance filter params:', { roomId, roomNumber, buildingName, status, assignedToId, page, limit, id, userRole });
                // Phân trang
                const pageNum = parseInt(page) || 1;
                const limitNum = parseInt(limit) || 10;
                const options = { where: {} };
                // If user is a STUDENT, only show their maintenance requests
                if (userRole === 'STUDENT' && userId) {
                    // Find student's roomId if not provided in query
                    if (!roomId) {
                        const studentProfile = yield prisma.studentProfile.findUnique({
                            where: { userId },
                            select: { roomId: true }
                        });
                        if (studentProfile === null || studentProfile === void 0 ? void 0 : studentProfile.roomId) {
                            // Filter by student's room
                            options.where.roomId = studentProfile.roomId;
                        }
                        else {
                            // Student has no room, return empty results
                            return res.status(200).json({
                                status: 'success',
                                results: 0,
                                total: 0,
                                data: []
                            });
                        }
                    }
                }
                // Xây dựng điều kiện lọc
                if (id)
                    options.where.id = parseInt(id);
                if (status) {
                    // Chuyển đổi status thành chữ hoa để khớp với Enum
                    const normalizedStatus = typeof status === 'string'
                        ? status.toUpperCase()
                        : String(status).toUpperCase();
                    if (Object.values(client_1.MaintenanceStatus).includes(normalizedStatus)) {
                        options.where.status = normalizedStatus;
                    }
                }
                if (assignedToId)
                    options.where.assignedToId = parseInt(assignedToId);
                // QUAN TRỌNG: Xử lý điều kiện lọc liên quan đến phòng
                if (roomId) {
                    const roomQuery = roomId;
                    console.log(`[API] Processing room filter: "${roomQuery}"`);
                    // Trường hợp: tìm chính xác theo tòa nhà (B3, B9) - Pattern đầy đủ
                    const exactBuildingPattern = /^B\d+$/i;
                    if (exactBuildingPattern.test(roomQuery)) {
                        console.log(`[API] Exact building search for: ${roomQuery}`);
                        // Tìm chính xác tên tòa nhà
                        options.where = Object.assign(Object.assign({}, options.where), { room: {
                                building: {
                                    name: {
                                        equals: roomQuery.toUpperCase(),
                                        mode: 'insensitive'
                                    }
                                }
                            } });
                    }
                    // Trường hợp: tìm theo chữ cái "B" - hiển thị tất cả tòa B
                    else if (roomQuery.toUpperCase() === 'B') {
                        console.log(`[API] Building prefix search for: ${roomQuery}`);
                        options.where = Object.assign(Object.assign({}, options.where), { room: {
                                building: {
                                    name: {
                                        startsWith: roomQuery.toUpperCase(),
                                        mode: 'insensitive'
                                    }
                                }
                            } });
                    }
                    // Trường hợp: tìm theo số phòng chính xác (203, 101)
                    else if (/^\d+[A-Za-z]?$/.test(roomQuery)) {
                        console.log(`[API] Room number search for: ${roomQuery}`);
                        // Tìm kiếm contains thay vì equals
                        options.where = Object.assign(Object.assign({}, options.where), { room: {
                                number: {
                                    contains: roomQuery,
                                    mode: 'insensitive'
                                }
                            } });
                    }
                    // Trường hợp: tìm theo kết hợp số phòng và tòa nhà
                    else {
                        // Hỗ trợ nhiều định dạng: "105 B3", "105-B3", "105(B3)", "105 - B3", "105 ( B3 )"
                        const combinedRoomPattern = /^(\d+[A-Za-z]?)\s*[-\s(]*\s*([Bb]\d+)\s*[\s)]*$/;
                        const combinedMatches = roomQuery.match(combinedRoomPattern);
                        if (combinedMatches && combinedMatches.length >= 3) {
                            const roomNumber = combinedMatches[1].trim();
                            const buildingName = combinedMatches[2].trim();
                            console.log(`[API] Combined search: room=${roomNumber}, building=${buildingName}`);
                            options.where = Object.assign(Object.assign({}, options.where), { room: {
                                    number: {
                                        equals: roomNumber,
                                        mode: 'insensitive'
                                    },
                                    building: {
                                        name: {
                                            equals: buildingName.toUpperCase(),
                                            mode: 'insensitive'
                                        }
                                    }
                                } });
                        }
                        // Tìm kiếm tổng quát
                        else {
                            console.log(`[API] General search for: ${roomQuery}`);
                            options.where = Object.assign(Object.assign({}, options.where), { OR: [
                                    {
                                        room: {
                                            number: {
                                                contains: roomQuery,
                                                mode: 'insensitive'
                                            }
                                        }
                                    },
                                    {
                                        room: {
                                            building: {
                                                name: {
                                                    contains: roomQuery,
                                                    mode: 'insensitive'
                                                }
                                            }
                                        }
                                    }
                                ] });
                        }
                    }
                }
                // Các điều kiện khác nếu không có roomId
                if (roomNumber) {
                    options.where.room = {
                        number: {
                            contains: roomNumber,
                            mode: 'insensitive'
                        }
                    };
                } // Lọc theo tòa nhà
                if (buildingId) {
                    console.log(`[API] Filtering by buildingId: ${buildingId}`);
                    const buildingIdNum = parseInt(buildingId);
                    if (!isNaN(buildingIdNum)) {
                        // Đảm bảo options.where tồn tại
                        options.where = options.where || {};
                        // Xử lý trường hợp room filter đã được khởi tạo trước đó
                        const existingRoom = options.where.room || {};
                        // Tạo room filter với buildingId
                        options.where.room = Object.assign(Object.assign({}, existingRoom), { buildingId: buildingIdNum });
                        console.log(`[API] Applied buildingId filter: ${buildingIdNum}`);
                    }
                }
                // Hoặc lọc theo tên tòa nhà
                else if (buildingName) {
                    // Đảm bảo options.where tồn tại
                    options.where = options.where || {};
                    // Xử lý trường hợp room filter đã được khởi tạo trước đó
                    const existingRoom = options.where.room || {};
                    // Tạo room filter với building.name
                    options.where.room = Object.assign(Object.assign({}, existingRoom), { building: Object.assign(Object.assign({}, (existingRoom.building || {})), { name: {
                                contains: buildingName,
                                mode: 'insensitive'
                            } }) });
                } // Áp dụng phân trang
                options.skip = (pageNum - 1) * limitNum;
                options.take = limitNum;
                // Đảm bảo options.skip và options.take là số hợp lệ
                options.skip = typeof options.skip === 'number' ? options.skip : 0;
                options.take = typeof options.take === 'number' ? options.take : 10;
                console.log('[API] Final query options:', JSON.stringify(options.where));
                // Lấy tổng số bản ghi (cho phân trang phía client)
                const totalRecords = yield prisma.maintenance.count({ where: options.where });
                const maintenances = yield maintenanceService.findAll(options);
                console.log(`[API] Query results: ${maintenances.length} records found`);
                res.status(200).json({
                    status: 'success',
                    results: maintenances.length,
                    total: totalRecords, // Trả về tổng số bản ghi
                    data: maintenances
                });
            }
            catch (error) {
                console.error('[API] Maintenance search error:', error);
                next(error);
            }
        });
    }
    getMaintenanceById(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                const maintenance = yield maintenanceService.findById(id); // Service đã xử lý lỗi not found
                res.status(200).json({
                    status: 'success',
                    data: maintenance
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    createMaintenance(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { roomId, issue, notes, imageIds, assignedToId, status } = req.body;
                const reporterUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId; // Lấy userId của người dùng đang đăng nhập
                if (!reporterUserId) {
                    return next(new Error('Không tìm thấy thông tin người dùng báo cáo.')); // Hoặc AppError 401
                }
                if (!roomId || !issue) {
                    return next(new Error('Thiếu thông tin bắt buộc: roomId, issue.')); // Hoặc AppError 400
                } // Kiểm tra vai trò người dùng
                const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
                let reportedByUserId = reporterUserId;
                if (userRole === client_1.Role.STUDENT) {
                    // Sinh viên chỉ có thể tạo yêu cầu cho phòng của mình
                    const reporterProfile = yield prisma.studentProfile.findUnique({
                        where: { userId: reporterUserId },
                        select: { id: true, roomId: true }
                    });
                    if (!reporterProfile) {
                        return next(new Error('Không tìm thấy thông tin sinh viên.'));
                    }
                    // Kiểm tra xem sinh viên có đang ở phòng được yêu cầu không
                    if (reporterProfile.roomId !== parseInt(roomId)) {
                        return next(new Error('Sinh viên chỉ có thể tạo yêu cầu bảo trì cho phòng của mình.'));
                    }
                }
                else if (userRole === client_1.Role.ADMIN || userRole === client_1.Role.STAFF) {
                    // Admin/Staff có thể tạo yêu cầu cho bất kỳ phòng nào
                    // Kiểm tra phòng có tồn tại không
                    const roomExists = yield prisma.room.findUnique({
                        where: { id: parseInt(roomId) }
                    });
                    if (!roomExists) {
                        return next(new Error('Phòng không tồn tại.'));
                    }
                    // Admin/Staff tạo yêu cầu thay mặt cho hệ thống
                    reportedByUserId = reporterUserId;
                }
                else {
                    return next(new Error('Không có quyền tạo yêu cầu bảo trì.'));
                }
                const createData = {
                    roomId: parseInt(roomId),
                    reportedById: reportedByUserId, // Sử dụng userId đã được xác định theo role
                    issue,
                    notes,
                    imageIds: imageIds ? (Array.isArray(imageIds) ? imageIds.map(Number) : [Number(imageIds)]) : undefined,
                    assignedToId: assignedToId ? parseInt(assignedToId) : undefined,
                    status: status // Cần validate enum
                };
                const newMaintenance = yield maintenanceService.create(createData);
                res.status(201).json({
                    status: 'success',
                    data: newMaintenance
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    updateMaintenance(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                const { issue, status, assignedToId, notes, imageIds } = req.body;
                const updateData = {
                    issue,
                    status: status, // Cần validate enum
                    // Xử lý assignedToId: nếu gửi rỗng hoặc null -> disconnect
                    assignedToId: assignedToId !== undefined ? (assignedToId ? parseInt(assignedToId) : null) : undefined,
                    notes,
                    // Đảm bảo imageIds là mảng số
                    imageIds: imageIds ? (Array.isArray(imageIds) ? imageIds.map(Number).filter(n => !isNaN(n)) : [Number(imageIds)].filter(n => !isNaN(n))) : undefined
                };
                const { maintenance, oldImagePaths } = yield maintenanceService.update(id, updateData);
                // Xóa file ảnh vật lý cũ sau khi cập nhật DB thành công
                if (oldImagePaths.length > 0 && typeof file_service_1.deleteFile === 'function') {
                    yield Promise.allSettled(oldImagePaths.map(filePath => (0, file_service_1.deleteFile)(filePath)));
                }
                else if (oldImagePaths.length > 0) {
                    console.warn(`[MaintenanceController] deleteFile function not available, cannot delete old maintenance images.`);
                }
                res.status(200).json({
                    status: 'success',
                    data: maintenance
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    deleteMaintenance(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                const user = req.user;
                if (!user) {
                    return res.status(401).json({ status: 'error', message: 'Người dùng chưa đăng nhập.' });
                }
                // Check if the maintenance request exists first
                const existingRequest = yield prisma.maintenance.findUnique({
                    where: { id },
                    include: {
                        reportedBy: true
                    }
                });
                if (!existingRequest) {
                    return res.status(404).json({
                        status: 'error',
                        message: 'Yêu cầu bảo trì không tồn tại.'
                    });
                }
                // Permission check: 
                // 1. Admin/Staff can delete any request
                // 2. Students can only delete their own requests in PENDING status
                if (user.role === client_1.Role.STUDENT) { // If student is trying to delete
                    const studentProfile = yield prisma.studentProfile.findUnique({
                        where: { userId: user.userId }
                    });
                    // Check if it's their own request - reportedById is already the userId
                    if (!studentProfile || existingRequest.reportedById !== user.userId) {
                        return res.status(403).json({
                            status: 'error',
                            message: 'Bạn không có quyền xóa yêu cầu bảo trì này.'
                        });
                    }
                    // Check if request is in PENDING status
                    if (existingRequest.status !== client_1.MaintenanceStatus.PENDING) {
                        return res.status(403).json({
                            status: 'error',
                            message: 'Bạn chỉ có thể xóa yêu cầu bảo trì ở trạng thái Chờ Xử Lý.'
                        });
                    }
                }
                // If we get here, user has permission to delete
                const { oldImagePaths } = yield maintenanceService.delete(id);
                // Xóa file ảnh vật lý cũ sau khi xóa DB thành công
                if (oldImagePaths.length > 0 && typeof file_service_1.deleteFile === 'function') {
                    yield Promise.allSettled(oldImagePaths.map(filePath => (0, file_service_1.deleteFile)(filePath)));
                }
                else if (oldImagePaths.length > 0) {
                    console.warn(`[MaintenanceController] deleteFile function not available, cannot delete maintenance images.`);
                }
                res.status(200).json({
                    status: 'success',
                    message: 'Yêu cầu bảo trì đã được xóa thành công.',
                    data: null
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
}
exports.MaintenanceController = MaintenanceController;
