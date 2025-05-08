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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffController = void 0;
const client_1 = require("@prisma/client");
const file_service_1 = require("../services/file.service");
const prisma = new client_1.PrismaClient();
class StaffController {
    // Lấy danh sách tất cả nhân viên (Admin/Staff)
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
                // Tìm profile và user liên quan để kiểm tra tồn tại và lấy userId, avatar cũ
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
                // Transaction để đảm bảo tính toàn vẹn dữ liệu
                const updatedProfile = yield prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    // Xử lý cập nhật Avatar
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
                    // Chuẩn bị dữ liệu cập nhật cho StaffProfile
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
                    // Cập nhật StaffProfile
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
                // Xóa file vật lý của avatar cũ (nếu có)
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
                        return next(new Error(`Không tìm thấy hồ sơ nhân viên hoặc tài nguyên liên quan (ID: ${req.params.id})`));
                    }
                }
                next(error);
            }
        });
    }
}
exports.StaffController = StaffController;
