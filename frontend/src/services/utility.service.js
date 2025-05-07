import apiClient from '../api/axios';
import { toast } from 'react-hot-toast';

// --- Các hàm gọi API cho Utility Reading/Billing ---

/**
 * Lấy danh sách các bản ghi chỉ số điện/nước (có phân trang và lọc).
 * @param {object} params - Query parameters (vd: page, limit, type: 'electric'|'water', studentId?, roomId?, dormitoryId?, billingPeriod?)
 * @returns {Promise<object>} Dữ liệu trả về { utilities: [...], meta: {...} }
 */
const getAllUtilityReadings = async (params = {}) => {
    try {
        // Create a copy of params to avoid modifying the original
        const queryParams = { ...params };

        // Check if type is an object and convert it to a string value
        if (queryParams.type && typeof queryParams.type === 'object') {
            console.warn('Type parameter is an object, converting to string', queryParams.type);
            // If it has a value property, use that, otherwise set to empty string
            queryParams.type = queryParams.type.value || '';
        }

        console.log('Calling utility API with params:', queryParams);
        // Make sure we're using the correct API path
        const response = await apiClient.get('/api/utilities', { params: queryParams });
        console.log('API response:', response.data);

        // Backend trả về: { status: 'success', results: number, total: number, data: array }
        if (response.data?.status === 'success') {
            return {
                utilities: response.data.data || [],
                meta: {
                    total: response.data.total || 0,
                    count: response.data.results || 0,
                    page: queryParams.page || 1,
                    limit: queryParams.limit || 10,
                    totalPages: Math.ceil((response.data.total || 0) / (queryParams.limit || 10))
                }
            };
        } else {
            throw new Error(response.data?.message || 'Lấy danh sách ghi điện nước thất bại.');
        }
    } catch (error) {
        console.error('Lỗi service getAllUtilityReadings:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

/**
 * Lấy thông tin chi tiết một bản ghi chỉ số điện/nước bằng ID.
 * @param {string|number} id - ID của bản ghi.
 * @returns {Promise<object>} Dữ liệu chi tiết của bản ghi.
 */
const getUtilityReadingById = async (id) => {
    try {
        const response = await apiClient.get(`/api/utilities/${id}`);
        // Backend trả về: { status: 'success', data: utility_reading_object }
        if (response.data?.status === 'success') {
            return response.data.data;
        } else {
            throw new Error(response.data?.message || `Không tìm thấy bản ghi điện nước với ID ${id}.`);
        }
    } catch (error) {
        console.error(`Lỗi service getUtilityReadingById (${id}):`, error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

/**
 * Tạo một bản ghi chỉ số điện/nước mới.
 * @param {object} readingData - Dữ liệu bản ghi { roomId, type, readingDate, indexValue, billingMonth, billingYear, notes? }.
 * @returns {Promise<object>} Dữ liệu bản ghi vừa tạo.
 */
const createUtilityReading = async (readingData) => {
    try {
        // Chuyển đổi kiểu dữ liệu nếu cần
        const payload = {
            ...readingData,
            roomId: parseInt(readingData.roomId),
            indexValue: parseFloat(readingData.indexValue),
            billingMonth: parseInt(readingData.billingMonth),
            billingYear: parseInt(readingData.billingYear),
        };

        console.log('Creating utility reading with payload:', payload);
        const response = await apiClient.post('/api/utilities', payload);
        console.log('Create response:', response.data);

        // Backend trả về: { status: 'success', data: new_utility_reading_object }
        if (response.data?.status === 'success') {
            return response.data.data;
        } else {
            throw new Error(response.data?.message || 'Ghi nhận chỉ số điện nước thất bại.');
        }
    } catch (error) {
        console.error('Lỗi service createUtilityReading:', error.response?.data || error.message);
        if (error.response?.data?.errors) {
            throw error.response.data;
        }
        throw error.response?.data || error;
    }
};

/**
 * Cập nhật thông tin một bản ghi chỉ số điện/nước.
 * @param {string|number} id - ID của bản ghi cần cập nhật.
 * @param {object} updateData - Dữ liệu cần cập nhật { readingDate?, indexValue?, notes? }.
 * @returns {Promise<object>} Dữ liệu bản ghi sau khi cập nhật.
 */
const updateUtilityReading = async (id, updateData) => {
    try {
        const payload = {
            ...updateData,
            indexValue: updateData.indexValue !== undefined ? parseFloat(updateData.indexValue) : undefined,
        };
        // Xóa các key undefined khỏi payload
        Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

        console.log(`Updating utility reading ${id} with payload:`, payload);
        const response = await apiClient.put(`/api/utilities/${id}`, payload);
        console.log('Update response:', response.data);

        // Backend trả về: { status: 'success', data: updated_utility_reading_object }
        if (response.data?.status === 'success') {
            return response.data.data;
        } else {
            throw new Error(response.data?.message || 'Cập nhật bản ghi điện nước thất bại.');
        }
    } catch (error) {
        console.error(`Lỗi service updateUtilityReading (${id}):`, error.response?.data || error.message);
        if (error.response?.data?.errors) {
            throw error.response.data;
        }
        throw error.response?.data || error;
    }
};

/**
 * Xóa một bản ghi chỉ số điện/nước.
 * @param {string|number} id - ID của bản ghi cần xóa.
 * @returns {Promise<object>} Response từ API.
 */
const deleteUtilityReading = async (id) => {
    try {
        console.log(`Deleting utility reading with ID: ${id}`);
        const response = await apiClient.delete(`/api/utilities/${id}`);
        console.log('Delete response:', response.data);

        // Backend trả về: { status: 'success', message: "..." }
        if (response.data?.status === 'success') {
            return response.data;
        } else {
            throw new Error(response.data?.message || 'Xóa bản ghi điện nước thất bại.');
        }
    } catch (error) {
        console.error(`Lỗi service deleteUtilityReading (${id}):`, error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

/**
 * Lấy biểu phí hiện tại cho các tiện ích (điện, nước)
 * @returns {Promise<Array>} Danh sách biểu phí hiện hành
 */
const getUtilityFeeRates = async () => {
    try {
        const response = await apiClient.get('/api/fee-rates', {
            params: {
                feeType: ['ELECTRICITY', 'WATER'],
                isActive: true,
                current: true
            }
        });

        if (response.data?.status === 'success') {
            return response.data.data || [];
        } else {
            throw new Error(response.data?.message || 'Không thể lấy biểu phí tiện ích.');
        }
    } catch (error) {
        console.error('Lỗi service getUtilityFeeRates:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

// Export service object
export const utilityService = {
    getAllUtilityReadings,
    getUtilityReadingById,
    createUtilityReading,
    updateUtilityReading,
    deleteUtilityReading,
    getUtilityFeeRates,
};