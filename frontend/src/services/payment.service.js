import apiClient from '../api/axios';
import { toast } from 'react-hot-toast';

// --- Các hàm gọi API cho Payment ---

/**
 * Lấy danh sách các giao dịch thanh toán (có phân trang và lọc).
 * @param {object} params - Query parameters (vd: page, limit, status, studentId, invoiceId, method?)
 * @returns {Promise<object>} Dữ liệu trả về { payments: [...], meta: {...} }
 */
const getAllPayments = async (params = {}) => {
  try {
    const response = await apiClient.get('/payments', { params });
    // API doc: { success: true, data: { payments: [...], meta: {...} } }
    if (response.data?.success) {
      return response.data.data; // Trả về { payments, meta }
    } else {
      throw new Error(response.data?.message || 'Lấy lịch sử thanh toán thất bại.');
    }
  } catch (error) {
    console.error('Lỗi service getAllPayments:', error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Lấy thông tin chi tiết một giao dịch thanh toán bằng ID.
 * @param {string|number} id - ID của giao dịch.
 * @returns {Promise<object>} Dữ liệu chi tiết của giao dịch.
 */
const getPaymentById = async (id) => {
  try {
    const response = await apiClient.get(`/payments/${id}`);
    // API doc: { success: true, data: { payment_object } }
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || `Không tìm thấy giao dịch với ID ${id}.`);
    }
  } catch (error) {
    console.error(`Lỗi service getPaymentById (${id}):`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Tạo một giao dịch thanh toán mới (Ghi nhận thanh toán thủ công hoặc khởi tạo thanh toán online?).
 * @param {object} paymentData - Dữ liệu thanh toán { studentId, invoiceId, amount, method, status?, details? }.
 * @returns {Promise<object>} Dữ liệu giao dịch vừa tạo.
 */
const createPayment = async (paymentData) => {
  try {
    // Chuyển đổi amount sang số
    const payload = {
      ...paymentData,
      amount: parseFloat(paymentData.amount) || 0,
    };
    const response = await apiClient.post('/payments', payload);
    // API doc: { success: true, data: { new_payment_object } }
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Tạo giao dịch thanh toán thất bại.');
    }
  } catch (error) {
    console.error('Lỗi service createPayment:', error.response?.data || error.message);
    if (error.response?.data?.errors) {
      throw error.response.data;
    }
    throw error.response?.data || error;
  }
};

/**
 * Cập nhật trạng thái một giao dịch thanh toán.
 * @param {string|number} id - ID của giao dịch cần cập nhật.
 * @param {object} updateData - Dữ liệu cần cập nhật { status: 'success' | 'failed' | 'pending'?, transactionId?, notes? }.
 * @returns {Promise<object>} Dữ liệu giao dịch sau khi cập nhật.
 */
const updatePayment = async (id, updateData) => {
  try {
    const response = await apiClient.put(`/payments/${id}`, updateData);
    // API doc: { success: true, data: { updated_payment_object } }
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Cập nhật giao dịch thanh toán thất bại.');
    }
  } catch (error) {
    console.error(`Lỗi service updatePayment (${id}):`, error.response?.data || error.message);
    if (error.response?.data?.errors) {
      throw error.response.data;
    }
    throw error.response?.data || error;
  }
};

/**
 * Xóa một giao dịch thanh toán (Thận trọng khi sử dụng).
 * @param {string|number} id - ID của giao dịch cần xóa.
 * @returns {Promise<object>} Response từ API.
 */
const deletePayment = async (id) => {
  try {
    const response = await apiClient.delete(`/payments/${id}`);
    // API doc: { success: true, message: "..." }
    if (response.data?.success) {
      return response.data;
    } else {
      throw new Error(response.data?.message || 'Xóa giao dịch thanh toán thất bại.');
    }
  } catch (error) {
    console.error(`Lỗi service deletePayment (${id}):`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

// Export service object
export const paymentService = {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
};