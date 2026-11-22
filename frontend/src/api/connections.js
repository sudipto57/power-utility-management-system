import { apiRequest } from './client';

export const getConnections = (params) => apiRequest('/connections', { params });
export const getConnection = (id) => apiRequest(`/connections/${id}`);
export const createConnection = (data) => apiRequest('/connections', { method: 'POST', body: data });
export const updateConnection = (id, data) => apiRequest(`/connections/${id}`, { method: 'PUT', body: data });
export const replaceMeter = (id, data) => apiRequest(`/connections/${id}/replace-meter`, { method: 'POST', body: data });
