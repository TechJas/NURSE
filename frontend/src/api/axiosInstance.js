import axios from 'axios';

// Base Axios instance — all API calls use this
// Empty baseURL = use Vite proxy (defined in vite.config.js)
// This ensures Authorization headers are always correctly forwarded
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://nurse-wvfe.onrender.com',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT token automatically
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 globally (auto logout)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
