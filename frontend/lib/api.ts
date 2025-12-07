import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect on actual 401 Unauthorized responses (not network errors)
    if (error.response?.status === 401) {
      const token = Cookies.get('token');
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      
      // Don't redirect if:
      // 1. No token exists (user wasn't logged in)
      // 2. Already on login/register page
      // 3. Request was to /auth/me (this is expected to fail if not authenticated)
      const isAuthMeRequest = error.config?.url?.includes('/auth/me');
      
      if (token && typeof window !== 'undefined' && !isAuthMeRequest) {
        // Only redirect if we're not already on login/register page
        if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
          Cookies.remove('token');
          window.location.href = '/login';
        }
      } else if (isAuthMeRequest) {
        // For /auth/me requests, just clear token silently without redirect
        // This prevents logout loops
        if (token) {
          Cookies.remove('token');
        }
      }
    }
    // Don't redirect on network errors or other status codes
    return Promise.reject(error);
  }
);

export default api;

