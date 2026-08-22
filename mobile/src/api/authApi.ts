import { apiClient } from './client';
import { AuthResponse } from '../types';

export const authApi = {
  login: async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
    const res = await apiClient.post('/api/auth/login', credentials);
    return res.data;
  },

  register: async (userData: { fullname: string; email: string; password: string; role: 'student' | 'teacher' }): Promise<AuthResponse> => {
    const res = await apiClient.post('/api/auth/register', userData);
    return res.data;
  },

  getProfile: async (): Promise<any> => {
    const res = await apiClient.get('/api/auth/profile');
    return res.data;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.get('/api/auth/logout');
    } catch {
      // Ignore network errors on logout
    }
  },
};
