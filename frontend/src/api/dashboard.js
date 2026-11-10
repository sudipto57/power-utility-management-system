import { apiRequest } from './client';

export const getDashboardStats = () => apiRequest('/dashboard/stats');
export const getRecentActivity = () => apiRequest('/dashboard/recent-activity');
