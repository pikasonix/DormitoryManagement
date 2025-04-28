import { Request, Response, NextFunction } from 'express';
import { MediaService } from '../services/media.service';
import { deleteFile } from '../services/file.service'; // Import hàm xóa file
import { Prisma, MediaType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient(); // Initialize Prisma client


const mediaService = new MediaService();

export class MediaController {

    /**
     * Xử lý upload file và tạo bản ghi Media.
     */
    async uploadMedia(req: Request, res: Response, next: NextFunction) {
        const uploadedFile = req.file; // File được multer xử lý và gán vào req.file

        try {
            if (!uploadedFile) {
                // return next(new AppError('Không có file nào được tải lên.', 400));
                return next(new Error('Không có file nào được tải lên.'));
            }

            // Lấy thông tin từ body (do upload là multipart/form-data)
            const { mediaType, alt, isPublic } = req.body;

            // Validate mediaType
            if (!mediaType || !Object.values(MediaType).includes(mediaType as MediaType)) {
                // Quan trọng: Nếu validate lỗi sau khi file đã upload, cần xóa file vật lý
                if (typeof deleteFile === 'function') await deleteFile(`/uploads/${uploadedFile.filename}`);
                // return next(new AppError(`Loại media không hợp lệ hoặc bị thiếu. Các loại hợp lệ: ${Object.values(MediaType).join(', ')}`, 400));
                return next(new Error(`Loại media không hợp lệ hoặc bị thiếu. Các loại hợp lệ: ${Object.values(MediaType).join(', ')}`));
            }

            const createData = {
                filename: uploadedFile.filename,
                originalFilename: uploadedFile.originalname,
                path: `/uploads/${uploadedFile.filename}`, // Lưu đường dẫn tương đối
                mimeType: uploadedFile.mimetype,
                size: uploadedFile.size,
                mediaType: mediaType as MediaType,
                alt: alt || null,
                isPublic: isPublic !== undefined ? Boolean(isPublic) : true,
                // uploadedById: req.user?.userId // Gán ID người upload nếu cần
            };

            const newMedia = await mediaService.create(createData);

            res.status(201).json({
                status: 'success',
                message: 'Tải lên thành công và tạo bản ghi Media.',
                data: newMedia // Trả về thông tin Media đã tạo (quan trọng là ID)
            });

        } catch (error: any) {
            // Nếu có lỗi xảy ra *sau khi* file đã được upload (vd: lỗi DB khi tạo record)
            // thì cần cố gắng xóa file vật lý đã upload
            if (uploadedFile && typeof deleteFile === 'function') {
                console.warn(`[MediaController.uploadMedia] Rolling back file upload due to error: ${error.message}. Deleting ${uploadedFile.filename}`);
                await deleteFile(`/uploads/${uploadedFile.filename}`).catch(delErr => console.error("Error deleting orphaned file:", delErr)); // Cố gắng xóa, bắt lỗi nếu xóa thất bại
            }
            next(error); // Chuyển lỗi đến global handler
        }
    }


    /**
     * Lấy danh sách Media (có thể lọc và phân trang).
     */
    async getAllMedia(req: Request, res: Response, next: NextFunction) {
        try {
            const { mediaType, isPublic, page, limit } = req.query;

            const options: Prisma.MediaFindManyArgs = { where: {} };

            // Xây dựng bộ lọc
            if (mediaType && Object.values(MediaType).includes(mediaType as MediaType)) {
                options.where!.mediaType = mediaType as MediaType;
            }
            if (isPublic !== undefined) {
                options.where!.isPublic = isPublic === 'true'; // Chuyển string từ query param thành boolean
            }

            // Phân trang
            const pageNum = parseInt(page as string) || 1;
            const limitNum = parseInt(limit as string) || 20; // Mặc định 20 item/trang
            options.skip = (pageNum - 1) * limitNum;
            options.take = limitNum;

            // Lấy tổng số bản ghi để phân trang phía client
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

    /**
     * Lấy thông tin chi tiết một Media bằng ID.
     */
    async getMediaById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id);
            const media = await mediaService.findById(id); // Service đã xử lý not found
            res.status(200).json({
                status: 'success',
                data: media
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Cập nhật metadata của Media.
     */
    async updateMedia(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id);
            const { alt, isPublic } = req.body; // Chỉ lấy các trường cho phép cập nhật

            const updateData = {
                alt: alt,
                isPublic: isPublic !== undefined ? Boolean(isPublic) : undefined,
            };

            const updatedMedia = await mediaService.update(id, updateData);
            res.status(200).json({
                status: 'success',
                data: updatedMedia
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Xóa một Media (bản ghi DB và file vật lý).
     */
    async deleteMedia(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id);

            // Service sẽ xử lý việc xóa DB và trả về path của file cần xóa
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