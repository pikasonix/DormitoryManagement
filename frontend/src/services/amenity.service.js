import api from './api';

export const facilityService = {
  getAll: () => api.get('/api/facilities'),
  getById: (id) => api.get(`/api/facilities/${id}`),
  create: (data) => {
    const formData = new FormData();
    for (const key in data) {
      if (key === 'image' && data[key]) {
        formData.append('image', data[key]);
      } else {
        formData.append(key, data[key]);
      }
    }
    return api.post('/api/facilities', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  update: (id, data) => {
    const formData = new FormData();
    for (const key in data) {
      if (key === 'image' && data[key]) {
        formData.append('image', data[key]);
      } else {
        formData.append(key, data[key]);
      }
    }
    return api.put(`/api/facilities/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  delete: (id) => api.delete(`/api/facilities/${id}`)
}; 