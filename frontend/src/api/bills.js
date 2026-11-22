import { apiRequest } from './client';

export const getBills = (params) => apiRequest('/bills', { params });
export const getBill = (id) => apiRequest(`/bills/${id}`);
export const previewBill = (readingId) => apiRequest('/bills/preview', { method: 'POST', body: { reading_id: readingId } });
export const generateBill = (data) => apiRequest('/bills/generate', { method: 'POST', body: data });
export const markBillPaid = (id, data = {}) => apiRequest(`/bills/${id}/mark-paid`, { method: 'POST', body: data });
export const markBillUnpaid = (id) => apiRequest(`/bills/${id}/mark-unpaid`, { method: 'POST', body: {} });
export const waiveLateFee = (id, reason) => apiRequest(`/bills/${id}/waive-late-fee`, { method: 'POST', body: { reason } });
export const confirmPayment = (billId, paymentId) =>
  apiRequest(`/bills/${billId}/payments/${paymentId}/confirm`, { method: 'POST', body: {} });
export const rejectPayment = (billId, paymentId, note) =>
  apiRequest(`/bills/${billId}/payments/${paymentId}/reject`, { method: 'POST', body: { note } });
export const sendDueReminders = () => apiRequest('/bills/send-reminders', { method: 'POST', body: {} });
