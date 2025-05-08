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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFile = void 0;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const UPLOADS_DIR = path_1.default.resolve(process.cwd(), 'uploads');
const AVATAR_DIR = path_1.default.resolve(UPLOADS_DIR, 'avatar');
promises_1.default.mkdir(UPLOADS_DIR, { recursive: true }).catch(error => {
    if (error.code !== 'EEXIST') {
        console.error(`[FileService] Failed to ensure uploads directory exists at ${UPLOADS_DIR}:`, error);
    }
    else {
        console.log(`[FileService] Uploads directory confirmed at: ${UPLOADS_DIR}`);
    }
});
promises_1.default.mkdir(AVATAR_DIR, { recursive: true }).catch(error => {
    if (error.code !== 'EEXIST') {
        console.error(`[FileService] Failed to ensure avatar directory exists at ${AVATAR_DIR}:`, error);
    }
    else {
        console.log(`[FileService] Avatar directory confirmed at: ${AVATAR_DIR}`);
    }
});
/**
 * Xóa file vật lý khỏi thư mục uploads một cách an toàn.
 * @param relativePath Đường dẫn tương đối của file cần xóa (vd: /uploads/image.jpg hoặc /uploads/avatar/avatar.jpg) như được lưu trong DB.
 */
const deleteFile = (relativePath) => __awaiter(void 0, void 0, void 0, function* () {
    if (!relativePath || typeof relativePath !== 'string' || !relativePath.startsWith('/uploads/')) {
        console.error(`[FileService] Invalid relative path provided for deletion: ${relativePath}`);
        return;
    }
    try {
        let absolutePath;
        if (relativePath.startsWith('/uploads/avatar/')) {
            const filename = path_1.default.basename(relativePath);
            absolutePath = path_1.default.join(AVATAR_DIR, filename);
        }
        else {
            const cleanPath = relativePath.replace('/uploads/', '');
            absolutePath = path_1.default.join(UPLOADS_DIR, cleanPath);
        }
        console.log(`[FileService] Attempting to delete file at: ${absolutePath}`);
        yield promises_1.default.unlink(absolutePath);
        console.log(`[FileService] Successfully deleted file: ${absolutePath}`);
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            console.warn(`[FileService] File not found for deletion (may already be deleted): ${error.path}`);
        }
        else {
            console.error(`[FileService] Error deleting file ${relativePath}:`, error);
        }
    }
});
exports.deleteFile = deleteFile;
