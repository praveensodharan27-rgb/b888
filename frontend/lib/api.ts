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
      const requestUrl = error.config?.url || '';
      
      // Don't redirect if:
      // 1. No token exists (user wasn't logged in)
      // 2. Already on login/register page
      // 3. Request was to /auth/me (this is expected to fail if not authenticated)
      // 4. Request was to /ads/*/favorite (favorite API should be auth-guarded only, no redirect)
      // 5. Request was to /ads/* (ad details page - don't redirect on 401/404)
      const isAuthMeRequest = requestUrl.includes('/auth/me');
      const isFavoriteRequest = requestUrl.includes('/favorite');
      const isAdDetailsRequest = requestUrl.match(/\/ads\/[^/]+$/); // Matches /ads/:id but not /ads/:id/favorite
      const isAdDetailsPage = currentPath.match(/^\/ads\/[^/]+$/); // Current page is ad details
      
      // CRITICAL: Never redirect from ad details page
      // This page must be stable and ID-based - no automatic navigation
      if (isAdDetailsPage || isAdDetailsRequest) {
        console.log('🛡️ Ad Details Page: Blocking redirect on 401 error');
        // Just clear token if exists, but don't redirect
        if (token && isAuthMeRequest) {
          Cookies.remove('token');
        }
        // Return rejected promise but don't redirect
        return Promise.reject(error);
      }
      
      if (token && typeof window !== 'undefined' && !isAuthMeRequest && !isFavoriteRequest) {
        // Only redirect if we're not already on login/register page
        if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
          Cookies.remove('token');
          window.location.href = '/login';
        }
      } else if (isAuthMeRequest || isFavoriteRequest) {
        // For /auth/me and /favorite requests, just clear token silently without redirect
        // This prevents logout loops and allows unauthenticated users to view ads
        if (token && isAuthMeRequest) {
          Cookies.remove('token');
        }
      }
    }
    // Don't redirect on network errors or other status codes (including 404)
    return Promise.reject(error);
  }
);

export default api;

