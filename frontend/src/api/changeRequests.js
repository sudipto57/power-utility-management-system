import { apiRequest } from './client';

// Admin: customers' requests to change their email, phone, customer type or connection type
export const getChangeRequests = (params) => apiRequest('/change-requests', { params });
export const approveChangeRequest = (id, note) => apiRequest(`/change-requests/${id}/approve`, { method: 'POST', body: { note } });
export const rejectChangeRequest = (id, note) => apiRequest(`/change-requests/${id}/reject`, { method: 'POST', body: { note } });
