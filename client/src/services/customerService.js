import api from './api';

export const customerService = {
    getAll: () => api.get('/customer'),
    getById: (id) => api.get(`/customer/${id}`),
    create: (data) => api.post('/customer', data),
    update: (id, data) => api.put(`/customer/${id}`, data),
    delete: (id) => api.delete(`/customer/${id}`),
};
