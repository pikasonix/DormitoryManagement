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
exports.MaintenanceService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class MaintenanceService {
    /**
     * Tìm kiếm và lấy danh sách các yêu cầu bảo trì.
     * @param options Tùy chọn tìm kiếm Prisma (where, include, orderBy, etc.)
     */
    findAll(options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const maintenances = yield prisma.maintenance.findMany(Object.assign(Object.assign({}, options), { include: Object.assign({ room: { select: { id: true, number: true, building: { select: { id: true, name: true } } } }, reportedBy: {
                            select: {
                                id: true,
                                fullName: true,
                                studentId: true,
                                userId: true,
                                user: { select: { id: true, email: true } }
                            }
                        }, assignedTo: { select: { id: true, fullName: true, position: true } }, images: true }, ((options === null || options === void 0 ? void 0 : options.include) || {})), orderBy: (options === null || options === void 0 ? void 0 : options.orderBy) || { reportDate: 'desc' } }));
                return maintenances;
            }
            catch (error) {
                console.error("[MaintenanceService.findAll] Error:", error);
                throw error;
            }
        });
    }
    /**
     * Tìm một yêu cầu bảo trì bằng ID.
     * @param id ID của Maintenance
     * @param options Tùy chọn Prisma findUnique (ví dụ: include)
     * @throws Error nếu không tìm thấy
     */
    findById(id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNaN(id)) {
                throw new Error('ID yêu cầu bảo trì không hợp lệ');
            }
            try {
                const maintenance = yield prisma.maintenance.findUnique(Object.assign(Object.assign({ where: { id } }, options), { include: Object.assign({ room: { include: { building: true } }, reportedBy: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        email: true,
                                        avatar: true
                                    }
                                }
                            }
                        }, assignedTo: { include: { user: { select: { email: true, avatar: true } } } }, images: true }, ((options === null || options === void 0 ? void 0 : options.include) || {})) }));
                if (!maintenance) {
                    throw new Error(`Không tìm thấy yêu cầu bảo trì với ID ${id}`);
                }
                return maintenance;
            }
            catch (error) {
                console.error(`[MaintenanceService.findById] Error fetching maintenance ${id}:`, error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    throw new Error(`Không tìm thấy yêu cầu bảo trì với ID ${id}`);
                }
                throw error;
            }
        });
    }
    /**
     * Tạo một yêu cầu bảo trì mới.
     * @param data Dữ liệu để tạo Maintenance (roomId, reportedById, issue, notes, imageIds?)
     */
    create(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const roomExists = yield prisma.room.findUnique({ where: { id: data.roomId } });
                // Kiểm tra người báo cáo theo userId thay vì id
                const reporterExists = yield prisma.studentProfile.findUnique({ where: { userId: data.reportedById } });
                if (!roomExists)
                    throw new Error(`Phòng với ID ${data.roomId} không tồn tại.`);
                if (!reporterExists)
                    throw new Error(`Người báo cáo (StudentProfile) với ID người dùng ${data.reportedById} không tồn tại.`);
                if (data.assignedToId) {
                    const assigneeExists = yield prisma.staffProfile.findUnique({ where: { id: data.assignedToId } });
                    if (!assigneeExists)
                        throw new Error(`Nhân viên được giao (StaffProfile) với ID ${data.assignedToId} không tồn tại.`);
                }
                const newMaintenance = yield prisma.maintenance.create({
                    data: {
                        room: { connect: { id: data.roomId } },
                        reportedBy: { connect: { userId: data.reportedById } }, // Sửa thành userId
                        issue: data.issue,
                        notes: data.notes,
                        status: data.status || client_1.MaintenanceStatus.PENDING,
                        reportDate: new Date(),
                        assignedTo: data.assignedToId ? { connect: { id: data.assignedToId } } : undefined,
                        images: data.imageIds && data.imageIds.length > 0 ? {
                            connect: data.imageIds.map(id => ({ id }))
                        } : undefined,
                    },
                    include: {
                        room: { select: { number: true, building: { select: { name: true } } } },
                        reportedBy: { select: { fullName: true } },
                        assignedTo: { select: { fullName: true } },
                        images: true
                    }
                });
                return newMaintenance;
            }
            catch (error) {
                console.error("[MaintenanceService.create] Error:", error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    throw new Error('Không tìm thấy phòng, người báo cáo hoặc người được giao.');
                }
                throw error;
            }
        });
    }
    /**
     * Cập nhật một yêu cầu bảo trì.
     * @param id ID của Maintenance cần cập nhật
     * @param data Dữ liệu cập nhật (issue, status, assignedToId, notes, imageIds)
     * @returns Object chứa Maintenance đã cập nhật và danh sách path ảnh cũ cần xóa
     */
    update(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNaN(id)) {
                throw new Error('ID yêu cầu bảo trì không hợp lệ');
            }
            // Chuyển đổi status thành chữ hoa để so sánh với enum MaintenanceStatus
            let normalizedStatus;
            if (data.status) {
                const upperStatus = typeof data.status === 'string'
                    ? data.status.toUpperCase()
                    : String(data.status).toUpperCase();
                // Kiểm tra nếu status sau khi chuyển đổi nằm trong các giá trị hợp lệ
                if (Object.values(client_1.MaintenanceStatus).includes(upperStatus)) {
                    normalizedStatus = upperStatus;
                }
                else {
                    throw new Error(`Trạng thái bảo trì không hợp lệ: ${data.status}`);
                }
            }
            let oldImagePaths = [];
            try {
                const updatedResult = yield prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    const currentMaintenance = yield tx.maintenance.findUnique({
                        where: { id },
                        include: { images: { select: { id: true, path: true } }, room: true }
                    });
                    if (!currentMaintenance || !currentMaintenance.room) {
                        throw new Error(`Không tìm thấy yêu cầu bảo trì hoặc phòng liên quan với ID ${id}`);
                    }
                    let imagesUpdate = undefined;
                    if (data.imageIds !== undefined) {
                        const currentImageIds = currentMaintenance.images.map(img => img.id);
                        const newImageIds = Array.isArray(data.imageIds)
                            ? data.imageIds.map(imgId => parseInt(imgId)).filter(imgId => !isNaN(imgId))
                            : [];
                        const idsToConnect = newImageIds.filter(imgId => !currentImageIds.includes(imgId));
                        const idsToDisconnect = currentImageIds.filter(imgId => !newImageIds.includes(imgId));
                        oldImagePaths = currentMaintenance.images
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
                        issue: data.issue,
                        status: normalizedStatus, // Sử dụng status đã được chuẩn hóa
                        notes: data.notes,
                        assignedTo: data.assignedToId !== undefined
                            ? (data.assignedToId ? { connect: { id: data.assignedToId } } : { disconnect: true })
                            : undefined,
                        completedDate: normalizedStatus === client_1.MaintenanceStatus.COMPLETED ? new Date() : normalizedStatus ? null : undefined,
                        images: imagesUpdate,
                    };
                    const updatedMaintenance = yield tx.maintenance.update({
                        where: { id },
                        data: updateData,
                        include: {
                            room: { select: { number: true, building: { select: { name: true } } } },
                            reportedBy: { select: { fullName: true } },
                            assignedTo: { select: { fullName: true } },
                            images: true
                        }
                    });
                    const currentRoomStatus = currentMaintenance.room.status;
                    let newRoomStatus = undefined;
                    if (normalizedStatus === client_1.MaintenanceStatus.IN_PROGRESS && currentRoomStatus !== client_1.RoomStatus.UNDER_MAINTENANCE) {
                        newRoomStatus = client_1.RoomStatus.UNDER_MAINTENANCE;
                    }
                    else if (normalizedStatus === client_1.MaintenanceStatus.COMPLETED && currentRoomStatus === client_1.RoomStatus.UNDER_MAINTENANCE) {
                        const roomInfo = yield tx.room.findUnique({ where: { id: currentMaintenance.roomId }, select: { capacity: true, actualOccupancy: true } });
                        newRoomStatus = (roomInfo && roomInfo.actualOccupancy >= roomInfo.capacity) ? client_1.RoomStatus.FULL : client_1.RoomStatus.AVAILABLE;
                    }
                    if (newRoomStatus !== undefined) {
                        yield tx.room.update({
                            where: { id: currentMaintenance.roomId },
                            data: { status: newRoomStatus }
                        });
                    }
                    return updatedMaintenance;
                }));
                return { maintenance: updatedResult, oldImagePaths };
            }
            catch (error) {
                console.error(`[MaintenanceService.update] Error updating maintenance ${id}:`, error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    throw new Error(`Không tìm thấy yêu cầu bảo trì, phòng, người được giao hoặc ảnh với ID ${id}`);
                }
                throw error;
            }
        });
    }
    /**
     * Xóa một yêu cầu bảo trì.
     * @param id ID của Maintenance cần xóa
     * @returns Danh sách path ảnh đã xóa (để xóa file vật lý)
     */
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNaN(id)) {
                throw new Error('ID yêu cầu bảo trì không hợp lệ');
            }
            let oldImagePaths = [];
            try {
                yield prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    const maintenanceToDelete = yield tx.maintenance.findUnique({
                        where: { id },
                        include: {
                            images: { select: { id: true, path: true } },
                            room: { select: { status: true } }
                        }
                    });
                    if (!maintenanceToDelete) {
                        throw new Error(`Không tìm thấy yêu cầu bảo trì với ID ${id}`);
                    }
                    const imageIdsToDelete = maintenanceToDelete.images.map(img => img.id);
                    oldImagePaths = maintenanceToDelete.images.map(img => img.path);
                    yield tx.maintenance.delete({ where: { id } });
                    if (imageIdsToDelete.length > 0) {
                        yield tx.media.deleteMany({ where: { id: { in: imageIdsToDelete } } });
                    }
                    if (((_a = maintenanceToDelete.room) === null || _a === void 0 ? void 0 : _a.status) === client_1.RoomStatus.UNDER_MAINTENANCE && maintenanceToDelete.status !== client_1.MaintenanceStatus.COMPLETED) {
                        const roomInfo = yield tx.room.findUnique({ where: { id: maintenanceToDelete.roomId }, select: { capacity: true, actualOccupancy: true } });
                        const nextStatus = (roomInfo && roomInfo.actualOccupancy >= roomInfo.capacity) ? client_1.RoomStatus.FULL : client_1.RoomStatus.AVAILABLE;
                        yield tx.room.update({ where: { id: maintenanceToDelete.roomId }, data: { status: nextStatus } });
                    }
                }));
                return { oldImagePaths };
            }
            catch (error) {
                console.error(`[MaintenanceService.delete] Error deleting maintenance ${id}:`, error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    throw new Error(`Không tìm thấy yêu cầu bảo trì với ID ${id}`);
                }
                throw error;
            }
        });
    }
}
exports.MaintenanceService = MaintenanceService;
