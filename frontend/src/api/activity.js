import { apiRequest } from './client';

// Activity log (admin): who changed what, and when
export const getActivity = (params) => apiRequest('/activity', { params });
