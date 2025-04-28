import { PrismaClient, Prisma, Building } from '@prisma/client';
import { Service } from 'typedi';
// Loại bỏ HttpException
// import { HttpException } from '../utils/httpException';
// Import AppError nếu bạn dùng nó thay thế
// import { AppError } from '../types/AppError';

// Lưu ý: Nên sử dụng instance PrismaClient singleton
const prisma = new PrismaClient();

// Định nghĩa kiểu dữ liệu đầu vào cho create và update bao gồm imageIds
type BuildingCreateInputWithImages = Prisma.BuildingCreateInput & { imageIds?: number[] };
type BuildingUpdateInputWithImages = Prisma.BuildingUpdateInput & { imageIds?: number[] };


@Service()
export class BuildingService {

    /**
     * Tạo một tòa nhà mới và kết nối ảnh nếu có.
     */
    async create(buildingData: BuildingCreateInputWithImages): Promise<Building> {
        const { imageIds, ...restData } = buildingData; // Tách imageIds ra

        try {
            const newBuilding = await prisma.building.create({
                data: {
                    ...restData, // Dữ liệu cơ bản của building
                    // Kết nối ảnh nếu có
                    images: imageIds && imageIds.length > 0 ? {
                        connect: imageIds.map(id => ({ id: id }))
                    } : undefined,
                },
                include: { images: true } // Include ảnh trong kết quả trả về
            });
            return newBuilding;
        } catch (error: any) {
            console.error("[BuildingService.create] Error:", error);
            // Xử lý lỗi Prisma cụ thể nếu cần (vd: P2002 nếu tên là unique)
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new Error(`Tên tòa nhà "${restData.name}" đã tồn tại.`); // Hoặc AppError 409
            }
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                // Lỗi không tìm thấy record để connect (vd: Media ID không tồn tại)
                throw new Error(`Không thể tạo tòa nhà: Một hoặc nhiều ID ảnh không hợp lệ.`); // Hoặc AppError 400
            }
            throw new Error(`Không thể tạo tòa nhà: ${error.message}`); // Thay thế HttpException
        }
    }

    /**
     * Lấy danh sách tòa nhà với phân trang, sắp xếp, tìm kiếm và includes.
     */
    async getAll(query: any): Promise<{ items: Building[], total: number }> {
        const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'asc', search = '' } = query;
        const skip = (Number(page) - 1) * Number(limit);
        // Validate sortBy để tránh lỗi injection (chỉ cho phép các trường hợp lệ)
        const allowedSortBy = ['id', 'name', 'address', 'createdAt', 'updatedAt'];
        const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'createdAt';
        const orderBy = { [safeSortBy]: sortOrder === 'desc' ? 'desc' : 'asc' };

        const where: Prisma.BuildingWhereInput = search
            ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { address: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                ],
            }
            : {};

        try {
            const [buildings, total] = await prisma.$transaction([ // Dùng transaction để đảm bảo count và findMany khớp nhau
                prisma.building.findMany({
                    where,
                    skip,
                    take: Number(limit),
                    orderBy,
                    include: {
                        images: true, // Lấy ảnh
                        // Đếm số phòng thay vì lấy cả danh sách phòng lớn
                        _count: { select: { rooms: true } },
                        // Lấy thông tin staff quản lý (nếu cần)
                        staff: {
                            select: { id: true, fullName: true, position: true },
                            take: 5 // Giới hạn số staff hiển thị nếu nhiều
                        },
                    },
                }),
                prisma.building.count({ where }),
            ]);

            return { items: buildings, total };
        } catch (error: any) {
            console.error("[BuildingService.getAll] Error:", error);
            throw new Error(`Không thể lấy danh sách tòa nhà: ${error.message}`); // Thay thế HttpException
        }
    }

    /**
     * Lấy thông tin chi tiết một tòa nhà bằng ID.
     */
    async getById(id: number): Promise<Building> {
        if (isNaN(id)) {
            throw new Error(`ID tòa nhà không hợp lệ.`); // Hoặc AppError 400
        }
        try {
            const building = await prisma.building.findUnique({
                where: { id },
                include: {
                    images: true,
                    // Lấy chi tiết phòng hơn khi xem một tòa nhà? Tùy yêu cầu.
                    rooms: {
                        select: { id: true, number: true, type: true, status: true, capacity: true, actualOccupancy: true },
                        orderBy: { number: 'asc' }
                    },
                    staff: { // Lấy chi tiết staff quản lý
                        include: {
                            user: { select: { id: true, email: true, avatar: true } } // Kèm user và avatar
                        }
                    },
                },
            });
            if (!building) {
                // Ném lỗi cụ thể để controller bắt và trả về 404
                throw new Error(`Không tìm thấy tòa nhà với ID ${id}`); // Hoặc AppError 404
            }
            return building;
        } catch (error: any) {
            console.error(`[BuildingService.getById] Error fetching building ${id}:`, error);
            if (error instanceof Error && error.message.includes('Không tìm thấy')) {
                throw error; // Ném lại lỗi "Not Found"
            }
            throw new Error(`Không thể lấy thông tin tòa nhà: ${error.message}`); // Thay thế HttpException 500
        }
    }

    /**
     * Cập nhật thông tin tòa nhà và ảnh liên quan.
     */
    async update(id: number, updateData: BuildingUpdateInputWithImages): Promise<{ building: Building, oldImagePaths: string[] }> {
        if (isNaN(id)) {
            throw new Error(`ID tòa nhà không hợp lệ.`);
        }

        const { imageIds, ...restUpdateData } = updateData; // Tách imageIds
        let oldImagePaths: string[] = [];

        try {
            // *** SỬ DỤNG TRANSACTION ***
            const updatedBuilding = await prisma.$transaction(async (tx) => {
                // 1. Lấy thông tin tòa nhà hiện tại (bao gồm ảnh)
                const currentBuilding = await tx.building.findUnique({
                    where: { id },
                    include: { images: { select: { id: true, path: true } } }
                });
                if (!currentBuilding) {
                    throw new Error(`Không tìm thấy tòa nhà với ID ${id}`); // Rollback
                }

                // --- Xử lý cập nhật ảnh ---
                let imagesUpdate: { disconnect?: { id: number }[]; connect?: { id: number }[] } | undefined = undefined;
                if (imageIds !== undefined) { // Chỉ xử lý nếu imageIds được gửi lên
                    const currentImageIds = currentBuilding.images.map(img => img.id);
                    const newImageIds = Array.isArray(imageIds)
                        ? imageIds.map(imgId => parseInt(imgId as any)).filter(imgId => !isNaN(imgId))
                        : [];

                    const idsToConnect = newImageIds.filter(imgId => !currentImageIds.includes(imgId));
                    const idsToDisconnect = currentImageIds.filter(imgId => !newImageIds.includes(imgId));

                    oldImagePaths = currentBuilding.images
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


                // 2. Cập nhật tòa nhà
                const buildingAfterUpdate = await tx.building.update({
                    where: { id },
                    data: {
                        ...restUpdateData, // Dữ liệu cơ bản
                        images: imagesUpdate // Áp dụng cập nhật ảnh
                    },
                    include: { // Include để trả về response
                        images: true,
                        _count: { select: { rooms: true } },
                        staff: { select: { id: true, fullName: true } }
                    },
                });

                return buildingAfterUpdate; // Trả về tòa nhà đã cập nhật
            });
            // *** KẾT THÚC TRANSACTION ***

            return { building: updatedBuilding, oldImagePaths }; // Trả về cả path ảnh cũ

        } catch (error: any) {
            console.error(`[BuildingService.update] Error updating building ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') { // Unique constraint (vd: name)
                    const fields = (error.meta?.target as string[])?.join(', ');
                    throw new Error(`Lỗi trùng lặp dữ liệu. Trường(s): ${fields} đã tồn tại.`);
                } else if (error.code === 'P2025') { // Record not found
                    // Lỗi này có thể do building không tồn tại hoặc media ID để connect không tồn tại
                    throw new Error(`Không tìm thấy tòa nhà (ID: ${id}) hoặc ảnh liên quan để cập nhật.`);
                }
            } else if (error instanceof Error && error.message.includes('Không tìm thấy')) {
                throw error; // Ném lại lỗi "Not Found" từ transaction
            }
            throw new Error(`Không thể cập nhật tòa nhà: ${error.message}`); // Lỗi chung
        }
    }

    /**
     * Xóa một tòa nhà (chỉ khi không còn phòng) và các ảnh liên quan.
     */
    async delete(id: number): Promise<{ oldImagePaths: string[] }> {
        if (isNaN(id)) {
            throw new Error(`ID tòa nhà không hợp lệ.`);
        }

        let oldImagePaths: string[] = [];

        try {
            // *** SỬ DỤNG TRANSACTION ***
            await prisma.$transaction(async (tx) => {
                // 1. Tìm tòa nhà, kiểm tra phòng, lấy ảnh
                const buildingToDelete = await tx.building.findUnique({
                    where: { id },
                    include: {
                        rooms: { select: { id: true } }, // Chỉ cần biết có phòng hay không
                        images: { select: { id: true, path: true } }
                    }
                });

                if (!buildingToDelete) {
                    throw new Error(`Không tìm thấy tòa nhà với ID ${id}`); // Rollback
                }

                // 2. QUAN TRỌNG: Kiểm tra xem có phòng nào không
                if (buildingToDelete.rooms.length > 0) {
                    throw new Error(`Không thể xóa tòa nhà "${buildingToDelete.name}" vì vẫn còn ${buildingToDelete.rooms.length} phòng thuộc tòa nhà này.`); // Rollback - Hoặc AppError 400/409
                }

                const imageIdsToDelete = buildingToDelete.images.map(img => img.id);
                oldImagePaths = buildingToDelete.images.map(img => img.path);

                // 3. Xóa các bản ghi Media liên quan trước (hoặc sau khi xóa building nếu không có ràng buộc)
                if (imageIdsToDelete.length > 0) {
                    await tx.media.deleteMany({ where: { id: { in: imageIdsToDelete } } });
                }

                // 4. Xóa tòa nhà
                await tx.building.delete({
                    where: { id },
                });

                // Transaction thành công
            });
            // *** KẾT THÚC TRANSACTION ***

            return { oldImagePaths }; // Trả về path để controller xóa file

        } catch (error: any) {
            console.error(`[BuildingService.delete] Error deleting building ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error(`Không tìm thấy tòa nhà với ID ${id}`);
            } else if (error instanceof Error && error.message.includes('Không thể xóa tòa nhà')) {
                throw error; // Ném lại lỗi nghiệp vụ
            }
            // Lỗi P2003 (Foreign Key) có thể xảy ra nếu còn Staff đang quản lý tòa nhà này mà không có onDelete SetNull/Cascade
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
                throw new Error(`Không thể xóa tòa nhà: Vẫn còn dữ liệu liên quan (vd: Nhân viên quản lý).`);
            }
            throw new Error(`Không thể xóa tòa nhà: ${error.message}`);
        }
    }
}