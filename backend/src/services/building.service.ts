import { PrismaClient, Prisma, Building } from '@prisma/client';
import { Service } from 'typedi';

const prisma = new PrismaClient();

type BuildingCreateInputWithImages = Prisma.BuildingCreateInput & { imageIds?: number[] };
type BuildingUpdateInputWithImages = Prisma.BuildingUpdateInput & { imageIds?: number[] };

// Define a more complete return type for the getAll method
type GetAllBuildingsResult = {
    items: Building[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

@Service()
export class BuildingService {

    /**
     * Tạo một tòa nhà mới và kết nối ảnh nếu có.
     */
    async create(buildingData: BuildingCreateInputWithImages): Promise<Building> {
        const { imageIds, ...restData } = buildingData;

        try {
            const newBuilding = await prisma.building.create({
                data: {
                    ...restData,
                    images: imageIds && imageIds.length > 0 ? {
                        connect: imageIds.map(id => ({ id: id }))
                    } : undefined,
                },
                include: { images: true }
            });
            return newBuilding;
        } catch (error: any) {
            console.error("[BuildingService.create] Error:", error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new Error(`Tên tòa nhà "${restData.name}" đã tồn tại.`);
            }
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error(`Không thể tạo tòa nhà: Một hoặc nhiều ID ảnh không hợp lệ.`);
            }
            throw new Error(`Không thể tạo tòa nhà: ${error.message}`);
        }
    }

    /**
     * Lấy danh sách tòa nhà với phân trang, sắp xếp, tìm kiếm và includes.
     */
    async getAll(query: any): Promise<GetAllBuildingsResult> {
        const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'asc', search = '' } = query;
        const skip = (Number(page) - 1) * Number(limit);
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
            const [buildings, total] = await prisma.$transaction([
                prisma.building.findMany({
                    where,
                    skip,
                    take: Number(limit),
                    orderBy,
                    include: {
                        images: true,
                        _count: { select: { rooms: true } },
                        staff: {
                            select: { id: true, fullName: true, position: true },
                            take: 5
                        },
                    },
                }),
                prisma.building.count({ where }),
            ]);

            // Biến đổi kết quả để thêm trường totalRooms
            const transformedBuildings = buildings.map(building => ({
                ...building,
                totalRooms: building._count.rooms // Thêm số phòng dựa trên kết quả đếm
            }));

            return {
                items: transformedBuildings as any,
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            };
        } catch (error: any) {
            console.error("[BuildingService.getAll] Error:", error);
            throw new Error(`Không thể lấy danh sách tòa nhà: ${error.message}`);
        }
    }

    /**
     * Lấy thông tin chi tiết một tòa nhà bằng ID.
     */
    async getById(id: number): Promise<Building> {
        if (isNaN(id)) {
            throw new Error(`ID tòa nhà không hợp lệ.`);
        }
        try {
            const building = await prisma.building.findUnique({
                where: { id },
                include: {
                    images: true,
                    rooms: {
                        select: { id: true, number: true, type: true, status: true, capacity: true, actualOccupancy: true },
                        orderBy: { number: 'asc' }
                    },
                    staff: {
                        include: {
                            user: { select: { id: true, email: true, avatar: true } }
                        }
                    },
                    _count: { select: { rooms: true } }
                },
            });
            if (!building) {
                throw new Error(`Không tìm thấy tòa nhà với ID ${id}`);
            }

            // Biến đổi kết quả để thêm trường totalRooms
            const transformedBuilding = {
                ...building,
                totalRooms: building._count.rooms // Thêm số phòng dựa trên kết quả đếm
            };

            return transformedBuilding as any;
        } catch (error: any) {
            console.error(`[BuildingService.getById] Error fetching building ${id}:`, error);
            if (error instanceof Error && error.message.includes('Không tìm thấy')) {
                throw error;
            }
            throw new Error(`Không thể lấy thông tin tòa nhà: ${error.message}`);
        }
    }

    /**
     * Cập nhật thông tin tòa nhà và ảnh liên quan.
     */
    async update(id: number, updateData: BuildingUpdateInputWithImages): Promise<{ building: Building, oldImagePaths: string[] }> {
        if (isNaN(id)) {
            throw new Error(`ID tòa nhà không hợp lệ.`);
        }

        // Remove totalRooms field from update data since it's not in the schema
        const { imageIds, totalRooms, ...restUpdateData } = updateData as BuildingUpdateInputWithImages & { totalRooms?: number };
        let oldImagePaths: string[] = [];

        // Tạo một object dữ liệu cập nhật có cấu trúc rõ ràng
        const dataToUpdate: Prisma.BuildingUpdateInput = {};

        // Xử lý các trường một cách rõ ràng và chắc chắn
        dataToUpdate.name = restUpdateData.name as string;
        dataToUpdate.address = restUpdateData.address as string;

        // Đặc biệt xử lý riêng trường description 
        // Đảm bảo trường này luôn được gán, kể cả khi là null hoặc chuỗi rỗng
        dataToUpdate.description = restUpdateData.description as string;

        console.log("Description value to update:", dataToUpdate.description);

        try {
            const updatedBuilding = await prisma.$transaction(async (tx) => {
                const currentBuilding = await tx.building.findUnique({
                    where: { id },
                    include: { images: { select: { id: true, path: true } } }
                });
                if (!currentBuilding) {
                    throw new Error(`Không tìm thấy tòa nhà với ID ${id}`);
                }

                let imagesUpdate: { disconnect?: { id: number }[]; connect?: { id: number }[] } | undefined = undefined;
                if (imageIds !== undefined) {
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

                    if (idsToDisconnect.length > 0) {
                        await tx.media.deleteMany({ where: { id: { in: idsToDisconnect } } });
                    }
                }

                const buildingAfterUpdate = await tx.building.update({
                    where: { id },
                    data: {
                        ...dataToUpdate,
                        images: imagesUpdate
                    },
                    include: {
                        images: true,
                        _count: { select: { rooms: true } },
                        staff: { select: { id: true, fullName: true } }
                    },
                });

                // Thêm trường totalRooms vào kết quả
                const transformedBuilding = {
                    ...buildingAfterUpdate,
                    totalRooms: buildingAfterUpdate._count.rooms
                };

                return transformedBuilding;
            });

            return { building: updatedBuilding as any, oldImagePaths };

        } catch (error: any) {
            console.error(`[BuildingService.update] Error updating building ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    const fields = (error.meta?.target as string[])?.join(', ');
                    throw new Error(`Lỗi trùng lặp dữ liệu. Trường(s): ${fields} đã tồn tại.`);
                } else if (error.code === 'P2025') {
                    throw new Error(`Không tìm thấy tòa nhà (ID: ${id}) hoặc ảnh liên quan để cập nhật.`);
                }
            } else if (error instanceof Error && error.message.includes('Không tìm thấy')) {
                throw error;
            }
            throw new Error(`Không thể cập nhật tòa nhà: ${error.message}`);
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
            await prisma.$transaction(async (tx) => {
                const buildingToDelete = await tx.building.findUnique({
                    where: { id },
                    include: {
                        rooms: { select: { id: true } },
                        images: { select: { id: true, path: true } }
                    }
                });

                if (!buildingToDelete) {
                    throw new Error(`Không tìm thấy tòa nhà với ID ${id}`);
                }

                if (buildingToDelete.rooms.length > 0) {
                    throw new Error(`Không thể xóa tòa nhà "${buildingToDelete.name}" vì vẫn còn ${buildingToDelete.rooms.length} phòng thuộc tòa nhà này.`);
                }

                const imageIdsToDelete = buildingToDelete.images.map(img => img.id);
                oldImagePaths = buildingToDelete.images.map(img => img.path);

                if (imageIdsToDelete.length > 0) {
                    await tx.media.deleteMany({ where: { id: { in: imageIdsToDelete } } });
                }

                await tx.building.delete({
                    where: { id },
                });
            });

            return { oldImagePaths };

        } catch (error: any) {
            console.error(`[BuildingService.delete] Error deleting building ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error(`Không tìm thấy tòa nhà với ID ${id}`);
            } else if (error instanceof Error && error.message.includes('Không thể xóa tòa nhà')) {
                throw error;
            }
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
                throw new Error(`Không thể xóa tòa nhà: Vẫn còn dữ liệu liên quan (vd: Nhân viên quản lý).`);
            }
            throw new Error(`Không thể xóa tòa nhà: ${error.message}`);
        }
    }
}