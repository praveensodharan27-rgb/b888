import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  // Prevent infinite spinners when backend/network is down.
  // Individual requests can override this if needed.
  timeout: 20000,
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
    // Check if this is an expected 401 error (no token, checking favorites/auth/profile)
    // Suppress console logging for these expected errors
    const requestUrl = error.config?.url || '';
    const token = Cookies.get('token');
    const isAuthMeRequest = requestUrl.includes('/auth/me');
    const isFavoriteRequest = requestUrl.includes('/favorite');
    const isProfileRequest = requestUrl.includes('/user/profile');
    const isFollowRequest = requestUrl.includes('/follow/check');
    const isExpected401 = error.response?.status === 401 && (
      (!token && (isAuthMeRequest || isFavoriteRequest || isFollowRequest)) || 
      isProfileRequest ||
      isFollowRequest
    );
    
    // Mark expected 401s early to suppress console logging
    if (isExpected401) {
      (error as any).isExpected = true;
      (error as any).suppressConsoleError = true;
    }
    
    // Log 400 Bad Request errors with details
    if (error.response?.status === 400) {
      const requestUrl = error.config?.url || 'unknown';
      const method = error.config?.method?.toUpperCase() || 'unknown';
      const errorData = error.response?.data || {};
      
      // Safely parse request data (might be FormData for file uploads)
      let requestData = null;
      try {
        if (error.config?.data && typeof error.config.data === 'string') {
          requestData = JSON.parse(error.config.data);
        } else if (error.config?.data instanceof FormData) {
          requestData = 'FormData (file upload)';
        } else {
          requestData = error.config?.data || null;
        }
      } catch (e) {
        requestData = 'Unable to parse request data';
      }
      
      // Build a more detailed error message
      const errorMessage = errorData.message || errorData.error || 'Bad Request';
      const validationErrors = errorData.errors || [];
      const errorDetails = validationErrors.length > 0 
        ? validationErrors.map((err: any) => err.msg || err.message || JSON.stringify(err)).join(', ')
        : 'No specific error details provided';
      
      console.error('❌ API 400 Bad Request Error:', {
        url: requestUrl,
        method: method,
        status: 400,
        message: errorMessage,
        errorDetails: errorDetails,
        errors: validationErrors,
        errorData: errorData, // Include full error data for debugging
        requestData: requestData,
      });
      
      // Also log a user-friendly message
      console.error(`❌ Request to ${method} ${requestUrl} failed: ${errorMessage}. ${errorDetails}`);
      
      // Don't throw here - let the calling code handle it
      // This ensures components can show user-friendly error messages
    }
    
    // Only redirect on actual 401 Unauthorized responses (not network errors)
    if (error.response?.status === 401) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      
      // Don't redirect if:
      // 1. No token exists (user wasn't logged in)
      // 2. Already on login/register page
      // 3. Request was to /auth/me (this is expected to fail if not authenticated)
      // 4. Request was to /ads/*/favorite (favorite API should be auth-guarded only, no redirect)
      // 5. Request was to /ads/* (ad details page - don't redirect on 401/404)
      const isAdDetailsRequest = requestUrl.match(/\/ads\/[^/]+$/); // Matches /ads/:id but not /ads/:id/favorite
      const isAdDetailsPage = currentPath.match(/^\/ads\/[^/]+$/); // Current page is ad details
      
      // For expected 401s (no token, checking favorites/auth), silently reject
      // These are handled gracefully by the calling code and don't need console logging
      if (isExpected401) {
        // Mark error as expected and silently reject
        (error as any).isExpected = true;
        return Promise.reject(error);
      }
      
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
          // Mark error as expected for profile requests (user will be redirected)
          if (isProfileRequest) {
            (error as any).isExpected = true;
          }
          window.location.href = '/login';
        }
      } else if (isAuthMeRequest || isFavoriteRequest) {
        // For /auth/me and /favorite requests, just clear token silently without redirect
        // This prevents logout loops and allows unauthenticated users to view ads
        if (token && isAuthMeRequest) {
          Cookies.remove('token');
        }
      } else if (isProfileRequest) {
        // For profile requests, mark as expected if no token (user will be redirected by useEffect)
        // or if token exists but is invalid (will be redirected)
        (error as any).isExpected = true;
      }
    }
    // Don't redirect on network errors or other status codes (including 404)
    return Promise.reject(error);
  }
);

export default api;

