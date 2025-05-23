import apiClient from '../api/axios';
import { toast } from 'react-hot-toast';

// --- Các hàm gọi API cho Invoice ---

/**
 * Lấy danh sách hóa đơn (có phân trang và lọc).
 * @param {object} params - Query parameters (vd: page, limit, status, studentId)
 * @returns {Promise<object>} Dữ liệu trả về { invoices: [...], meta: {...} }
 */
const getAllInvoices = async (params = {}) => {
    try {
        // Xử lý tham số: chuyển studentId thành studentProfileId nếu cần
        const apiParams = { ...params };
        if (apiParams.studentId) {
            apiParams.studentProfileId = apiParams.studentId;
            delete apiParams.studentId;
        }        // Sử dụng endpoint dựa trên vai trò người dùng
        const endpoint = '/api/invoices';
        console.log('Gọi API:', endpoint, apiParams);
        const response = await apiClient.get(endpoint, { params: apiParams });

        // Backend trả về: { status: 'success', results: number, total: number, data: array }
        if (response.data?.status === 'success') {
            return {
                invoices: response.data.data || [],
                meta: {
                    total: response.data.total || 0,
                    count: response.data.results || 0,
                    page: params.page || 1,
                    limit: params.limit || 10,
                    totalPages: Math.ceil((response.data.total || 0) / (params.limit || 10))
                }
            };
        } else {
            throw new Error(response.data?.message || 'Lấy danh sách hóa đơn thất bại.');
        }
    } catch (error) {
        console.error('Lỗi service getAllInvoices:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

/**
 * Lấy thông tin chi tiết một hóa đơn bằng ID.
 * @param {string|number} id - ID của hóa đơn.
 * @returns {Promise<object>} Dữ liệu chi tiết của hóa đơn.
 */
const getInvoiceById = async (id) => {
    try {
        const response = await apiClient.get(`/api/invoices/${id}`);
        // Backend trả về: { status: 'success', data: invoice_object }
        if (response.data?.status === 'success') {
            return response.data.data;
        } else {
            throw new Error(response.data?.message || `Không tìm thấy hóa đơn với ID ${id}.`);
        }
    } catch (error) {
        console.error(`Lỗi service getInvoiceById (${id}):`, error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

/**
 * Tạo một hóa đơn mới.
 * @param {object} invoiceData - Dữ liệu hóa đơn mới { studentProfileId, roomId, billingMonth, billingYear, dueDate, items: [{type, description, amount}], status? }.
 * @returns {Promise<object>} Dữ liệu hóa đơn vừa tạo.
 */
const createInvoice = async (invoiceData) => {
    try {
        // Chuyển đổi studentId thành studentProfileId nếu cần
        const payload = { ...invoiceData };
        if (payload.studentId && !payload.studentProfileId) {
            payload.studentProfileId = payload.studentId;
            delete payload.studentId;
        }

        // Đảm bảo amount trong items là số
        if (payload.items && Array.isArray(payload.items)) {
            payload.items = payload.items.map(item => ({
                ...item,
                amount: parseFloat(item.amount) || 0,
            }));
        }

        const response = await apiClient.post('/api/invoices', payload);
        // Backend trả về: { status: 'success', data: new_invoice_object }
        if (response.data?.status === 'success') {
            return response.data.data;
        } else {
            throw new Error(response.data?.message || 'Tạo hóa đơn mới thất bại.');
        }
    } catch (error) {
        console.error('Lỗi service createInvoice:', error.response?.data || error.message);
        if (error.response?.data?.errors) {
            throw error.response.data;
        }
        throw error.response?.data || error;
    }
};

/**
 * Tạo hóa đơn hàng loạt cho tất cả sinh viên trong tháng hiện tại.
 * @param {number} month - Tháng tạo hóa đơn (1-12, mặc định là tháng hiện tại)
 * @param {number} year - Năm tạo hóa đơn (mặc định là năm hiện tại)
 * @returns {Promise<object>} Kết quả tạo hóa đơn hàng loạt
 */
const createBulkInvoices = async (month = null, year = null) => {
    try {
        const now = new Date();
        const requestData = {
            month: month || now.getMonth() + 1,
            year: year || now.getFullYear()
        };

        const response = await apiClient.post('/api/invoices/bulk', requestData);

        if (response.data?.status === 'success') {
            return response.data.data;
        } else {
            throw new Error(response.data?.message || 'Tạo hóa đơn hàng loạt thất bại.');
        }
    } catch (error) {
        console.error('Lỗi service createBulkInvoices:', error.response?.data || error.message);
        if (error.response?.data?.errors) {
            throw error.response.data;
        }
        throw error.response?.data || error;
    }
};

/**
 * Tạo hóa đơn tiền phòng cho tháng
 * @param {number} month - Tháng tạo hóa đơn (1-12, mặc định là tháng hiện tại)
 * @param {number} year - Năm tạo hóa đơn (mặc định là năm hiện tại)
 * @returns {Promise<object>} Kết quả tạo hóa đơn tiền phòng
 */
const createRoomFeeInvoices = async (month = null, year = null) => {
    try {
        const now = new Date();
        const requestData = {
            month: month || now.getMonth() + 1,
            year: year || now.getFullYear()
        };

        const response = await apiClient.post('/api/invoices/bulk/room-fee', requestData);

        if (response.data?.status === 'success') {
            return response.data.data;
        } else {
            throw new Error(response.data?.message || 'Tạo hóa đơn tiền phòng thất bại.');
        }
    } catch (error) {
        console.error('Lỗi service createRoomFeeInvoices:', error.response?.data || error.message);
        if (error.response?.data?.errors) {
            throw error.response.data;
        }
        throw error.response?.data || error;
    }
};

/**
 * Tạo hóa đơn phí gửi xe cho tháng
 * @param {number} month - Tháng tạo hóa đơn (1-12, mặc định là tháng hiện tại)
 * @param {number} year - Năm tạo hóa đơn (mặc định là năm hiện tại)
 * @returns {Promise<object>} Kết quả tạo hóa đơn phí gửi xe
 */
const createParkingFeeInvoices = async (month = null, year = null) => {
    try {
        const now = new Date();
        const requestData = {
            month: month || now.getMonth() + 1,
            year: year || now.getFullYear()
        };

        const response = await apiClient.post('/api/invoices/bulk/parking-fee', requestData);

        if (response.data?.status === 'success') {
            return response.data.data;
        } else {
            throw new Error(response.data?.message || 'Tạo hóa đơn phí gửi xe thất bại.');
        }
    } catch (error) {
        console.error('Lỗi service createParkingFeeInvoices:', error.response?.data || error.message);
        if (error.response?.data?.errors) {
            throw error.response.data;
        }
        throw error.response?.data || error;
    }
};

/**
 * Tạo hóa đơn tiện ích (điện/nước) cho tháng
 * @param {number} month - Tháng tạo hóa đơn (1-12, mặc định là tháng hiện tại)
 * @param {number} year - Năm tạo hóa đơn (mặc định là năm hiện tại)
 * @returns {Promise<object>} Kết quả tạo hóa đơn tiện ích
 */
const createUtilityInvoices = async (month = null, year = null) => {
    try {
        const now = new Date();
        const requestData = {
            month: month || now.getMonth() + 1,
            year: year || now.getFullYear()
        };

        const response = await apiClient.post('/api/invoices/bulk/utility', requestData);

        if (response.data?.status === 'success') {
            return response.data.data;
        } else {
            throw new Error(response.data?.message || 'Tạo hóa đơn tiện ích thất bại.');
        }
    } catch (error) {
        console.error('Lỗi service createUtilityInvoices:', error.response?.data || error.message);
        if (error.response?.data?.errors) {
            throw error.response.data;
        }
        throw error.response?.data || error;
    }
};

/**
 * Cập nhật thông tin một hóa đơn (thường là trạng thái hoặc hạn thanh toán).
 * @param {string|number} id - ID của hóa đơn cần cập nhật.
 * @param {object} invoiceData - Dữ liệu cần cập nhật { status?, dueDate?, items? }.
 * @returns {Promise<object>} Dữ liệu hóa đơn sau khi cập nhật.
 */
const updateInvoice = async (id, invoiceData) => {
    try {
        const response = await apiClient.put(`/api/invoices/${id}`, invoiceData);
        // Backend trả về: { status: 'success', data: updated_invoice_object }
        if (response.data?.status === 'success') {
            return response.data.data;
        } else {
            throw new Error(response.data?.message || 'Cập nhật hóa đơn thất bại.');
        }
    } catch (error) {
        console.error(`Lỗi service updateInvoice (${id}):`, error.response?.data || error.message);
        if (error.response?.data?.errors) {
            throw error.response.data;
        }
        throw error.response?.data || error;
    }
};

/**
 * Xóa một hóa đơn.
 * @param {string|number} id - ID của hóa đơn cần xóa.
 * @returns {Promise<object>} Response từ API (thường chứa message).
 */
const deleteInvoice = async (id) => {
    try {
        const response = await apiClient.delete(`/api/invoices/${id}`);
        // Backend trả về: { status: 'success', message: "..." }
        if (response.data?.status === 'success') {
            return response.data;
        } else {
            throw new Error(response.data?.message || 'Xóa hóa đơn thất bại.');
        }
    } catch (error) {
        console.error(`Lỗi service deleteInvoice (${id}):`, error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

// Export service object
export const invoiceService = {
    getAllInvoices,
    getInvoiceById,
    createInvoice,
    createBulkInvoices,
    createRoomFeeInvoices,
    createParkingFeeInvoices,
    createUtilityInvoices,
    updateInvoice,
    deleteInvoice,
};