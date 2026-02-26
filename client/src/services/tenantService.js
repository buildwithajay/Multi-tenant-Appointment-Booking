import api from './api';

export const tenantService = {
    getAll: () => api.get('/tenant'),
    getById: (id) => api.get(`/tenant/${id}`),
    create: (data) => api.post('/tenant', data),
    confirmStripePayment: (tenantId, sessionId) =>
        api.get('/tenant/stripe/confirm', { params: { tenantId, session_id: sessionId } }),
    update: (id, data) => api.put(`/tenant/${id}`, data),
    delete: (id) => api.delete(`/tenant/${id}`),
};
