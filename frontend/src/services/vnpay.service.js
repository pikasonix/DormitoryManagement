import apiClient from '../api/axios';
import { toast } from 'react-hot-toast';

/**
 * Lấy URL thanh toán VNPay cho một hóa đơn.
 * @param {number} invoice_id - ID của hóa đơn cần thanh toán.
 * @returns {Promise<object>} Dữ liệu chứa URL thanh toán, {success, paymentUrl, payment_id, transaction_id}.
 */
const getPaymentUrl = async (invoice_id) => {
    try {
        const response = await apiClient.post('/api/vnpay/payment-url', { invoice_id });

        if (response.data?.success) {
            return response.data;
        } else {
            throw new Error(response.data?.message || 'Không thể tạo URL thanh toán.');
        }
    } catch (error) {
        // In chi tiết lỗi để debug
        console.error('Lỗi service getPaymentUrl:', error.response?.data || error.message);

        // Lỗi từ backend
        if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }
        // Lỗi từ axios
        else if (error.response) {
            throw new Error(`Lỗi kết nối (${error.response.status}): ${error.response.statusText}`);
        }
        // Lỗi đã có thông báo
        else if (error.message) {
            throw error;
        }
        // Lỗi khác
        else {
            throw new Error('Không thể kết nối đến cổng thanh toán. Vui lòng thử lại sau.');
        }
    }
};

/**
 * Lấy thông tin chi tiết một thanh toán VNPay.
 * @param {number} payment_id - ID của thanh toán.
 * @returns {Promise<object>} Dữ liệu chi tiết thanh toán.
 */
const getPaymentDetails = async (payment_id) => {
    try {
        const response = await apiClient.get(`/api/vnpay/payment/${payment_id}`);

        if (response.data?.success) {
            return response.data.payment;
        } else {
            throw new Error(response.data?.message || 'Không thể lấy thông tin thanh toán.');
        }
    } catch (error) {
        console.error(`Lỗi service getPaymentDetails (${payment_id}):`, error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

/**
 * Lấy danh sách thanh toán của một sinh viên.
 * @param {number} studentId - ID của sinh viên.
 * @returns {Promise<object>} Danh sách hóa đơn và thanh toán của sinh viên.
 */
const getStudentPayments = async (studentId) => {
    try {
        const response = await apiClient.get(`/api/vnpay/payments/student/${studentId}`);

        if (response.data?.success) {
            return response.data.invoices;
        } else {
            throw new Error(response.data?.message || 'Không thể lấy danh sách thanh toán.');
        }
    } catch (error) {
        console.error(`Lỗi service getStudentPayments (${studentId}):`, error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

/**
 * Lấy thông tin chi tiết thanh toán theo invoice ID.
 * @param {number} invoiceId - ID của hóa đơn.
 * @returns {Promise<object>} Dữ liệu chi tiết thanh toán.
 */
const getPaymentByInvoiceId = async (invoiceId) => {
    try {
        const response = await apiClient.get(`/api/vnpay/payments/invoice/${invoiceId}`);

        if (response.data?.success) {
            return response.data.payment;
        } else {
            throw new Error(response.data?.message || 'Không thể lấy thông tin thanh toán.');
        }
    } catch (error) {
        console.error(`Lỗi service getPaymentByInvoiceId (${invoiceId}):`, error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

// Export service object
export const vnpayService = {
    getPaymentUrl,
    getPaymentDetails,
    getPaymentByInvoiceId,
    getStudentPayments,
};
