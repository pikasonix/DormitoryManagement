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
exports.VehicleService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class VehicleService {
    /**
     * Tìm kiếm và lấy danh sách các đăng ký xe.
     * @param options Tùy chọn tìm kiếm Prisma (where, include, orderBy, etc.)
     */
    findAll(options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const registrations = yield prisma.vehicleRegistration.findMany(Object.assign(Object.assign({}, options), { include: Object.assign({ studentProfile: {
                            select: {
                                id: true,
                                fullName: true,
                                studentId: true,
                                phoneNumber: true,
                                room: { select: { number: true, building: { select: { name: true } } } }
                            }
                        }, images: true }, ((options === null || options === void 0 ? void 0 : options.include) || {})), orderBy: (options === null || options === void 0 ? void 0 : options.orderBy) || { createdAt: 'desc' } }));
                return registrations;
            }
            catch (error) {
                console.error("[VehicleService.findAll] Error:", error);
                throw error;
            }
        });
    }
    /**
     * Tìm một đăng ký xe bằng ID.
     * @param id ID của VehicleRegistration
     * @param options Tùy chọn Prisma findUnique
     * @throws Error nếu không tìm thấy
     */
    findById(id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNaN(id)) {
                throw new Error('ID đăng ký xe không hợp lệ');
            }
            try {
                const registration = yield prisma.vehicleRegistration.findUnique(Object.assign(Object.assign({ where: { id } }, options), { include: Object.assign({ studentProfile: {
                            include: {
                                user: { select: { email: true, avatar: true } }
                            },
                        }, images: true }, ((options === null || options === void 0 ? void 0 : options.include) || {})) }));
                if (!registration) {
                    throw new Error(`Không tìm thấy đăng ký xe với ID ${id}`);
                }
                return registration;
            }
            catch (error) {
                console.error(`[VehicleService.findById] Error fetching registration ${id}:`, error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    throw new Error(`Không tìm thấy đăng ký xe với ID ${id}`);
                }
                throw error;
            }
        });
    }
    /**
     * Tạo một đăng ký xe mới.
     * @param data Dữ liệu đăng ký xe.
     * @throws Error nếu dữ liệu không hợp lệ hoặc lỗi tạo.
     */
    create(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (!data.studentProfileId || !data.vehicleType || !data.licensePlate || !data.startDate) {
                throw new Error('Thiếu thông tin bắt buộc: studentProfileId, vehicleType, licensePlate, startDate.');
            }
            if (isNaN(parseInt(data.studentProfileId))) {
                throw new Error('studentProfileId không hợp lệ.');
            }
            if (!Object.values(client_1.VehicleType).includes(data.vehicleType)) {
                throw new Error(`Loại xe không hợp lệ: ${data.vehicleType}`);
            }
            if (data.parkingCardNo) {
                const existingCard = yield prisma.vehicleRegistration.findUnique({ where: { parkingCardNo: data.parkingCardNo } });
                if (existingCard) {
                    throw new Error(`Số thẻ gửi xe "${data.parkingCardNo}" đã tồn tại.`);
                }
            }
            try {
                const studentExists = yield prisma.studentProfile.findUnique({ where: { id: data.studentProfileId } });
                if (!studentExists) {
                    throw new Error(`Sinh viên với ID ${data.studentProfileId} không tồn tại.`);
                }
                const newRegistration = yield prisma.vehicleRegistration.create({
                    data: {
                        studentProfile: { connect: { id: data.studentProfileId } },
                        vehicleType: data.vehicleType,
                        licensePlate: data.licensePlate,
                        brand: data.brand,
                        model: data.model,
                        color: data.color,
                        parkingCardNo: data.parkingCardNo,
                        isActive: data.isActive !== undefined ? data.isActive : true,
                        startDate: new Date(data.startDate),
                        endDate: data.endDate ? new Date(data.endDate) : null,
                        notes: data.notes,
                        images: data.imageIds && data.imageIds.length > 0 ? {
                            connect: data.imageIds.map(id => ({ id }))
                        } : undefined,
                    },
                    include: {
                        studentProfile: { select: { id: true, fullName: true } },
                        images: true
                    }
                });
                return newRegistration;
            }
            catch (error) {
                console.error("[VehicleService.create] Error:", error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                    if (error.code === 'P2002') {
                        const fields = (_b = (_a = error.meta) === null || _a === void 0 ? void 0 : _a.target) === null || _b === void 0 ? void 0 : _b.join(', ');
                        throw new Error(`Lỗi trùng lặp dữ liệu. Trường(s): ${fields} đã tồn tại.`);
                    }
                    else if (error.code === 'P2003') {
                        throw new Error(`Sinh viên với ID ${data.studentProfileId} không tồn tại.`);
                    }
                }
                throw new Error('Không thể tạo đăng ký xe.');
            }
        });
    }
    /**
     * Cập nhật một đăng ký xe.
     * @param id ID của VehicleRegistration
     * @param data Dữ liệu cập nhật.
     * @returns Object chứa đăng ký đã cập nhật và path ảnh cũ cần xóa
     */
    update(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (isNaN(id)) {
                throw new Error('ID đăng ký xe không hợp lệ');
            }
            if (data.vehicleType && !Object.values(client_1.VehicleType).includes(data.vehicleType)) {
                throw new Error(`Loại xe không hợp lệ: ${data.vehicleType}`);
            }
            if (data.parkingCardNo) {
                const existingCard = yield prisma.vehicleRegistration.findFirst({
                    where: { parkingCardNo: data.parkingCardNo, NOT: { id: id } }
                });
                if (existingCard) {
                    throw new Error(`Số thẻ gửi xe "${data.parkingCardNo}" đã tồn tại.`);
                }
            }
            let oldImagePaths = [];
            try {
                const updatedResult = yield prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    const currentRegistration = yield tx.vehicleRegistration.findUnique({
                        where: { id },
                        include: { images: { select: { id: true, path: true } } }
                    });
                    if (!currentRegistration) {
                        throw new Error(`Không tìm thấy đăng ký xe với ID ${id}`);
                    }
                    let imagesUpdate = undefined;
                    if (data.imageIds !== undefined) {
                        const currentImageIds = currentRegistration.images.map(img => img.id);
                        const newImageIds = Array.isArray(data.imageIds)
                            ? data.imageIds.map(imgId => parseInt(imgId)).filter(imgId => !isNaN(imgId))
                            : [];
                        const idsToConnect = newImageIds.filter(imgId => !currentImageIds.includes(imgId));
                        const idsToDisconnect = currentImageIds.filter(imgId => !newImageIds.includes(imgId));
                        oldImagePaths = currentRegistration.images
                            .filter(img => idsToDisconnect.includes(img.id))
                            .map(img => img.path);
                        imagesUpdate = {
                            disconnect: idsToDisconnect.map(imgId => ({ id: imgId })),
                            connect: idsToConnect.map(imgId => ({ id: imgId })),
                        };
                        if (idsToDisconnect.length > 0) {
                            yield tx.media.deleteMany({ where: { id: { in: idsToDisconnect } } });
                        }
                    }
                    const updateData = {
                        vehicleType: data.vehicleType,
                        licensePlate: data.licensePlate,
                        brand: data.brand,
                        model: data.model,
                        color: data.color,
                        parkingCardNo: data.parkingCardNo !== undefined ? (data.parkingCardNo || null) : undefined,
                        isActive: data.isActive,
                        startDate: data.startDate ? new Date(data.startDate) : undefined,
                        endDate: data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : undefined,
                        notes: data.notes,
                        images: imagesUpdate
                    };
                    const updatedRegistration = yield tx.vehicleRegistration.update({
                        where: { id },
                        data: updateData,
                        include: {
                            studentProfile: { select: { id: true, fullName: true } },
                            images: true
                        }
                    });
                    return updatedRegistration;
                }));
                return { registration: updatedResult, oldImagePaths };
            }
            catch (error) {
                console.error(`[VehicleService.update] Error updating registration ${id}:`, error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                    if (error.code === 'P2002') {
                        const fields = (_b = (_a = error.meta) === null || _a === void 0 ? void 0 : _a.target) === null || _b === void 0 ? void 0 : _b.join(', ');
                        throw new Error(`Lỗi trùng lặp dữ liệu. Trường(s): ${fields} đã tồn tại.`);
                    }
                    else if (error.code === 'P2025') {
                        throw new Error(`Không tìm thấy đăng ký xe hoặc tài nguyên liên quan với ID ${id}`);
                    }
                }
                throw error;
            }
        });
    }
    /**
     * Xóa một đăng ký xe.
     * @param id ID của VehicleRegistration
     * @returns Danh sách path ảnh đã xóa
     * @throws Error nếu không tìm thấy hoặc lỗi xóa
     */
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNaN(id)) {
                throw new Error('ID đăng ký xe không hợp lệ');
            }
            let oldImagePaths = [];
            try {
                yield prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    const registrationToDelete = yield tx.vehicleRegistration.findUnique({
                        where: { id },
                        include: { images: { select: { id: true, path: true } } }
                    });
                    if (!registrationToDelete) {
                        throw new Error(`Không tìm thấy đăng ký xe với ID ${id}`);
                    }
                    const imageIdsToDelete = registrationToDelete.images.map(img => img.id);
                    oldImagePaths = registrationToDelete.images.map(img => img.path);
                    yield tx.vehicleRegistration.delete({ where: { id } });
                    if (imageIdsToDelete.length > 0) {
                        yield tx.media.deleteMany({ where: { id: { in: imageIdsToDelete } } });
                    }
                }));
                return { oldImagePaths };
            }
            catch (error) {
                console.error(`[VehicleService.delete] Error deleting registration ${id}:`, error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    throw new Error(`Không tìm thấy đăng ký xe với ID ${id}`);
                }
                throw error;
            }
        });
    }
}
exports.VehicleService = VehicleService;
