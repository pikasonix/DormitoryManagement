import apiClient from '../api/axios';
import { toast } from 'react-hot-toast';

// --- Các hàm gọi API cho Amenity ---

/**
 * Lấy danh sách tất cả tiện nghi (có phân trang).
 * @param {object} params - Query parameters (vd: page, limit, search?)
 * @returns {Promise<object>} Dữ liệu trả về { amenities: [...], meta: {...} }
 */
const getAllAmenities = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/amenities', { params });
    // API doc: { success: true, data: { amenities: [...], meta: {...} } }
    if (response.data?.success) {
      return response.data.data; // Trả về { amenities, meta }
    } else {
      throw new Error(response.data?.message || 'Lấy danh sách tiện nghi thất bại.');
    }
  } catch (error) {
    console.error('Lỗi service getAllAmenities:', error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Lấy thông tin chi tiết một tiện nghi bằng ID.
 * @param {string|number} id - ID của tiện nghi.
 * @returns {Promise<object>} Dữ liệu chi tiết của tiện nghi.
 */
const getAmenityById = async (id) => {
  try {
    const response = await apiClient.get(`/api/amenities/${id}`);
    // API doc: { success: true, data: { amenity_object } }
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || `Không tìm thấy tiện nghi với ID ${id}.`);
    }
  } catch (error) {
    console.error(`Lỗi service getAmenityById (${id}):`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Tạo một tiện nghi mới.
 * @param {object} amenityData - Dữ liệu tiện nghi mới { name, description?, icon? }.
 * @returns {Promise<object>} Dữ liệu tiện nghi vừa tạo.
 */
const createAmenity = async (amenityData) => {
  try {
    const response = await apiClient.post('/api/amenities', amenityData);
    // API doc: { success: true, data: { new_amenity_object } }
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Tạo tiện nghi mới thất bại.');
    }
  } catch (error) {
    console.error('Lỗi service createAmenity:', error.response?.data || error.message);
    if (error.response?.data?.errors) {
      throw error.response.data;
    }
    throw error.response?.data || error;
  }
};

/**
 * Cập nhật thông tin một tiện nghi.
 * @param {string|number} id - ID của tiện nghi cần cập nhật.
 * @param {object} amenityData - Dữ liệu cần cập nhật.
 * @returns {Promise<object>} Dữ liệu tiện nghi sau khi cập nhật.
 */
const updateAmenity = async (id, amenityData) => {
  try {
    const response = await apiClient.put(`/api/amenities/${id}`, amenityData);
    // API doc: { success: true, data: { updated_amenity_object } }
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Cập nhật tiện nghi thất bại.');
    }
  } catch (error) {
    console.error(`Lỗi service updateAmenity (${id}):`, error.response?.data || error.message);
    if (error.response?.data?.errors) {
      throw error.response.data;
    }
    throw error.response?.data || error;
  }
};

/**
 * Xóa một tiện nghi.
 * @param {string|number} id - ID của tiện nghi cần xóa.
 * @returns {Promise<object>} Response từ API (thường chứa message).
 */
const deleteAmenity = async (id) => {
  try {
    const response = await apiClient.delete(`/api/amenities/${id}`);
    // API doc: { success: true, message: "..." }
    if (response.data?.success) {
      return response.data;
    } else {
      // Có thể có lỗi nếu tiện nghi đang được sử dụng trong phòng?
      throw new Error(response.data?.message || 'Xóa tiện nghi thất bại.');
    }
  } catch (error) {
    console.error(`Lỗi service deleteAmenity (${id}):`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

// Export service object
export const amenityService = {
  getAllAmenities,
  getAmenityById,
  createAmenity,
  updateAmenity,
  deleteAmenity,
};