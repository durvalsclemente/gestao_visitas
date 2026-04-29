import axios from 'axios';
import { clearToken, getStoredToken } from '../auth/token';

const CENTRAL_URL = import.meta.env.VITE_CENTRAL_URL ?? '';

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
      if (CENTRAL_URL) {
        const back = encodeURIComponent(window.location.href);
        window.location.replace(`${CENTRAL_URL}/login?redirect=${back}`);
      }
    }
    return Promise.reject(error);
  },
);
