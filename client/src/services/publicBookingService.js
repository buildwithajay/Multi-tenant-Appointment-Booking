import axios from 'axios';

const publicApi = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
});

export const publicBookingService = {
    getCatalog: (slug) => publicApi.get(`/public/tenant/${slug}/catalog`),
    getAvailability: async (slug, params) => {
        try {
            return await publicApi.get(`/public/tenant/${slug}/availability`, { params });
        } catch (err) {
            if (err.response?.status !== 404) throw err;
            return publicApi.get(`/public/availability/${slug}`, { params });
        }
    },
    createBooking: (slug, data) => publicApi.post(`/public/tenant/${slug}/bookings`, data),
};
