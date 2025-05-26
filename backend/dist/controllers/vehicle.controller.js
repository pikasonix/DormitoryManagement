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
exports.VehicleController = void 0;
const vehicle_service_1 = require("../services/vehicle.service");
const file_service_1 = require("../services/file.service");
const client_1 = require("@prisma/client");
const client_2 = require("@prisma/client");
const prisma = new client_2.PrismaClient();
const vehicleService = new vehicle_service_1.VehicleService();
class VehicleController {
    getAllRegistrations(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { studentProfileId, vehicleType, isActive, licensePlate, parkingCardNo, hasParkingCardNo, buildingId, page, limit } = req.query;
                const requesterUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                const requesterRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
                const options = { where: {} };
                // Nếu là sinh viên, chỉ cho xem xe của chính mình
                if (requesterRole === 'STUDENT') {
                    const studentProfile = yield prisma.studentProfile.findUnique({
                        where: { userId: requesterUserId },
                        select: { id: true }
                    });
                    if (!studentProfile) {
                        return next(new Error('Không tìm thấy hồ sơ sinh viên của bạn.'));
                    }
                    // Luôn filter theo studentProfileId của chính sinh viên đó
                    options.where.studentProfileId = studentProfile.id;
                } // Admin/Staff có thể xem tất cả hoặc lọc theo studentProfileId
                else if (requesterRole === 'ADMIN' || requesterRole === 'STAFF') {
                    if (studentProfileId)
                        options.where.studentProfileId = parseInt(studentProfileId);
                    // Nếu là STAFF và có buildingId, lọc theo tòa nhà
                    if (requesterRole === 'STAFF' && buildingId) {
                        options.where.studentProfile = {
                            room: {
                                buildingId: parseInt(buildingId)
                            }
                        };
                    }
                }
                // Các bộ lọc khác
                if (vehicleType && Object.values(client_1.VehicleType).includes(vehicleType)) {
                    options.where.vehicleType = vehicleType;
                }
                else if (vehicleType) {
                    return next(new Error(`Loại xe không hợp lệ: ${vehicleType}`));
                }
                if (isActive !== undefined)
                    options.where.isActive = isActive === 'true';
                if (licensePlate)
                    options.where.licensePlate = { contains: licensePlate, mode: 'insensitive' }; // Tìm kiếm biển số
                if (parkingCardNo)
                    options.where.parkingCardNo = parkingCardNo;
                // Lọc xe có hoặc không có parkingCardNo
                if (hasParkingCardNo !== undefined) {
                    if (hasParkingCardNo === 'true') {
                        options.where.parkingCardNo = { not: null };
                    }
                    else {
                        options.where.parkingCardNo = null;
                    }
                }
                // Phân trang
                const pageNum = parseInt(page) || 1;
                const limitNum = parseInt(limit) || 10;
                options.skip = (pageNum - 1) * limitNum;
                options.take = limitNum;
                options.orderBy = { createdAt: 'desc' };
                // Lấy tổng số bản ghi
                const totalRecords = yield prisma.vehicleRegistration.count({ where: options.where });
                const registrations = yield vehicleService.findAll(options);
                res.status(200).json({
                    status: 'success',
                    results: registrations.length,
                    total: totalRecords,
                    data: registrations
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    getRegistrationById(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const id = parseInt(req.params.id);
                const requesterUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                const requesterRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
                // Lấy thông tin xe trước
                const registration = yield vehicleService.findById(id); // Service xử lý not found
                // Kiểm tra xem có tìm thấy xe không
                if (!registration) {
                    return next(new Error('Không tìm thấy thông tin xe.'));
                }
                // Kiểm tra quyền xem chi tiết
                if (requesterRole === 'STUDENT') {
                    // Nếu là sinh viên, chỉ xem được xe của chính mình
                    const studentProfile = yield prisma.studentProfile.findUnique({
                        where: { userId: requesterUserId },
                        select: { id: true }
                    });
                    if (!studentProfile) {
                        return next(new Error('Không tìm thấy hồ sơ sinh viên của bạn.'));
                    }
                    // Nếu không phải xe của họ, từ chối truy cập
                    if (registration.studentProfileId !== studentProfile.id) {
                        return next(new Error('Bạn không có quyền xem thông tin xe này.'));
                    }
                }
                res.status(200).json({
                    status: 'success',
                    data: registration
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    // Sinh viên hoặc Admin/Staff tạo đăng ký
    createRegistration(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { studentProfileId, // Có thể lấy từ req.user nếu là sinh viên tự đăng ký, hoặc từ body nếu Admin/Staff tạo hộ
                vehicleType, licensePlate, startDate, brand, model, color, parkingCardNo, isActive, endDate, notes, imageIds } = req.body;
                const requesterUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                const requesterRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
                let targetStudentProfileId;
                // Xác định ID sinh viên cần đăng ký xe cho
                if (requesterRole === 'STUDENT') {
                    // Sinh viên tự đăng ký
                    const studentProfile = yield prisma.studentProfile.findUnique({ where: { userId: requesterUserId }, select: { id: true } });
                    if (!studentProfile)
                        return next(new Error('Không tìm thấy hồ sơ sinh viên của bạn.'));
                    targetStudentProfileId = studentProfile.id;
                    // Không cho sinh viên tự set parkingCardNo, isActive, endDate
                    if (parkingCardNo !== undefined || isActive !== undefined || endDate !== undefined) {
                        console.warn(`Student (User ID: ${requesterUserId}) attempted to set restricted fields during vehicle registration.`);
                        // return next(new Error('Bạn không có quyền đặt số thẻ, trạng thái hoặc ngày kết thúc.'));
                    }
                }
                else if ((requesterRole === 'ADMIN' || requesterRole === 'STAFF') && studentProfileId) {
                    // Admin/Staff đăng ký hộ
                    targetStudentProfileId = parseInt(studentProfileId);
                    if (isNaN(targetStudentProfileId))
                        return next(new Error('studentProfileId không hợp lệ.'));
                }
                else {
                    return next(new Error('Không thể xác định sinh viên để đăng ký xe.')); // Hoặc AppError 400/403
                }
                // Validate VehicleType enum
                if (!vehicleType || !Object.values(client_1.VehicleType).includes(vehicleType)) {
                    return next(new Error(`Loại xe không hợp lệ: ${vehicleType}`));
                }
                const createData = {
                    studentProfileId: targetStudentProfileId,
                    vehicleType: vehicleType,
                    licensePlate,
                    startDate, // Service sẽ chuyển thành Date
                    brand, model, color, notes, // Chỉ Admin/Staff mới được set các trường này khi tạo
                    parkingCardNo: (requesterRole !== 'STUDENT' ? parkingCardNo : undefined),
                    isActive: (requesterRole !== 'STUDENT' ? (isActive !== undefined ? isActive : true) : false), // Sinh viên tự đăng ký thì mặc định inactive (false) để đợi duyệt
                    endDate: (requesterRole !== 'STUDENT' ? endDate : undefined),
                    imageIds: imageIds ? (Array.isArray(imageIds) ? imageIds.map(Number) : [Number(imageIds)]) : undefined
                };
                const newRegistration = yield vehicleService.create(createData);
                res.status(201).json({
                    status: 'success',
                    data: newRegistration
                });
            }
            catch (error) {
                next(error); // Chuyển lỗi từ service hoặc validation
            }
        });
    }
    // Admin/Staff cập nhật đăng ký xe
    updateRegistration(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                // Lấy dữ liệu cập nhật từ body
                const { vehicleType, licensePlate, brand, model, color, parkingCardNo, isActive, startDate, endDate, notes, imageIds } = req.body;
                // Validate VehicleType enum
                if (vehicleType && !Object.values(client_1.VehicleType).includes(vehicleType)) {
                    return next(new Error(`Loại xe không hợp lệ: ${vehicleType}`));
                }
                const updateData = {
                    vehicleType: vehicleType,
                    licensePlate, brand, model, color, parkingCardNo, isActive, startDate, endDate, notes,
                    // Đảm bảo imageIds là mảng số
                    imageIds: imageIds ? (Array.isArray(imageIds) ? imageIds.map(Number).filter(n => !isNaN(n)) : [Number(imageIds)].filter(n => !isNaN(n))) : undefined
                };
                const { registration, oldImagePaths } = yield vehicleService.update(id, updateData);
                // Xóa file ảnh vật lý cũ
                if (oldImagePaths.length > 0 && typeof file_service_1.deleteFile === 'function') {
                    yield Promise.allSettled(oldImagePaths.map(filePath => (0, file_service_1.deleteFile)(filePath)));
                }
                else if (oldImagePaths.length > 0) {
                    console.warn(`[VehicleController] deleteFile function not available, cannot delete old vehicle images.`);
                }
                res.status(200).json({
                    status: 'success',
                    data: registration
                });
            }
            catch (error) {
                next(error); // Chuyển lỗi từ service hoặc validation
            }
        });
    } // Admin/Staff xóa đăng ký xe hoặc sinh viên hủy đăng ký xe chờ duyệt của chính mình
    deleteRegistration(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const id = parseInt(req.params.id);
                const requesterUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                const requesterRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
                // Kiểm tra quyền xóa
                if (requesterRole === 'STUDENT') {
                    // Nếu là sinh viên, kiểm tra xem xe có phải của họ không
                    const studentProfile = yield prisma.studentProfile.findUnique({
                        where: { userId: requesterUserId },
                        select: { id: true }
                    });
                    if (!studentProfile) {
                        return next(new Error('Không tìm thấy hồ sơ sinh viên của bạn.'));
                    }
                    // Kiểm tra xe có thuộc sở hữu của sinh viên này không
                    const vehicle = yield prisma.vehicleRegistration.findUnique({
                        where: { id },
                        select: { studentProfileId: true, isActive: true, parkingCardNo: true }
                    });
                    if (!vehicle) {
                        return next(new Error('Không tìm thấy thông tin xe.'));
                    }
                    if (vehicle.studentProfileId !== studentProfile.id) {
                        return next(new Error('Bạn không có quyền xóa thông tin xe này.'));
                    }
                    // Sinh viên chỉ được xóa xe đang chờ duyệt (isActive = false và chưa có parkingCardNo)
                    if (vehicle.isActive || vehicle.parkingCardNo) {
                        return next(new Error('Bạn chỉ có thể hủy đăng ký xe đang chờ duyệt.'));
                    }
                }
                // Thực hiện xóa
                const { oldImagePaths } = yield vehicleService.delete(id); // Service xử lý not found và transaction xóa
                // Xóa file ảnh vật lý cũ
                if (oldImagePaths.length > 0 && typeof file_service_1.deleteFile === 'function') {
                    yield Promise.allSettled(oldImagePaths.map(filePath => (0, file_service_1.deleteFile)(filePath)));
                }
                else if (oldImagePaths.length > 0) {
                    console.warn(`[VehicleController] deleteFile function not available, cannot delete vehicle images.`);
                }
                res.status(200).json({
                    status: 'success',
                    message: 'Đăng ký xe đã được xóa thành công.',
                    data: null
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
}
exports.VehicleController = VehicleController;
