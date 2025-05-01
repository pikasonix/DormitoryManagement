// src/services/auth.service.js
import apiClient from '../api/axios';

/**
 * Gọi API endpoint đăng nhập.
 * @param {string} email - Email người dùng
 * @param {string} password - Mật khẩu người dùng
 * @returns {Promise<{user: object, token: string}>} Dữ liệu gồm user object và token nếu thành công.
 * @throws {Error} Nếu đăng nhập thất bại hoặc API trả về lỗi.
 */
const login = async (email, password) => {
    try {
        const response = await apiClient.post('/auth/login', { email, password });

        // Kiểm tra nếu có dữ liệu và thành công
        if (response.data?.success) {
            // Nếu success nhưng thiếu user/token thì log cảnh báo
            if (!response.data?.data?.user || !response.data?.data?.token) {
                console.warn('Cảnh báo: Đăng nhập thành công nhưng thiếu user/token.');
            }
            return response.data.data;
        }
        // Trường hợp đặc biệt: thông báo là "Đăng nhập thành công" nhưng không có success flag
        else if (response.data?.message === 'Đăng nhập thành công') {
            console.log('Đăng nhập thành công, trích xuất dữ liệu.');
            // Tùy vào cấu trúc API, có thể dữ liệu nằm trong response.data hoặc response.data.data
            return response.data.data || response.data;
        }
        else {
            throw new Error(response.data?.message || 'Đăng nhập thất bại.');
        }
    } catch (error) {
        // Đặc biệt xử lý trường hợp lỗi nhưng message là "Đăng nhập thành công"
        if (error.message === 'Đăng nhập thành công' ||
            error.response?.data?.message === 'Đăng nhập thành công') {
            console.log('Phát hiện đăng nhập thành công được trả về dưới dạng lỗi');

            // Trả về dữ liệu từ response nếu có, hoặc tạo đối tượng mặc định
            const userData = error.response?.data?.data || {};
            return userData;
        }

        const errorMessage = error.response?.data?.message || error.message || 'Lỗi không xác định';
        console.error('Lỗi dịch vụ đăng nhập:', errorMessage);
        throw new Error(errorMessage);
    }
};

/**
 * Gọi API endpoint đăng ký người dùng mới.
 * @param {object} userData - Dữ liệu người dùng gồm email, password và các thông tin khác
 * @returns {Promise<object>} - Dữ liệu người dùng đã đăng ký
 * @throws {Error} Nếu đăng ký thất bại hoặc API trả về lỗi
 */
const register = async (userData) => {
    try {
        const response = await apiClient.post('/auth/register', userData);

        if (response.data?.success) {
            return response.data.data || response.data;
        } else if (response.data?.message === 'Đăng ký thành công') {
            return response.data.data || response.data;
        } else {
            throw new Error(response.data?.message || 'Đăng ký thất bại.');
        }
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || 'Lỗi không xác định';
        console.error('Lỗi dịch vụ đăng ký:', errorMessage);
        throw new Error(errorMessage);
    }
};

/**
 * Hàm logout trong service.
 */
const logout = () => {
    console.log("AuthService: Logout function called (no backend API call implemented).");
};

/**
 * Gọi API để lấy thông tin người dùng đang đăng nhập.
 * @returns {Promise<object>} User object nếu thành công.
 */
const getMe = async () => {
    try {
        const response = await apiClient.get('/auth/me');

        if (response.data?.success && response.data?.data) {
            return response.data.data;
        } else {
            throw new Error(response.data?.message || 'Không thể lấy thông tin người dùng.');
        }
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || 'Lỗi không xác định';
        console.error('Lỗi dịch vụ getMe:', errorMessage);
        throw new Error(errorMessage);
    }
};

/**
 * Gọi API để thay đổi mật khẩu.
 * @param {string} oldPassword
 * @param {string} newPassword
 * @returns {Promise<object>}
 */
const changePassword = async (oldPassword, newPassword) => {
    try {
        const response = await apiClient.put('/auth/change-password', {
            oldPassword,
            newPassword,
        });

        if (response.data?.success || response.status === 200 || response.status === 204) {
            return response.data || { message: 'Đổi mật khẩu thành công.' };
        } else {
            throw new Error(response.data?.message || 'Đổi mật khẩu thất bại.');
        }
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || 'Lỗi không xác định';
        console.error('Lỗi dịch vụ changePassword:', errorMessage);
        throw new Error(errorMessage);
    }
};

// Export các hàm service đã định nghĩa
export const authService = {
    login,
    logout,
    getMe,
    changePassword,
    register, // Thêm hàm register vào export
};
