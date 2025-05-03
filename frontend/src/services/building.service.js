import apiClient from '../api/axios'; // Instance Axios đã cấu hình
import { toast } from 'react-hot-toast';

// --- Các hàm gọi API cho Building/Dormitory ---

/**
 * Lấy danh sách tất cả tòa nhà (buildings).
 * @param {object} params - Query parameters (vd: page, limit, search)
 * @returns {Promise<object>} Dữ liệu trả về từ API (bao gồm danh sách buildings và meta nếu có)
 */
const getAllBuildings = async (params = {}) => {
    try {
        const response = await apiClient.get('/api/buildings', { params });
        // API doc trả về { success: true, data: { buildings: [...], meta: {...} } }
        if (response.data?.success) {
            return response.data.data; // Trả về { buildings, meta }
        } else {
            throw new Error(response.data?.message || 'Lấy danh sách tòa nhà thất bại.');
        }
    } catch (error) {
        console.error('Lỗi service getAllBuildings:', error.response?.data?.message || error.message);
        // Toast lỗi đã được xử lý bởi interceptor
        throw error.response?.data || error;
    }
};

/**
 * Lấy thông tin chi tiết một tòa nhà bằng ID.
 * @param {string|number} id - ID của tòa nhà.
 * @returns {Promise<object>} Dữ liệu chi tiết của tòa nhà.
 */
const getBuildingById = async (id) => {
    try {
        const response = await apiClient.get(`/api/buildings/${id}`);
        // API doc trả về { success: true, data: { building_object } }
        if (response.data?.success && response.data?.data) {
            return response.data.data; // Trả về object tòa nhà
        } else {
            throw new Error(response.data?.message || `Không tìm thấy tòa nhà với ID ${id}.`);
        }
    } catch (error) {
        console.error(`Lỗi service getBuildingById (${id}):`, error.response?.data?.message || error.message);
        throw error.response?.data || error;
    }
};

/**
 * Tạo một tòa nhà mới.
 * @param {object} buildingData - Dữ liệu tòa nhà mới { name, address, description?, totalRooms? }.
 * @returns {Promise<object>} Dữ liệu tòa nhà vừa tạo.
 */
const createBuilding = async (buildingData) => {
    try {
        const response = await apiClient.post('/api/buildings', buildingData);
        // API doc trả về { success: true, data: { new_building_object } }
        if (response.data?.success && response.data?.data) {
            return response.data.data;
        } else {
            throw new Error(response.data?.message || 'Tạo tòa nhà mới thất bại.');
        }
    } catch (error) {
        console.error('Lỗi service createBuilding:', error.response?.data?.message || error.message);
        // Xử lý lỗi validation chi tiết nếu có
        if (error.response?.data?.errors) {
            // Ném lại lỗi để component form xử lý errors
            throw error.response.data;
        }
        throw error.response?.data || error;
    }
};

/**
 * Cập nhật thông tin một tòa nhà.
 * @param {string|number} id - ID của tòa nhà cần cập nhật.
 * @param {object} buildingData - Dữ liệu cần cập nhật.
 * @returns {Promise<object>} Dữ liệu tòa nhà sau khi cập nhật.
 */
const updateBuilding = async (id, buildingData) => {
    try {
        const response = await apiClient.put(`/api/buildings/${id}`, buildingData);
        // API doc trả về { success: true, data: { updated_building_object } }
        if (response.data?.success && response.data?.data) {
            return response.data.data;
        } else {
            throw new Error(response.data?.message || 'Cập nhật tòa nhà thất bại.');
        }
    } catch (error) {
        console.error(`Lỗi service updateBuilding (${id}):`, error.response?.data?.message || error.message);
        if (error.response?.data?.errors) {
            throw error.response.data;
        }
        throw error.response?.data || error;
    }
};

/**
 * Xóa một tòa nhà.
 * @param {string|number} id - ID của tòa nhà cần xóa.
 * @returns {Promise<object>} Response từ API (thường chứa message).
 */
const deleteBuilding = async (id) => {
    try {
        const response = await apiClient.delete(`/api/buildings/${id}`);
        // API doc trả về { success: true, message: "..." }
        if (response.data?.success) {
            return response.data;
        } else {
            throw new Error(response.data?.message || 'Xóa tòa nhà thất bại.');
        }
    } catch (error) {
        console.error(`Lỗi service deleteBuilding (${id}):`, error.response?.data?.message || error.message);
        throw error.response?.data || error;
    }
};


// Export service object
export const buildingService = {
    getAllBuildings,
    getBuildingById,
    createBuilding,
    updateBuilding,
    deleteBuilding,
};