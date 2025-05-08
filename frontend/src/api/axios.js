import axios from 'axios';
import { toast } from 'react-hot-toast'; // Đảm bảo đã cài đặt react-hot-toast

// Sử dụng VITE_API_URL như đã thảo luận trước đó
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://192.168.1.12:5002';

// Kiểm tra xem VITE_API_URL đã được định nghĩa chưa
if (!import.meta.env.VITE_API_URL) {
  console.warn("Cảnh báo: VITE_API_URL chưa được định nghĩa trong file .env, sử dụng địa chỉ IP mặc định");
}

console.log('API đang kết nối đến:', API_BASE_URL);

// Tạo một instance Axios mới với cấu hình tùy chỉnh
const apiClient = axios.create({
  // Chỉ định baseURL là gốc của server API (ví dụ: http://localhost:5002)
  // Các service sẽ thêm phần path cụ thể (ví dụ: /api/auth/login)
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // timeout: 10000, // Timeout sau 10 giây (tùy chọn)
});

// --- Request Interceptor ---
// Tự động thêm token vào header Authorization cho các request
apiClient.interceptors.request.use(
  (config) => {
    // Lấy token từ localStorage (nơi AuthContext đã lưu)
    const token = localStorage.getItem('authToken');

    // Thêm header Authorization nếu token tồn tại
    // Không cần kiểm tra public path ở đây nữa vì nếu request cần xác thực mà không có token hợp lệ,
    // backend sẽ trả về lỗi 401 và response interceptor sẽ xử lý.
    if (token) {
      // Đảm bảo không ghi đè header Authorization đã tồn tại nếu có (hiếm khi)
      if (!config.headers['Authorization']) {
        config.headers['Authorization'] = `Bearer ${token}`;
        // console.log('[Axios Request Interceptor] Added token for URL:', config.url);
      }
    }
    // else {
    // console.log('[Axios Request Interceptor] No token found for URL:', config.url);
    // }

    // Luôn thêm /api vào trước URL nếu chưa có (để nhất quán với cấu trúc backend)
    // Kiểm tra xem URL đã bắt đầu bằng /api chưa
    if (config.url && !config.url.startsWith('/api')) {
      // Nếu config.url là relative path (ví dụ: 'auth/login')
      if (!config.url.startsWith('http://') && !config.url.startsWith('https://')) {
        config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
      }
      // Nếu là absolute path nhưng không trỏ đến API của chúng ta thì bỏ qua
    }


    return config; // Trả về config đã được sửa đổi
  },
  (error) => {
    // Xử lý lỗi trước khi request được gửi đi
    console.error('[Axios Request Interceptor] Error:', error);
    toast.error('Lỗi khi chuẩn bị gửi yêu cầu.'); // Thông báo lỗi chung
    return Promise.reject(error);
  }
);

// --- Response Interceptor ---
// Xử lý lỗi chung từ response API
apiClient.interceptors.response.use(
  (response) => {
    // Bất kỳ status code nào nằm trong khoảng 2xx sẽ đi vào đây
    // Có thể thêm logic kiểm tra response.data.success ở đây nếu muốn xử lý tập trung
    return response; // Trả về response gốc
  },
  (error) => {
    // Bất kỳ status code nào ngoài khoảng 2xx sẽ đi vào đây
    console.error('[Axios Response Interceptor] API Call Error:', error.response || error.message || error);

    // Biến để đánh dấu tránh xử lý lỗi 401 nhiều lần nếu có retry (hiện tại chưa có retry)
    const originalRequest = error.config;
    originalRequest._retry = originalRequest._retry || false; // Khởi tạo nếu chưa có

    if (error.response) {
      // Request đã được gửi và server trả về với status code không thành công
      const { status, data } = error.response;

      // Xử lý lỗi 401 (Unauthorized) - Quan trọng nhất
      if (status === 401 && !originalRequest._retry) {
        originalRequest._retry = true; // Đánh dấu đã xử lý lỗi 401 này

        // Kiểm tra xem request có phải là request đăng nhập không
        const isLoginRequest = originalRequest.url.includes('/auth/login');

        if (isLoginRequest) {
          // Đây là lỗi khi cố gắng đăng nhập - để component xử lý
          console.log('[Axios Interceptor] Login attempt failed with 401');
          // Không xử lý đặc biệt, để component login tự xử lý lỗi
          return Promise.reject(error);
        }

        console.error('[Axios Response Interceptor] Unauthorized (401). Logging out...');

        // Xóa token và thông tin user khỏi localStorage.
        // AuthContext sẽ tự động cập nhật state trong lần render tiếp theo hoặc khi reload.
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser'); // Giả sử user info cũng lưu ở đây

        // Thông báo cho người dùng và chuyển hướng về trang login
        // Chỉ chuyển hướng nếu chưa ở trang login
        if (window.location.pathname !== '/login') {
          toast.error(data?.message || 'Phiên đăng nhập hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.', { id: 'auth-error-toast' }); // Dùng id để tránh toast trùng lặp nếu lỗi xảy ra nhanh
          // Delay chuyển hướng để toast kịp hiển thị
          setTimeout(() => {
            window.location.href = '/login'; // Chuyển hướng cứng để reset toàn bộ state ứng dụng
          }, 1500);
        }
        // Không reject lỗi này nữa vì đã xử lý bằng redirect, trả về 1 promise pending để dừng chuỗi hiện tại
        return new Promise(() => { });

      } else if (status === 403) {
        // Lỗi Forbidden (Không có quyền truy cập)
        toast.error(data?.message || 'Bạn không có quyền thực hiện hành động này.');

      } else if (status === 404) {
        // Lỗi Not Found (Endpoint hoặc tài nguyên không tồn tại)
        // Thường xử lý tại component, nhưng có thể log ở đây
        console.warn('[Axios Response Interceptor] Resource not found (404):', error.config.url);
        // Không hiển thị toast chung cho 404 trừ khi có yêu cầu cụ thể

      } else if (status === 400 && data?.errors && Array.isArray(data.errors)) {
        // Lỗi Validation (ví dụ từ Zod middleware của backend)
        // Giả sử data.errors là [{ field: 'fieldName', message: 'error message' }]
        console.error('[Axios Response Interceptor] Validation Error (400):', data.errors);
        // Format lỗi validation để hiển thị
        const errorMessages = data.errors.map(err => `- ${err.field ? `${err.field}: ` : ''}${err.message}`);
        toast.error(`Lỗi dữ liệu đầu vào:\n${errorMessages.join('\n')}`, { duration: 6000 }); // Tăng thời gian hiển thị

      } else if (status >= 500) {
        // Lỗi Server (Internal Server Error, etc.)
        toast.error(data?.message || 'Lỗi hệ thống phía máy chủ. Vui lòng thử lại sau.');

      } else {
        // Các lỗi client-side khác (4xx) chưa được xử lý cụ thể
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

    // Quan trọng: Reject promise để component gọi API biết rằng đã có lỗi và xử lý tiếp nếu cần
    // Trả về data lỗi từ server nếu có, nếu không thì trả về đối tượng lỗi gốc
    return Promise.reject(error.response?.data || error);
  }
);

// Export instance đã cấu hình để sử dụng trong các service
export default apiClient;