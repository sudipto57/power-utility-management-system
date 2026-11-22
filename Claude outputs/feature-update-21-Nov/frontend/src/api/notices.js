import { apiRequest } from './client';

// Outage and maintenance notices (admin)
export const getNotices = () => apiRequest('/notices');
export const getNoticeAreas = () => apiRequest('/notices/areas');
export const createNotice = (data) => apiRequest('/notices', { method: 'POST', body: data });
export const updateNotice = (id, data) => apiRequest(`/notices/${id}`, { method: 'PUT', body: data });
export const deleteNotice = (id) => apiRequest(`/notices/${id}`, { method: 'DELETE' });
