import { apiRequest } from './client';

// Public bill estimator (no login needed): { customer_type, connection_type, units }
export const estimateBill = (params) => apiRequest('/tariffs/estimate', { params });
