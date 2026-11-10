import { apiRequest } from './client';

export const getRequests = (params) => apiRequest('/requests', { params });
export const getRequest = (id) => apiRequest(`/requests/${id}`);
export const getStaff = () => apiRequest('/requests/staff');
export const updateRequestStatus = (id, data) => apiRequest(`/requests/${id}/status`, { method: 'PATCH', body: data });
export const addRequestComment = (id, comment) => apiRequest(`/requests/${id}/comments`, { method: 'POST', body: { comment } });
