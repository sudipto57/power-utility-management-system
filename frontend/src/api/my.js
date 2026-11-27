import { apiRequest } from './client';

// Customer portal: the backend only ever returns the logged-in customer's own data
export const getMyProfile = () => apiRequest('/my/profile');
export const updateMyProfile = (data) => apiRequest('/my/profile', { method: 'PUT', body: data }); // name + address
export const setMyPhoto = (photo) => apiRequest('/my/photo', { method: 'PUT', body: { photo } }); // my profile picture
export const deleteMyPhoto = () => apiRequest('/my/photo', { method: 'DELETE' });
export const getMyChangeRequests = () => apiRequest('/my/change-requests');
export const createMyChangeRequest = (data) => apiRequest('/my/change-requests', { method: 'POST', body: data });
export const getMyDashboard = () => apiRequest('/my/dashboard');
export const getMyBills = (params) => apiRequest('/my/bills', { params });
export const getMyBill = (id) => apiRequest(`/my/bills/${id}`);
export const getMyStatement = () => apiRequest('/my/statement');
export const getMyRequests = () => apiRequest('/my/requests');
export const getMyRequest = (id) => apiRequest(`/my/requests/${id}`);
export const createMyRequest = (data) => apiRequest('/my/requests', { method: 'POST', body: data });
export const addMyRequestComment = (id, comment) =>
  apiRequest(`/my/requests/${id}/comments`, { method: 'POST', body: { comment } });

// Meter & Usage: own meter readings (Pending until staff verify them) and this month so far
export const getMyUsage = () => apiRequest('/my/usage');
export const sendMyReading = (data) => apiRequest('/my/readings', { method: 'POST', body: data });

// Pay now (demo): full balance by Mobile Banking or Card, waits until staff confirm it
export const payMyBill = (id, data) => apiRequest(`/my/bills/${id}/pay`, { method: 'POST', body: data });
export const getMyPayments = () => apiRequest('/my/payments');
export const getMyPayment = (id) => apiRequest(`/my/payments/${id}`);

// Inbox (the bell)
export const getMyNotifications = () => apiRequest('/my/notifications');
export const readMyNotification = (id) => apiRequest(`/my/notifications/${id}/read`, { method: 'POST', body: {} }); // id or "all"
