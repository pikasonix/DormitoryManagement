import path from 'path';
import fs from 'fs/promises';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const AVATAR_DIR = path.resolve(UPLOADS_DIR, 'avatar');

fs.mkdir(UPLOADS_DIR, { recursive: true }).catch(error => {
  if (error.code !== 'EEXIST') {
    console.error(`[FileService] Failed to ensure uploads directory exists at ${UPLOADS_DIR}:`, error);
  } else {
    console.log(`[FileService] Uploads directory confirmed at: ${UPLOADS_DIR}`);
  }
});

fs.mkdir(AVATAR_DIR, { recursive: true }).catch(error => {
  if (error.code !== 'EEXIST') {
    console.error(`[FileService] Failed to ensure avatar directory exists at ${AVATAR_DIR}:`, error);
  } else {
    console.log(`[FileService] Avatar directory confirmed at: ${AVATAR_DIR}`);
  }
});

/**
 * Xóa file vật lý khỏi thư mục uploads một cách an toàn.
 * @param relativePath Đường dẫn tương đối của file cần xóa (vd: /uploads/image.jpg hoặc /uploads/avatar/avatar.jpg) như được lưu trong DB.
 */
export const deleteFile = async (relativePath: string): Promise<void> => {
  if (!relativePath || typeof relativePath !== 'string' || !relativePath.startsWith('/uploads/')) {
    console.error(`[FileService] Invalid relative path provided for deletion: ${relativePath}`);
    return;
  }

  try {
    let absolutePath;

    if (relativePath.startsWith('/uploads/avatar/')) {
      const filename = path.basename(relativePath);
      absolutePath = path.join(AVATAR_DIR, filename);
    } else {
      const cleanPath = relativePath.replace('/uploads/', '');
      absolutePath = path.join(UPLOADS_DIR, cleanPath);
    }

    console.log(`[FileService] Attempting to delete file at: ${absolutePath}`);

    await fs.unlink(absolutePath);

    console.log(`[FileService] Successfully deleted file: ${absolutePath}`);

  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.warn(`[FileService] File not found for deletion (may already be deleted): ${error.path}`);
    } else {
      console.error(`[FileService] Error deleting file ${relativePath}:`, error);
    }
  }
};