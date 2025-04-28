import axios from 'axios';
import { toast } from 'react-hot-toast'; // Hoặc thư viện notification khác

// Lấy baseURL từ biến môi trường, có giá trị mặc định cho development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002/api';

// Tạo một instance Axios mới với cấu hình tùy chỉnh
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    // Không nên đặt 'Authorization' mặc định ở đây vì không phải request nào cũng cần
  },
  // timeout: 10000, // Timeout sau 10 giây (tùy chọn)
});

// --- Request Interceptor ---
// Tự động thêm token vào header Authorization cho các request cần xác thực
apiClient.interceptors.request.use(
  (config) => {
    // Lấy token từ localStorage (hoặc nơi bạn lưu trữ)
    // Bạn có thể cần một hàm helper hoặc lấy trực tiếp từ AuthContext nếu có thể
    const token = localStorage.getItem('authToken'); // Ví dụ tên key là 'authToken'

    // Chỉ thêm header nếu token tồn tại và request không phải là đến các endpoint public
    // (Có thể làm cách kiểm tra URL tinh vi hơn nếu cần)
    const publicPaths = ['/auth/login', '/auth/register', '/auth/request-password-reset', '/auth/reset-password'];
    if (token && config.url && !publicPaths.some(path => config.url.endsWith(path))) {
      console.log('[Axios Request Interceptor] Adding token to header for URL:', config.url);
      config.headers['Authorization'] = `Bearer ${token}`;
    } else {
      console.log('[Axios Request Interceptor] No token added for URL:', config.url);
    }

    return config; // Trả về config đã được sửa đổi
  },
  (error) => {
    // Xử lý lỗi trước khi request được gửi đi (hiếm khi xảy ra)
    console.error('[Axios Request Interceptor] Error:', error);
    return Promise.reject(error);
  }
);

// --- Response Interceptor ---
// Xử lý lỗi chung từ response API
apiClient.interceptors.response.use(
  (response) => {
    // Bất kỳ status code nào nằm trong khoảng 2xx sẽ đi vào đây
    // Bạn có thể thêm logic xử lý data response chung ở đây nếu muốn
    return response; // Trả về response gốc
  },
  (error) => {
    // Bất kỳ status code nào ngoài khoảng 2xx sẽ đi vào đây
    console.error('[Axios Response Interceptor] API Call Error:', error.response || error.message || error);

    if (error.response) {
      // Request đã được gửi và server trả về với status code không thành công
      const { status, data } = error.response;

      // Xử lý các lỗi cụ thể
      if (status === 401) {
        // Lỗi Unauthorized (Token sai, hết hạn, hoặc chưa đăng nhập)
        console.error('[Axios Response Interceptor] Unauthorized (401). Logging out...');
        // Xóa token và thông tin user khỏi localStorage/context
        localStorage.removeItem('authToken');
        localStorage.removeItem('user'); // Ví dụ
        // Có thể gọi hàm logout từ AuthContext ở đây nếu cần thiết
        // authContext.logout();

        // Thông báo cho người dùng và chuyển hướng về trang login
        // Tránh chuyển hướng nếu đang ở trang login rồi
        if (window.location.pathname !== '/login') {
          toast.error(data?.message || 'Phiên đăng nhập hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.');
          // Delay chuyển hướng để toast kịp hiển thị
          setTimeout(() => {
            window.location.href = '/login'; // Chuyển hướng cứng
          }, 1500);
        }

      } else if (status === 403) {
        // Lỗi Forbidden (Không có quyền truy cập)
        toast.error(data?.message || 'Bạn không có quyền thực hiện hành động này.');

      } else if (status === 404) {
        // Lỗi Not Found (Endpoint hoặc tài nguyên không tồn tại)
        // Thường thì nên xử lý lỗi 404 tại component gọi API thay vì ở đây
        console.warn('[Axios Response Interceptor] Resource not found (404):', error.config.url);
        // toast.error(data?.message || 'Không tìm thấy tài nguyên được yêu cầu.');

      } else if (status === 400 && data?.errors) {
        // Lỗi Validation (từ middleware Zod/validate)
        // Hiển thị lỗi validation chi tiết nếu có
        console.error('[Axios Response Interceptor] Validation Error (400):', data.errors);
        const errorMsg = data.errors.map(err => `${err.field}: ${err.message}`).join('\n');
        toast.error(`Lỗi dữ liệu:\n${errorMsg}`, { duration: 5000 });

      } else if (status >= 500) {
        // Lỗi Server (Internal Server Error, etc.)
        toast.error(data?.message || 'Lỗi hệ thống phía máy chủ. Vui lòng thử lại sau.');

      } else {
        // Các lỗi client-side khác (4xx)
        toast.error(data?.message || `Đã xảy ra lỗi (${status}).`);
      }

    } else if (error.request) {
      // Request đã được gửi nhưng không nhận được response (vd: network error, server offline)
      console.error('[Axios Response Interceptor] No response received:', error.request);
      toast.error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.');
    } else {
      // Lỗi xảy ra trong quá trình thiết lập request
      console.error('[Axios Response Interceptor] Error setting up request:', error.message);
      toast.error('Đã xảy ra lỗi khi gửi yêu cầu.');
    }

    // Quan trọng: Reject promise để component gọi API biết rằng đã có lỗi
    return Promise.reject(error);
  }
);

// Export instance đã cấu hình để sử dụng trong các service
export default apiClient;