import apiClient from '../api/axios'; // THÊM DÒNG NÀY (Kiểm tra lại đường dẫn)

const login = async (credentials) => {
    try {
        const response = await apiClient.post('/auth/login', credentials);
        // Lưu token và user vào localStorage/context sau khi thành công
        if (response.data.token && response.data.user) {
            localStorage.setItem('authToken', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user)); // Lưu thông tin user
            // Cập nhật context nếu cần
        }
        return response.data; // Trả về dữ liệu từ API
    } catch (error) {
        // Interceptor đã xử lý lỗi và hiển thị toast, chỉ cần ném lại lỗi
        // để component gọi biết là có lỗi xảy ra
        console.error('Login service error:', error); // Log thêm nếu muốn
        throw error;
    }
};

const logout = () => {
    // Khi logout, client chỉ cần xóa token và user data
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    // Không cần gọi API /auth/logout vì nó không thực sự làm gì ở backend
    // Nếu muốn gọi để server biết (vd: log), thì gọi như các API khác:
    // try {
    //    await apiClient.post('/auth/logout');
    // } catch(error) {
    //     console.error("Error calling logout API (mostly informational):", error);
    // }
};

const getMe = async () => {
    try {
        const response = await apiClient.get('/auth/me');
        // Cập nhật lại thông tin user trong localStorage/context nếu cần
        if (response.data.user) {
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data.user;
    } catch (error) {
        console.error('GetMe service error:', error);
        // Lỗi 401 sẽ tự động xử lý logout bởi interceptor
        throw error;
    }
}


// Export các hàm service
export const authService = {
    login,
    logout,
    getMe,
    // Thêm các hàm khác: requestPasswordReset, resetPassword...
};