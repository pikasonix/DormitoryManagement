import { PrismaClient, Prisma, Media, MediaType } from '@prisma/client';
// import { AppError } from '../types/AppError'; // Import nếu dùng AppError

// Lưu ý: Nên sử dụng instance PrismaClient singleton
const prisma = new PrismaClient();

export class MediaService {

    /**
     * Tạo một bản ghi Media mới trong database.
     * @param data Dữ liệu Media từ file upload và request body.
     */
    async create(data: {
        filename: string;
        originalFilename: string;
        path: string; // Đường dẫn tương đối (vd: /uploads/...)
        mimeType: string;
        size: number;
        mediaType: MediaType; // Enum MediaType
        alt?: string;
        isPublic?: boolean;
        // uploadedById?: number; // Optional: ID người upload
    }): Promise<Media> {
        try {
            // Validate mediaType nếu cần (dù controller nên làm trước)
            if (!Object.values(MediaType).includes(data.mediaType)) {
                throw new Error(`Loại media không hợp lệ: ${data.mediaType}`); // Hoặc AppError 400
            }

            const newMedia = await prisma.media.create({
                data: {
                    filename: data.filename,
                    originalFilename: data.originalFilename,
                    path: data.path,
                    mimeType: data.mimeType,
                    size: data.size,
                    mediaType: data.mediaType,
                    alt: data.alt,
                    isPublic: data.isPublic !== undefined ? data.isPublic : true, // Mặc định public
                    // uploadedById: data.uploadedById // Gán nếu có
                }
            });
            return newMedia;
        } catch (error) {
            console.error("[MediaService.create] Error:", error);
            // Xử lý lỗi Prisma cụ thể nếu cần
            throw error; // Ném lại lỗi để controller xử lý
        }
    }

    /**
     * Tìm kiếm và lấy danh sách Media.
     * @param options Tùy chọn tìm kiếm Prisma (where, include, orderBy, etc.)
     */
    async findAll(options?: Prisma.MediaFindManyArgs): Promise<Media[]> {
        try {
            const mediaItems = await prisma.media.findMany({
                ...options,
                // Mặc định không include các relation ngược (avatarFor, roomImages...)
                // trừ khi được yêu cầu trong options
                orderBy: options?.orderBy || { uploadedAt: 'desc' } // Sắp xếp theo ngày upload mới nhất
            });
            return mediaItems;
        } catch (error) {
            console.error("[MediaService.findAll] Error:", error);
            throw error;
        }
    }

    /**
     * Tìm một Media bằng ID.
     * @param id ID của Media
     * @param options Tùy chọn Prisma findUnique
     * @throws Error nếu không tìm thấy
     */
    async findById(id: number, options?: Prisma.MediaFindUniqueArgs): Promise<Media | null> {
        if (isNaN(id)) {
            throw new Error('ID Media không hợp lệ'); // Hoặc AppError 400
        }
        try {
            const media = await prisma.media.findUnique({
                where: { id },
                ...options
            });

            if (!media) {
                throw new Error(`Không tìm thấy Media với ID ${id}`); // Hoặc AppError 404
            }
            return media;
        } catch (error) {
            console.error(`[MediaService.findById] Error fetching media ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error(`Không tìm thấy Media với ID ${id}`);
            }
            throw error;
        }
    }

    /**
     * Cập nhật thông tin metadata của Media (vd: alt, isPublic).
     * Không dùng để thay đổi file vật lý.
     * @param id ID của Media
     * @param data Dữ liệu cập nhật (chỉ các trường cho phép)
     * @throws Error nếu không tìm thấy
     */
    async update(id: number, data: {
        alt?: string;
        isPublic?: boolean;
        // Thêm các trường metadata khác nếu cần
    }): Promise<Media> {
        if (isNaN(id)) {
            throw new Error('ID Media không hợp lệ');
        }
        try {
            const updatedMedia = await prisma.media.update({
                where: { id },
                data: {
                    alt: data.alt,
                    isPublic: data.isPublic
                    // Chỉ cập nhật các trường được phép
                }
            });
            return updatedMedia;
        } catch (error) {
            console.error(`[MediaService.update] Error updating media ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error(`Không tìm thấy Media với ID ${id}`);
            }
            throw error;
        }
    }

    /**
     * Xóa một bản ghi Media và ngắt các liên kết cần thiết.
     * @param id ID của Media cần xóa
     * @returns Đường dẫn tương đối của file đã xóa (để controller xóa file vật lý)
     * @throws Error nếu không tìm thấy hoặc lỗi xóa
     */
    async delete(id: number): Promise<{ deletedMediaPath: string }> {
        if (isNaN(id)) {
            throw new Error('ID Media không hợp lệ');
        }

        let deletedMediaPath = '';

        try {
            // *** SỬ DỤNG TRANSACTION ***
            await prisma.$transaction(async (tx) => {
                // 1. Tìm Media để lấy path và kiểm tra tồn tại
                const mediaToDelete = await tx.media.findUnique({
                    where: { id },
                    select: { path: true, id: true } // Chỉ lấy path và id
                });

                if (!mediaToDelete) {
                    throw new Error(`Không tìm thấy Media với ID ${id}`); // Rollback
                }
                deletedMediaPath = mediaToDelete.path;

                // 2. Ngắt kết nối các quan hệ Foreign Key trực tiếp (QUAN TRỌNG)
                // Ví dụ: Nếu Media này là avatar của User nào đó
                await tx.user.updateMany({
                    where: { avatarId: id },
                    data: { avatarId: null } // Set avatarId về null
                });

                // Lưu ý: Các quan hệ Many-to-Many (RoomImages, BuildingImages, ...)
                // thường tự động được xử lý khi bản ghi Media bị xóa
                // (do Prisma quản lý bảng trung gian hoặc relation ảo).
                // Chỉ cần xử lý các Foreign Key trực tiếp như avatarId.

                // 3. Xóa bản ghi Media
                await tx.media.delete({
                    where: { id }
                });

                // Transaction thành công
            });
            // *** KẾT THÚC TRANSACTION ***

            return { deletedMediaPath }; // Trả về path để controller xóa file

        } catch (error) {
            console.error(`[MediaService.delete] Error deleting media ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error(`Không tìm thấy Media với ID ${id}`);
            }
            // Xử lý các lỗi transaction khác nếu cần
            throw error;
        }
    }
}