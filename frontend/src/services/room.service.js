import apiClient from '../api/axios';
import { toast } from 'react-hot-toast';

// Lấy danh sách phòng (có filter, pagination)
const getAllRooms = async (params = {}) => {
  // params: buildingId, status, type, hasVacancy, page, limit, sortBy, sortOrder
  try {
    console.log('[Room Service] Fetching rooms with params:', params);
    const response = await apiClient.get('/rooms', { params });
    console.log('[Room Service] Response:', response.data);
    // API trả về { status: 'success', results: number, total: number, data: Room[] }
    return response.data; // Trả về cả object response
  } catch (error) {
    console.error('[Room Service] Error fetching rooms:', error);
    throw error;
  }
};

// Lấy chi tiết phòng bằng ID
const getRoomById = async (id) => {
  if (!id) throw new Error('Room ID is required');
  try {
    console.log(`[Room Service] Fetching room by ID: ${id}`);
    const response = await apiClient.get(`/rooms/${id}`);
    console.log('[Room Service] Response:', response.data);
    // API trả về { status: 'success', data: Room }
    return response.data.data; // Trả về chỉ object Room
  } catch (error) {
    console.error(`[Room Service] Error fetching room ${id}:`, error);
    if (error.response?.status === 404) {
      toast.error('Không tìm thấy phòng này.');
    }
    throw error;
  }
};

// Tạo phòng mới
const createRoom = async (roomData) => {
  // roomData: { buildingId, number, type, capacity, floor, price, description?, amenities?, imageIds? }
  // amenities: [{ amenityId, quantity?, notes? }]
  // imageIds: [number]
  try {
    console.log('[Room Service] Creating room:', roomData);
    const response = await apiClient.post('/rooms', roomData);
    console.log('[Room Service] Response:', response.data);
    toast.success('Tạo phòng thành công!');
    // API trả về { status: 'success', data: Room }
    return response.data.data;
  } catch (error) {
    console.error('[Room Service] Error creating room:', error);
    throw error;
  }
};

// Cập nhật phòng
const updateRoom = async (id, updateData) => {
  // updateData: { number?, type?, capacity?, floor?, status?, price?, description?, amenities?, imageIds? }
  if (!id) throw new Error('Room ID is required for update');
  try {
    console.log(`[Room Service] Updating room ${id}:`, updateData);
    const response = await apiClient.put(`/rooms/${id}`, updateData);
    console.log('[Room Service] Response:', response.data);
    toast.success('Cập nhật phòng thành công!');
    // API trả về { status: 'success', data: Room }
    return response.data.data;
  } catch (error) {
    console.error(`[Room Service] Error updating room ${id}:`, error);
    throw error;
  }
};

// Xóa phòng
const deleteRoom = async (id) => {
  if (!id) throw new Error('Room ID is required for delete');
  try {
    console.log(`[Room Service] Deleting room ${id}`);
    // API trả về 200 OK với message hoặc 204 No Content
    await apiClient.delete(`/rooms/${id}`);
    toast.success('Xóa phòng thành công!');
    return true;
  } catch (error) {
    console.error(`[Room Service] Error deleting room ${id}:`, error);
    // Xử lý lỗi cụ thể (vd: không xóa được do còn sinh viên?)
    if (error.response?.status === 400 || error.response?.status === 409) {
      toast.error(error.response?.data?.message || 'Không thể xóa phòng.');
    }
    throw error;
  }
};

export const roomService = {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
};