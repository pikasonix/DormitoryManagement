import apiClient from '../api/axios';

export const feeService = {  // Get all fee rates with pagination and filters
    getAllFeeRates: async (params = {}) => {
        try {
            const response = await apiClient.get('/fees', { params });
            return response.data.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to fetch fee rates' };
        }
    },    // Get current active parking fee for a specific vehicle type
    getParkingFee: async (vehicleType) => {
        try {
            const response = await apiClient.get('/fees', {
                params: {
                    feeType: 'PARKING',
                    vehicleType: vehicleType,
                    isActive: true,
                    limit: 1
                }
            });
            const data = response.data?.data;
            if (data?.feeRates && data.feeRates.length > 0) {
                return data.feeRates[0]; // Return the first matching active fee
            }
            return null;
        } catch (error) {
            console.error('Error fetching parking fee:', error);
            return null;
        }
    },
    // Get specific fee rate by ID
    getFeeRateById: async (id) => {
        try {
            const response = await apiClient.get(`/fees/${id}`);
            return response.data.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to fetch fee rate details' };
        }
    },
    // Create new fee rate
    createFeeRate: async (data) => {
        try {
            const response = await apiClient.post('/fees', data);
            return response.data.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to create fee rate' };
        }
    },
    // Update existing fee rate
    updateFeeRate: async (id, data) => {
        try {
            const response = await apiClient.put(`/fees/${id}`, data);
            return response.data.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to update fee rate' };
        }
    },
    // Delete fee rate
    deleteFeeRate: async (id) => {
        try {
            const response = await apiClient.delete(`/fees/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to delete fee rate' };
        }
    }
};
