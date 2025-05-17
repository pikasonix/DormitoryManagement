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
        if (params.status) {
            console.log('Sending status to backend:', params.status);
        }
        const response = await apiClient.get('/api/transfers', { params });
        // Backend trả về: { status: 'success', results: number, total: number, data: array }
        if (response.data?.status === 'success') {
            return {
                transfers: response.data.data || [],
                meta: {
                    total: response.data.total || 0,
                    count: response.data.results || 0,
                    page: params.page || 1,
                    limit: params.limit || 10,
                    totalPages: Math.ceil((response.data.total || 0) / (params.limit || 10))
                }
            };
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
        const response = await apiClient.get(`/api/transfers/${id}`);
        // Backend trả về: { status: 'success', data: transfer_request_object }
        if (response.data?.status === 'success') {
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
        const response = await apiClient.post('/api/transfers/request', requestData);
        // Backend trả về: { status: 'success', data: new_transfer_request_object }
        if (response.data?.status === 'success') {
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
        // Nếu chỉ có status, sử dụng API status
        if (updateData && Object.keys(updateData).length === 1 && updateData.status) {
            const response = await apiClient.put(`/api/transfers/${id}/status`, {
                status: updateData.status
            });

            if (response.data?.status === 'success') {
                return response.data.data;
            } else {
                throw new Error(response.data?.message || 'Cập nhật trạng thái yêu cầu chuyển phòng thất bại.');
            }
        } else {
            // Gọi API chỉnh sửa chung cho cập nhật các trường khác
            const response = await apiClient.put(`/api/transfers/${id}`, updateData);

            if (response.data?.status === 'success') {
                return response.data.data;
            } else {
                throw new Error(response.data?.message || 'Cập nhật yêu cầu chuyển phòng thất bại.');
            }
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
        const response = await apiClient.delete(`/api/transfers/${id}`);
        // Backend trả về: { status: 'success', message: "..." }
        if (response.data?.status === 'success') {
            return response.data;
        } else {
            throw new Error(response.data?.message || 'Xóa yêu cầu chuyển phòng thất bại.');
        }
    } catch (error) {
        console.error(`Lỗi service deleteTransferRequest (${id}):`, error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

/**
 * Phê duyệt yêu cầu chuyển phòng (Admin/Staff)
 * @param {string|number} id - ID của yêu cầu cần phê duyệt
 * @returns {Promise<object>} Dữ liệu yêu cầu sau khi cập nhật
 */
const approveTransferRequest = async (id) => {
    try {
        const response = await apiClient.put(`/api/transfers/${id}/status`, {
            status: 'APPROVED'
        });

        if (response.data?.status === 'success') {
            toast.success('Đã phê duyệt yêu cầu chuyển phòng thành công!');
            return response.data.data;
        } else {
            throw new Error(response.data?.message || 'Phê duyệt yêu cầu thất bại.');
        }
    } catch (error) {
        console.error(`Lỗi service approveTransferRequest (${id}):`, error.response?.data || error.message);
        const errorMessage = error.response?.data?.message || error.message || 'Phê duyệt yêu cầu thất bại.';
        toast.error(errorMessage);
        if (error.response?.data?.errors) {
            throw error.response.data;
        }
        throw error.response?.data || error;
    }
};

/**
 * Từ chối yêu cầu chuyển phòng (Admin/Staff)
 * @param {string|number} id - ID của yêu cầu cần từ chối
 * @returns {Promise<object>} Dữ liệu yêu cầu sau khi cập nhật
 */
const rejectTransferRequest = async (id) => {
    try {
        const response = await apiClient.put(`/api/transfers/${id}/status`, {
            status: 'REJECTED'
        });

        if (response.data?.status === 'success') {
            toast.success('Đã từ chối yêu cầu chuyển phòng thành công!');
            return response.data.data;
        } else {
            throw new Error(response.data?.message || 'Từ chối yêu cầu thất bại.');
        }
    } catch (error) {
        console.error(`Lỗi service rejectTransferRequest (${id}):`, error.response?.data || error.message);
        const errorMessage = error.response?.data?.message || error.message || 'Từ chối yêu cầu thất bại.';
        toast.error(errorMessage);
        if (error.response?.data?.errors) {
            throw error.response.data;
        }
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
    approveTransferRequest,
    rejectTransferRequest,
};