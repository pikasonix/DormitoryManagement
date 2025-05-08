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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffController = exports.StudentController = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const file_service_1 = require("../services/file.service");
const prisma = new client_1.PrismaClient();
class StudentController {
    // Lấy danh sách tất cả sinh viên
    getAllStudents(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const page = parseInt(req.query.page) || 1;
                const limitQuery = req.query.limit;
                const limit = limitQuery ? parseInt(limitQuery) : 0;
                const applyPagination = limit > 0;
                const offset = applyPagination ? (page - 1) * limit : 0;
                const keyword = req.query.keyword;
                const whereCondition = {};
                if (keyword) {
                    whereCondition.OR = [
                        { fullName: { contains: keyword, mode: 'insensitive' } },
                        { studentId: { contains: keyword, mode: 'insensitive' } },
                        { user: { email: { contains: keyword, mode: 'insensitive' } } },
                        { phoneNumber: { contains: keyword, mode: 'insensitive' } }
                    ];
                }
                const totalStudents = yield prisma.studentProfile.count({
                    where: whereCondition
                });
                const students = yield prisma.studentProfile.findMany(Object.assign(Object.assign({ where: whereCondition, include: {
                        user: {
                            select: {
                                email: true,
                                isActive: true,
                                avatar: true
                            }
                        },
                        room: {
                            include: {
                                building: { select: { id: true, name: true } }
                            }
                        }
                    }, orderBy: {
                        fullName: 'asc'
                    } }, (applyPagination && { skip: offset })), (applyPagination && { take: limit })));
                const meta = applyPagination ? {
                    total: totalStudents,
                    currentPage: page,
                    totalPages: Math.ceil(totalStudents / limit),
                    limit
                } : {
                    total: totalStudents,
                    currentPage: 1,
                    totalPages: 1,
                    limit: totalStudents
                };
                res.status(200).json({
                    status: 'success',
                    results: students.length,
                    data: students,
                    meta
                });
            }
            catch (error) {
                console.error('Lỗi khi lấy danh sách sinh viên:', error);
                next(error);
            }
        });
    }
    // Lấy thông tin chi tiết sinh viên bằng User ID
    getStudentById(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = parseInt(req.params.id);
                if (isNaN(userId)) {
                    return next(new Error('User ID không hợp lệ'));
                }
                const student = yield prisma.studentProfile.findFirst({
                    where: { userId: userId },
                    include: {
                        user: {
                            select: { id: true, email: true, isActive: true, avatar: true }
                        },
                        room: {
                            include: {
                                building: true,
                                amenities: { include: { amenity: true } }
                            }
                        },
                        invoices: { orderBy: { issueDate: 'desc' }, take: 5 },
                        payments: { orderBy: { paymentDate: 'desc' }, take: 5 },
                        reportedMaintenances: { orderBy: { reportDate: 'desc' }, take: 3, include: { images: true } },
                        vehicleRegistrations: { include: { images: true } },
                        roomTransfers: { orderBy: { createdAt: 'desc' }, take: 3 }
                    }
                });
                if (!student) {
                    return next(new Error(`Không tìm thấy hồ sơ sinh viên với User ID ${userId}`));
                }
                res.status(200).json({
                    status: 'success',
                    data: student
                });
            }
            catch (error) {
                console.error('Lỗi khi lấy chi tiết sinh viên:', error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    return next(new Error(`Không tìm thấy hồ sơ sinh viên với User ID ${req.params.id}`));
                }
                next(error);
            }
        });
    }
    // Lấy thông tin chi tiết sinh viên bằng User ID
    getStudentByUserId(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = parseInt(req.params.userId);
                if (isNaN(userId)) {
                    return next(new Error('User ID không hợp lệ'));
                }
                const student = yield prisma.studentProfile.findFirst({
                    where: { userId: userId },
                    include: {
                        user: {
                            select: { id: true, email: true, isActive: true, avatar: true }
                        },
                        room: {
                            include: {
                                building: true,
                                amenities: { include: { amenity: true } }
                            }
                        },
                        invoices: { orderBy: { issueDate: 'desc' }, take: 5 },
                        payments: { orderBy: { paymentDate: 'desc' }, take: 5 },
                        reportedMaintenances: { orderBy: { reportDate: 'desc' }, take: 3, include: { images: true } },
                        vehicleRegistrations: { include: { images: true } },
                        roomTransfers: { orderBy: { createdAt: 'desc' }, take: 3 }
                    }
                });
                if (!student) {
                    return next(new Error(`Không tìm thấy hồ sơ sinh viên với User ID ${userId}`));
                }
                res.status(200).json({
                    status: 'success',
                    data: student
                });
            }
            catch (error) {
                console.error('Lỗi khi lấy chi tiết sinh viên từ User ID:', error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    return next(new Error(`Không tìm thấy hồ sơ sinh viên với User ID ${req.params.userId}`));
                }
                next(error);
            }
        });
    }
    // Lấy thông tin chi tiết sinh viên bằng Profile ID
    getStudentByProfileId(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const profileId = parseInt(req.params.profileId);
                if (isNaN(profileId)) {
                    return next(new Error('Profile ID không hợp lệ'));
                }
                const student = yield prisma.studentProfile.findUnique({
                    where: { id: profileId },
                    include: {
                        user: {
                            select: { id: true, email: true, isActive: true, avatar: true }
                        },
                        room: {
                            include: {
                                building: true,
                                amenities: { include: { amenity: true } }
                            }
                        },
                        invoices: { orderBy: { issueDate: 'desc' }, take: 5 },
                        payments: { orderBy: { paymentDate: 'desc' }, take: 5 },
                        reportedMaintenances: { orderBy: { reportDate: 'desc' }, take: 3, include: { images: true } },
                        vehicleRegistrations: { include: { images: true } },
                        roomTransfers: { orderBy: { createdAt: 'desc' }, take: 3 }
                    }
                });
                if (!student) {
                    return next(new Error(`Không tìm thấy hồ sơ sinh viên với Profile ID ${profileId}`));
                }
                res.status(200).json({
                    status: 'success',
                    data: student
                });
            }
            catch (error) {
                console.error('Lỗi khi lấy chi tiết sinh viên theo Profile ID:', error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    return next(new Error(`Không tìm thấy hồ sơ sinh viên với Profile ID ${req.params.profileId}`));
                }
                next(error);
            }
        });
    }
    // Tạo sinh viên mới
    createStudent(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { email, password, studentId, fullName, gender, birthDate, identityCardNumber, phoneNumber, faculty, courseYear, className, permanentProvince, permanentDistrict, permanentAddress, status, startDate, contractEndDate, personalEmail, ethnicity, religion, priorityObject, fatherName, fatherDobYear, fatherPhone, fatherAddress, motherName, motherDobYear, motherPhone, motherAddress, emergencyContactRelation, emergencyContactPhone, emergencyContactAddress, roomId, avatarId } = req.body;
                if (!email || !password || !studentId || !fullName || !gender || !birthDate || !identityCardNumber || !phoneNumber || !faculty || !courseYear || !startDate || !contractEndDate) {
                    return next(new Error('Thiếu các trường thông tin bắt buộc để tạo sinh viên'));
                }
                if (status && !Object.values(client_1.StudentStatus).includes(status)) {
                    return next(new Error(`Trạng thái sinh viên không hợp lệ: ${status}`));
                }
                const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
                const newUserAndProfile = yield prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    const newUser = yield tx.user.create({
                        data: {
                            email,
                            password: hashedPassword,
                            role: client_1.Role.STUDENT,
                            isActive: true,
                            avatar: avatarId ? { connect: { id: parseInt(avatarId) } } : undefined
                        }
                    });
                    const newProfile = yield tx.studentProfile.create({
                        data: {
                            user: { connect: { id: newUser.id } },
                            studentId,
                            fullName,
                            gender,
                            birthDate: new Date(birthDate),
                            identityCardNumber,
                            phoneNumber,
                            faculty,
                            courseYear: parseInt(courseYear),
                            startDate: new Date(startDate),
                            contractEndDate: new Date(contractEndDate),
                            status: status || client_1.StudentStatus.PENDING_APPROVAL,
                            className: className || null,
                            personalEmail: personalEmail || null,
                            ethnicity: ethnicity || null,
                            religion: religion || null,
                            priorityObject: priorityObject || null,
                            permanentProvince: permanentProvince || null,
                            permanentDistrict: permanentDistrict || null,
                            permanentAddress: permanentAddress || null,
                            fatherName: fatherName || null,
                            fatherDobYear: fatherDobYear ? parseInt(fatherDobYear) : null,
                            fatherPhone: fatherPhone || null,
                            fatherAddress: fatherAddress || null,
                            motherName: motherName || null,
                            motherDobYear: motherDobYear ? parseInt(motherDobYear) : null,
                            motherPhone: motherPhone || null,
                            motherAddress: motherAddress || null,
                            emergencyContactRelation: emergencyContactRelation || null,
                            emergencyContactPhone: emergencyContactPhone || null,
                            emergencyContactAddress: emergencyContactAddress || null,
                            room: roomId ? { connect: { id: parseInt(roomId) } } : undefined
                        }
                    });
                    return { user: newUser, profile: newProfile };
                }));
                const createdStudent = yield prisma.studentProfile.findUnique({
                    where: { id: newUserAndProfile.profile.id },
                    include: {
                        user: { select: { id: true, email: true, isActive: true, avatar: true } },
                        room: { include: { building: true } }
                    }
                });
                res.status(201).json({
                    status: 'success',
                    message: 'Sinh viên đã được tạo thành công',
                    data: createdStudent
                });
            }
            catch (error) {
                console.error('Lỗi khi tạo sinh viên:', error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                    if (error.code === 'P2002') {
                        const fields = (_b = (_a = error.meta) === null || _a === void 0 ? void 0 : _a.target) === null || _b === void 0 ? void 0 : _b.join(', ');
                        return next(new Error(`Lỗi trùng lặp dữ liệu. Trường(s): ${fields} đã tồn tại.`));
                    }
                }
                next(error);
            }
        });
    }
    // Cập nhật thông tin sinh viên
    updateStudent(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const profileId = parseInt(req.params.id);
                if (isNaN(profileId)) {
                    return next(new Error('ID hồ sơ sinh viên không hợp lệ'));
                }
                const _c = req.body, { avatarId, roomId } = _c, profileData = __rest(_c, ["avatarId", "roomId"]);
                const currentProfile = yield prisma.studentProfile.findUnique({
                    where: { id: profileId },
                    include: { user: { select: { id: true, avatarId: true } } }
                });
                if (!currentProfile || !currentProfile.user) {
                    return next(new Error(`Không tìm thấy hồ sơ sinh viên với ID ${profileId}`));
                }
                if (profileData.studentId && profileData.studentId !== currentProfile.studentId) {
                    const existingStudentWithId = yield prisma.studentProfile.findUnique({
                        where: { studentId: profileData.studentId }
                    });
                    if (existingStudentWithId) {
                        return next(new Error(`Mã sinh viên ${profileData.studentId} đã được sử dụng bởi sinh viên khác.`));
                    }
                }
                const userId = currentProfile.user.id;
                const currentAvatarId = currentProfile.user.avatarId;
                let oldAvatarPath = null;
                const updatedProfile = yield prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    if (avatarId !== undefined) {
                        const newAvatarId = avatarId ? parseInt(avatarId) : null;
                        if (currentAvatarId !== newAvatarId) {
                            yield tx.user.update({
                                where: { id: userId },
                                data: { avatarId: newAvatarId },
                            });
                            if (currentAvatarId && currentAvatarId !== newAvatarId) {
                                const oldAvatar = yield tx.media.findUnique({ where: { id: currentAvatarId } });
                                if (oldAvatar) {
                                    oldAvatarPath = oldAvatar.path;
                                    yield tx.media.delete({ where: { id: currentAvatarId } });
                                }
                            }
                        }
                    }
                    const studentUpdateData = {
                        studentId: profileData.studentId,
                        fullName: profileData.fullName,
                        gender: profileData.gender,
                        birthDate: profileData.birthDate ? new Date(profileData.birthDate) : undefined,
                        identityCardNumber: profileData.identityCardNumber,
                        phoneNumber: profileData.phoneNumber,
                        faculty: profileData.faculty,
                        courseYear: profileData.courseYear ? parseInt(profileData.courseYear) : undefined,
                        className: profileData.className,
                        permanentProvince: profileData.permanentProvince,
                        permanentDistrict: profileData.permanentDistrict,
                        permanentAddress: profileData.permanentAddress,
                        status: profileData.status,
                        startDate: profileData.startDate ? new Date(profileData.startDate) : undefined,
                        contractEndDate: profileData.contractEndDate ? new Date(profileData.contractEndDate) : undefined,
                        checkInDate: profileData.checkInDate !== undefined ? (profileData.checkInDate ? new Date(profileData.checkInDate) : null) : undefined,
                        checkOutDate: profileData.checkOutDate !== undefined ? (profileData.checkOutDate ? new Date(profileData.checkOutDate) : null) : undefined,
                        personalEmail: profileData.personalEmail, ethnicity: profileData.ethnicity, religion: profileData.religion, priorityObject: profileData.priorityObject,
                        fatherName: profileData.fatherName, fatherDobYear: profileData.fatherDobYear ? parseInt(profileData.fatherDobYear) : null, fatherPhone: profileData.fatherPhone, fatherAddress: profileData.fatherAddress,
                        motherName: profileData.motherName, motherDobYear: profileData.motherDobYear ? parseInt(profileData.motherDobYear) : null, motherPhone: profileData.motherPhone, motherAddress: profileData.motherAddress,
                        emergencyContactRelation: profileData.emergencyContactRelation, emergencyContactPhone: profileData.emergencyContactPhone, emergencyContactAddress: profileData.emergencyContactAddress,
                        room: roomId !== undefined
                            ? (roomId ? { connect: { id: parseInt(roomId) } } : { disconnect: true })
                            : undefined
                    };
                    const profileAfterUpdate = yield tx.studentProfile.update({
                        where: { id: profileId },
                        data: studentUpdateData,
                        include: {
                            user: { select: { id: true, email: true, isActive: true, avatar: true } },
                            room: { include: { building: true } }
                        }
                    });
                    return profileAfterUpdate;
                }));
                if (oldAvatarPath && typeof file_service_1.deleteFile === 'function') {
                    (0, file_service_1.deleteFile)(oldAvatarPath);
                }
                else if (oldAvatarPath) {
                    console.warn(`deleteFile function not available, cannot delete old avatar: ${oldAvatarPath}`);
                }
                res.status(200).json({
                    status: 'success',
                    message: 'Thông tin sinh viên đã được cập nhật',
                    data: updatedProfile
                });
            }
            catch (error) {
                console.error('Lỗi khi cập nhật sinh viên:', error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                    if (error.code === 'P2002') {
                        const fields = (_b = (_a = error.meta) === null || _a === void 0 ? void 0 : _a.target) === null || _b === void 0 ? void 0 : _b.join(', ');
                        return next(new Error(`Lỗi trùng lặp dữ liệu. Trường(s): ${fields} đã tồn tại.`));
                    }
                    else if (error.code === 'P2025') {
                        return next(new Error(`Không tìm thấy hồ sơ sinh viên hoặc tài nguyên liên quan (ID: ${req.params.id})`));
                    }
                }
                next(error);
            }
        });
    }
    // Xóa sinh viên
    deleteStudent(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const profileId = parseInt(req.params.id);
                if (isNaN(profileId)) {
                    return next(new Error('ID hồ sơ sinh viên không hợp lệ'));
                }
                const deletedData = yield prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    const studentProfile = yield tx.studentProfile.findUnique({
                        where: { id: profileId },
                        include: {
                            user: { select: { id: true, avatarId: true, avatar: { select: { path: true } } } },
                            vehicleRegistrations: { select: { images: { select: { id: true, path: true } } } },
                            reportedMaintenances: { select: { images: { select: { id: true, path: true } } } },
                            payments: { select: { id: true } },
                            invoices: { select: { id: true } },
                            roomTransfers: { select: { id: true } },
                        }
                    });
                    if (!studentProfile || !studentProfile.user) {
                        throw new Error(`Không tìm thấy hồ sơ sinh viên với ID ${profileId}`);
                    }
                    const userId = studentProfile.user.id;
                    const mediaToDelete = [];
                    if (studentProfile.user.avatar) {
                        mediaToDelete.push({ id: studentProfile.user.avatarId, path: studentProfile.user.avatar.path });
                    }
                    studentProfile.vehicleRegistrations.forEach(vr => vr.images.forEach(img => mediaToDelete.push({ id: img.id, path: img.path })));
                    studentProfile.reportedMaintenances.forEach(m => m.images.forEach(img => mediaToDelete.push({ id: img.id, path: img.path })));
                    const uniqueMediaToDelete = mediaToDelete.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
                    yield tx.payment.deleteMany({ where: { studentProfileId: profileId } });
                    yield tx.invoice.deleteMany({ where: { studentProfileId: profileId } });
                    yield tx.roomTransfer.deleteMany({ where: { studentProfileId: profileId } });
                    yield tx.maintenance.deleteMany({ where: { reportedById: profileId } });
                    yield tx.vehicleRegistration.deleteMany({ where: { studentProfileId: profileId } });
                    yield tx.user.delete({
                        where: { id: userId }
                    });
                    const mediaIdsToDelete = uniqueMediaToDelete.map(m => m.id);
                    if (mediaIdsToDelete.length > 0) {
                        yield tx.media.deleteMany({
                            where: { id: { in: mediaIdsToDelete } }
                        });
                    }
                    return { mediaPathsToDelete: uniqueMediaToDelete.map(m => m.path) };
                }));
                if (typeof file_service_1.deleteFile === 'function') {
                    deletedData.mediaPathsToDelete.forEach(file_service_1.deleteFile);
                }
                else {
                    console.warn(`deleteFile function not available, cannot delete associated media files.`);
                }
                res.status(200).json({
                    status: 'success',
                    message: 'Sinh viên đã được xóa thành công',
                    data: null
                });
            }
            catch (error) {
                console.error('Lỗi khi xóa sinh viên:', error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    return next(new Error(`Không tìm thấy hồ sơ sinh viên hoặc tài nguyên liên quan (ID: ${req.params.id})`));
                }
                else if (error.message.includes('Không tìm thấy hồ sơ sinh viên')) {
                    return next(new Error(error.message));
                }
                next(error);
            }
        });
    }
}
exports.StudentController = StudentController;
class StaffController {
    // Lấy danh sách tất cả nhân viên
    getAllStaff(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const staffProfiles = yield prisma.staffProfile.findMany({
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                isActive: true,
                                role: true,
                                avatar: true
                            }
                        },
                        managedBuilding: true
                    },
                    orderBy: {
                        fullName: 'asc'
                    }
                });
                res.status(200).json({
                    status: 'success',
                    results: staffProfiles.length,
                    data: staffProfiles
                });
            }
            catch (error) {
                console.error('Lỗi khi lấy danh sách nhân viên:', error);
                next(error);
            }
        });
    }
    // Lấy thông tin chi tiết một nhân viên bằng Profile ID
    getStaffById(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                if (isNaN(id)) {
                    return next(new Error('ID hồ sơ nhân viên không hợp lệ'));
                }
                const staff = yield prisma.staffProfile.findUnique({
                    where: { id: id },
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                isActive: true,
                                role: true,
                                avatar: true
                            }
                        },
                        managedBuilding: true
                    }
                });
                if (!staff) {
                    return next(new Error(`Không tìm thấy hồ sơ nhân viên với ID ${id}`));
                }
                res.status(200).json({
                    status: 'success',
                    data: staff
                });
            }
            catch (error) {
                console.error('Lỗi khi lấy chi tiết nhân viên:', error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    return next(new Error(`Không tìm thấy hồ sơ nhân viên với ID ${req.params.id}`));
                }
                next(error);
            }
        });
    }
    // Cập nhật thông tin nhân viên
    updateStaff(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const profileId = parseInt(req.params.id);
                if (isNaN(profileId)) {
                    return next(new Error('ID hồ sơ nhân viên không hợp lệ'));
                }
                const _c = req.body, { avatarId, managedBuildingId } = _c, profileData = __rest(_c, ["avatarId", "managedBuildingId"]);
                const currentProfile = yield prisma.staffProfile.findUnique({
                    where: { id: profileId },
                    include: { user: { select: { id: true, avatarId: true } } }
                });
                if (!currentProfile || !currentProfile.user) {
                    return next(new Error(`Không tìm thấy hồ sơ nhân viên với ID ${profileId}`));
                }
                const userId = currentProfile.user.id;
                const currentAvatarId = currentProfile.user.avatarId;
                let oldAvatarPath = null;
                const updatedProfile = yield prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    if (avatarId !== undefined) {
                        const newAvatarId = avatarId ? parseInt(avatarId) : null;
                        if (currentAvatarId !== newAvatarId) {
                            yield tx.user.update({
                                where: { id: userId },
                                data: { avatarId: newAvatarId },
                            });
                            if (currentAvatarId && currentAvatarId !== newAvatarId) {
                                const oldAvatar = yield tx.media.findUnique({ where: { id: currentAvatarId } });
                                if (oldAvatar) {
                                    oldAvatarPath = oldAvatar.path;
                                    yield tx.media.delete({ where: { id: currentAvatarId } });
                                }
                            }
                        }
                    }
                    const staffUpdateData = {
                        fullName: profileData.fullName,
                        gender: profileData.gender,
                        birthDate: profileData.birthDate ? new Date(profileData.birthDate) : undefined,
                        identityCardNumber: profileData.identityCardNumber,
                        phoneNumber: profileData.phoneNumber,
                        position: profileData.position,
                        address: profileData.address,
                        managedBuilding: managedBuildingId !== undefined
                            ? (managedBuildingId ? { connect: { id: parseInt(managedBuildingId) } } : { disconnect: true })
                            : undefined
                    };
                    const profileAfterUpdate = yield tx.staffProfile.update({
                        where: { id: profileId },
                        data: staffUpdateData,
                        include: {
                            user: { select: { id: true, email: true, isActive: true, role: true, avatar: true } },
                            managedBuilding: true
                        }
                    });
                    return profileAfterUpdate;
                }));
                if (oldAvatarPath && typeof file_service_1.deleteFile === 'function') {
                    (0, file_service_1.deleteFile)(oldAvatarPath);
                }
                else if (oldAvatarPath) {
                    console.warn(`deleteFile function not available, cannot delete old avatar: ${oldAvatarPath}`);
                }
                res.status(200).json({
                    status: 'success',
                    message: 'Thông tin nhân viên đã được cập nhật',
                    data: updatedProfile
                });
            }
            catch (error) {
                console.error('Lỗi khi cập nhật nhân viên:', error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                    if (error.code === 'P2002') {
                        const fields = (_b = (_a = error.meta) === null || _a === void 0 ? void 0 : _a.target) === null || _b === void 0 ? void 0 : _b.join(', ');
                        return next(new Error(`Lỗi trùng lặp dữ liệu. Trường(s): ${fields} đã tồn tại.`));
                    }
                    else if (error.code === 'P2025') {
                        return next(new Error(`Không tìm thấy hồ sơ nhân viên hoặc tài nguyên liên quan (ID: ${req.params.id}`));
                    }
                }
                next(error);
            }
        });
    }
}
exports.StaffController = StaffController;
