import { PrismaClient, Prisma, VehicleRegistration, VehicleType, StudentProfile, FeeType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export class VehicleService {

    /**
     * Tìm kiếm và lấy danh sách các đăng ký xe.
     * @param options Tùy chọn tìm kiếm Prisma (where, include, orderBy, etc.)
     */
    async findAll(options?: Prisma.VehicleRegistrationFindManyArgs): Promise<VehicleRegistration[]> {
        try {
            const registrations = await prisma.vehicleRegistration.findMany({
                ...options,
                include: {
                    studentProfile: {
                        select: {
                            id: true,
                            fullName: true,
                            studentId: true,
                            phoneNumber: true,
                            room: { select: { number: true, building: { select: { name: true } } } }
                        }
                    },
                    images: true,
                    ...(options?.include || {})
                },
                orderBy: options?.orderBy || { createdAt: 'desc' }
            });
            return registrations;
        } catch (error) {
            console.error("[VehicleService.findAll] Error:", error);
            throw error;
        }
    }

    /**
     * Tìm một đăng ký xe bằng ID.
     * @param id ID của VehicleRegistration
     * @param options Tùy chọn Prisma findUnique
     * @throws Error nếu không tìm thấy
     */
    async findById(id: number, options?: Prisma.VehicleRegistrationFindUniqueArgs): Promise<VehicleRegistration | null> {
        if (isNaN(id)) {
            throw new Error('ID đăng ký xe không hợp lệ');
        }
        try {
            const registration = await prisma.vehicleRegistration.findUnique({
                where: { id },
                ...options,
                include: {
                    studentProfile: {
                        include: {
                            user: { select: { email: true, avatar: true } }
                        },
                    },
                    images: true,
                    ...(options?.include || {})
                },
            });

            if (!registration) {
                throw new Error(`Không tìm thấy đăng ký xe với ID ${id}`);
            }
            return registration;
        } catch (error) {
            console.error(`[VehicleService.findById] Error fetching registration ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error(`Không tìm thấy đăng ký xe với ID ${id}`);
            }
            throw error;
        }
    }

    /**
     * Tạo một đăng ký xe mới.
     * @param data Dữ liệu đăng ký xe.
     * @throws Error nếu dữ liệu không hợp lệ hoặc lỗi tạo.
     */
    async create(data: {
        studentProfileId: number;
        vehicleType: VehicleType;
        licensePlate: string;
        brand?: string;
        model?: string;
        color?: string;
        parkingCardNo?: string;
        isActive?: boolean;
        startDate: Date | string;
        endDate?: Date | string | null;
        notes?: string;
        imageIds?: number[];
    }): Promise<VehicleRegistration> {
        if (!data.studentProfileId || !data.vehicleType || !data.licensePlate || !data.startDate) {
            throw new Error('Thiếu thông tin bắt buộc: studentProfileId, vehicleType, licensePlate, startDate.');
        }
        if (isNaN(parseInt(data.studentProfileId as any))) {
            throw new Error('studentProfileId không hợp lệ.');
        }
        if (!Object.values(VehicleType).includes(data.vehicleType as VehicleType)) {
            throw new Error(`Loại xe không hợp lệ: ${data.vehicleType}`);
        }
        if (data.parkingCardNo) {
            const existingCard = await prisma.vehicleRegistration.findUnique({ where: { parkingCardNo: data.parkingCardNo } });
            if (existingCard) {
                throw new Error(`Số thẻ gửi xe "${data.parkingCardNo}" đã tồn tại.`);
            }
        }

        try {
            const studentExists = await prisma.studentProfile.findUnique({ where: { id: data.studentProfileId } });
            if (!studentExists) {
                throw new Error(`Sinh viên với ID ${data.studentProfileId} không tồn tại.`);
            }

            const newRegistration = await prisma.vehicleRegistration.create({
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
        } catch (error) {
            console.error("[VehicleService.create] Error:", error);
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    const fields = (error.meta?.target as string[])?.join(', ');
                    throw new Error(`Lỗi trùng lặp dữ liệu. Trường(s): ${fields} đã tồn tại.`);
                } else if (error.code === 'P2003') {
                    throw new Error(`Sinh viên với ID ${data.studentProfileId} không tồn tại.`);
                }
            }
            throw new Error('Không thể tạo đăng ký xe.');
        }
    }

    /**
     * Cập nhật một đăng ký xe.
     * @param id ID của VehicleRegistration
     * @param data Dữ liệu cập nhật.
     * @returns Object chứa đăng ký đã cập nhật và path ảnh cũ cần xóa
     */
    async update(id: number, data: {
        vehicleType?: VehicleType;
        licensePlate?: string;
        brand?: string;
        model?: string;
        color?: string;
        parkingCardNo?: string | null;
        isActive?: boolean;
        startDate?: Date | string;
        endDate?: Date | string | null;
        notes?: string;
        imageIds?: number[];
    }): Promise<{ registration: VehicleRegistration; oldImagePaths: string[] }> {
        if (isNaN(id)) {
            throw new Error('ID đăng ký xe không hợp lệ');
        }
        if (data.vehicleType && !Object.values(VehicleType).includes(data.vehicleType as VehicleType)) {
            throw new Error(`Loại xe không hợp lệ: ${data.vehicleType}`);
        }
        if (data.parkingCardNo) {
            const existingCard = await prisma.vehicleRegistration.findFirst({
                where: { parkingCardNo: data.parkingCardNo, NOT: { id: id } }
            });
            if (existingCard) {
                throw new Error(`Số thẻ gửi xe "${data.parkingCardNo}" đã tồn tại.`);
            }
        }

        let oldImagePaths: string[] = [];

        try {
            const updatedResult = await prisma.$transaction(async (tx) => {
                const currentRegistration = await tx.vehicleRegistration.findUnique({
                    where: { id },
                    include: { images: { select: { id: true, path: true } } }
                });
                if (!currentRegistration) {
                    throw new Error(`Không tìm thấy đăng ký xe với ID ${id}`);
                }

                let imagesUpdate: { disconnect?: { id: number }[]; connect?: { id: number }[] } | undefined = undefined;
                if (data.imageIds !== undefined) {
                    const currentImageIds = currentRegistration.images.map(img => img.id);
                    const newImageIds = Array.isArray(data.imageIds)
                        ? data.imageIds.map(imgId => parseInt(imgId as any)).filter(imgId => !isNaN(imgId))
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
                        await tx.media.deleteMany({ where: { id: { in: idsToDisconnect } } });
                    }
                }

                const updateData: Prisma.VehicleRegistrationUpdateInput = {
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

                const updatedRegistration = await tx.vehicleRegistration.update({
                    where: { id },
                    data: updateData,
                    include: {
                        studentProfile: { select: { id: true, fullName: true } },
                        images: true
                    }
                });

                return updatedRegistration;
            });

            return { registration: updatedResult, oldImagePaths };

        } catch (error) {
            console.error(`[VehicleService.update] Error updating registration ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    const fields = (error.meta?.target as string[])?.join(', ');
                    throw new Error(`Lỗi trùng lặp dữ liệu. Trường(s): ${fields} đã tồn tại.`);
                } else if (error.code === 'P2025') {
                    throw new Error(`Không tìm thấy đăng ký xe hoặc tài nguyên liên quan với ID ${id}`);
                }
            }
            throw error;
        }
    }

    /**
     * Xóa một đăng ký xe.
     * @param id ID của VehicleRegistration
     * @returns Danh sách path ảnh đã xóa
     * @throws Error nếu không tìm thấy hoặc lỗi xóa
     */
    async delete(id: number): Promise<{ oldImagePaths: string[] }> {
        if (isNaN(id)) {
            throw new Error('ID đăng ký xe không hợp lệ');
        }

        let oldImagePaths: string[] = [];

        try {
            await prisma.$transaction(async (tx) => {
                const registrationToDelete = await tx.vehicleRegistration.findUnique({
                    where: { id },
                    include: { images: { select: { id: true, path: true } } }
                });

                if (!registrationToDelete) {
                    throw new Error(`Không tìm thấy đăng ký xe với ID ${id}`);
                }

                const imageIdsToDelete = registrationToDelete.images.map(img => img.id);
                oldImagePaths = registrationToDelete.images.map(img => img.path);

                await tx.vehicleRegistration.delete({ where: { id } });

                if (imageIdsToDelete.length > 0) {
                    await tx.media.deleteMany({ where: { id: { in: imageIdsToDelete } } });
                }
            });

            return { oldImagePaths };

        } catch (error) {
            console.error(`[VehicleService.delete] Error deleting registration ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error(`Không tìm thấy đăng ký xe với ID ${id}`);
            }
            throw error;
        }
    }
}