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
exports.MediaService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class MediaService {
    /**
     * Tạo một bản ghi Media mới trong database
     */
    create(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!Object.values(client_1.MediaType).includes(data.mediaType)) {
                    throw new Error(`Loại media không hợp lệ: ${data.mediaType}`);
                }
                const newMedia = yield prisma.media.create({
                    data: {
                        filename: data.filename,
                        path: data.path,
                        mimeType: data.mimeType,
                        size: data.size,
                        mediaType: data.mediaType,
                    }
                });
                return newMedia;
            }
            catch (error) {
                console.error("[MediaService.create] Error:", error);
                throw error;
            }
        });
    }
    /**
     * Tìm kiếm và lấy danh sách Media
     */
    findAll(options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const mediaItems = yield prisma.media.findMany(Object.assign(Object.assign({}, options), { orderBy: (options === null || options === void 0 ? void 0 : options.orderBy) || { uploadedAt: 'desc' } }));
                return mediaItems;
            }
            catch (error) {
                console.error("[MediaService.findAll] Error:", error);
                throw error;
            }
        });
    }
    /**
     * Tìm một Media bằng ID
     */
    findById(id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNaN(id)) {
                throw new Error('ID Media không hợp lệ');
            }
            try {
                const media = yield prisma.media.findUnique(Object.assign({ where: { id } }, options));
                if (!media) {
                    throw new Error(`Không tìm thấy Media với ID ${id}`);
                }
                return media;
            }
            catch (error) {
                console.error(`[MediaService.findById] Error fetching media ${id}:`, error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    throw new Error(`Không tìm thấy Media với ID ${id}`);
                }
                throw error;
            }
        });
    }
    /**
     * Cập nhật thông tin metadata của Media
     */
    update(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNaN(id)) {
                throw new Error('ID Media không hợp lệ');
            }
            try {
                const updatedMedia = yield prisma.media.update({
                    where: { id },
                    data: {}
                });
                return updatedMedia;
            }
            catch (error) {
                console.error(`[MediaService.update] Error updating media ${id}:`, error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    throw new Error(`Không tìm thấy Media với ID ${id}`);
                }
                throw error;
            }
        });
    }
    /**
     * Xóa một bản ghi Media và ngắt các liên kết cần thiết
     */
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNaN(id)) {
                throw new Error('ID Media không hợp lệ');
            }
            let deletedMediaPath = '';
            try {
                yield prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    const mediaToDelete = yield tx.media.findUnique({
                        where: { id },
                        select: { path: true, id: true }
                    });
                    if (!mediaToDelete) {
                        throw new Error(`Không tìm thấy Media với ID ${id}`);
                    }
                    deletedMediaPath = mediaToDelete.path;
                    yield tx.user.updateMany({
                        where: { avatarId: id },
                        data: { avatarId: null }
                    });
                    yield tx.media.delete({
                        where: { id }
                    });
                }));
                return { deletedMediaPath };
            }
            catch (error) {
                console.error(`[MediaService.delete] Error deleting media ${id}:`, error);
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                    throw new Error(`Không tìm thấy Media với ID ${id}`);
                }
                throw error;
            }
        });
    }
}
exports.MediaService = MediaService;
