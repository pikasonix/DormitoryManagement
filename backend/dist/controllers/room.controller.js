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
exports.RoomController = void 0;
const client_1 = require("@prisma/client");
const file_service_1 = require("../services/file.service");
const prisma = new client_1.PrismaClient();
class RoomController {
    getAllRooms(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { buildingId, status, type, hasVacancy, page, limit, search } = req.query;
                const whereClause = {};
                if (buildingId)
                    whereClause.buildingId = parseInt(buildingId);
                if (status)
                    whereClause.status = status;
                if (type)
                    whereClause.type = type;
                if (search) {
                    whereClause.number = { contains: search };
                }
                if (hasVacancy === 'true') {
                    whereClause.status = { not: client_1.RoomStatus.UNDER_MAINTENANCE };
                    whereClause.AND = [
                        ...(whereClause.AND || []),
                        { capacity: { gt: prisma.room.fields.actualOccupancy } }
                    ];
                }
                else if (hasVacancy === 'false') {
                    whereClause.OR = [
                        { status: client_1.RoomStatus.FULL },
                        { status: client_1.RoomStatus.UNDER_MAINTENANCE },
                        { capacity: { lte: prisma.room.fields.actualOccupancy } }
                    ];
                }
                // Pagination
                const pageNum = parseInt(page) || 1;
                const limitNum = parseInt(limit) || 10;
                const skip = (pageNum - 1) * limitNum;
                // Execute count and findMany in parallel to improve performance
                const [totalRecords, rooms] = yield Promise.all([
                    prisma.room.count({ where: whereClause }),
                    prisma.room.findMany({
                        where: whereClause,
                        include: {
                            building: { select: { id: true, name: true } },
                            images: true,
                            residents: {
                                select: {
                                    id: true,
                                    fullName: true,
                                    studentId: true,
                                    user: { select: { avatar: true } }
                                }
                            },
                            amenities: {
                                include: {
                                    amenity: true
                                }
                            }
                        },
                        orderBy: [
                            { building: { name: 'asc' } },
                            { floor: 'asc' },
                            { number: 'asc' }
                        ],
                        skip: skip,
                        take: limitNum
                    })
                ]);
                res.status(200).json({
                    status: 'success',
                    results: rooms.length,
                    total: totalRecords,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(totalRecords / limitNum),
                    data: rooms
                });
            }
            catch (error) {
                console.error('Lỗi khi lấy danh sách phòng:', error);
                next(error);
            }
        });
    }
    getRoomById(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                if (isNaN(id)) {
                    return next(new Error('ID phòng không hợp lệ'));
                }
                const room = yield prisma.room.findUnique({
                    where: { id },
                    include: {
                        building: true,
                        images: true,
                        residents: {
                            include: { user: { select: { id: true, email: true, isActive: true, avatar: true } } }
                        },
                        amenities: { include: { amenity: true } },
                        maintenances: { orderBy: { reportDate: 'desc' }, take: 5, include: { reportedBy: true, assignedTo: true, images: true } },
                        meterReadings: { orderBy: { readingDate: 'desc' }, take: 6 },
                        invoices: { where: { roomId: id }, orderBy: { issueDate: 'desc' }, take: 3 }
                    }
                });
                if (!room) {
                    return next(new Error(`Không tìm thấy phòng với ID ${id}`));
                }
                res.status(200).json({
                    status: 'success',
                    data: room
                });
            }
            catch (error) {
                console.error('Lỗi khi lấy chi tiết phòng:', error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    return next(new Error(`Không tìm thấy phòng với ID ${req.params.id}`));
                }
                next(error);
            }
        });
    }
    createRoom(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { buildingId, number, type, capacity, floor, status, description, amenities, imageIds } = req.body;
                if (!buildingId || !number || !type || !capacity || !floor) {
                    return next(new Error('Thiếu trường bắt buộc: buildingId, number, type, capacity, floor'));
                }
                if (!Object.values(client_1.RoomType).includes(type)) {
                    return next(new Error(`Loại phòng không hợp lệ: ${type}`));
                }
                if (status && !Object.values(client_1.RoomStatus).includes(status)) {
                    return next(new Error(`Trạng thái phòng không hợp lệ: ${status}`));
                }
                const existingRoom = yield prisma.room.findUnique({ where: { buildingId_number: { buildingId: parseInt(buildingId), number } } });
                if (existingRoom) {
                    return next(new Error(`Số phòng "${number}" đã tồn tại trong tòa nhà này.`));
                }
                const newRoom = yield prisma.room.create({
                    data: {
                        building: { connect: { id: parseInt(buildingId) } },
                        number,
                        type: type,
                        capacity: parseInt(capacity),
                        floor: parseInt(floor),
                        status: status || client_1.RoomStatus.AVAILABLE,
                        description: description || null,
                        actualOccupancy: 0,
                        amenities: amenities && Array.isArray(amenities) && amenities.length > 0 ? {
                            create: amenities.map((am) => ({
                                amenity: { connect: { id: parseInt(am.amenityId) } },
                                quantity: am.quantity ? parseInt(am.quantity) : 1,
                                notes: am.notes || null
                            }))
                        } : undefined,
                        images: imageIds && Array.isArray(imageIds) && imageIds.length > 0 ? {
                            connect: imageIds.map((id) => ({ id: parseInt(id) }))
                        } : undefined
                    },
                    include: {
                        building: true,
                        images: true,
                        amenities: { include: { amenity: true } }
                    }
                });
                res.status(201).json({
                    status: 'success',
                    data: newRoom
                });
            }
            catch (error) {
                console.error('Lỗi khi tạo phòng:', error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    return next(new Error('Không tìm thấy tòa nhà hoặc tiện nghi được chỉ định.'));
                }
                next(error);
            }
        });
    }
    updateRoom(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                if (isNaN(id)) {
                    return next(new Error('ID phòng không hợp lệ'));
                }
                const { number, type, capacity, floor, status, description, amenities, imageIds } = req.body;
                if (type && !Object.values(client_1.RoomType).includes(type)) {
                    return next(new Error(`Loại phòng không hợp lệ: ${type}`));
                }
                if (status && !Object.values(client_1.RoomStatus).includes(status)) {
                    return next(new Error(`Trạng thái phòng không hợp lệ: ${status}`));
                }
                if (number) {
                    const currentRoom = yield prisma.room.findUnique({ where: { id }, select: { buildingId: true } });
                    if (!currentRoom)
                        return next(new Error(`Không tìm thấy phòng với ID ${id}`));
                    const existingRoom = yield prisma.room.findUnique({ where: { buildingId_number: { buildingId: currentRoom.buildingId, number } } });
                    if (existingRoom && existingRoom.id !== id) {
                        return next(new Error(`Số phòng "${number}" đã tồn tại trong tòa nhà này.`));
                    }
                }
                let oldImagePaths = [];
                const updatedRoom = yield prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    let imagesUpdate = undefined;
                    if (imageIds !== undefined) {
                        const currentImages = yield tx.room.findUnique({
                            where: { id },
                            select: { images: { select: { id: true, path: true } } }
                        });
                        const currentImageIds = (currentImages === null || currentImages === void 0 ? void 0 : currentImages.images.map(img => img.id)) || [];
                        const newImageIds = Array.isArray(imageIds) ? imageIds.map(id => parseInt(id)).filter(id => !isNaN(id)) : [];
                        const idsToConnect = newImageIds.filter(id => !currentImageIds.includes(id));
                        const idsToDisconnect = currentImageIds.filter(id => !newImageIds.includes(id));
                        oldImagePaths = (currentImages === null || currentImages === void 0 ? void 0 : currentImages.images.filter(img => idsToDisconnect.includes(img.id)).map(img => img.path)) || [];
                        imagesUpdate = {
                            disconnect: idsToDisconnect.map(id => ({ id })),
                            connect: idsToConnect.map(id => ({ id })),
                        };
                    }
                    let amenitiesUpdate = undefined;
                    if (amenities !== undefined) {
                        const newAmenitiesData = Array.isArray(amenities) ? amenities.map((am) => ({
                            amenityId: parseInt(am.amenityId),
                            quantity: am.quantity ? parseInt(am.quantity) : 1,
                            notes: am.notes || null
                        })).filter(am => !isNaN(am.amenityId)) : [];
                        amenitiesUpdate = {
                            deleteMany: {},
                            create: newAmenitiesData
                        };
                    }
                    const roomUpdateData = {
                        number: number || undefined,
                        type: type,
                        capacity: capacity ? parseInt(capacity) : undefined,
                        floor: floor ? parseInt(floor) : undefined,
                        status: status,
                        description: description,
                        images: imagesUpdate,
                        amenities: amenitiesUpdate
                    };
                    const roomAfterUpdate = yield tx.room.update({
                        where: { id },
                        data: roomUpdateData,
                        include: {
                            building: true,
                            images: true,
                            amenities: { include: { amenity: true } }
                        }
                    });
                    const mediaIdsToDelete = oldImagePaths.length > 0
                        ? (yield tx.media.findMany({ where: { path: { in: oldImagePaths } }, select: { id: true } })).map(m => m.id)
                        : [];
                    if (mediaIdsToDelete.length > 0) {
                        yield tx.media.deleteMany({ where: { id: { in: mediaIdsToDelete } } });
                    }
                    return roomAfterUpdate;
                }));
                if (oldImagePaths.length > 0 && typeof file_service_1.deleteFile === 'function') {
                    yield Promise.allSettled(oldImagePaths.map(filePath => (0, file_service_1.deleteFile)(filePath)));
                }
                else if (oldImagePaths.length > 0) {
                    console.warn(`[RoomController] deleteFile function not available, cannot delete old room images.`);
                }
                res.status(200).json({
                    status: 'success',
                    data: updatedRoom
                });
            }
            catch (error) {
                console.error('Lỗi khi cập nhật phòng:', error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                    if (error.code === 'P2002') {
                        return next(new Error(`Số phòng "${req.body.number}" đã tồn tại trong tòa nhà này.`));
                    }
                    else if (error.code === 'P2025') {
                        return next(new Error(`Không tìm thấy phòng hoặc tài nguyên liên quan (ID: ${req.params.id})`));
                    }
                }
                next(error);
            }
        });
    }
    deleteRoom(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                if (isNaN(id)) {
                    return next(new Error('ID phòng không hợp lệ'));
                }
                let imagePathsToDelete = [];
                yield prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    const roomToDelete = yield tx.room.findUnique({
                        where: { id },
                        include: {
                            images: { select: { id: true, path: true } },
                            residents: { select: { id: true } }
                        }
                    });
                    if (!roomToDelete) {
                        throw new Error(`Không tìm thấy phòng với ID ${id}`);
                    }
                    imagePathsToDelete = roomToDelete.images.map(img => img.path);
                    yield tx.roomAmenity.deleteMany({ where: { roomId: id } });
                    yield tx.utilityMeterReading.deleteMany({ where: { roomId: id } });
                    yield tx.invoice.deleteMany({ where: { roomId: id } });
                    yield tx.maintenance.deleteMany({ where: { roomId: id } });
                    const residentIds = roomToDelete.residents.map(r => r.id);
                    if (residentIds.length > 0) {
                        yield tx.studentProfile.updateMany({
                            where: { id: { in: residentIds } },
                            data: { roomId: null }
                        });
                    }
                    const imageIdsToDelete = roomToDelete.images.map(img => img.id);
                    if (imageIdsToDelete.length > 0) {
                        yield tx.media.deleteMany({ where: { id: { in: imageIdsToDelete } } });
                    }
                    yield tx.room.delete({
                        where: { id }
                    });
                }));
                if (imagePathsToDelete.length > 0 && typeof file_service_1.deleteFile === 'function') {
                    yield Promise.allSettled(imagePathsToDelete.map(filePath => (0, file_service_1.deleteFile)(filePath)));
                }
                else if (imagePathsToDelete.length > 0) {
                    console.warn(`[RoomController] deleteFile function not available, cannot delete room images.`);
                }
                res.status(200).json({
                    status: 'success',
                    message: 'Phòng đã được xóa thành công',
                    data: null
                });
            }
            catch (error) {
                console.error('Lỗi khi xóa phòng:', error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    return next(new Error(`Không tìm thấy phòng hoặc tài nguyên liên quan (ID: ${req.params.id})`));
                }
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
                    return next(new Error(`Không thể xóa phòng vì vẫn còn dữ liệu liên quan (vd: sinh viên, hóa đơn...). Vui lòng kiểm tra lại.`));
                }
                next(error);
            }
        });
    }
}
exports.RoomController = RoomController;
