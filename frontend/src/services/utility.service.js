import apiClient from '../api/axios';
import { toast } from 'react-hot-toast';

// --- Các hàm gọi API cho Utility Reading/Billing ---

/**
 * Lấy danh sách các bản ghi chỉ số điện/nước (có phân trang và lọc).
 * @param {object} params - Query parameters (vd: page, limit, type: 'electric'|'water', studentId?, roomId?, dormitoryId?, billingPeriod?)
 * @returns {Promise<object>} Dữ liệu trả về { utilities: [...], meta: {...} }
 */
const getAllUtilityReadings = async (params = {}) => {
    try {
        const response = await apiClient.get('/utilities', { params });
        // API doc: { success: true, data: { utilities: [...], meta: {...} } }
        if (response.data?.success) {
            return response.data.data; // Trả về { utilities, meta }
        } else {
            throw new Error(response.data?.message || 'Lấy danh sách ghi điện nước thất bại.');
        }
    } catch (error) {
        console.error('Lỗi service getAllUtilityReadings:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

/**
 * Lấy thông tin chi tiết một bản ghi chỉ số điện/nước bằng ID.
 * @param {string|number} id - ID của bản ghi.
 * @returns {Promise<object>} Dữ liệu chi tiết của bản ghi.
 */
const getUtilityReadingById = async (id) => {
    try {
        const response = await apiClient.get(`/utilities/${id}`);
        // API doc: { success: true, data: { utility_reading_object } }
        if (response.data?.success && response.data?.data) {
            return response.data.data;
        } else {
            throw new Error(response.data?.message || `Không tìm thấy bản ghi điện nước với ID ${id}.`);
        }
    } catch (error) {
        console.error(`Lỗi service getUtilityReadingById (${id}):`, error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

/**
 * Tạo một bản ghi chỉ số điện/nước mới.
 * @param {object} readingData - Dữ liệu bản ghi { dormitoryId?, roomId?, studentId?, type, consumption, amount?, billingPeriod, status? }.
 *   Cần làm rõ các trường bắt buộc và optional với backend.
 * @returns {Promise<object>} Dữ liệu bản ghi vừa tạo.
 */
const createUtilityReading = async (readingData) => {
    try {
        // Chuyển đổi kiểu dữ liệu nếu cần
        const payload = {
            ...readingData,
            consumption: parseFloat(readingData.consumption) || 0,
            amount: readingData.amount ? parseFloat(readingData.amount) : null, // Amount có thể tính ở backend?
            // Đảm bảo studentId, roomId, dormitoryId là số nếu backend yêu cầu
            studentId: readingData.studentId ? parseInt(readingData.studentId) : null,
            roomId: readingData.roomId ? parseInt(readingData.roomId) : null,
            dormitoryId: readingData.dormitoryId ? parseInt(readingData.dormitoryId) : null,
        };
        const response = await apiClient.post('/utilities', payload);
        // API doc: { success: true, data: { new_utility_reading_object } }
        if (response.data?.success && response.data?.data) {
            return response.data.data;
        } else {
            throw new Error(response.data?.message || 'Ghi nhận chỉ số điện nước thất bại.');
        }
    } catch (error) {
        console.error('Lỗi service createUtilityReading:', error.response?.data || error.message);
        if (error.response?.data?.errors) {
            throw error.response.data;
        }
        throw error.response?.data || error;
    }
};

/**
 * Cập nhật thông tin một bản ghi chỉ số điện/nước.
 * @param {string|number} id - ID của bản ghi cần cập nhật.
 * @param {object} updateData - Dữ liệu cần cập nhật { consumption?, amount?, status? }.
 * @returns {Promise<object>} Dữ liệu bản ghi sau khi cập nhật.
 */
const updateUtilityReading = async (id, updateData) => {
    try {
        const payload = {
            ...updateData,
            consumption: updateData.consumption ? parseFloat(updateData.consumption) : undefined, // Chỉ gửi nếu có thay đổi
            amount: updateData.amount ? parseFloat(updateData.amount) : undefined,
        };
        // Xóa các key undefined khỏi payload
        Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

        const response = await apiClient.put(`/utilities/${id}`, payload);
        // API doc: { success: true, data: { updated_utility_reading_object } }
        if (response.data?.success && response.data?.data) {
            return response.data.data;
        } else {
            throw new Error(response.data?.message || 'Cập nhật bản ghi điện nước thất bại.');
        }
    } catch (error) {
        console.error(`Lỗi service updateUtilityReading (${id}):`, error.response?.data || error.message);
        if (error.response?.data?.errors) {
            throw error.response.data;
        }
        throw error.response?.data || error;
    }
};

/**
 * Xóa một bản ghi chỉ số điện/nước.
 * @param {string|number} id - ID của bản ghi cần xóa.
 * @returns {Promise<object>} Response từ API.
 */
const deleteUtilityReading = async (id) => {
    try {
        const response = await apiClient.delete(`/utilities/${id}`);
        // API doc: { success: true, message: "..." }
        if (response.data?.success) {
            return response.data;
        } else {
            throw new Error(response.data?.message || 'Xóa bản ghi điện nước thất bại.');
        }
    } catch (error) {
        console.error(`Lỗi service deleteUtilityReading (${id}):`, error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

// Export service object
export const utilityService = {
    getAllUtilityReadings,
    getUtilityReadingById,
    createUtilityReading,
    updateUtilityReading,
    deleteUtilityReading,
};