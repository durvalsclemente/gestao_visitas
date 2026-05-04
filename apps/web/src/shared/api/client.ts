import axios from 'axios';
import { redirectToCentralAuthorize } from '../auth/oauth';
import { clearToken, getStoredToken } from '../auth/token';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 401) {
      clearToken();
      void redirectToCentralAuthorize();
    }
    return Promise.reject(error);
  },
);
