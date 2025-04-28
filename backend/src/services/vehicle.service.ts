import { PrismaClient, Prisma, VehicleRegistration, VehicleType, StudentProfile } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
// import { AppError } from '../types/AppError';

// Lưu ý: Nên sử dụng instance PrismaClient singleton
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
                include: { // Include thông tin liên quan mặc định
                    studentProfile: { // Sinh viên đăng ký
                        select: { id: true, fullName: true, studentId: true, room: { select: { number: true, building: { select: { name: true } } } } } // Thêm thông tin phòng
                    },
                    images: true, // Ảnh xe
                    ...(options?.include || {})
                },
                orderBy: options?.orderBy || { createdAt: 'desc' } // Mặc định sắp xếp theo ngày tạo mới nhất
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
            throw new Error('ID đăng ký xe không hợp lệ'); // Hoặc AppError 400
        }
        try {
            const registration = await prisma.vehicleRegistration.findUnique({
                where: { id },
                ...options,
                include: { // Include chi tiết hơn
                    studentProfile: { include: { user: { select: { email: true, avatar: true } } } },
                    images: true,
                    ...(options?.include || {})
                },
            });

            if (!registration) {
                throw new Error(`Không tìm thấy đăng ký xe với ID ${id}`); // Hoặc AppError 404
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
        vehicleType: VehicleType; // Enum VehicleType
        licensePlate: string;
        brand?: string;
        model?: string;
        color?: string;
        parkingCardNo?: string; // Thường được cấp sau bởi admin/staff
        isActive?: boolean; // Mặc định là true
        startDate: Date | string;
        endDate?: Date | string | null;
        monthlyFee?: number | string | Decimal | null;
        notes?: string;
        imageIds?: number[]; // Mảng ID ảnh xe đã upload
    }): Promise<VehicleRegistration> {
        // --- Validation ---
        if (!data.studentProfileId || !data.vehicleType || !data.licensePlate || !data.startDate) {
            throw new Error('Thiếu thông tin bắt buộc: studentProfileId, vehicleType, licensePlate, startDate.'); // Hoặc AppError 400
        }
        if (isNaN(parseInt(data.studentProfileId as any))) {
            throw new Error('studentProfileId không hợp lệ.'); // Hoặc AppError 400
        }
        if (!Object.values(VehicleType).includes(data.vehicleType as VehicleType)) {
            throw new Error(`Loại xe không hợp lệ: ${data.vehicleType}`); // Hoặc AppError 400
        }
        // Validate unique parkingCardNo nếu được cung cấp
        if (data.parkingCardNo) {
            const existingCard = await prisma.vehicleRegistration.findUnique({ where: { parkingCardNo: data.parkingCardNo } });
            if (existingCard) {
                throw new Error(`Số thẻ gửi xe "${data.parkingCardNo}" đã tồn tại.`); // Hoặc AppError 409
            }
        }
        // --- Kết thúc Validation ---

        try {
            // Kiểm tra sinh viên tồn tại
            const studentExists = await prisma.studentProfile.findUnique({ where: { id: data.studentProfileId } });
            if (!studentExists) {
                throw new Error(`Sinh viên với ID ${data.studentProfileId} không tồn tại.`); // Hoặc AppError 404
            }

            const newRegistration = await prisma.vehicleRegistration.create({
                data: {
                    studentProfile: { connect: { id: data.studentProfileId } },
                    vehicleType: data.vehicleType,
                    licensePlate: data.licensePlate,
                    brand: data.brand,
                    model: data.model,
                    color: data.color,
                    parkingCardNo: data.parkingCardNo, // Có thể null ban đầu
                    isActive: data.isActive !== undefined ? data.isActive : true, // Mặc định active
                    startDate: new Date(data.startDate),
                    endDate: data.endDate ? new Date(data.endDate) : null,
                    monthlyFee: data.monthlyFee !== undefined && data.monthlyFee !== null ? new Decimal(data.monthlyFee) : null,
                    notes: data.notes,
                    // Kết nối ảnh nếu có
                    images: data.imageIds && data.imageIds.length > 0 ? {
                        connect: data.imageIds.map(id => ({ id }))
                    } : undefined,
                },
                include: { // Include để trả về
                    studentProfile: { select: { id: true, fullName: true } },
                    images: true
                }
            });
            return newRegistration;
        } catch (error) {
            console.error("[VehicleService.create] Error:", error);
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') { // Lỗi unique (vd: parkingCardNo)
                    const fields = (error.meta?.target as string[])?.join(', ');
                    throw new Error(`Lỗi trùng lặp dữ liệu. Trường(s): ${fields} đã tồn tại.`); // Hoặc AppError 409
                } else if (error.code === 'P2003') { // Lỗi foreign key (studentProfileId)
                    throw new Error(`Sinh viên với ID ${data.studentProfileId} không tồn tại.`);
                }
            }
            throw new Error('Không thể tạo đăng ký xe.'); // Lỗi chung
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
        monthlyFee?: number | string | Decimal | null;
        notes?: string;
        imageIds?: number[]; // Mảng ID ảnh mới, sẽ THAY THẾ ảnh cũ
    }): Promise<{ registration: VehicleRegistration; oldImagePaths: string[] }> {
        if (isNaN(id)) {
            throw new Error('ID đăng ký xe không hợp lệ');
        }
        // --- Validation ---
        if (data.vehicleType && !Object.values(VehicleType).includes(data.vehicleType as VehicleType)) {
            throw new Error(`Loại xe không hợp lệ: ${data.vehicleType}`);
        }
        // Validate unique parkingCardNo nếu thay đổi và khác null
        if (data.parkingCardNo) {
            const existingCard = await prisma.vehicleRegistration.findFirst({
                where: { parkingCardNo: data.parkingCardNo, NOT: { id: id } } // Tìm thẻ khác có cùng số
            });
            if (existingCard) {
                throw new Error(`Số thẻ gửi xe "${data.parkingCardNo}" đã tồn tại.`); // Hoặc AppError 409
            }
        }
        // --- Kết thúc Validation ---


        let oldImagePaths: string[] = [];

        try {
            // *** SỬ DỤNG TRANSACTION ***
            const updatedResult = await prisma.$transaction(async (tx) => {
                // 1. Lấy bản ghi hiện tại (bao gồm ảnh)
                const currentRegistration = await tx.vehicleRegistration.findUnique({
                    where: { id },
                    include: { images: { select: { id: true, path: true } } }
                });
                if (!currentRegistration) {
                    throw new Error(`Không tìm thấy đăng ký xe với ID ${id}`);
                }

                // --- Xử lý cập nhật ảnh ---
                let imagesUpdate: { disconnect?: { id: number }[]; connect?: { id: number }[] } | undefined = undefined;
                if (data.imageIds !== undefined) { // Chỉ xử lý nếu imageIds được gửi lên
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
                    // Xóa các bản ghi Media cũ trong transaction
                    if (idsToDisconnect.length > 0) {
                        await tx.media.deleteMany({ where: { id: { in: idsToDisconnect } } });
                    }
                }
                // --- Kết thúc xử lý ảnh ---


                // 2. Chuẩn bị dữ liệu cập nhật
                const updateData: Prisma.VehicleRegistrationUpdateInput = {
                    vehicleType: data.vehicleType,
                    licensePlate: data.licensePlate,
                    brand: data.brand,
                    model: data.model,
                    color: data.color,
                    // Xử lý parkingCardNo: cập nhật nếu có giá trị, set null nếu gửi null/rỗng
                    parkingCardNo: data.parkingCardNo !== undefined ? (data.parkingCardNo || null) : undefined,
                    isActive: data.isActive,
                    startDate: data.startDate ? new Date(data.startDate) : undefined,
                    // Xử lý endDate: cập nhật nếu có giá trị, set null nếu gửi null/rỗng
                    endDate: data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : undefined,
                    // Xử lý monthlyFee
                    monthlyFee: data.monthlyFee !== undefined ? (data.monthlyFee !== null ? new Decimal(data.monthlyFee) : null) : undefined,
                    notes: data.notes,
                    images: imagesUpdate // Áp dụng cập nhật ảnh
                };

                // 3. Cập nhật VehicleRegistration
                const updatedRegistration = await tx.vehicleRegistration.update({
                    where: { id },
                    data: updateData,
                    include: { // Include để trả về
                        studentProfile: { select: { id: true, fullName: true } },
                        images: true
                    }
                });

                return updatedRegistration;
            });
            // *** KẾT THÚC TRANSACTION ***

            return { registration: updatedResult, oldImagePaths };

        } catch (error) {
            console.error(`[VehicleService.update] Error updating registration ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') { // Unique constraint (parkingCardNo)
                    const fields = (error.meta?.target as string[])?.join(', ');
                    throw new Error(`Lỗi trùng lặp dữ liệu. Trường(s): ${fields} đã tồn tại.`);
                } else if (error.code === 'P2025') { // Record not found
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
            // *** SỬ DỤNG TRANSACTION ***
            await prisma.$transaction(async (tx) => {
                // 1. Tìm bản ghi và ảnh liên quan
                const registrationToDelete = await tx.vehicleRegistration.findUnique({
                    where: { id },
                    include: { images: { select: { id: true, path: true } } }
                });

                if (!registrationToDelete) {
                    throw new Error(`Không tìm thấy đăng ký xe với ID ${id}`); // Rollback
                }

                const imageIdsToDelete = registrationToDelete.images.map(img => img.id);
                oldImagePaths = registrationToDelete.images.map(img => img.path);

                // 2. Xóa bản ghi VehicleRegistration
                await tx.vehicleRegistration.delete({ where: { id } });

                // 3. Xóa các bản ghi Media liên quan
                if (imageIdsToDelete.length > 0) {
                    await tx.media.deleteMany({ where: { id: { in: imageIdsToDelete } } });
                }
                // Transaction thành công
            });
            // *** KẾT THÚC TRANSACTION ***

            return { oldImagePaths };

        } catch (error) {
            console.error(`[VehicleService.delete] Error deleting registration ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error(`Không tìm thấy đăng ký xe với ID ${id}`);
            }
            // Xử lý lỗi foreign key nếu có (P2003) - ít khả năng
            throw error;
        }
    }
}