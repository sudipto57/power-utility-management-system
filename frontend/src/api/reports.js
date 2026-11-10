import { apiRequest } from './client';

export const getCustomerReport = () => apiRequest('/reports/customers');
export const getBillReport = () => apiRequest('/reports/bills');
export const getPaymentReport = () => apiRequest('/reports/payments');
