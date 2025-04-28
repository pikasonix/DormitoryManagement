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
        const response = await apiClient.get('/invoices', { params });
        // API doc: { success: true, data: { invoices: [...], meta: {...} } }
        if (response.data?.success) {
            return response.data.data; // Trả về { invoices, meta }
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
        const response = await apiClient.get(`/invoices/${id}`);
        // API doc: { success: true, data: { invoice_object } }
        if (response.data?.success && response.data?.data) {
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
 * @param {object} invoiceData - Dữ liệu hóa đơn mới { studentId, invoiceNumber?, amount, dueDate, items: [{description, amount}], status? }.
 * @returns {Promise<object>} Dữ liệu hóa đơn vừa tạo.
 */
const createInvoice = async (invoiceData) => {
    try {
        // Đảm bảo amount và item.amount là số nếu cần
        const payload = {
            ...invoiceData,
            amount: parseFloat(invoiceData.amount) || 0,
            items: (invoiceData.items || []).map(item => ({
                ...item,
                amount: parseFloat(item.amount) || 0,
            })),
        };
        const response = await apiClient.post('/invoices', payload);
        // API doc: { success: true, data: { new_invoice_object } }
        if (response.data?.success && response.data?.data) {
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
 * Cập nhật thông tin một hóa đơn (thường là trạng thái hoặc hạn thanh toán).
 * @param {string|number} id - ID của hóa đơn cần cập nhật.
 * @param {object} invoiceData - Dữ liệu cần cập nhật { status?, dueDate? }.
 * @returns {Promise<object>} Dữ liệu hóa đơn sau khi cập nhật.
 */
const updateInvoice = async (id, invoiceData) => {
    try {
        const response = await apiClient.put(`/invoices/${id}`, invoiceData);
        // API doc: { success: true, data: { updated_invoice_object } }
        if (response.data?.success && response.data?.data) {
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
        const response = await apiClient.delete(`/invoices/${id}`);
        // API doc: { success: true, message: "..." }
        if (response.data?.success) {
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
    updateInvoice,
    deleteInvoice,
};