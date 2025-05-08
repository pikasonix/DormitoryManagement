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
exports.TransferService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class TransferService {
    /**
     * Lấy danh sách các yêu cầu chuyển phòng
     */
    findAll(options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const transfers = yield prisma.roomTransfer.findMany(Object.assign(Object.assign({}, options), { include: Object.assign({ studentProfile: {
                            select: { id: true, fullName: true, studentId: true }
                        }, fromRoom: {
                            select: { id: true, number: true, building: { select: { id: true, name: true } } }
                        }, toRoom: {
                            select: { id: true, number: true, building: { select: { id: true, name: true } } }
                        }, approvedBy: {
                            select: { id: true, fullName: true, position: true }
                        } }, ((options === null || options === void 0 ? void 0 : options.include) || {})), orderBy: (options === null || options === void 0 ? void 0 : options.orderBy) || { createdAt: 'desc' } }));
                return transfers;
            }
            catch (error) {
                console.error("[TransferService.findAll] Error:", error);
                throw error;
            }
        });
    }
    /**
     * Tìm một yêu cầu chuyển phòng theo ID
     */
    findById(id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNaN(id)) {
                throw new Error('ID yêu cầu chuyển phòng không hợp lệ');
            }
            try {
                const transfer = yield prisma.roomTransfer.findUnique(Object.assign(Object.assign({ where: { id } }, options), { include: Object.assign({ studentProfile: { include: { user: { select: { email: true, avatar: true } } } }, fromRoom: { include: { building: true } }, toRoom: { include: { building: true } }, approvedBy: { include: { user: { select: { email: true, avatar: true } } } } }, ((options === null || options === void 0 ? void 0 : options.include) || {})) }));
                if (!transfer) {
                    throw new Error(`Không tìm thấy yêu cầu chuyển phòng với ID ${id}`);
                }
                return transfer;
            }
            catch (error) {
                console.error(`[TransferService.findById] Error fetching transfer ${id}:`, error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    throw new Error(`Không tìm thấy yêu cầu chuyển phòng với ID ${id}`);
                }
                throw error;
            }
        });
    }
    /**
     * Tạo mới yêu cầu chuyển phòng
     */
    create(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data.studentProfileId || !data.toRoomId || !data.transferDate) {
                throw new Error('Thiếu thông tin bắt buộc: studentProfileId, toRoomId, transferDate.');
            }
            if (isNaN(parseInt(data.studentProfileId)) || isNaN(parseInt(data.toRoomId))) {
                throw new Error('studentProfileId hoặc toRoomId không hợp lệ.');
            }
            try {
                const student = yield prisma.studentProfile.findUnique({
                    where: { id: data.studentProfileId },
                    select: { id: true, roomId: true, status: true }
                });
                if (!student) {
                    throw new Error(`Không tìm thấy sinh viên với ID ${data.studentProfileId}.`);
                }
                if (student.status !== client_1.StudentStatus.RENTING) {
                    throw new Error(`Sinh viên này hiện không ở trạng thái 'RENTING', không thể yêu cầu chuyển phòng.`);
                }
                const toRoom = yield prisma.room.findUnique({
                    where: { id: data.toRoomId },
                    select: { id: true, status: true, capacity: true, actualOccupancy: true, buildingId: true }
                });
                if (!toRoom) {
                    throw new Error(`Không tìm thấy phòng muốn chuyển đến với ID ${data.toRoomId}.`);
                }
                if (toRoom.status === client_1.RoomStatus.UNDER_MAINTENANCE) {
                    throw new Error(`Phòng muốn chuyển đến (${toRoom.id}) đang được bảo trì.`);
                }
                if (toRoom.actualOccupancy >= toRoom.capacity) {
                    throw new Error(`Phòng muốn chuyển đến (${toRoom.id}) đã đầy.`);
                }
                const pendingTransfer = yield prisma.roomTransfer.findFirst({
                    where: {
                        studentProfileId: data.studentProfileId,
                        status: { in: [client_1.TransferStatus.PENDING, client_1.TransferStatus.APPROVED] }
                    }
                });
                if (pendingTransfer) {
                    throw new Error(`Bạn đã có một yêu cầu chuyển phòng đang chờ xử lý (ID: ${pendingTransfer.id}).`);
                }
                const newTransfer = yield prisma.roomTransfer.create({
                    data: {
                        studentProfile: { connect: { id: data.studentProfileId } },
                        fromRoom: student.roomId ? { connect: { id: student.roomId } } : undefined,
                        toRoom: { connect: { id: data.toRoomId } },
                        transferDate: new Date(data.transferDate),
                        reason: data.reason,
                        status: client_1.TransferStatus.PENDING
                    },
                    include: {
                        studentProfile: { select: { fullName: true, studentId: true } },
                        fromRoom: { select: { number: true, building: { select: { name: true } } } },
                        toRoom: { select: { number: true, building: { select: { name: true } } } }
                    }
                });
                return newTransfer;
            }
            catch (error) {
                console.error("[TransferService.create] Error:", error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    throw new Error('Không tìm thấy sinh viên hoặc phòng được chỉ định.');
                }
                else if (error instanceof Error && (error.message.includes('không thể yêu cầu chuyển phòng') ||
                    error.message.includes('đang được bảo trì') ||
                    error.message.includes('đã đầy') ||
                    error.message.includes('đã có một yêu cầu'))) {
                    throw error;
                }
                throw new Error('Không thể tạo yêu cầu chuyển phòng.');
            }
        });
    }
    /**
     * Cập nhật trạng thái yêu cầu chuyển phòng
     */
    updateStatus(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNaN(id)) {
                throw new Error('ID yêu cầu chuyển phòng không hợp lệ');
            }
            if (!data.status || !Object.values(client_1.TransferStatus).includes(data.status)) {
                throw new Error(`Trạng thái chuyển phòng không hợp lệ: ${data.status}`);
            }
            try {
                const updatedTransfer = yield prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    const currentTransfer = yield tx.roomTransfer.findUnique({
                        where: { id },
                        include: {
                            studentProfile: { select: { id: true, roomId: true } },
                            toRoom: { select: { id: true, capacity: true, actualOccupancy: true } }
                        }
                    });
                    if (!currentTransfer || !currentTransfer.studentProfile || !currentTransfer.toRoom) {
                        throw new Error(`Không tìm thấy yêu cầu chuyển phòng hoặc thông tin liên quan với ID ${id}`);
                    }
                    if (currentTransfer.status === client_1.TransferStatus.COMPLETED || currentTransfer.status === client_1.TransferStatus.REJECTED) {
                        throw new Error(`Không thể thay đổi trạng thái của yêu cầu đã ${currentTransfer.status}.`);
                    }
                    const transferUpdateData = {
                        status: data.status,
                        approvedBy: data.approvedById ? { connect: { id: data.approvedById } } : (data.status === client_1.TransferStatus.REJECTED ? { disconnect: true } : undefined),
                    };
                    if (data.status === client_1.TransferStatus.COMPLETED) {
                        const studentId = currentTransfer.studentProfileId;
                        const fromRoomId = currentTransfer.fromRoomId;
                        const toRoomId = currentTransfer.toRoomId;
                        const toRoomCurrent = yield tx.room.findUnique({ where: { id: toRoomId }, select: { capacity: true, actualOccupancy: true, status: true } });
                        if (!toRoomCurrent || toRoomCurrent.status !== client_1.RoomStatus.AVAILABLE || toRoomCurrent.actualOccupancy >= toRoomCurrent.capacity) {
                            throw new Error(`Không thể hoàn thành: Phòng mới (${toRoomId}) không còn chỗ hoặc không khả dụng.`);
                        }
                        yield tx.studentProfile.update({ where: { id: studentId }, data: { roomId: toRoomId } });
                        if (fromRoomId) {
                            yield tx.room.update({
                                where: { id: fromRoomId },
                                data: {
                                    actualOccupancy: { decrement: 1 },
                                    status: { set: client_1.RoomStatus.AVAILABLE }
                                }
                            });
                        }
                        const updatedToRoom = yield tx.room.update({ where: { id: toRoomId }, data: { actualOccupancy: { increment: 1 } } });
                        if (updatedToRoom.actualOccupancy >= updatedToRoom.capacity) {
                            yield tx.room.update({ where: { id: toRoomId }, data: { status: client_1.RoomStatus.FULL } });
                        }
                    }
                    const finalUpdatedTransfer = yield tx.roomTransfer.update({
                        where: { id },
                        data: transferUpdateData,
                        include: {
                            studentProfile: { select: { fullName: true, studentId: true } },
                            fromRoom: { select: { number: true, building: { select: { name: true } } } },
                            toRoom: { select: { number: true, building: { select: { name: true } } } },
                            approvedBy: { select: { fullName: true } }
                        }
                    });
                    return finalUpdatedTransfer;
                }));
                return updatedTransfer;
            }
            catch (error) {
                console.error(`[TransferService.updateStatus] Error updating transfer ${id}:`, error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    throw new Error(`Không tìm thấy yêu cầu chuyển phòng, sinh viên, phòng hoặc người duyệt với ID ${id}`);
                }
                else if (error instanceof Error && (error.message.includes('Không thể thay đổi trạng thái') || error.message.includes('không còn chỗ'))) {
                    throw error;
                }
                throw new Error(`Không thể cập nhật trạng thái yêu cầu chuyển phòng với ID ${id}.`);
            }
        });
    }
    /**
     * Xóa yêu cầu chuyển phòng
     */
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNaN(id)) {
                throw new Error('ID yêu cầu chuyển phòng không hợp lệ');
            }
            try {
                const transfer = yield prisma.roomTransfer.findUnique({ where: { id }, select: { status: true } });
                if (!transfer) {
                    throw new Error(`Không tìm thấy yêu cầu chuyển phòng với ID ${id}`);
                }
                if (transfer.status === client_1.TransferStatus.APPROVED || transfer.status === client_1.TransferStatus.COMPLETED) {
                    throw new Error(`Không thể xóa yêu cầu chuyển phòng đã được duyệt hoặc hoàn thành.`);
                }
                yield prisma.roomTransfer.delete({ where: { id } });
            }
            catch (error) {
                console.error(`[TransferService.delete] Error deleting transfer ${id}:`, error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    throw new Error(`Không tìm thấy yêu cầu chuyển phòng với ID ${id}`);
                }
                else if (error instanceof Error && error.message.includes('Không thể xóa yêu cầu')) {
                    throw error;
                }
                throw error;
            }
        });
    }
}
exports.TransferService = TransferService;
