// src/services/building.service.js
import apiClient from '../api/axios'; // Import instance Axios đã cấu hình
import { toast } from 'react-hot-toast'; // Để hiển thị thông báo (tùy chọn)

// Hàm lấy danh sách tòa nhà (có phân trang, tìm kiếm, sắp xếp)
const getAllBuildings = async (params = {}) => {
    // params có thể chứa: page, limit, sortBy, sortOrder, search
    try {
        console.log('[Building Service] Fetching buildings with params:', params);
        const response = await apiClient.get('/buildings', { params });
        console.log('[Building Service] Response:', response.data);
        // API trả về { status: 'success', results: number, total: number, data: Building[] }
        return response.data; // Trả về toàn bộ object response từ API
    } catch (error) {
        console.error('[Building Service] Error fetching buildings:', error);
        // Lỗi đã được interceptor xử lý, chỉ cần ném lại để component biết
        throw error;
    }
};

// Hàm lấy chi tiết một tòa nhà bằng ID
const getBuildingById = async (id) => {
    if (!id) throw new Error('Building ID is required');
    try {
        console.log(`[Building Service] Fetching building by ID: ${id}`);
        const response = await apiClient.get(`/buildings/${id}`);
        console.log('[Building Service] Response:', response.data);
        // API trả về { status: 'success', data: Building }
        return response.data.data; // Trả về chỉ object Building
    } catch (error) {
        console.error(`[Building Service] Error fetching building ${id}:`, error);
        if (error.response?.status === 404) {
            toast.error('Không tìm thấy tòa nhà này.');
        }
        throw error;
    }
};

// Hàm tạo tòa nhà mới
const createBuilding = async (buildingData) => {
    // buildingData nên là object: { name, address?, description?, imageIds? }
    try {
        console.log('[Building Service] Creating building:', buildingData);
        const response = await apiClient.post('/buildings', buildingData);
        console.log('[Building Service] Response:', response.data);
        toast.success('Tạo tòa nhà thành công!');
        // API trả về { status: 'success', data: Building }
        return response.data.data;
    } catch (error) {
        console.error('[Building Service] Error creating building:', error);
        // Lỗi validation hoặc lỗi khác đã được interceptor hoặc controller xử lý toast
        throw error;
    }
};

// Hàm cập nhật tòa nhà
const updateBuilding = async (id, updateData) => {
    // updateData nên là object: { name?, address?, description?, imageIds? }
    if (!id) throw new Error('Building ID is required for update');
    try {
        console.log(`[Building Service] Updating building ${id}:`, updateData);
        const response = await apiClient.put(`/buildings/${id}`, updateData);
        console.log('[Building Service] Response:', response.data);
        toast.success('Cập nhật tòa nhà thành công!');
        // API trả về { status: 'success', data: Building }
        return response.data.data;
    } catch (error) {
        console.error(`[Building Service] Error updating building ${id}:`, error);
        throw error;
    }
};

// Hàm xóa tòa nhà
const deleteBuilding = async (id) => {
    if (!id) throw new Error('Building ID is required for delete');
    try {
        console.log(`[Building Service] Deleting building ${id}`);
        // API trả về 200 OK với message hoặc 204 No Content
        await apiClient.delete(`/buildings/${id}`);
        toast.success('Xóa tòa nhà thành công!');
        return true; // Trả về true nếu thành công
    } catch (error) {
        console.error(`[Building Service] Error deleting building ${id}:`, error);
        // Kiểm tra lỗi cụ thể (vd: không thể xóa do còn phòng)
        if (error.response?.status === 400 || error.response?.status === 409) {
            toast.error(error.response?.data?.message || 'Không thể xóa tòa nhà.');
        }
        throw error;
    }
};

// Export thành một object
export const buildingService = {
    getAllBuildings,
    getBuildingById,
    createBuilding,
    updateBuilding,
    deleteBuilding,
};