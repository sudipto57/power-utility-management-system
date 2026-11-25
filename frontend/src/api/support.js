import { apiDownload, apiRequest } from './client';

// Public: the Support form on the first page (no login needed)
// data = { name, email, category, subject, message, attachment?: { name, type, data (base64) } }
export const sendSupportProblem = (data) => apiRequest('/support', { method: 'POST', body: data });
// The 4-digit code from the email (right code = the problem goes to the office)
export const verifySupportProblem = (id, code) => apiRequest(`/support/${id}/verify`, { method: 'POST', body: { code } });
export const resendSupportCode = (id) => apiRequest(`/support/${id}/resend`, { method: 'POST' });

// Admin: the Support page
export const getSupportTickets = (params) => apiRequest('/support', { params });
export const getSupportTicket = (id) => apiRequest(`/support/${id}`);
export const updateSupportTicket = (id, data) => apiRequest(`/support/${id}`, { method: 'PUT', body: data });
export const downloadSupportFile = (id) => apiDownload(`/support/${id}/attachment`);
