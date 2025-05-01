import path from 'path';
import fs from 'fs/promises'; // Sử dụng fs.promises cho async/await

// Xác định thư mục uploads một cách đáng tin cậy hơn, thường là ở gốc dự án
// process.cwd() trả về thư mục làm việc hiện tại nơi script được chạy
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const AVATAR_DIR = path.resolve(UPLOADS_DIR, 'avatar');

// Đảm bảo thư mục upload tồn tại khi service được load (chỉ chạy một lần)
// Mặc dù multer cũng có thể làm điều này, thêm ở đây để chắc chắn.
fs.mkdir(UPLOADS_DIR, { recursive: true }).catch(error => {
  if (error.code !== 'EEXIST') { // Bỏ qua lỗi nếu thư mục đã tồn tại
    console.error(`[FileService] Failed to ensure uploads directory exists at ${UPLOADS_DIR}:`, error);
  } else {
    console.log(`[FileService] Uploads directory confirmed at: ${UPLOADS_DIR}`);
  }
});

// Đảm bảo thư mục avatar tồn tại
fs.mkdir(AVATAR_DIR, { recursive: true }).catch(error => {
  if (error.code !== 'EEXIST') {
    console.error(`[FileService] Failed to ensure avatar directory exists at ${AVATAR_DIR}:`, error);
  } else {
    console.log(`[FileService] Avatar directory confirmed at: ${AVATAR_DIR}`);
  }
});

/**
 * Xóa file vật lý khỏi thư mục uploads một cách an toàn.
 * Chỉ log lỗi nếu không xóa được, không throw để tránh dừng luồng chính không cần thiết.
 * @param relativePath Đường dẫn tương đối của file cần xóa (vd: /uploads/image.jpg hoặc /uploads/avatar/avatar.jpg) như được lưu trong DB.
 */
export const deleteFile = async (relativePath: string): Promise<void> => {
  if (!relativePath || typeof relativePath !== 'string' || !relativePath.startsWith('/uploads/')) {
    console.error(`[FileService] Invalid relative path provided for deletion: ${relativePath}`);
    return; // Không thực hiện xóa nếu path không hợp lệ
  }

  try {
    // Xác định đường dẫn tuyệt đối dựa trên cấu trúc path
    let absolutePath;

    if (relativePath.startsWith('/uploads/avatar/')) {
      // File là avatar, nằm trong thư mục avatar
      const filename = path.basename(relativePath);
      absolutePath = path.join(AVATAR_DIR, filename);
    } else {
      // File thông thường trong thư mục uploads
      const cleanPath = relativePath.replace('/uploads/', '');
      absolutePath = path.join(UPLOADS_DIR, cleanPath);
    }

    console.log(`[FileService] Attempting to delete file at: ${absolutePath}`);

    // Thử xóa file, fs.promises.unlink sẽ throw lỗi nếu file không tồn tại hoặc không có quyền
    await fs.unlink(absolutePath);

    console.log(`[FileService] Successfully deleted file: ${absolutePath}`);

  } catch (error: any) {
    // Chỉ log lỗi, không throw lại trừ khi thực sự cần thiết
    if (error.code === 'ENOENT') {
      // Lỗi file không tồn tại - thường không nghiêm trọng, có thể đã bị xóa trước đó
      console.warn(`[FileService] File not found for deletion (may already be deleted): ${error.path}`);
    } else {
      // Các lỗi khác (vd: quyền truy cập)
      console.error(`[FileService] Error deleting file ${relativePath}:`, error);
    }
    // Quyết định không throw lỗi ở đây để các tiến trình khác (như xóa user) có thể tiếp tục
    // throw new Error(`Không thể xóa file: ${relativePath}`); // Bỏ comment nếu muốn throw lỗi
  }
};