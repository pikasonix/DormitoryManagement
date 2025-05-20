import apiClient from '../api/axios';
import { toast } from 'react-hot-toast';

// --- Các hàm gọi API cho Payment ---

/**
 * Lấy danh sách các giao dịch thanh toán (có phân trang và lọc).
 * @param {object} params - Query parameters (vd: page, limit, id, studentId, invoiceId, method, transactionCode)
 * @returns {Promise<object>} Dữ liệu trả về { payments: [...], meta: {...} }
 */
const getAllPayments = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/payments', { params });
    // Backend trả về: { status: 'success', payments: [...], meta: {...} }
    if (response.data?.status === 'success') {
      return {
        payments: response.data.payments || [],
        meta: response.data.meta || {
          page: params.page || 1,
          limit: params.limit || 10,
          totalPages: 1,
          total: 0
        }
      };
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
    const response = await apiClient.get(`/api/payments/${id}`);
    // Backend trả về: { status: 'success', data: payment_object }
    if (response.data?.status === 'success') {
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
    // Chuyển đổi dữ liệu sang số đúng định dạng
    // Đảm bảo tất cả các trường dữ liệu có giá trị số đều được chuyển đổi chính xác
    const payload = {
      ...paymentData,
      studentProfileId: parseInt(paymentData.studentProfileId, 10), // Đảm bảo là số nguyên
      invoiceId: parseInt(paymentData.invoiceId, 10), // Đảm bảo là số nguyên
      amount: parseFloat(paymentData.amount) || 0, // Đảm bảo là số thực
    };

    // Kiểm tra dữ liệu trước khi gửi
    if (isNaN(payload.studentProfileId)) {
      throw new Error('Lỗi: studentProfileId không hợp lệ');
    }

    if (isNaN(payload.invoiceId)) {
      throw new Error('Lỗi: invoiceId không hợp lệ');
    }

    if (isNaN(payload.amount) || payload.amount <= 0) {
      throw new Error('Lỗi: amount không hợp lệ');
    }

    console.log('Final POST request payload to API:', JSON.stringify(payload));
    const response = await apiClient.post('/api/payments', payload);
    // Backend trả về: { status: 'success', data: new_payment_object }
    if (response.data?.status === 'success') {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Tạo giao dịch thanh toán thất bại.');
    }
  } catch (error) {
    console.error('Lỗi service createPayment:', error.response?.data || error.message);
    // Log thông tin chi tiết về lỗi
    if (error.response) {
      console.error('Response error details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      });
    }
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
    const response = await apiClient.put(`/api/payments/${id}`, updateData);
    // Backend trả về: { status: 'success', data: updated_payment_object }
    if (response.data?.status === 'success') {
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
    const response = await apiClient.delete(`/api/payments/${id}`);
    // Backend trả về: { status: 'success', message: "..." }
    if (response.data?.status === 'success') {
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