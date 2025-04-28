import apiClient from '../api/axios';
import { toast } from 'react-hot-toast';

// Lấy danh sách sinh viên (có filter, pagination)
const getAllStudents = async (params = {}) => {
  // params: roomId, buildingId, status, faculty, courseYear, search, page, limit, sortBy, sortOrder
  try {
    console.log('[Student Service] Fetching students with params:', params);
    const response = await apiClient.get('/students', { params });
    console.log('[Student Service] Response:', response.data);
    // API trả về { status: 'success', results: number, total: number, data: StudentProfile[] }
    return response.data;
  } catch (error) {
    console.error('[Student Service] Error fetching students:', error);
    throw error;
  }
};

// Lấy chi tiết một sinh viên bằng Profile ID
const getStudentById = async (id) => {
  if (!id) throw new Error('Student Profile ID is required');
  try {
    console.log(`[Student Service] Fetching student by ID: ${id}`);
    const response = await apiClient.get(`/students/${id}`);
    console.log('[Student Service] Response:', response.data);
    // API trả về { status: 'success', data: StudentProfile }
    return response.data.data;
  } catch (error) {
    console.error(`[Student Service] Error fetching student ${id}:`, error);
    if (error.response?.status === 404) {
      toast.error('Không tìm thấy hồ sơ sinh viên này.');
    }
    throw error;
  }
};

// Tạo sinh viên mới (User + StudentProfile)
const createStudent = async (studentData) => {
  // studentData: chứa email, password, và tất cả các trường của StudentProfile
  try {
    console.log('[Student Service] Creating student:', studentData);
    // Backend API POST /students đã xử lý việc tạo User và Profile
    const response = await apiClient.post('/students', studentData);
    console.log('[Student Service] Response:', response.data);
    toast.success('Tạo hồ sơ sinh viên thành công!');
    // API trả về { status: 'success', data: StudentProfile }
    return response.data.data;
  } catch (error) {
    console.error('[Student Service] Error creating student:', error);
    // Lỗi validation hoặc trùng lặp đã được interceptor hoặc controller xử lý toast
    throw error;
  }
};

// Cập nhật thông tin sinh viên (Profile ID)
const updateStudent = async (profileId, updateData) => {
  // updateData: chứa các trường có thể cập nhật của StudentProfile và có thể cả avatarId
  if (!profileId) throw new Error('Student Profile ID is required for update');
  try {
    console.log(`[Student Service] Updating student profile ${profileId}:`, updateData);
    // Sử dụng endpoint PUT /students/:id để cập nhật profile
    const response = await apiClient.put(`/students/${profileId}`, updateData);
    // Nếu cập nhật avatarId thì dùng PUT /users/:userId/profile?
    // => Cần thống nhất API endpoint cho việc cập nhật.
    // => GIẢ SỬ API PUT /students/:id xử lý cả profile và avatarId (nếu có)
    console.log('[Student Service] Response:', response.data);
    toast.success('Cập nhật thông tin sinh viên thành công!');
    // API trả về { status: 'success', data: StudentProfile }
    return response.data.data;
  } catch (error) {
    console.error(`[Student Service] Error updating student ${profileId}:`, error);
    throw error;
  }
};

// Xóa sinh viên (Profile ID)
const deleteStudent = async (profileId) => {
  if (!profileId) throw new Error('Student Profile ID is required for delete');
  try {
    console.log(`[Student Service] Deleting student profile ${profileId}`);
    // API DELETE /students/:id xử lý việc xóa User, Profile và các liên kết
    await apiClient.delete(`/students/${profileId}`);
    toast.success('Xóa sinh viên thành công!');
    return true;
  } catch (error) {
    console.error(`[Student Service] Error deleting student ${profileId}:`, error);
    if (error.response?.status === 400 || error.response?.status === 409) {
      toast.error(error.response?.data?.message || 'Không thể xóa sinh viên.');
    }
    throw error;
  }
};

// Export thành một object
export const studentService = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
};