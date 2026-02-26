import api from './api';

export const bookingService = {
    getAll: () => api.get('/booking'),
    getById: (id) => api.get(`/booking/${id}`),
    create: (data) => api.post('/booking', data),
    update: (id, data) => api.put(`/booking/${id}`, data),
    delete: (id) => api.delete(`/booking/${id}`),
};
