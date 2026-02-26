import api from './api';

export const serviceService = {
    getAll: () => api.get('/service'),
    getById: (id) => api.get(`/service/${id}`),
    create: (data) => api.post('/service', data),
    update: (id, data) => api.put(`/service/${id}`, data),
    delete: (id) => api.delete(`/service/${id}`),
};
