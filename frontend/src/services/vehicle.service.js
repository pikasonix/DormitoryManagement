import apiClient from '../api/axios';
import { toast } from 'react-hot-toast';

// --- Các hàm gọi API cho Vehicle ---

/**
 * Lấy danh sách xe (có phân trang và lọc).
 * @param {object} params - Query parameters (vd: page, limit, type, status, ownerId?, licensePlate?)
 * @returns {Promise<object>} Dữ liệu trả về { vehicles: [...], meta: {...} }
 */
const getAllVehicles = async (params = {}) => {
    try {
        const response = await apiClient.get('/api/vehicles', { params });
        // Backend trả về: { status: 'success', results: number, total: number, data: array }
        if (response.data?.status === 'success') {
            return {
                vehicles: response.data.data || [],
                meta: {
                    total: response.data.total || 0,
                    count: response.data.results || 0,
                    page: params.page || 1,
                    limit: params.limit || 10,
                    totalPages: Math.ceil((response.data.total || 0) / (params.limit || 10))
                }
            };
        } else {
            throw new Error(response.data?.message || 'Lấy danh sách xe thất bại.');
        }
    } catch (error) {
        console.error('Lỗi service getAllVehicles:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

/**
 * Lấy thông tin chi tiết một xe bằng ID.
 * @param {string|number} id - ID của xe.
 * @returns {Promise<object>} Dữ liệu chi tiết của xe.
 */
const getVehicleById = async (id) => {
    try {
        const response = await apiClient.get(`/api/vehicles/${id}`);
        // Backend trả về: { status: 'success', data: vehicle_object }
        if (response.data?.status === 'success') {
            return response.data.data;
        } else {
            throw new Error(response.data?.message || `Không tìm thấy xe với ID ${id}.`);
        }
    } catch (error) {
        console.error(`Lỗi service getVehicleById (${id}):`, error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

/**
 * Tạo (Đăng ký) một xe mới.
 * @param {object} vehicleData - Dữ liệu xe { ownerId?, type, licensePlate, model, color, status? }.
 *   Backend có thể tự lấy ownerId từ user đang login?
 * @returns {Promise<object>} Dữ liệu xe vừa tạo.
 */
const createVehicle = async (vehicleData) => {
    try {
        // Làm rõ backend có tự lấy ownerId không. Nếu không, frontend cần gửi.
        const response = await apiClient.post('/api/vehicles', vehicleData);
        // Backend trả về: { status: 'success', data: new_vehicle_object }
        if (response.data?.status === 'success') {
            return response.data.data;
        } else {
            throw new Error(response.data?.message || 'Đăng ký xe mới thất bại.');
        }
    } catch (error) {
        console.error('Lỗi service createVehicle:', error.response?.data || error.message);
        if (error.response?.data?.errors) {
            throw error.response.data;
        }
        throw error.response?.data || error;
    }
};

/**
 * Cập nhật thông tin một xe.
 * @param {string|number} id - ID của xe cần cập nhật.
 * @param {object} vehicleData - Dữ liệu cần cập nhật { type?, model?, color?, status? }. Biển số thường không được sửa.
 * @returns {Promise<object>} Dữ liệu xe sau khi cập nhật.
 */
const updateVehicle = async (id, vehicleData) => {
    try {
        // Không cho phép cập nhật licensePlate và ownerId?
        const payload = { ...vehicleData };
        delete payload.licensePlate;
        delete payload.ownerId;

        const response = await apiClient.put(`/api/vehicles/${id}`, payload);
        // Backend trả về: { status: 'success', data: updated_vehicle_object }
        if (response.data?.status === 'success') {
            return response.data.data;
        } else {
            throw new Error(response.data?.message || 'Cập nhật thông tin xe thất bại.');
        }
    } catch (error) {
        console.error(`Lỗi service updateVehicle (${id}):`, error.response?.data || error.message);
        if (error.response?.data?.errors) {
            throw error.response.data;
        }
        throw error.response?.data || error;
    }
};

/**
 * Xóa một xe.
 * @param {string|number} id - ID của xe cần xóa.
 * @returns {Promise<object>} Response từ API.
 */
const deleteVehicle = async (id) => {
    try {
        const response = await apiClient.delete(`/api/vehicles/${id}`);
        // Backend trả về: { status: 'success', message: "..." }
        if (response.data?.status === 'success') {
            return response.data;
        } else {
            throw new Error(response.data?.message || 'Xóa thông tin xe thất bại.');
        }
    } catch (error) {
        console.error(`Lỗi service deleteVehicle (${id}):`, error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

// Export service object
export const vehicleService = {
    getAllVehicles,
    getVehicleById,
    createVehicle,
    updateVehicle,
    deleteVehicle,
};