import { PrismaClient, Prisma, Media, MediaType } from '@prisma/client';

const prisma = new PrismaClient();

export class MediaService {

    /**
     * Tạo một bản ghi Media mới trong database
     */
    async create(data: {
        filename: string;
        path: string;
        mimeType: string;
        size: number;
        mediaType: MediaType;
    }): Promise<Media> {
        try {
            if (!Object.values(MediaType).includes(data.mediaType)) {
                throw new Error(`Loại media không hợp lệ: ${data.mediaType}`);
            }

            const newMedia = await prisma.media.create({
                data: {
                    filename: data.filename,
                    path: data.path,
                    mimeType: data.mimeType,
                    size: data.size,
                    mediaType: data.mediaType,
                }
            });
            return newMedia;
        } catch (error) {
            console.error("[MediaService.create] Error:", error);
            throw error;
        }
    }

    /**
     * Tìm kiếm và lấy danh sách Media
     */
    async findAll(options?: Prisma.MediaFindManyArgs): Promise<Media[]> {
        try {
            const mediaItems = await prisma.media.findMany({
                ...options,
                orderBy: options?.orderBy || { uploadedAt: 'desc' }
            });
            return mediaItems;
        } catch (error) {
            console.error("[MediaService.findAll] Error:", error);
            throw error;
        }
    }

    /**
     * Tìm một Media bằng ID
     */
    async findById(id: number, options?: Prisma.MediaFindUniqueArgs): Promise<Media | null> {
        if (isNaN(id)) {
            throw new Error('ID Media không hợp lệ');
        }
        try {
            const media = await prisma.media.findUnique({
                where: { id },
                ...options
            });

            if (!media) {
                throw new Error(`Không tìm thấy Media với ID ${id}`);
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
     * Cập nhật thông tin metadata của Media
     */
    async update(id: number, data: {}): Promise<Media> {
        if (isNaN(id)) {
            throw new Error('ID Media không hợp lệ');
        }
        try {
            const updatedMedia = await prisma.media.update({
                where: { id },
                data: {}
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
     * Xóa một bản ghi Media và ngắt các liên kết cần thiết
     */
    async delete(id: number): Promise<{ deletedMediaPath: string }> {
        if (isNaN(id)) {
            throw new Error('ID Media không hợp lệ');
        }

        let deletedMediaPath = '';

        try {
            await prisma.$transaction(async (tx) => {
                const mediaToDelete = await tx.media.findUnique({
                    where: { id },
                    select: { path: true, id: true }
                });

                if (!mediaToDelete) {
                    throw new Error(`Không tìm thấy Media với ID ${id}`);
                }
                deletedMediaPath = mediaToDelete.path;

                await tx.user.updateMany({
                    where: { avatarId: id },
                    data: { avatarId: null }
                });

                await tx.media.delete({
                    where: { id }
                });
            });

            return { deletedMediaPath };

        } catch (error) {
            console.error(`[MediaService.delete] Error deleting media ${id}:`, error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new Error(`Không tìm thấy Media với ID ${id}`);
            }
            throw error;
        }
    }
}