import apiClient from '../api/axios';
import { toast } from 'react-hot-toast';

// --- Các hàm gọi API cho Student ---

/**
 * Lấy danh sách sinh viên (có phân trang và tìm kiếm).
 * @param {object} params - Query parameters (vd: page, limit, keyword)
 * @returns {Promise<object>} Dữ liệu trả về từ API { students: [...], meta: {...} }
 */
const getAllStudents = async (params = {}) => {
  try {
    const response = await apiClient.get('/students', { params });

    // Handle different API response structures
    if (response.data?.success || response.data?.status === 'success') {
      // Handle data based on structure
      if (response.data.data?.students) {
        return response.data.data; // { students: [...], meta: {...} }
      } else if (Array.isArray(response.data.data)) {
        // If data is an array, assume it's the students array
        return {
          students: response.data.data,
          meta: {
            total: response.data.data.length,
            currentPage: params.page || 1,
            totalPages: Math.ceil(response.data.data.length / (params.limit || 10))
          }
        };
      } else if (response.data.data) {
        // If data is an object with no students field
        return {
          students: response.data.data,
          meta: response.data.meta || {
            total: response.data.results || response.data.data.length,
            currentPage: params.page || 1,
            totalPages: Math.ceil((response.data.results || response.data.data.length) / (params.limit || 10))
          }
        };
      }
    }

    // Fallback handling for unexpected response structure
    console.warn('Unexpected API response structure:', response.data);
    throw new Error(response.data?.message || 'Lấy danh sách sinh viên thất bại.');
  } catch (error) {
    console.error('Lỗi service getAllStudents:', error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Lấy thông tin chi tiết một sinh viên bằng ID hồ sơ (profile ID).
 * @param {string|number} id - ID của hồ sơ sinh viên (StudentProfile ID).
 * @returns {Promise<object>} Dữ liệu chi tiết của sinh viên.
 */
const getStudentById = async (id) => {
  try {
    const response = await apiClient.get(`/students/${id}`);
    // API doc: { success: true, data: { student_profile_object } }
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || `Không tìm thấy sinh viên với ID ${id}.`);
    }
  } catch (error) {
    console.error(`Lỗi service getStudentById (${id}):`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Lấy thông tin chi tiết một sinh viên bằng User ID.
 * @param {string|number} userId - ID của user (User ID).
 * @returns {Promise<object>} Dữ liệu chi tiết của sinh viên.
 */
const getStudentByUserId = async (userId) => {
  try {
    const response = await apiClient.get(`/students/by-user/${userId}`);
    if (response.data?.status === 'success' && response.data?.data) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || `Không tìm thấy sinh viên với User ID ${userId}.`);
    }
  } catch (error) {
    console.error(`Lỗi service getStudentByUserId (${userId}):`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Lấy thông tin chi tiết một sinh viên bằng Profile ID.
 * @param {string|number} profileId - ID của hồ sơ sinh viên (student_profiles.id).
 * @returns {Promise<object>} Dữ liệu chi tiết của sinh viên.
 */
const getStudentByProfileId = async (profileId) => {
  try {
    const response = await apiClient.get(`/students/by-profile/${profileId}`);
    if (response.data?.status === 'success' && response.data?.data) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || `Không tìm thấy sinh viên với Profile ID ${profileId}.`);
    }
  } catch (error) {
    console.error(`Lỗi service getStudentByProfileId (${profileId}):`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Tạo một hồ sơ sinh viên mới.
 * Lưu ý: API này có thể yêu cầu tạo User trước hoặc tự tạo User liên kết.
 * Cần làm rõ logic này với backend. Giả sử API này tạo cả User và Profile.
 * Hoặc có thể API này chỉ tạo Profile và cần userId có sẵn?
 * => Giả định API này tạo cả User (với email/pass mặc định?) và Profile.
 * @param {object} studentData - Dữ liệu hồ sơ sinh viên (bao gồm các trường trong API doc).
 * @returns {Promise<object>} Dữ liệu hồ sơ sinh viên vừa tạo.
 */
const createStudent = async (studentData) => {
  try {
    // **Cần làm rõ:** API `/students` có tạo cả User không, hay cần `userId`?
    // Nếu cần tạo user riêng, thì luồng sẽ phức tạp hơn.
    // Giả sử gửi thẳng data profile lên /students
    const response = await apiClient.post('/students', studentData);
    // API doc: { success: true, data: { new_student_profile_object } }
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Tạo hồ sơ sinh viên thất bại.');
    }
  } catch (error) {
    console.error('Lỗi service createStudent:', error.response?.data || error.message);
    if (error.response?.data?.errors) {
      throw error.response.data;
    }
    throw error.response?.data || error;
  }
};

/**
 * Cập nhật thông tin hồ sơ sinh viên.
 * @param {string|number} id - ID của hồ sơ sinh viên cần cập nhật.
 * @param {object} studentData - Dữ liệu cần cập nhật.
 * @returns {Promise<object>} Dữ liệu hồ sơ sinh viên sau khi cập nhật.
 */
const updateStudent = async (id, studentData) => {
  try {
    // Chỉ gửi các trường cần cập nhật
    const response = await apiClient.put(`/students/${id}`, studentData);
    // API doc: { success: true, data: { updated_student_profile_object } }
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Cập nhật hồ sơ sinh viên thất bại.');
    }
  } catch (error) {
    console.error(`Lỗi service updateStudent (${id}):`, error.response?.data || error.message);
    if (error.response?.data?.errors) {
      throw error.response.data;
    }
    throw error.response?.data || error;
  }
};

/**
 * Xóa một hồ sơ sinh viên.
 * Lưu ý: Việc xóa này có thể cần xóa cả User liên kết hoặc chỉ xóa Profile.
 * @param {string|number} id - ID của hồ sơ sinh viên cần xóa.
 * @returns {Promise<object>} Response từ API (thường chứa message).
 */
const deleteStudent = async (id) => {
  try {
    const response = await apiClient.delete(`/students/${id}`);
    // Kiểm tra cả hai trường hợp: success và status để tương thích với cả hai cấu trúc response
    if (response.data?.success || response.data?.status === 'success') {
      return response.data;
    } else {
      throw new Error(response.data?.message || 'Xóa hồ sơ sinh viên thất bại.');
    }
  } catch (error) {
    console.error(`Lỗi service deleteStudent (${id}):`, error.response?.data || error.message);
    // Có thể có lỗi ràng buộc khóa ngoại nếu sinh viên còn hợp đồng, hóa đơn,...
    throw error.response?.data || error;
  }
};


// Export service object
export const studentService = {
  getAllStudents,
  getStudentById,
  getStudentByUserId,
  getStudentByProfileId,
  createStudent,
  updateStudent,
  deleteStudent,
};