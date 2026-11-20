import { apiRequest } from './client';

export const getReadings = (params) => apiRequest('/readings', { params });
export const getLastReading = (connectionId) => apiRequest(`/connections/${connectionId}/last-reading`);
export const createReading = (data) => apiRequest('/readings', { method: 'POST', body: data });
export const getUnusualReadings = (params) => apiRequest('/readings/unusual', { params });
