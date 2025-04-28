import { PrismaClient, Prisma, RoomTransfer, TransferStatus, Room, StudentProfile, RoomStatus, StudentStatus } from '@prisma/client';

// Lưu ý: Nên sử dụng instance PrismaClient singleton
const prisma = new PrismaClient();

export class TransferService {

    // ... (findAll, findById, create giữ nguyên) ...
    async findAll(options?: Prisma.RoomTransferFindManyArgs): Promise<RoomTransfer[]> {
        try {
            const transfers = await prisma.roomTransfer.findMany({
                ...options,
                include: { // Include thông tin liên quan mặc định
                    studentProfile: { // Sinh viên yêu cầu
                        select: { id: true, fullName: true, studentId: true }
                    },
                    fromRoom: { // Phòng cũ
                        select: { id: true, number: true, building: { select: { id: true, name: true } } }
                    },
                    toRoom: { // Phòng mới
                        select: { id: true, number: true, building: { select: { id: true, name: true } } }
                    },
                    approvedBy: { // Người duyệt (Staff)
                        select: { id: true, fullName: true, position: true }
                    },
                    ...(options?.include || {})
                },
                orderBy: options?.orderBy || { createdAt: 'desc' } // Mặc định sắp xếp theo ngày tạo mới nhất
            });
            return transfers;
        } catch (error) {
            console.error("[TransferService.findAll] Error:", error);
            throw error;
        }
    }

    async findById(id: number, options?: Prisma.RoomTransferFindUniqueArgs): Promise<RoomTransfer | null> {
        if (isNaN(id)) {
            throw new Error('ID yêu cầu chuyển phòng không hợp lệ'); // Hoặc AppError 400
        }
        try {
            const transfer = await prisma.roomTransfer.findUnique({
                where: { id },
                ...options,
                include: { // Include chi tiết hơn
                    studentProfile: { include: { user: { select: { email: true, avatar: true } } } },
                    fromRoom: { include: { building: true } },
                    toRoom: { include: { building: true } },
                    approvedBy: { include: { user: { select: { email: true, avatar: true } } } },
                    ...(options?.include || {})
                },
            });

            if (!transfer) {
                throw new Error(`Không tìm thấy yêu cầu chuyển phòng với ID ${id}`); // Hoặc AppError 404
            }
            return transfer;
        } catch (error) {
            console.error(`[TransferService.findById] Error fetching transfer ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error(`Không tìm thấy yêu cầu chuyển phòng với ID ${id}`);
            }
            throw error;
        }
    }

    async create(data: {
        studentProfileId: number;
        toRoomId: number;
        transferDate: Date | string;
        reason?: string;
    }): Promise<RoomTransfer> {
        // --- Validation ---
        if (!data.studentProfileId || !data.toRoomId || !data.transferDate) {
            throw new Error('Thiếu thông tin bắt buộc: studentProfileId, toRoomId, transferDate.'); // Hoặc AppError 400
        }
        if (isNaN(parseInt(data.studentProfileId as any)) || isNaN(parseInt(data.toRoomId as any))) {
            throw new Error('studentProfileId hoặc toRoomId không hợp lệ.'); // Hoặc AppError 400
        }
        // --- Kết thúc Validation ---

        try {
            // 1. Lấy thông tin sinh viên và phòng hiện tại (fromRoomId)
            const student = await prisma.studentProfile.findUnique({
                where: { id: data.studentProfileId },
                select: { id: true, roomId: true, status: true } // Lấy cả status
            });
            if (!student) {
                throw new Error(`Không tìm thấy sinh viên với ID ${data.studentProfileId}.`); // Hoặc AppError 404
            }
            if (student.status !== StudentStatus.RENTING) {
                throw new Error(`Sinh viên này hiện không ở trạng thái 'RENTING', không thể yêu cầu chuyển phòng.`); // Hoặc AppError 400
            }


            // 2. Kiểm tra phòng muốn chuyển đến (toRoom)
            const toRoom = await prisma.room.findUnique({
                where: { id: data.toRoomId },
                select: { id: true, status: true, capacity: true, actualOccupancy: true, buildingId: true }
            });
            if (!toRoom) {
                throw new Error(`Không tìm thấy phòng muốn chuyển đến với ID ${data.toRoomId}.`); // Hoặc AppError 404
            }
            // Kiểm tra phòng mới có phù hợp không (còn chỗ, không đang bảo trì, cùng tòa nhà?)
            if (toRoom.status === RoomStatus.UNDER_MAINTENANCE) {
                throw new Error(`Phòng muốn chuyển đến (${toRoom.id}) đang được bảo trì.`); // Hoặc AppError 400
            }
            if (toRoom.actualOccupancy >= toRoom.capacity) {
                throw new Error(`Phòng muốn chuyển đến (${toRoom.id}) đã đầy.`); // Hoặc AppError 400
            }


            // 3. Kiểm tra xem sinh viên đã có yêu cầu đang chờ chưa?
            const pendingTransfer = await prisma.roomTransfer.findFirst({
                where: {
                    studentProfileId: data.studentProfileId,
                    status: { in: [TransferStatus.PENDING, TransferStatus.APPROVED] } // Đang chờ hoặc đã duyệt nhưng chưa hoàn thành?
                }
            });
            if (pendingTransfer) {
                throw new Error(`Bạn đã có một yêu cầu chuyển phòng đang chờ xử lý (ID: ${pendingTransfer.id}).`); // Hoặc AppError 409 Conflict
            }


            // 4. Tạo yêu cầu chuyển phòng
            const newTransfer = await prisma.roomTransfer.create({
                data: {
                    studentProfile: { connect: { id: data.studentProfileId } },
                    fromRoom: student.roomId ? { connect: { id: student.roomId } } : undefined, // Phòng hiện tại (có thể null nếu mới vào?)
                    toRoom: { connect: { id: data.toRoomId } }, // Phòng muốn đến
                    transferDate: new Date(data.transferDate),
                    reason: data.reason,
                    status: TransferStatus.PENDING // Trạng thái ban đầu là PENDING
                },
                include: { // Include để trả về đủ thông tin
                    studentProfile: { select: { fullName: true, studentId: true } },
                    fromRoom: { select: { number: true, building: { select: { name: true } } } },
                    toRoom: { select: { number: true, building: { select: { name: true } } } }
                }
            });
            return newTransfer;
        } catch (error) {
            console.error("[TransferService.create] Error:", error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error('Không tìm thấy sinh viên hoặc phòng được chỉ định.');
            } else if (error instanceof Error && error.message.includes('không thể yêu cầu chuyển phòng')) {
                throw error; // Ném lại lỗi validation cụ thể
            } else if (error instanceof Error && error.message.includes('đang được bảo trì')) {
                throw error;
            } else if (error instanceof Error && error.message.includes('đã đầy')) {
                throw error;
            } else if (error instanceof Error && error.message.includes('đã có một yêu cầu')) {
                throw error;
            }
            throw new Error('Không thể tạo yêu cầu chuyển phòng.'); // Lỗi chung
        }
    }

    async updateStatus(id: number, data: {
        status: TransferStatus;
        approvedById?: number | null;
    }): Promise<RoomTransfer> {
        if (isNaN(id)) {
            throw new Error('ID yêu cầu chuyển phòng không hợp lệ');
        }
        if (!data.status || !Object.values(TransferStatus).includes(data.status as TransferStatus)) {
            throw new Error(`Trạng thái chuyển phòng không hợp lệ: ${data.status}`);
        }
        if ((data.status === TransferStatus.APPROVED || data.status === TransferStatus.COMPLETED) && !data.approvedById) {
            throw new Error('Cần cung cấp ID người duyệt (approvedById) khi duyệt hoặc hoàn thành.');
        }

        try {
            const updatedTransfer = await prisma.$transaction(async (tx) => {
                const currentTransfer = await tx.roomTransfer.findUnique({
                    where: { id },
                    include: {
                        studentProfile: { select: { id: true, roomId: true } },
                        toRoom: { select: { id: true, capacity: true, actualOccupancy: true } }
                    }
                });

                if (!currentTransfer || !currentTransfer.studentProfile || !currentTransfer.toRoom) {
                    throw new Error(`Không tìm thấy yêu cầu chuyển phòng hoặc thông tin liên quan với ID ${id}`);
                }

                // SỬA LỖI Ở ĐÂY: Dùng || thay vì includes()
                if (currentTransfer.status === TransferStatus.COMPLETED || currentTransfer.status === TransferStatus.REJECTED) {
                    throw new Error(`Không thể thay đổi trạng thái của yêu cầu đã ${currentTransfer.status}.`);
                }

                const transferUpdateData: Prisma.RoomTransferUpdateInput = {
                    status: data.status,
                    approvedBy: data.approvedById ? { connect: { id: data.approvedById } } : (data.status === TransferStatus.REJECTED ? { disconnect: true } : undefined),
                };

                if (data.status === TransferStatus.COMPLETED) {
                    const studentId = currentTransfer.studentProfileId;
                    const fromRoomId = currentTransfer.fromRoomId;
                    const toRoomId = currentTransfer.toRoomId;

                    const toRoomCurrent = await tx.room.findUnique({ where: { id: toRoomId }, select: { capacity: true, actualOccupancy: true, status: true } });
                    if (!toRoomCurrent || toRoomCurrent.status !== RoomStatus.AVAILABLE || toRoomCurrent.actualOccupancy >= toRoomCurrent.capacity) {
                        throw new Error(`Không thể hoàn thành: Phòng mới (${toRoomId}) không còn chỗ hoặc không khả dụng.`);
                    }

                    await tx.studentProfile.update({ where: { id: studentId }, data: { roomId: toRoomId } });

                    if (fromRoomId) {
                        await tx.room.update({
                            where: { id: fromRoomId },
                            data: {
                                actualOccupancy: { decrement: 1 },
                                status: { set: RoomStatus.AVAILABLE }
                            }
                        });
                    }

                    const updatedToRoom = await tx.room.update({ where: { id: toRoomId }, data: { actualOccupancy: { increment: 1 } } });
                    if (updatedToRoom.actualOccupancy >= updatedToRoom.capacity) {
                        await tx.room.update({ where: { id: toRoomId }, data: { status: RoomStatus.FULL } });
                    }
                }

                const finalUpdatedTransfer = await tx.roomTransfer.update({
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
            });

            return updatedTransfer;
        } catch (error) {
            console.error(`[TransferService.updateStatus] Error updating transfer ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error(`Không tìm thấy yêu cầu chuyển phòng, sinh viên, phòng hoặc người duyệt với ID ${id}`);
            } else if (error instanceof Error && (error.message.includes('Không thể thay đổi trạng thái') || error.message.includes('không còn chỗ'))) {
                throw error;
            }
            throw new Error(`Không thể cập nhật trạng thái yêu cầu chuyển phòng với ID ${id}.`);
        }
    }

    async delete(id: number): Promise<void> {
        if (isNaN(id)) {
            throw new Error('ID yêu cầu chuyển phòng không hợp lệ');
        }
        try {
            const transfer = await prisma.roomTransfer.findUnique({ where: { id }, select: { status: true } });
            if (!transfer) {
                throw new Error(`Không tìm thấy yêu cầu chuyển phòng với ID ${id}`);
            }

            // SỬA LỖI Ở ĐÂY: Dùng || thay vì includes()
            if (transfer.status === TransferStatus.APPROVED || transfer.status === TransferStatus.COMPLETED) {
                throw new Error(`Không thể xóa yêu cầu chuyển phòng đã được duyệt hoặc hoàn thành.`);
            }

            await prisma.roomTransfer.delete({ where: { id } });

        } catch (error) {
            console.error(`[TransferService.delete] Error deleting transfer ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error(`Không tìm thấy yêu cầu chuyển phòng với ID ${id}`);
            } else if (error instanceof Error && error.message.includes('Không thể xóa yêu cầu')) {
                throw error;
            }
            throw error;
        }
    }
}