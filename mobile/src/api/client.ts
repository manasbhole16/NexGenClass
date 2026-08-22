import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../constants/config';
import { storageService } from '../services/storageService';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request Interceptor: Attach JWT Bearer token from secure storage
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await storageService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Global 401 handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response && error.response.status === 401) {
      // Auto clear credentials on session expiration
      await storageService.clearAuth();
    }
    return Promise.reject(error);
  }
);
