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
  } else {
    // Log missing token for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ No token found in cookies for request:', config.url);
    }
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log 400 Bad Request errors with details
    if (error.response?.status === 400) {
      const requestUrl = error.config?.url || 'unknown';
      const method = error.config?.method?.toUpperCase() || 'unknown';
      const errorData = error.response?.data || {};
      
      // Check if errorData has meaningful content
      // An object is "meaningful" if it has message, error, errors, or other useful properties
      const hasKeys = errorData && typeof errorData === 'object' && Object.keys(errorData).length > 0;
      const hasMessage = hasKeys && (errorData.message || errorData.error);
      const validationErrors = hasKeys ? (errorData.errors || []) : [];
      const hasValidationErrors = Array.isArray(validationErrors) && validationErrors.length > 0;
      const hasErrorData = hasMessage || hasValidationErrors || (hasKeys && errorData.status);
      
      const errorMessage = hasMessage 
        ? (errorData.message || errorData.error || 'Bad Request')
        : 'Bad Request (empty response body)';
      const errorDetails = hasValidationErrors
        ? validationErrors.map((err: any) => err.msg || err.message || JSON.stringify(err)).join(', ')
        : hasMessage
          ? 'No specific error details provided'
          : 'Empty error response body';
      
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
      
      // Check if this is a geocoding API key configuration error
      // These are known backend configuration issues that shouldn't spam the console
      const isGeocodingApiKeyError = requestUrl.includes('/geocoding/') && 
        (errorMessage.includes('referrer restrictions') || 
         errorMessage.includes('referer restrictions') ||
         errorMessage.includes('API key'));
      
      // For empty error responses (no message, no validation errors, no status), log minimal info
      if (!hasErrorData) {
        // Empty 400 response - likely a backend issue or expected validation failure
        // Only log in development to avoid console spam
        if (process.env.NODE_ENV === 'development') {
          console.warn(`⚠️ API 400 Bad Request (empty response): ${method} ${requestUrl}`);
        }
        // Don't log detailed info for empty responses
        return Promise.reject(error);
      }
      
      // For geocoding API key errors, log as warning (not error) and only in development
      // These are backend configuration issues, not user-facing errors
      if (isGeocodingApiKeyError) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Geocoding API Key Configuration Issue:', {
            url: requestUrl,
            message: errorMessage,
            note: 'Backend requires server-side API key with IP restrictions. Frontend will use client-side geocoding as fallback.'
          });
        }
        // Don't log full error details for API key config issues
        return Promise.reject(error);
      }
      
      // Build log object with only meaningful data (only when we have error data)
      // At this point, we know hasErrorData is true, so we have meaningful content
      const logData: any = {
        url: requestUrl,
        method: method,
        status: 400,
        message: errorMessage,
        errorDetails: errorDetails,
      };
      
      // Only include errorData if it has meaningful properties (not just empty object)
      // Check for actual content, not just existence
      if (hasErrorData && (hasMessage || hasValidationErrors || errorData.status)) {
        // Only include meaningful properties, not empty objects
        const meaningfulData: any = {};
        if (errorData.message) meaningfulData.message = errorData.message;
        if (errorData.error) meaningfulData.error = errorData.error;
        if (errorData.status) meaningfulData.status = errorData.status;
        if (errorData.details) meaningfulData.details = errorData.details;
        // Only add errorData if we have at least one meaningful property
        if (Object.keys(meaningfulData).length > 0) {
          logData.errorData = meaningfulData;
        }
      }
      
      // Include validation errors if present
      if (hasValidationErrors) {
        logData.errors = validationErrors;
      }
      
      // Include request data if available (helpful for debugging)
      if (requestData) {
        // For FormData, just indicate it's present without logging the full content
        if (requestData === 'FormData (file upload)') {
          logData.requestData = 'FormData (file upload)';
        } else {
          // For other data, include it but limit size to avoid huge logs
          const requestDataStr = JSON.stringify(requestData);
          logData.requestData = requestDataStr.length > 500 
            ? requestDataStr.substring(0, 500) + '... (truncated)'
            : requestData;
        }
      }
      
      console.error('❌ API 400 Bad Request Error:', logData);
      
      // Log validation errors more clearly if present
      if (validationErrors && validationErrors.length > 0) {
        console.error('📋 Validation Errors:', validationErrors.map((err: any) => ({
          field: err.param || err.path || 'unknown',
          message: err.msg || err.message || JSON.stringify(err),
          value: err.value
        })));
      }
      
      // Also log a user-friendly message
      console.error(`❌ Request to ${method} ${requestUrl} failed: ${errorMessage}. ${errorDetails}`);
      
      // Don't throw here - let the calling code handle it
      // This ensures components can show user-friendly error messages
    }
    
    // Only redirect on actual 401 Unauthorized responses (not network errors)
    if (error.response?.status === 401) {
      const token = Cookies.get('token');
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const requestUrl = error.config?.url || '';
      const errorMessage = error.response?.data?.message || 'Unauthorized';
      
      // Don't log 401 errors for endpoints that are expected to fail when not authenticated
      // These endpoints handle 401 gracefully in their hooks
      // Extract base path for more accurate matching
      const urlPath = requestUrl.split('?')[0]; // Get path without query params
      const urlQuery = requestUrl.split('?')[1] || ''; // Get query string
      
      const isExpected401Endpoint = 
        requestUrl.includes('/favorite') || // Favorite endpoints return false when not authenticated
        requestUrl.includes('/auth/me') || // Auth check endpoint
        requestUrl.includes('/user/profile') || // User profile (location persistence hook)
        requestUrl.includes('/user/notifications') || // Notifications (only for authenticated)
        requestUrl.includes('/user/free-ads-status') || // Free ads status (only for authenticated)
        requestUrl.includes('/business-package/status') || // Business package status (only for authenticated)
        requestUrl.includes('/ads/check-limit') || // Ad limit check (only for authenticated)
        requestUrl.includes('/premium/offers') || // Premium offers (might need auth)
        requestUrl.includes('/chat/') || // Chat endpoints (only for authenticated)
        requestUrl.includes('/geocoding/') || // Geocoding endpoints (might require auth)
        (urlPath === '/ads' && urlQuery.includes('userId=')) || // Seller's ads endpoint - exact path match with userId in query
        (urlPath.includes('/ads') && urlQuery.includes('userId=')); // Fallback: any /ads path with userId= in query
      
      if (!isExpected401Endpoint) {
        // Log 401 errors with details for debugging (only for unexpected endpoints)
        // This helps identify which endpoint needs to be added to the expected list
        // Extract the endpoint path for better identification
        const endpointPath = requestUrl.split('?')[0]; // Remove query params for cleaner logging
        const errorData = error.response?.data || {};
        const hasErrorData = errorData && Object.keys(errorData).length > 0;
        
        console.error('❌ API 401 Unauthorized Error (Unexpected):', {
          url: requestUrl,
          endpoint: endpointPath,
          method: error.config?.method?.toUpperCase() || 'unknown',
          hasToken: !!token,
          tokenLength: token?.length || 0,
          errorMessage: errorMessage || (hasErrorData ? 'Unauthorized' : 'Empty response body'),
          currentPath: currentPath,
          errorData: hasErrorData ? errorData : '(empty response body)',
          errorResponseStatus: error.response?.status,
          note: 'If this endpoint is expected to return 401 when not authenticated, add it to isExpected401Endpoint list',
          fullUrl: error.config?.url,
          baseURL: error.config?.baseURL
        });
      }
      // Silently handle expected 401 errors (don't log, but still process redirect logic)
      // These endpoints are designed to work with or without authentication
      
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
      const isPostAdPage = currentPath.includes('/post-ad');
      
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
      
      // For post-ad page, show a more helpful error message
      if (isPostAdPage && token) {
        console.error('⚠️ Token exists but authentication failed. Token may be expired or invalid.');
        // Don't auto-redirect from post-ad page, let the component handle it
        return Promise.reject(error);
      }
      
      if (token && typeof window !== 'undefined' && !isAuthMeRequest && !isFavoriteRequest && !isPostAdPage) {
        // Only redirect if we're not already on login/register page
        if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
          console.log('🔄 Redirecting to login due to 401 error');
          Cookies.remove('token');
          window.location.href = '/login';
        }
      } else if (isAuthMeRequest || isFavoriteRequest) {
        // For /auth/me and /favorite requests, just clear token silently without redirect
        // This prevents logout loops and allows unauthenticated users to view ads
        if (token && isAuthMeRequest) {
          Cookies.remove('token');
        }
      } else if (!token && isPostAdPage) {
        // No token on post-ad page - redirect to login
        console.log('🔄 No token found, redirecting to login');
        if (typeof window !== 'undefined' && !currentPath.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    
    // Handle 404 Not Found errors - suppress logging for expected 404s
    if (error.response?.status === 404) {
      const requestUrl = error.config?.url || '';
      
      // 404 is expected for neighborhoods endpoint if they don't exist for a state
      const isExpected404 = requestUrl.includes('/locations/neighborhoods');
      
      if (isExpected404) {
        // Mark error as expected to prevent logging
        // The error will still be rejected so components can handle it, but it won't be logged
        error.isExpected404 = true;
        // Don't log expected 404s - neighborhoods may not exist for all states
        return Promise.reject(error);
      }
      
      // For other 404s, log only in development
      if (process.env.NODE_ENV === 'development') {
        console.warn(`⚠️ API 404 Not Found: ${error.config?.method?.toUpperCase() || 'GET'} ${requestUrl}`);
      }
    }
    
    // Don't redirect on network errors or other status codes (including 404)
    return Promise.reject(error);
  }
);

export default api;

