"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaController = void 0;
const media_service_1 = require("../services/media.service");
const file_service_1 = require("../services/file.service");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const mediaService = new media_service_1.MediaService();
class MediaController {
    // Xử lý upload file và tạo bản ghi Media
    uploadMedia(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const uploadedFile = req.file;
            try {
                if (!uploadedFile) {
                    return next(new Error('Không có file nào được tải lên.'));
                }
                const { mediaType } = req.body;
                // Validate mediaType
                if (!mediaType || !Object.values(client_1.MediaType).includes(mediaType)) {
                    if (typeof file_service_1.deleteFile === 'function')
                        yield (0, file_service_1.deleteFile)(`/uploads/${uploadedFile.filename}`);
                    return next(new Error(`Loại media không hợp lệ hoặc bị thiếu. Các loại hợp lệ: ${Object.values(client_1.MediaType).join(', ')}`));
                }
                // Xác định đường dẫn dựa trên loại media
                let filePath;
                if (mediaType === client_1.MediaType.USER_AVATAR) {
                    filePath = `/uploads/avatar/${uploadedFile.filename}`;
                }
                else {
                    filePath = `/uploads/${uploadedFile.filename}`;
                }
                const createData = {
                    filename: uploadedFile.filename,
                    path: filePath,
                    mimeType: uploadedFile.mimetype,
                    size: uploadedFile.size,
                    mediaType: mediaType,
                };
                // Thực hiện transaction
                const newMedia = yield prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    const media = yield tx.media.create({
                        data: createData
                    });
                    if (mediaType === client_1.MediaType.USER_AVATAR && ((_a = req.user) === null || _a === void 0 ? void 0 : _a.userId)) {
                        console.log(`[MediaController] Updating user ${req.user.userId} with new avatar ID ${media.id}`);
                        yield tx.user.update({
                            where: { id: req.user.userId },
                            data: { avatarId: media.id }
                        });
                    }
                    return media;
                }));
                res.status(201).json({
                    status: 'success',
                    message: 'Tải lên thành công và tạo bản ghi Media.',
                    data: newMedia
                });
            }
            catch (error) {
                if (uploadedFile && typeof file_service_1.deleteFile === 'function') {
                    console.warn(`[MediaController.uploadMedia] Rolling back file upload due to error: ${error.message}. Deleting ${uploadedFile.filename}`);
                    yield (0, file_service_1.deleteFile)(`/uploads/${uploadedFile.filename}`).catch(delErr => console.error("Error deleting orphaned file:", delErr));
                }
                next(error);
            }
        });
    }
    // Lấy danh sách Media (có thể lọc và phân trang)
    getAllMedia(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { mediaType, page, limit } = req.query;
                const options = { where: {} };
                // Xây dựng bộ lọc
                if (mediaType && Object.values(client_1.MediaType).includes(mediaType)) {
                    options.where.mediaType = mediaType;
                }
                // Phân trang
                const pageNum = parseInt(page) || 1;
                const limitNum = parseInt(limit) || 20;
                options.skip = (pageNum - 1) * limitNum;
                options.take = limitNum;
                // Lấy tổng số bản ghi để phân trang
                const totalRecords = yield prisma.media.count({ where: options.where });
                const mediaItems = yield mediaService.findAll(options);
                res.status(200).json({
                    status: 'success',
                    results: mediaItems.length,
                    total: totalRecords,
                    data: mediaItems
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    // Lấy thông tin chi tiết một Media bằng ID
    getMediaById(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                const media = yield mediaService.findById(id);
                res.status(200).json({
                    status: 'success',
                    data: media
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    // Cập nhật metadata của Media
    updateMedia(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                // Since all updateable fields (like alt) have been removed from schema
                // We're just returning the media object without updates
                // Or you can consider removing this endpoint completely if no longer needed
                const updatedMedia = yield mediaService.update(id, {});
                res.status(200).json({
                    status: 'success',
                    data: updatedMedia
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    // Xóa một Media (bản ghi DB và file vật lý)
    deleteMedia(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(req.params.id);
                const { deletedMediaPath } = yield mediaService.delete(id);
                // Xóa file vật lý sau khi xóa DB thành công
                if (deletedMediaPath && typeof file_service_1.deleteFile === 'function') {
                    yield (0, file_service_1.deleteFile)(deletedMediaPath);
                }
                else if (deletedMediaPath) {
                    console.warn(`[MediaController] deleteFile function not available, cannot delete media file: ${deletedMediaPath}`);
                }
                res.status(200).json({
                    status: 'success',
                    message: 'Media đã được xóa thành công.',
                    data: null
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
}
exports.MediaController = MediaController;
