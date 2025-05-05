import apiClient from '../api/axios';
import { toast } from 'react-hot-toast';

// --- Các hàm gọi API cho Maintenance Request ---

/**
 * Lấy danh sách yêu cầu bảo trì (có phân trang và lọc).
 * @param {object} params - Query parameters (vd: page, limit, status, id, roomId, buildingId?)
 * @returns {Promise<object>} Dữ liệu trả về { maintenanceRequests: [...], meta: {...} }
 */
const getAllMaintenanceRequests = async (params = {}) => {
  try {
    // Nếu status là chữ thường, chuyển thành chữ hoa để khớp với backend enum
    if (params.status && typeof params.status === 'string') {
      params.status = params.status.toUpperCase();
    }

    const response = await apiClient.get('/api/maintenances', { params });
    // Backend returns: { status: 'success', results: number, total: number, data: array }
    if (response.data?.status === 'success') {
      return {
        maintenanceRequests: response.data.data,
        meta: {
          total: response.data.total,
          count: response.data.results,
          page: params.page || 1,
          limit: params.limit || 10
        }
      };
    } else {
      throw new Error(response.data?.message || 'Lấy danh sách yêu cầu bảo trì thất bại.');
    }
  } catch (error) {
    console.error('Lỗi service getAllMaintenanceRequests:', error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Lấy thông tin chi tiết một yêu cầu bảo trì bằng ID.
 * @param {string|number} id - ID của yêu cầu.
 * @returns {Promise<object>} Dữ liệu chi tiết của yêu cầu.
 */
const getMaintenanceRequestById = async (id) => {
  try {
    const response = await apiClient.get(`/api/maintenances/${id}`);
    // Backend returns: { status: 'success', data: object }
    if (response.data?.status === 'success' && response.data?.data) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || `Không tìm thấy yêu cầu bảo trì với ID ${id}.`);
    }
  } catch (error) {
    console.error(`Lỗi service getMaintenanceRequestById (${id}):`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Tạo một yêu cầu bảo trì mới (Thường do Sinh viên thực hiện).
 * @param {object} requestData - Dữ liệu yêu cầu { roomId, issue, notes, imageIds? }.
 * @returns {Promise<object>} Dữ liệu yêu cầu vừa tạo.
 */
const createMaintenanceRequest = async (requestData) => {
  try {
    const response = await apiClient.post('/api/maintenances', requestData);
    // Backend returns: { status: 'success', data: object }
    if (response.data?.status === 'success' && response.data?.data) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Gửi yêu cầu bảo trì thất bại.');
    }
  } catch (error) {
    console.error('Lỗi service createMaintenanceRequest:', error.response?.data || error.message);
    if (error.response?.data?.errors) {
      throw error.response.data;
    }
    throw error.response?.data || error;
  }
};

/**
 * Cập nhật thông tin một yêu cầu bảo trì (Thường do Admin/Staff: cập nhật status, gán người xử lý).
 * @param {string|number} id - ID của yêu cầu cần cập nhật.
 * @param {object} updateData - Dữ liệu cần cập nhật { status?, assignedStaffId?, notes? }.
 * @returns {Promise<object>} Dữ liệu yêu cầu sau khi cập nhật.
 */
const updateMaintenanceRequest = async (id, updateData) => {
  try {
    const response = await apiClient.put(`/api/maintenances/${id}`, updateData);
    // Backend returns: { status: 'success', data: object }
    if (response.data?.status === 'success' && response.data?.data) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Cập nhật yêu cầu bảo trì thất bại.');
    }
  } catch (error) {
    console.error(`Lỗi service updateMaintenanceRequest (${id}):`, error.response?.data || error.message);
    if (error.response?.data?.errors) {
      throw error.response.data;
    }
    throw error.response?.data || error;
  }
};

/**
 * Xóa một yêu cầu bảo trì.
 * @param {string|number} id - ID của yêu cầu cần xóa.
 * @returns {Promise<object>} Response từ API (thường chứa message).
 */
const deleteMaintenanceRequest = async (id) => {
  try {
    const response = await apiClient.delete(`/api/maintenances/${id}`);
    // Backend returns: { status: 'success', message: string, data: null }
    if (response.data?.status === 'success') {
      return response.data;
    } else {
      throw new Error(response.data?.message || 'Xóa yêu cầu bảo trì thất bại.');
    }
  } catch (error) {
    console.error(`Lỗi service deleteMaintenanceRequest (${id}):`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

// Export service object
export const maintenanceService = {
  getAllMaintenanceRequests,
  getMaintenanceRequestById,
  createMaintenanceRequest,
  updateMaintenanceRequest,
  deleteMaintenanceRequest,
  // Hàm upload media có thể dùng chung từ room.service.js hoặc tạo media.service.js
};