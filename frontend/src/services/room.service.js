import apiClient from '../api/axios'; // Instance Axios đã cấu hình
import { toast } from 'react-hot-toast';

// --- Các hàm gọi API cho Room ---

/**
 * Lấy danh sách phòng (có thể lọc).
 * @param {object} params - Query parameters (vd: buildingId, status, type, hasVacancy, page, limit)
 * @returns {Promise<object>} Dữ liệu trả về { rooms: [...], meta: {...} }
 */
const getAllRooms = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/rooms', { params });
    // Controller trả về { status: 'success', results: number, total: number, data: [...] }
    if (response.data?.status === 'success' && Array.isArray(response.data?.data)) {
      console.log('Room data from API:', response.data.data[0]); // For debugging: Check building info

      return {
        rooms: response.data.data,
        meta: {
          total: response.data.total || response.data.results || response.data.data.length,
          currentPage: parseInt(params.page) || 1,
          totalPages: Math.ceil((response.data.total || response.data.results || response.data.data.length) / (params.limit || 10)),
          limit: parseInt(params.limit) || 10
        }
      };
    } else {
      throw new Error(response.data?.message || 'Lấy danh sách phòng thất bại.');
    }
  } catch (error) {
    console.error('Lỗi service getAllRooms:', error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Lấy thông tin chi tiết một phòng bằng ID.
 * @param {string|number} id - ID của phòng.
 * @returns {Promise<object>} Dữ liệu chi tiết của phòng.
 */
const getRoomById = async (id) => {
  try {
    const response = await apiClient.get(`/api/rooms/${id}`);
    // Controller trả về { status: 'success', data: room_object }
    if (response.data?.status === 'success' && response.data?.data) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || `Không tìm thấy phòng với ID ${id}.`);
    }
  } catch (error) {
    console.error(`Lỗi service getRoomById (${id}):`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Lấy thông tin chi tiết một phòng bằng ID, bao gồm danh sách sinh viên.
 * @param {string|number} id - ID của phòng.
 * @returns {Promise<object>} Dữ liệu chi tiết của phòng và danh sách sinh viên.
 */
const getRoomDetails = async (id) => {
  try {
    // Use the regular getRoomById endpoint since it includes residents
    const response = await apiClient.get(`/api/rooms/${id}`);

    // Controller trả về { status: 'success', data: room_object }
    if (response.data?.status === 'success' && response.data?.data) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || `Không tìm thấy thông tin chi tiết phòng với ID ${id}.`);
    }
  } catch (error) {
    console.error(`Lỗi service getRoomDetails (${id}):`, error.response?.data || error.message);
    throw error.response?.data || error;
    throw error.response?.data || error;
  }
};

/**
 * Tạo một phòng mới.
 * @param {object} roomData - Dữ liệu phòng mới { buildingId, number, type, capacity, floor, price, status?, description?, amenities?, imageIds? }.
 * @returns {Promise<object>} Dữ liệu phòng vừa tạo.
 */
const createRoom = async (roomData) => {
  try {
    // Controller yêu cầu amenities là [{ amenityId, quantity?, notes? }]
    // Controller yêu cầu imageIds là [number]
    const response = await apiClient.post('/api/rooms', roomData);
    // Controller trả về { status: 'success', data: new_room_object }
    if (response.data?.status === 'success' && response.data?.data) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Tạo phòng mới thất bại.');
    }
  } catch (error) {
    console.error('Lỗi service createRoom:', error.response?.data || error.message);
    if (error.response?.data?.errors) { // Nếu backend trả về lỗi validation chi tiết
      throw error.response.data;
    }
    throw error.response?.data || error;
  }
};

/**
 * Cập nhật thông tin một phòng.
 * @param {string|number} id - ID của phòng cần cập nhật.
 * @param {object} roomData - Dữ liệu cần cập nhật.
 * @returns {Promise<object>} Dữ liệu phòng sau khi cập nhật.
 */
const updateRoom = async (id, roomData) => {
  try {
    const response = await apiClient.put(`/api/rooms/${id}`, roomData);
    // Controller trả về { status: 'success', data: updated_room_object }
    if (response.data?.status === 'success' && response.data?.data) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Cập nhật phòng thất bại.');
    }
  } catch (error) {
    console.error(`Lỗi service updateRoom (${id}):`, error.response?.data || error.message);
    if (error.response?.data?.errors) {
      throw error.response.data;
    }
    throw error.response?.data || error;
  }
};

/**
 * Xóa một phòng.
 * @param {string|number} id - ID của phòng cần xóa.
 * @returns {Promise<object>} Response từ API (thường chứa message).
 */
const deleteRoom = async (id) => {
  try {
    const response = await apiClient.delete(`/api/rooms/${id}`);
    // Controller trả về { status: 'success', message: "...", data: null }
    if (response.data?.status === 'success') {
      return response.data;
    } else {
      throw new Error(response.data?.message || 'Xóa phòng thất bại.');
    }
  } catch (error) {
    console.error(`Lỗi service deleteRoom (${id}):`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

// --- Service cho upload media (nếu chưa có) ---
// Hàm này có thể đặt ở media.service.js hoặc ở đây nếu chỉ dùng cho Room
/**
 * Upload một file media (vd: ảnh phòng).
 * @param {File} file - File cần upload.
 * @param {string} context - Ngữ cảnh upload (vd: 'room-image'), tùy backend yêu cầu.
 * @returns {Promise<object>} Thông tin media đã upload (vd: { id, url, path }).
 */
const uploadMedia = async (file, context = 'room-image') => {
  const formData = new FormData();
  formData.append('file', file);
  // formData.append('context', context); // Gửi context nếu backend cần

  try {
    // **Sử dụng endpoint upload media chính xác**
    const response = await apiClient.post('/api/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    // **Kiểm tra cấu trúc response upload chính xác**
    if (response.data?.success && response.data?.data?.id) { // Giả sử trả về { success: true, data: { id: ... } }
      return response.data.data; // Trả về object media
    } else {
      throw new Error(response.data?.message || 'Upload file thất bại.');
    }
  } catch (error) {
    console.error('Lỗi service uploadMedia:', error.response?.data || error.message);
    toast.error(error.response?.data?.message || 'Upload file thất bại.'); // Hiển thị toast lỗi
    throw error.response?.data || error;
  }
};


// Export service object
export const roomService = {
  getAllRooms,
  getRoomById,
  getRoomDetails,
  createRoom,
  updateRoom,
  deleteRoom,
  uploadMedia, // Thêm hàm upload
};