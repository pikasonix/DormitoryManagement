import api from './api';

export const paymentService = {
  getAll: () => api.get('/api/payments'),
  getById: (id) => api.get(`/api/payments/${id}`),
  create: (data) => api.post('/api/payments', data),
  update: (id, data) => api.put(`/api/payments/${id}`, data),
  delete: (id) => api.delete(`/api/payments/${id}`)
}; 