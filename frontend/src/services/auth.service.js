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

        // Xử lý trường hợp thông tin đăng nhập không chính xác (401)
        if (error.response?.status === 401) {
            console.log('Đăng nhập thất bại: Thông tin đăng nhập không chính xác');
            throw new Error(error.response?.data?.message || 'Email hoặc mật khẩu không chính xác');
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

/**
 * Gọi API để cập nhật thông tin hồ sơ.
 * @param {object} profileData - Dữ liệu cập nhật hồ sơ
 * @returns {Promise<object>} - Kết quả cập nhật
 * @throws {Error} Nếu cập nhật thất bại hoặc API trả về lỗi
 */
const updateProfile = async (profileData) => {
    try {
        // Ensure we have the profile ID
        if (!profileData.id) {
            console.error('Missing profile ID for update');
            throw new Error('Thiếu thông tin ID hồ sơ');
        }

        const profileId = profileData.id;

        // Create a sanitized copy of the data without the ID field (since it goes in the URL)
        const sanitizedData = { ...profileData };
        delete sanitizedData.id;  // Remove ID from body since it's in the URL

        // Handle numeric fields that might be empty strings or undefined
        if (sanitizedData.roomId === '' || sanitizedData.roomId === undefined) {
            sanitizedData.roomId = null;
        } else if (sanitizedData.roomId !== null) {
            const roomIdNum = parseInt(sanitizedData.roomId);
            sanitizedData.roomId = isNaN(roomIdNum) ? null : roomIdNum;
        }

        if (sanitizedData.avatarId === '' || sanitizedData.avatarId === undefined) {
            sanitizedData.avatarId = null;
        } else if (sanitizedData.avatarId !== null) {
            const avatarIdNum = parseInt(sanitizedData.avatarId);
            sanitizedData.avatarId = isNaN(avatarIdNum) ? null : avatarIdNum;
        }

        if (sanitizedData.courseYear === '' || sanitizedData.courseYear === undefined) {
            sanitizedData.courseYear = null;
        } else if (sanitizedData.courseYear !== null) {
            const courseYearNum = parseInt(sanitizedData.courseYear);
            sanitizedData.courseYear = isNaN(courseYearNum) ? null : courseYearNum;
        }

        if (sanitizedData.fatherDobYear === '' || sanitizedData.fatherDobYear === undefined) {
            sanitizedData.fatherDobYear = null;
        } else if (sanitizedData.fatherDobYear !== null) {
            const fatherDobYearNum = parseInt(sanitizedData.fatherDobYear);
            sanitizedData.fatherDobYear = isNaN(fatherDobYearNum) ? null : fatherDobYearNum;
        }

        if (sanitizedData.motherDobYear === '' || sanitizedData.motherDobYear === undefined) {
            sanitizedData.motherDobYear = null;
        } else if (sanitizedData.motherDobYear !== null) {
            const motherDobYearNum = parseInt(sanitizedData.motherDobYear);
            sanitizedData.motherDobYear = isNaN(motherDobYearNum) ? null : motherDobYearNum;
        }

        // Handle date fields that might be empty strings
        const dateFields = ['birthDate', 'startDate', 'contractEndDate', 'checkInDate', 'checkOutDate'];
        dateFields.forEach(field => {
            if (sanitizedData[field] === '' || sanitizedData[field] === undefined) {
                sanitizedData[field] = null;
            } else if (sanitizedData[field] !== null) {
                // Validate date format
                const date = new Date(sanitizedData[field]);
                if (isNaN(date.getTime())) {
                    console.warn(`Invalid date format for ${field}: ${sanitizedData[field]}`);
                    sanitizedData[field] = null;
                }
            }
        });

        // Log the data being sent for debugging
        console.log('Sanitized profile data before update:', sanitizedData);
        console.log('Updating profile ID:', profileId);

        // Determine the correct API endpoint based on role or profile type
        let apiEndpoint;

        // Get user data to determine role
        const userData = await getMe();
        const userRole = userData?.user?.role;

        // More reliable role-based endpoint selection
        if (userRole === 'STAFF' || userRole === 'ADMIN') {
            // For staff/admin profiles, use the staff endpoint
            apiEndpoint = `/students/staff/${profileId}`;
            console.log('Detected staff/admin role, using staff API endpoint');
        } else {
            // For student profiles, use the student endpoint
            apiEndpoint = `/students/${profileId}`;
            console.log('Using student API endpoint');
        }

        console.log('Using API endpoint:', apiEndpoint);

        try {
            // Use the correct endpoint with the profileId in the URL
            const response = await apiClient.put(apiEndpoint, sanitizedData);

            if (response.data?.success || response.data?.status === 'success') {
                return response.data;
            } else {
                console.error('API response error:', response.data);
                throw new Error(response.data?.message || 'Cập nhật thông tin thất bại.');
            }
        } catch (apiError) {
            // Log detailed information about the API error
            console.error('API call failed:', apiError);

            if (apiError.response) {
                console.error('Error status:', apiError.response.status);
                console.error('Error data:', apiError.response.data);

                // Check for validation errors
                if (apiError.response.data?.errors) {
                    console.error('Validation errors:', apiError.response.data.errors);

                    // Format validation errors for better readability
                    const errorMessages = Object.entries(apiError.response.data.errors)
                        .map(([field, message]) => `${field}: ${message}`)
                        .join(', ');

                    throw new Error(`Dữ liệu không hợp lệ. ${errorMessages}`);
                }
            }

            const errorMessage = apiError.response?.data?.message || apiError.message || 'Lỗi không xác định';
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('Lỗi dịch vụ updateProfile:', error);
        throw error; // Rethrow the error with detailed information
    }
};

/**
 * Lấy lịch sử đăng nhập của người dùng
 * @param {number} userId - ID người dùng (tùy chọn, mặc định sẽ lấy thông tin người dùng hiện tại)
 * @param {number} page - Số trang (pagination)
 * @param {number} limit - Số record trên mỗi trang
 * @returns {Promise<object>} - Dữ liệu lịch sử đăng nhập và thông tin phân trang
 */
const getLoginHistory = async (userId = null, page = 1, limit = 10) => {
    try {
        const endpoint = userId
            ? `/auth/login-history/${userId}?page=${page}&limit=${limit}`
            : `/auth/login-history?page=${page}&limit=${limit}`;

        const response = await apiClient.get(endpoint);

        if (response.data?.success) {
            return {
                data: response.data.data,
                meta: response.data.meta
            };
        } else {
            throw new Error(response.data?.message || 'Không thể lấy lịch sử đăng nhập');
        }
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || 'Lỗi không xác định';
        console.error('Lỗi khi lấy lịch sử đăng nhập:', errorMessage);
        throw new Error(errorMessage);
    }
};

// Export các hàm service đã định nghĩa
export const authService = {
    login,
    logout,
    getMe,
    changePassword,
    register,
    updateProfile, // Thêm hàm updateProfile vào export
    getLoginHistory // Thêm hàm getLoginHistory vào export
};
