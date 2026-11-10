import { apiRequest } from './client';

export const getCustomers = (params) => apiRequest('/customers', { params });
export const getCustomer = (id) => apiRequest(`/customers/${id}`);
export const createCustomer = (data) => apiRequest('/customers', { method: 'POST', body: data });
export const updateCustomer = (id, data) => apiRequest(`/customers/${id}`, { method: 'PUT', body: data });
export const deleteCustomer = (id) => apiRequest(`/customers/${id}`, { method: 'DELETE' });
