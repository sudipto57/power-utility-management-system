import { apiRequest } from './client';

export const getReadings = (params) => apiRequest('/readings', { params });
export const getLastReading = (connectionId) => apiRequest(`/connections/${connectionId}/last-reading`);
export const createReading = (data) => apiRequest('/readings', { method: 'POST', body: data });
export const verifyReading = (id) => apiRequest(`/readings/${id}/verify`, { method: 'POST', body: {} });
export const rejectReading = (id, note) => apiRequest(`/readings/${id}/reject`, { method: 'POST', body: { note } });
