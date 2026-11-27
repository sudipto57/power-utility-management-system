import { apiRequest } from './client';

export const getCustomers = (params) => apiRequest('/customers', { params });
export const getCustomer = (id) => apiRequest(`/customers/${id}`);
export const createCustomer = (data) => apiRequest('/customers', { method: 'POST', body: data });
export const updateCustomer = (id, data) => apiRequest(`/customers/${id}`, { method: 'PUT', body: data });
export const deleteCustomer = (id) => apiRequest(`/customers/${id}`, { method: 'DELETE' });
// For ever, everywhere (database + the SQL files). confirm = the customer number typed by the admin
export const deleteCustomerForever = (id, confirm) =>
  apiRequest(`/customers/${id}/permanent`, { method: 'DELETE', body: { confirm } });
export const getCustomerStatement = (id) => apiRequest(`/customers/${id}/statement`);
// Profile picture (photo = a data URL made by components/common/ProfilePhoto.jsx)
export const setCustomerPhoto = (id, photo) => apiRequest(`/customers/${id}/photo`, { method: 'PUT', body: { photo } });
export const deleteCustomerPhoto = (id) => apiRequest(`/customers/${id}/photo`, { method: 'DELETE' });

// Website sign-ups copied into the private file database/private/website_customers.sql
export const getSqlFileStatus = () => apiRequest('/customers/sql-file');
export const saveSqlFileNow = () => apiRequest('/customers/sql-file', { method: 'POST' });
