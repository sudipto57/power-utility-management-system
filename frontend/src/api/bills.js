import { apiRequest } from './client';

export const getBills = (params) => apiRequest('/bills', { params });
export const getBill = (id) => apiRequest(`/bills/${id}`);
export const previewBill = (readingId) => apiRequest('/bills/preview', { method: 'POST', body: { reading_id: readingId } });
export const generateBill = (data) => apiRequest('/bills/generate', { method: 'POST', body: data });
export const markBillPaid = (id, data = {}) => apiRequest(`/bills/${id}/mark-paid`, { method: 'POST', body: data });
export const markBillUnpaid = (id) => apiRequest(`/bills/${id}/mark-unpaid`, { method: 'POST', body: {} });
