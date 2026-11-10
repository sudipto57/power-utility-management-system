import { apiRequest } from './client';

export const login = (loginName, password) => apiRequest('/auth/login', { method: 'POST', body: { login: loginName, password } });

export const getMe = () => apiRequest('/auth/me');
