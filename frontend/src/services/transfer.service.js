import apiClient from '../api/axios';
import { toast } from 'react-hot-toast';

// --- Các hàm gọi API cho Room Transfer Request ---

/**
 * Lấy danh sách yêu cầu chuyển phòng (có phân trang và lọc).
 * @param {object} params - Query parameters (vd: page, limit, status, studentId?)
 * @returns {Promise<object>} Dữ liệu trả về { transfers: [...], meta: {...} }
 */
const getAllTransferRequests = async (params = {}) => {
    try {
        const response = await apiClient.get('/transfers', { params });
        // API doc: { success: true, data: { transfers: [...], meta: {...} } }
        if (response.data?.success) {
            return response.data.data; // Trả về { transfers, meta }
        } else {
            throw new Error(response.data?.message || 'Lấy danh sách yêu cầu chuyển phòng thất bại.');
        }
    } catch (error) {
        console.error('Lỗi service getAllTransferRequests:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

/**
 * Lấy thông tin chi tiết một yêu cầu chuyển phòng bằng ID.
 * @param {string|number} id - ID của yêu cầu.
 * @returns {Promise<object>} Dữ liệu chi tiết của yêu cầu.
 */
const getTransferRequestById = async (id) => {
    try {
        const response = await apiClient.get(`/transfers/${id}`);
        // API doc: { success: true, data: { transfer_request_object } }
        if (response.data?.success && response.data?.data) {
            return response.data.data;
        } else {
            throw new Error(response.data?.message || `Không tìm thấy yêu cầu chuyển phòng với ID ${id}.`);
        }
    } catch (error) {
        console.error(`Lỗi service getTransferRequestById (${id}):`, error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

/**
 * Tạo một yêu cầu chuyển phòng mới (Thường do Sinh viên).
 * @param {object} requestData - Dữ liệu yêu cầu { studentId, currentRoomId, targetRoomId, reason }.
 *   Backend có thể tự lấy studentId/currentRoomId từ user đang login?
 * @returns {Promise<object>} Dữ liệu yêu cầu vừa tạo.
 */
const createTransferRequest = async (requestData) => {
    try {
        // Cần làm rõ backend có tự lấy studentId/currentRoomId không
        const response = await apiClient.post('/transfers', requestData);
        // API doc: { success: true, data: { new_transfer_request_object } }
        if (response.data?.success && response.data?.data) {
            return response.data.data;
        } else {
            throw new Error(response.data?.message || 'Gửi yêu cầu chuyển phòng thất bại.');
        }
    } catch (error) {
        console.error('Lỗi service createTransferRequest:', error.response?.data || error.message);
        if (error.response?.data?.errors) {
            throw error.response.data;
        }
        throw error.response?.data || error;
    }
};

/**
 * Cập nhật trạng thái một yêu cầu chuyển phòng (Thường do Admin/Staff: approved/rejected).
 * @param {string|number} id - ID của yêu cầu cần cập nhật.
 * @param {object} updateData - Dữ liệu cần cập nhật { status: 'approved' | 'rejected', adminNotes?: string }.
 * @returns {Promise<object>} Dữ liệu yêu cầu sau khi cập nhật.
 */
const updateTransferRequest = async (id, updateData) => {
    try {
        const response = await apiClient.put(`/transfers/${id}`, updateData);
        // API doc: { success: true, data: { updated_transfer_request_object } }
        if (response.data?.success && response.data?.data) {
            return response.data.data;
        } else {
            throw new Error(response.data?.message || 'Cập nhật yêu cầu chuyển phòng thất bại.');
        }
    } catch (error) {
        console.error(`Lỗi service updateTransferRequest (${id}):`, error.response?.data || error.message);
        if (error.response?.data?.errors) {
            throw error.response.data;
        }
        throw error.response?.data || error;
    }
};

/**
 * Xóa/Hủy một yêu cầu chuyển phòng.
 * @param {string|number} id - ID của yêu cầu cần xóa.
 * @returns {Promise<object>} Response từ API.
 */
const deleteTransferRequest = async (id) => {
    try {
        const response = await apiClient.delete(`/transfers/${id}`);
        // API doc: { success: true, message: "..." }
        if (response.data?.success) {
            return response.data;
        } else {
            throw new Error(response.data?.message || 'Xóa yêu cầu chuyển phòng thất bại.');
        }
    } catch (error) {
        console.error(`Lỗi service deleteTransferRequest (${id}):`, error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

// Export service object
export const transferService = {
    getAllTransferRequests,
    getTransferRequestById,
    createTransferRequest,
    updateTransferRequest,
    deleteTransferRequest,
};