import { apiRequest } from './client';

// Planned power cuts. getCurrentOutages works for admins and customers (news strip).
export const getCurrentOutages = () => apiRequest('/outages/current');
export const getOutages = () => apiRequest('/outages');
export const createOutage = (data) => apiRequest('/outages', { method: 'POST', body: data });
export const updateOutage = (id, data) => apiRequest(`/outages/${id}`, { method: 'PUT', body: data });
export const deleteOutage = (id) => apiRequest(`/outages/${id}`, { method: 'DELETE' });
