import { Request, Response, NextFunction } from 'express';
import { MediaService } from '../services/media.service';
import { deleteFile } from '../services/file.service';
import { Prisma, MediaType, PrismaClient, Role } from '@prisma/client';

interface RequestWithUser extends Request {
    user?: {
        userId: number;
        email: string;
        role: Role;
    };
}

const prisma = new PrismaClient();
const mediaService = new MediaService();

export class MediaController {

    // Xử lý upload file và tạo bản ghi Media
    async uploadMedia(req: RequestWithUser, res: Response, next: NextFunction) {
        const uploadedFile = req.file;

        try {
            if (!uploadedFile) {
                return next(new Error('Không có file nào được tải lên.'));
            }

            const { mediaType } = req.body;

            // Validate mediaType
            if (!mediaType || !Object.values(MediaType).includes(mediaType as MediaType)) {
                if (typeof deleteFile === 'function') await deleteFile(`/uploads/${uploadedFile.filename}`);
                return next(new Error(`Loại media không hợp lệ hoặc bị thiếu. Các loại hợp lệ: ${Object.values(MediaType).join(', ')}`));
            }

            // Xác định đường dẫn dựa trên loại media
            let filePath;
            if (mediaType === MediaType.USER_AVATAR) {
                filePath = `/uploads/avatar/${uploadedFile.filename}`;
            } else {
                filePath = `/uploads/${uploadedFile.filename}`;
            }

            const createData = {
                filename: uploadedFile.filename,
                path: filePath,
                mimeType: uploadedFile.mimetype,
                size: uploadedFile.size,
                mediaType: mediaType as MediaType,
            };

            // Thực hiện transaction
            const newMedia = await prisma.$transaction(async (tx) => {
                const media = await tx.media.create({
                    data: createData
                });

                if (mediaType === MediaType.USER_AVATAR && req.user?.userId) {
                    console.log(`[MediaController] Updating user ${req.user.userId} with new avatar ID ${media.id}`);

                    await tx.user.update({
                        where: { id: req.user.userId },
                        data: { avatarId: media.id }
                    });
                }

                return media;
            });

            res.status(201).json({
                status: 'success',
                message: 'Tải lên thành công và tạo bản ghi Media.',
                data: newMedia
            });

        } catch (error: any) {
            if (uploadedFile && typeof deleteFile === 'function') {
                console.warn(`[MediaController.uploadMedia] Rolling back file upload due to error: ${error.message}. Deleting ${uploadedFile.filename}`);
                await deleteFile(`/uploads/${uploadedFile.filename}`).catch(delErr => console.error("Error deleting orphaned file:", delErr));
            }
            next(error);
        }
    }

    // Lấy danh sách Media (có thể lọc và phân trang)
    async getAllMedia(req: Request, res: Response, next: NextFunction) {
        try {
            const { mediaType, page, limit } = req.query;

            const options: Prisma.MediaFindManyArgs = { where: {} };

            // Xây dựng bộ lọc
            if (mediaType && Object.values(MediaType).includes(mediaType as MediaType)) {
                options.where!.mediaType = mediaType as MediaType;
            }

            // Phân trang
            const pageNum = parseInt(page as string) || 1;
            const limitNum = parseInt(limit as string) || 20;
            options.skip = (pageNum - 1) * limitNum;
            options.take = limitNum;

            // Lấy tổng số bản ghi để phân trang
            const totalRecords = await prisma.media.count({ where: options.where });
            const mediaItems = await mediaService.findAll(options);

            res.status(200).json({
                status: 'success',
                results: mediaItems.length,
                total: totalRecords,
                data: mediaItems
            });
        } catch (error) {
            next(error);
        }
    }

    // Lấy thông tin chi tiết một Media bằng ID
    async getMediaById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id);
            const media = await mediaService.findById(id);
            res.status(200).json({
                status: 'success',
                data: media
            });
        } catch (error) {
            next(error);
        }
    }

    // Cập nhật metadata của Media
    async updateMedia(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id);

            // Since all updateable fields (like alt) have been removed from schema
            // We're just returning the media object without updates
            // Or you can consider removing this endpoint completely if no longer needed

            const updatedMedia = await mediaService.update(id, {});
            res.status(200).json({
                status: 'success',
                data: updatedMedia
            });
        } catch (error) {
            next(error);
        }
    }

    // Xóa một Media (bản ghi DB và file vật lý)
    async deleteMedia(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id);

            const { deletedMediaPath } = await mediaService.delete(id);

            // Xóa file vật lý sau khi xóa DB thành công
            if (deletedMediaPath && typeof deleteFile === 'function') {
                await deleteFile(deletedMediaPath);
            } else if (deletedMediaPath) {
                console.warn(`[MediaController] deleteFile function not available, cannot delete media file: ${deletedMediaPath}`);
            }

            res.status(200).json({
                status: 'success',
                message: 'Media đã được xóa thành công.',
                data: null
            });
        } catch (error) {
            next(error);
        }
    }
}