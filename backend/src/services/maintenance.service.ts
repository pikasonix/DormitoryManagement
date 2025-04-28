import { PrismaClient, Prisma, Maintenance, MaintenanceStatus, RoomStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library'; // Import nếu cần xử lý Decimal (không có trong Maintenance)

// Lưu ý: Nên sử dụng instance PrismaClient singleton
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
                include: { // Include các thông tin liên quan mặc định
                    room: { select: { id: true, number: true, building: { select: { id: true, name: true } } } },
                    reportedBy: { select: { id: true, fullName: true, studentId: true } }, // Người báo cáo
                    assignedTo: { select: { id: true, fullName: true, position: true } }, // Người được giao
                    images: true, // Ảnh đính kèm
                    ...(options?.include || {}) // Cho phép ghi đè hoặc thêm include từ options
                },
                orderBy: options?.orderBy || { reportDate: 'desc' } // Mặc định sắp xếp theo ngày báo cáo mới nhất
            });
            return maintenances;
        } catch (error) {
            console.error("[MaintenanceService.findAll] Error:", error);
            throw error; // Ném lại lỗi để controller xử lý
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
            throw new Error('ID yêu cầu bảo trì không hợp lệ'); // Hoặc AppError(..., 400)
        }
        try {
            const maintenance = await prisma.maintenance.findUnique({
                where: { id },
                ...options,
                include: { // Include mặc định cho trang chi tiết
                    room: { include: { building: true } },
                    reportedBy: { include: { user: { select: { email: true, avatar: true } } } }, // Lấy thêm email/avatar người báo cáo
                    assignedTo: { include: { user: { select: { email: true, avatar: true } } } }, // Lấy thêm email/avatar người được giao
                    images: true,
                    ...(options?.include || {})
                },
            });

            if (!maintenance) {
                throw new Error(`Không tìm thấy yêu cầu bảo trì với ID ${id}`); // Hoặc AppError(..., 404)
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
        reportedById: number; // StudentProfile ID
        issue: string;
        notes?: string;
        status?: MaintenanceStatus; // Có thể cho phép đặt status ban đầu khác PENDING
        assignedToId?: number; // Có thể gán người xử lý ngay khi tạo
        imageIds?: number[];
    }): Promise<Maintenance> {
        try {
            // Kiểm tra sự tồn tại của Room và StudentProfile (Reporter)
            const roomExists = await prisma.room.findUnique({ where: { id: data.roomId } });
            const reporterExists = await prisma.studentProfile.findUnique({ where: { id: data.reportedById } });
            if (!roomExists) throw new Error(`Phòng với ID ${data.roomId} không tồn tại.`);
            if (!reporterExists) throw new Error(`Người báo cáo (StudentProfile) với ID ${data.reportedById} không tồn tại.`);
            if (data.assignedToId) {
                const assigneeExists = await prisma.staffProfile.findUnique({ where: { id: data.assignedToId } });
                if (!assigneeExists) throw new Error(`Nhân viên được giao (StaffProfile) với ID ${data.assignedToId} không tồn tại.`);
            }


            const newMaintenance = await prisma.maintenance.create({
                data: {
                    room: { connect: { id: data.roomId } },
                    reportedBy: { connect: { id: data.reportedById } },
                    issue: data.issue,
                    notes: data.notes,
                    status: data.status || MaintenanceStatus.PENDING, // Mặc định PENDING
                    reportDate: new Date(), // Ngày báo cáo là hiện tại
                    // Kết nối người được giao nếu có
                    assignedTo: data.assignedToId ? { connect: { id: data.assignedToId } } : undefined,
                    // Kết nối ảnh nếu có
                    images: data.imageIds && data.imageIds.length > 0 ? {
                        connect: data.imageIds.map(id => ({ id }))
                    } : undefined,
                },
                include: { // Include để trả về đủ thông tin
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
                throw new Error('Không tìm thấy phòng, người báo cáo hoặc người được giao.'); // Lỗi Foreign Key
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
        assignedToId?: number | null; // Cho phép gỡ assignment bằng null
        notes?: string;
        imageIds?: number[]; // Mảng ID mới, sẽ thay thế hoàn toàn ảnh cũ
    }): Promise<{ maintenance: Maintenance; oldImagePaths: string[] }> {
        if (isNaN(id)) {
            throw new Error('ID yêu cầu bảo trì không hợp lệ');
        }
        // Validate status enum nếu được cung cấp
        if (data.status && !Object.values(MaintenanceStatus).includes(data.status as MaintenanceStatus)) {
            throw new Error(`Trạng thái bảo trì không hợp lệ: ${data.status}`);
        }

        let oldImagePaths: string[] = [];

        try {
            // *** SỬ DỤNG TRANSACTION ***
            const updatedResult = await prisma.$transaction(async (tx) => {
                // 1. Lấy bản ghi hiện tại (bao gồm ảnh và phòng)
                const currentMaintenance = await tx.maintenance.findUnique({
                    where: { id },
                    include: { images: { select: { id: true, path: true } }, room: true }
                });
                if (!currentMaintenance || !currentMaintenance.room) {
                    throw new Error(`Không tìm thấy yêu cầu bảo trì hoặc phòng liên quan với ID ${id}`);
                }

                // --- Xử lý cập nhật ảnh ---
                let imagesUpdate: { disconnect?: { id: number }[]; connect?: { id: number }[] } | undefined = undefined;
                if (data.imageIds !== undefined) { // Chỉ xử lý nếu imageIds được gửi lên
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
                    // Xóa các bản ghi Media cũ trong transaction
                    if (idsToDisconnect.length > 0) {
                        await tx.media.deleteMany({ where: { id: { in: idsToDisconnect } } });
                    }
                }
                // --- Kết thúc xử lý ảnh ---

                // --- Chuẩn bị dữ liệu cập nhật ---
                const updateData: Prisma.MaintenanceUpdateInput = {
                    issue: data.issue,
                    status: data.status,
                    notes: data.notes,
                    // Xử lý assignedToId (connect, disconnect, hoặc không làm gì)
                    assignedTo: data.assignedToId !== undefined
                        ? (data.assignedToId ? { connect: { id: data.assignedToId } } : { disconnect: true })
                        : undefined,
                    // Tự động cập nhật completedDate nếu status là COMPLETED
                    completedDate: (data.status as MaintenanceStatus) === MaintenanceStatus.COMPLETED ? new Date() : ((data.status as MaintenanceStatus) !== MaintenanceStatus.COMPLETED ? null : undefined), // Reset nếu không còn COMPLETED
                    images: imagesUpdate,
                };
                // --- Kết thúc chuẩn bị ---


                // 2. Cập nhật Maintenance record
                const updatedMaintenance = await tx.maintenance.update({
                    where: { id },
                    data: updateData,
                    include: { // Include để trả về response
                        room: { select: { number: true, building: { select: { name: true } } } },
                        reportedBy: { select: { fullName: true } },
                        assignedTo: { select: { fullName: true } },
                        images: true
                    }
                });

                // 3. Cập nhật trạng thái Phòng nếu cần
                const currentRoomStatus = currentMaintenance.room.status;
                let newRoomStatus: RoomStatus | undefined = undefined;

                if (data.status === MaintenanceStatus.IN_PROGRESS && currentRoomStatus !== RoomStatus.UNDER_MAINTENANCE) {
                    newRoomStatus = RoomStatus.UNDER_MAINTENANCE;
                } else if (data.status === MaintenanceStatus.COMPLETED && currentRoomStatus === RoomStatus.UNDER_MAINTENANCE) {
                    // Xác định trạng thái phòng sau khi sửa xong
                    const roomInfo = await tx.room.findUnique({ where: { id: currentMaintenance.roomId }, select: { capacity: true, actualOccupancy: true } });
                    newRoomStatus = (roomInfo && roomInfo.actualOccupancy >= roomInfo.capacity) ? RoomStatus.FULL : RoomStatus.AVAILABLE;
                }

                if (newRoomStatus !== undefined) {
                    await tx.room.update({
                        where: { id: currentMaintenance.roomId },
                        data: { status: newRoomStatus }
                    });
                }

                return updatedMaintenance; // Trả về maintenance đã cập nhật
            });
            // *** KẾT THÚC TRANSACTION ***

            return { maintenance: updatedResult, oldImagePaths }; // Trả về cả path ảnh cũ

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
            // *** SỬ DỤNG TRANSACTION ***
            await prisma.$transaction(async (tx) => {
                // 1. Tìm bản ghi và ảnh liên quan
                const maintenanceToDelete = await tx.maintenance.findUnique({
                    where: { id },
                    include: {
                        images: { select: { id: true, path: true } },
                        room: { select: { status: true } } // Lấy trạng thái phòng hiện tại
                    }
                });

                if (!maintenanceToDelete) {
                    throw new Error(`Không tìm thấy yêu cầu bảo trì với ID ${id}`); // Rollback
                }

                const imageIdsToDelete = maintenanceToDelete.images.map(img => img.id);
                oldImagePaths = maintenanceToDelete.images.map(img => img.path);

                // 2. Xóa bản ghi Maintenance (quan hệ với Media sẽ tự động ngắt hoặc cần ngắt trước)
                // Nếu có foreign key từ Media -> Maintenance thì cần xóa Media trước
                // Nếu dùng relation table thì xóa Maintenance là đủ (trừ khi muốn xóa cả Media)
                await tx.maintenance.delete({ where: { id } });

                // 3. Xóa các bản ghi Media liên quan
                if (imageIdsToDelete.length > 0) {
                    await tx.media.deleteMany({ where: { id: { in: imageIdsToDelete } } });
                }

                // 4. Cập nhật trạng thái Phòng nếu nó đang bảo trì do yêu cầu này
                if (maintenanceToDelete.room?.status === RoomStatus.UNDER_MAINTENANCE && maintenanceToDelete.status !== MaintenanceStatus.COMPLETED) {
                    const roomInfo = await tx.room.findUnique({ where: { id: maintenanceToDelete.roomId }, select: { capacity: true, actualOccupancy: true } });
                    const nextStatus = (roomInfo && roomInfo.actualOccupancy >= roomInfo.capacity) ? RoomStatus.FULL : RoomStatus.AVAILABLE;
                    await tx.room.update({ where: { id: maintenanceToDelete.roomId }, data: { status: nextStatus } });
                }

                // Transaction thành công
            });
            // *** KẾT THÚC TRANSACTION ***

            return { oldImagePaths }; // Trả về path để controller xóa file

        } catch (error) {
            console.error(`[MaintenanceService.delete] Error deleting maintenance ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error(`Không tìm thấy yêu cầu bảo trì với ID ${id}`);
            }
            throw error;
        }
    }
}