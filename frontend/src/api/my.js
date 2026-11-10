import { apiRequest } from './client';

// Customer portal: the backend only ever returns the logged-in customer's own data
export const getMyProfile = () => apiRequest('/my/profile');
export const getMyDashboard = () => apiRequest('/my/dashboard');
export const getMyBills = (params) => apiRequest('/my/bills', { params });
export const getMyBill = (id) => apiRequest(`/my/bills/${id}`);
export const getMyRequests = () => apiRequest('/my/requests');
export const getMyRequest = (id) => apiRequest(`/my/requests/${id}`);
export const createMyRequest = (data) => apiRequest('/my/requests', { method: 'POST', body: data });
