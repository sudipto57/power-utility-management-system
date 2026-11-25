import { apiRequest } from './client';

export const getCustomers = (params) => apiRequest('/customers', { params });
export const getCustomer = (id) => apiRequest(`/customers/${id}`);
export const createCustomer = (data) => apiRequest('/customers', { method: 'POST', body: data });
export const updateCustomer = (id, data) => apiRequest(`/customers/${id}`, { method: 'PUT', body: data });
export const deleteCustomer = (id) => apiRequest(`/customers/${id}`, { method: 'DELETE' });
// For ever, everywhere (database + 04_sample_data.sql). confirm = the customer number typed by the admin
export const deleteCustomerForever = (id, confirm) =>
  apiRequest(`/customers/${id}/permanent`, { method: 'DELETE', body: { confirm } });
export const getCustomerStatement = (id) => apiRequest(`/customers/${id}/statement`);

// Website sign-ups copied into database/04_sample_data.sql
export const getSqlFileStatus = () => apiRequest('/customers/sql-file');
export const saveSqlFileNow = () => apiRequest('/customers/sql-file', { method: 'POST' });
