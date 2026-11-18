import { apiRequest } from './client';

// role = 'admin' or 'customer' (from the switch bar on the login page)
export const login = (loginName, password, role) =>
  apiRequest('/auth/login', { method: 'POST', body: { login: loginName, password, role } });

// Customers only: creates the login + customer profile and emails a 6-digit code
export const signup = (data) => apiRequest('/auth/signup', { method: 'POST', body: data });

// The 6-digit code from the sign up email (right code = logged in)
export const confirmEmail = (loginName, code) =>
  apiRequest('/auth/confirm-email', { method: 'POST', body: { login: loginName, code } });
export const resendCode = (loginName) => apiRequest('/auth/resend-code', { method: 'POST', body: { login: loginName } });

// Forgot password: login = email, username or phone number. The code goes to the account's email.
export const forgotPassword = (loginName) =>
  apiRequest('/auth/forgot-password', { method: 'POST', body: { login: loginName } });
export const resetPassword = (loginName, code, password) =>
  apiRequest('/auth/reset-password', { method: 'POST', body: { login: loginName, code, password } });

export const getMe = () => apiRequest('/auth/me');
