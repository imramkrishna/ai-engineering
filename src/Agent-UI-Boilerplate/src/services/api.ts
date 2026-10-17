import axios, { type AxiosInstance } from 'axios';
import { API_CONFIG } from '../config/endpoints';

/**
 * Simple Centralized API Client
 * -----------------------------
 * Uses VITE_API_BASE_URL, attaches Bearer auth token via request interceptor,
 * and handles global errors via response interceptor.
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: { 'Content-Type': 'application/json' },
});

// 1. Request Interceptor: Attach Auth Token if present
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2. Response Interceptor: Normalize errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Server unreachable — using local fallback';
    return Promise.reject(new Error(message));
  },
);

export { apiClient };
export default apiClient;
