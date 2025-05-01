import apiClient from '../api/axios';
import { toast } from 'react-hot-toast';

/**
 * Upload một file media lên server.
 * @param {File} file - File cần upload (Image, PDF, etc.).
 * @param {string} [context] - (Tùy chọn) Ngữ cảnh upload, ví dụ: 'user-avatar', 'room-image', 'maintenance-request'. Backend có thể dùng thông tin này.
 * @param {string} [mediaType] - Loại media cần upload. Các giá trị hợp lệ: USER_AVATAR, ROOM_IMAGE, BUILDING_IMAGE, VEHICLE_IMAGE, MAINTENANCE_IMAGE, OTHER
 * @returns {Promise<object>} Thông tin chi tiết của media đã được upload (vd: { id, url, path, filename, size, mimeType }).
 * @throws {Error} Nếu upload thất bại hoặc API trả về lỗi.
 */
const uploadMedia = async (file, context = 'default', mediaType = null) => {
    const formData = new FormData();
    formData.append('file', file); // Key 'file' theo API doc

    // Xác định mediaType dựa trên context nếu không được cung cấp trực tiếp
    if (!mediaType) {
        // Map context đến mediaType tương ứng
        const contextToMediaType = {
            'user-avatar': 'USER_AVATAR',
            'room-image': 'ROOM_IMAGE',
            'building-image': 'BUILDING_IMAGE',
            'vehicle-image': 'VEHICLE_IMAGE',
            'maintenance-request': 'MAINTENANCE_IMAGE',
            'default': 'OTHER'
        };

        mediaType = contextToMediaType[context] || 'OTHER';
    }

    // Thêm mediaType vào formData (bắt buộc theo yêu cầu của backend)
    formData.append('mediaType', mediaType);

    // Hiển thị toast loading khi bắt đầu upload
    const uploadToastId = toast.loading(`Đang tải lên: ${file.name}...`);

    try {
        // **Sử dụng endpoint upload media chính xác**
        const response = await apiClient.post('/media/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            // Có thể thêm onUploadProgress nếu muốn hiển thị % tiến trình
            // onUploadProgress: (progressEvent) => {
            //   const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            //   console.log(`Upload Progress: ${percentCompleted}%`);
            //   // Cập nhật UI nếu cần
            // }
        });

        // **Kiểm tra cấu trúc response upload chính xác**
        // API doc: { success: true, data: { id, url, filename, ... } }
        if (response.data?.success && response.data?.data?.id) {
            toast.success(`Đã tải lên: ${response.data.data.filename || file.name}`, { id: uploadToastId });
            return response.data.data; // Trả về object media đầy đủ
        } else {
            throw new Error(response.data?.message || 'Upload file không thành công.');
        }
    } catch (error) {
        console.error('Lỗi service uploadMedia:', error.response?.data || error.message);
        // Interceptor có thể đã hiển thị lỗi chung, nhưng hiển thị lại lỗi cụ thể hơn
        toast.error(error.response?.data?.message || `Lỗi khi tải lên: ${file.name}`, { id: uploadToastId });
        throw error.response?.data || error; // Ném lại lỗi
    }
};


/**
 * Lấy thông tin chi tiết một file media bằng ID.
 * Ít dùng trực tiếp trong UI, nhưng có thể hữu ích.
 * @param {string|number} id - ID của media.
 * @returns {Promise<object>} Dữ liệu chi tiết của media.
 */
const getMediaById = async (id) => {
    try {
        const response = await apiClient.get(`/media/${id}`);
        // API doc: { success: true, data: { media_object } }
        if (response.data?.success && response.data?.data) {
            return response.data.data;
        } else {
            throw new Error(response.data?.message || `Không tìm thấy media với ID ${id}.`);
        }
    } catch (error) {
        console.error(`Lỗi service getMediaById (${id}):`, error.response?.data || error.message);
        throw error.response?.data || error;
    }
};


// Export service object
export const mediaService = {
    uploadMedia,
    getMediaById,
    // Không có list hay delete media trực tiếp theo API doc
};