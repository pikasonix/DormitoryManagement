import { PrismaClient, Prisma, Maintenance, MaintenanceStatus, RoomStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export class MaintenanceService {

    /**
     * Tìm kiếm và lấy danh sách các yêu cầu bảo trì.
     * @param options Tùy chọn tìm kiếm Prisma (where, include, orderBy, etc.)
     */
    async findAll(options?: Prisma.MaintenanceFindManyArgs): Promise<Maintenance[]> {
        try {
            const maintenances = await prisma.maintenance.findMany({
                ...options,
                include: {
                    room: { select: { id: true, number: true, building: { select: { id: true, name: true } } } },
                    reportedBy: {
                        select: {
                            id: true,
                            fullName: true,
                            studentId: true,
                            userId: true,
                            user: { select: { id: true, email: true } }
                        }
                    },
                    assignedTo: { select: { id: true, fullName: true, position: true } },
                    images: true,
                    ...(options?.include || {})
                },
                orderBy: options?.orderBy || { reportDate: 'desc' }
            });
            return maintenances;
        } catch (error) {
            console.error("[MaintenanceService.findAll] Error:", error);
            throw error;
        }
    }

    /**
     * Tìm một yêu cầu bảo trì bằng ID.
     * @param id ID của Maintenance
     * @param options Tùy chọn Prisma findUnique (ví dụ: include)
     * @throws Error nếu không tìm thấy
     */
    async findById(id: number, options?: Prisma.MaintenanceFindUniqueArgs): Promise<Maintenance | null> {
        if (isNaN(id)) {
            throw new Error('ID yêu cầu bảo trì không hợp lệ');
        }
        try {
            const maintenance = await prisma.maintenance.findUnique({
                where: { id },
                ...options,
                include: {
                    room: { include: { building: true } },
                    reportedBy: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    avatar: true
                                }
                            }
                        }
                    },
                    assignedTo: { include: { user: { select: { email: true, avatar: true } } } },
                    images: true,
                    ...(options?.include || {})
                },
            });

            if (!maintenance) {
                throw new Error(`Không tìm thấy yêu cầu bảo trì với ID ${id}`);
            }
            return maintenance;
        } catch (error) {
            console.error(`[MaintenanceService.findById] Error fetching maintenance ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error(`Không tìm thấy yêu cầu bảo trì với ID ${id}`);
            }
            throw error;
        }
    }

    /**
     * Tạo một yêu cầu bảo trì mới.
     * @param data Dữ liệu để tạo Maintenance (roomId, reportedById, issue, notes, imageIds?)
     */
    async create(data: {
        roomId: number;
        reportedById: number;
        issue: string;
        notes?: string;
        status?: MaintenanceStatus;
        assignedToId?: number;
        imageIds?: number[];
    }): Promise<Maintenance> {
        try {
            const roomExists = await prisma.room.findUnique({ where: { id: data.roomId } });
            // Kiểm tra người báo cáo theo userId thay vì id
            const reporterExists = await prisma.studentProfile.findUnique({ where: { userId: data.reportedById } });

            if (!roomExists) throw new Error(`Phòng với ID ${data.roomId} không tồn tại.`);
            if (!reporterExists) throw new Error(`Người báo cáo (StudentProfile) với ID người dùng ${data.reportedById} không tồn tại.`);
            if (data.assignedToId) {
                const assigneeExists = await prisma.staffProfile.findUnique({ where: { id: data.assignedToId } });
                if (!assigneeExists) throw new Error(`Nhân viên được giao (StaffProfile) với ID ${data.assignedToId} không tồn tại.`);
            }

            const newMaintenance = await prisma.maintenance.create({
                data: {
                    room: { connect: { id: data.roomId } },
                    reportedBy: { connect: { userId: data.reportedById } }, // Sửa thành userId
                    issue: data.issue,
                    notes: data.notes,
                    status: data.status || MaintenanceStatus.PENDING,
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
        } catch (error) {
            console.error("[MaintenanceService.create] Error:", error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error('Không tìm thấy phòng, người báo cáo hoặc người được giao.');
            }
            throw error;
        }
    }

    /**
     * Cập nhật một yêu cầu bảo trì.
     * @param id ID của Maintenance cần cập nhật
     * @param data Dữ liệu cập nhật (issue, status, assignedToId, notes, imageIds)
     * @returns Object chứa Maintenance đã cập nhật và danh sách path ảnh cũ cần xóa
     */
    async update(id: number, data: {
        issue?: string;
        status?: MaintenanceStatus;
        assignedToId?: number | null;
        notes?: string;
        imageIds?: number[];
    }): Promise<{ maintenance: Maintenance; oldImagePaths: string[] }> {
        if (isNaN(id)) {
            throw new Error('ID yêu cầu bảo trì không hợp lệ');
        }

        // Chuyển đổi status thành chữ hoa để so sánh với enum MaintenanceStatus
        let normalizedStatus: MaintenanceStatus | undefined;
        if (data.status) {
            const upperStatus = typeof data.status === 'string'
                ? data.status.toUpperCase()
                : String(data.status).toUpperCase();

            // Kiểm tra nếu status sau khi chuyển đổi nằm trong các giá trị hợp lệ
            if (Object.values(MaintenanceStatus).includes(upperStatus as MaintenanceStatus)) {
                normalizedStatus = upperStatus as MaintenanceStatus;
            } else {
                throw new Error(`Trạng thái bảo trì không hợp lệ: ${data.status}`);
            }
        }

        let oldImagePaths: string[] = [];

        try {
            const updatedResult = await prisma.$transaction(async (tx) => {
                const currentMaintenance = await tx.maintenance.findUnique({
                    where: { id },
                    include: { images: { select: { id: true, path: true } }, room: true }
                });
                if (!currentMaintenance || !currentMaintenance.room) {
                    throw new Error(`Không tìm thấy yêu cầu bảo trì hoặc phòng liên quan với ID ${id}`);
                }

                let imagesUpdate: { disconnect?: { id: number }[]; connect?: { id: number }[] } | undefined = undefined;
                if (data.imageIds !== undefined) {
                    const currentImageIds = currentMaintenance.images.map(img => img.id);
                    const newImageIds = Array.isArray(data.imageIds)
                        ? data.imageIds.map(imgId => parseInt(imgId as any)).filter(imgId => !isNaN(imgId))
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
                        await tx.media.deleteMany({ where: { id: { in: idsToDisconnect } } });
                    }
                }

                const updateData: Prisma.MaintenanceUpdateInput = {
                    issue: data.issue,
                    status: normalizedStatus, // Sử dụng status đã được chuẩn hóa
                    notes: data.notes,
                    assignedTo: data.assignedToId !== undefined
                        ? (data.assignedToId ? { connect: { id: data.assignedToId } } : { disconnect: true })
                        : undefined,
                    completedDate: normalizedStatus === MaintenanceStatus.COMPLETED ? new Date() : normalizedStatus ? null : undefined,
                    images: imagesUpdate,
                };

                const updatedMaintenance = await tx.maintenance.update({
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
                let newRoomStatus: RoomStatus | undefined = undefined;

                if (normalizedStatus === MaintenanceStatus.IN_PROGRESS && currentRoomStatus !== RoomStatus.UNDER_MAINTENANCE) {
                    newRoomStatus = RoomStatus.UNDER_MAINTENANCE;
                } else if (normalizedStatus === MaintenanceStatus.COMPLETED && currentRoomStatus === RoomStatus.UNDER_MAINTENANCE) {
                    const roomInfo = await tx.room.findUnique({ where: { id: currentMaintenance.roomId }, select: { capacity: true, actualOccupancy: true } });
                    newRoomStatus = (roomInfo && roomInfo.actualOccupancy >= roomInfo.capacity) ? RoomStatus.FULL : RoomStatus.AVAILABLE;
                }

                if (newRoomStatus !== undefined) {
                    await tx.room.update({
                        where: { id: currentMaintenance.roomId },
                        data: { status: newRoomStatus }
                    });
                }

                return updatedMaintenance;
            });

            return { maintenance: updatedResult, oldImagePaths };

        } catch (error) {
            console.error(`[MaintenanceService.update] Error updating maintenance ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error(`Không tìm thấy yêu cầu bảo trì, phòng, người được giao hoặc ảnh với ID ${id}`);
            }
            throw error;
        }
    }

    /**
     * Xóa một yêu cầu bảo trì.
     * @param id ID của Maintenance cần xóa
     * @returns Danh sách path ảnh đã xóa (để xóa file vật lý)
     */
    async delete(id: number): Promise<{ oldImagePaths: string[] }> {
        if (isNaN(id)) {
            throw new Error('ID yêu cầu bảo trì không hợp lệ');
        }

        let oldImagePaths: string[] = [];

        try {
            await prisma.$transaction(async (tx) => {
                const maintenanceToDelete = await tx.maintenance.findUnique({
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

                await tx.maintenance.delete({ where: { id } });

                if (imageIdsToDelete.length > 0) {
                    await tx.media.deleteMany({ where: { id: { in: imageIdsToDelete } } });
                }

                if (maintenanceToDelete.room?.status === RoomStatus.UNDER_MAINTENANCE && maintenanceToDelete.status !== MaintenanceStatus.COMPLETED) {
                    const roomInfo = await tx.room.findUnique({ where: { id: maintenanceToDelete.roomId }, select: { capacity: true, actualOccupancy: true } });
                    const nextStatus = (roomInfo && roomInfo.actualOccupancy >= roomInfo.capacity) ? RoomStatus.FULL : RoomStatus.AVAILABLE;
                    await tx.room.update({ where: { id: maintenanceToDelete.roomId }, data: { status: nextStatus } });
                }
            });

            return { oldImagePaths };

        } catch (error) {
            console.error(`[MaintenanceService.delete] Error deleting maintenance ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error(`Không tìm thấy yêu cầu bảo trì với ID ${id}`);
            }
            throw error;
        }
    }
}