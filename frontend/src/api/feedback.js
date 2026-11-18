import { apiRequest } from './client';

// Website feedback (no login needed): { rating: 1-5, topic, message, name, email }
export const sendFeedback = (data) => apiRequest('/feedback', { method: 'POST', body: data });
