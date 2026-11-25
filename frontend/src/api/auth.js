import { apiRequest } from './client';

// role = 'admin' or 'customer' (from the switch bar on the login page)
// Admins get { token, user }. Customers get { needs_code: true, email, expires_at }: a 4-digit code is emailed.
// resend = true: a customer asks for a NEW login code ("Send a new code")
export const login = (loginName, password, role, resend = false) =>
  apiRequest('/auth/login', { method: 'POST', body: { login: loginName, password, role, resend } });

// Customers only: creates the login + customer profile and emails a 4-digit code
export const signup = (data) => apiRequest('/auth/signup', { method: 'POST', body: data });

// The 4-digit code from the sign up email (right code = logged in)
export const confirmEmail = (loginName, code) =>
  apiRequest('/auth/confirm-email', { method: 'POST', body: { login: loginName, code } });
export const resendCode = (loginName) => apiRequest('/auth/resend-code', { method: 'POST', body: { login: loginName } });

// Forgot password: login = email, username or phone number. The code goes to the account's email.
export const forgotPassword = (loginName) =>
  apiRequest('/auth/forgot-password', { method: 'POST', body: { login: loginName } });
export const resetPassword = (loginName, code, password) =>
  apiRequest('/auth/reset-password', { method: 'POST', body: { login: loginName, code, password } });

// Step 2 of a customer login: the 4-digit code from the email (right code = logged in)
export const verifyLogin = (loginName, code) =>
  apiRequest('/auth/verify-login', { method: 'POST', body: { login: loginName, code } });

export const getMe = () => apiRequest('/auth/me');

// Every country with its calling code and phone number length (for the phone number box)
export const getCountries = () => apiRequest('/auth/countries');
