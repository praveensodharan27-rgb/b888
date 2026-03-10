import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import { getQueryClient } from './queryClient';

// Normalize API base URL - ensure /api path for correct routing
function normalizeApiBaseUrl(url: string | undefined): string {
  const base = url || 'http://148.230.67.118:5000/api';
  const trimmed = String(base).trim().replace(/\/+$/, '');
  if (trimmed.endsWith('/api')) return trimmed;
  return trimmed + '/api';
}
const API_BASE_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);

// Public endpoints that don't require authentication
const publicEndpoints = [
  '/auth/login',
  '/auth/register',
  '/auth/login-otp',
  '/auth/send-otp',
  '/auth/verify-otp',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/locations',
  '/categories',
  '/brands',
  '/filter-configurations',
  '/filters',
  '/filter-values',
  '/ads', // Public ads listing
  '/home-feed', // Public home feed
  '/sponsored-ads', // Public sponsored ads fetch
  '/interstitial-ads', // Public interstitial ads fetch
  '/free-posting-promos', // Public promo cards - location-based, no auth
  '/geocoding', // Geocoding (detect-location, geocode-address) - public, optional auth
  '/premium/offers', // Premium pricing - public, no auth required
  '/credits/config', // Credits config - public
  '/directory', // India business directory - public read
  '/business/public', // My Business public page by slug
];

// Auth-required subpaths under /ads (e.g. /ads/check-limit, /ads/:id/favorite)
const adsAuthRequiredPaths = ['/ads/check-limit', '/ads/check-status', '/ads/favorite', '/ads/specifications'];
const isAdsAuthRequiredPath = (url: string) => adsAuthRequiredPaths.some(p => url?.includes(p));

// Check if endpoint is public (admin routes always require auth)
// POST/PUT/DELETE to /ads require auth - only GET (listing, single ad) is public
const isPublicEndpoint = (url: string, method?: string): boolean => {
  if (url?.includes('/admin')) return false;
  // /user/* paths always require auth (e.g. /user/ads, /user/profile)
  if (url?.includes('/user/')) return false;
  const m = (method || '').toUpperCase();
  if ((m === 'POST' || m === 'PUT' || m === 'DELETE') && url?.includes('/ads')) return false;
  // POST /directory/businesses = create business, requires login
  if (m === 'POST' && url?.includes('/directory/businesses')) return false;
  // GET /directory/my-businesses = list user's businesses, requires login
  if (url?.includes('/directory/my-businesses')) return false;
  if (isAdsAuthRequiredPath(url || '')) return false;
  return publicEndpoints.some(endpoint => url.includes(endpoint));
};

// Create axios instance (60s default; slow backends or cold starts may need more)
const DEFAULT_TIMEOUT_MS = 60000;
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: DEFAULT_TIMEOUT_MS,
});

// Request interceptor - Add JWT token; allow FormData to set Content-Type (avatar upload)
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof FormData !== 'undefined' && config.data instanceof FormData && config.headers) {
      delete (config.headers as Record<string, unknown>)['Content-Type'];
    }
    if (!isPublicEndpoint(config.url || '', config.method)) {
      const token = typeof window !== 'undefined' ? Cookies.get('token') : null;
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      } else if (!token && typeof window !== 'undefined') {
        // Suppress "No token" log - expected for unauthenticated users on optional-auth endpoints
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle network errors (no response: backend down, CORS, timeout, etc.)
    if (!error.response) {
      if (typeof window !== 'undefined') {
        const msg = String(error?.message ?? 'Network Error');
        const url = error?.config?.url ?? '';
        const method = (error?.config?.method ?? 'get').toUpperCase();
        const base = error?.config?.baseURL ?? API_BASE_URL;
        const isTimeout = error?.code === 'ECONNABORTED' || msg.toLowerCase().includes('timeout');
        // Throttle: log once per 60s per base URL to avoid console spam when backend is down
        const key = '__apiNetworkErrorLog';
        const last = (globalThis as any)[key] ?? 0;
        const now = Date.now();
        if (now - last > 60000) {
          (globalThis as any)[key] = now;
          const hint = base.startsWith('http') ? ` Is the server running at ${base.replace(/\/api$/, '')}?` : '';
          console.warn(
            `💡 API ${isTimeout ? 'Timeout' : 'Network Error'}${url ? ` ${method} ${url}` : ''}.${hint}`
          );
        }
      }
      return Promise.reject(error);
    }

    // 400: don't log to console – validation/errors are shown in UI (toast/form). Avoids AxiosError noise.
    if (error.response?.status === 400) {
      // Optional: one short dev-only line if you need to trace which call failed
      if (process.env.NODE_ENV === 'development' && typeof console.warn === 'function') {
        const url = error?.config?.url ?? '';
        const method = (error?.config?.method ?? 'get').toUpperCase();
        const msg = (error.response?.data as { message?: string })?.message;
        console.warn(`400 ${method} ${url}${msg ? `: ${msg}` : ''}`);
      }
    }

    // Log 404 errors with full details for debugging (skip expected ones)
    if (error.response.status === 404) {
      const url = error?.config?.url ?? 'unknown';
      const method = (error?.config?.method ?? 'get').toUpperCase();
      const fullUrl = error?.config?.baseURL 
        ? `${error.config.baseURL}${url}` 
        : url;
      // Suppress expected 404s - handled gracefully by callers
      const urlStr = String(url || fullUrl || '');
      const isLocations404 =
        urlStr.includes('locations/india') ||
        urlStr.includes('locations/all-india') ||
        (urlStr.includes('locations/') && (urlStr.includes('%2C') || urlStr.includes(',')));
      // GET /locations/:slug - slug may not exist in DB (e.g. delhi-division) - expected 404, handled by callers
      const isLocationsSlug404 = method === 'GET' && /\/locations\/[^/]+(?:\?|$)/.test(urlStr.replace(/\?.*$/, '')) && !urlStr.includes('/locations/states') && !urlStr.includes('/locations/neighborhoods') && !urlStr.includes('/locations/mobile');
      const locationsSlugMatch = urlStr.match(/locations\/([^/?]+)/);
      const slug = locationsSlugMatch ? decodeURIComponent(locationsSlugMatch[1]) : '';
      const isGoogleStyleSlug = slug && (slug.endsWith('-india') || slug.split('-').length >= 3);
      const isAdNotFound404 = method === 'GET' && /\/ads\/[^/]+$/.test(urlStr.replace(/\?.*$/, ''));
      const isCreditsConfig404 = urlStr.includes('/credits/config');
      if (isLocations404 || isLocationsSlug404 || isGoogleStyleSlug || isAdNotFound404 || isCreditsConfig404) {
        return Promise.reject(error);
      }
      
      console.error(`❌ 404 Not Found: ${method} ${fullUrl}`, {
        url,
        method,
        baseURL: error?.config?.baseURL,
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }

    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response.status === 401) {
      if (typeof window !== 'undefined') {
        const url = String(error?.config?.url || '');
        const isAuthMe = url.includes('/auth/me');
        const isAdPostingFlow = url.includes('/ads') || url.includes('/premium/ad-posting') || url.includes('/premium/order') || url.includes('/payment-gateway') || url.includes('/geocoding') || url.includes('/ai/');

        if (isAuthMe) {
          // /auth/me 401 = token definitely invalid, clear immediately
          Cookies.remove('token', { path: '/' });
          try {
            const queryClient = getQueryClient();
            queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
            queryClient.setQueryData(['auth', 'me'], null);
          } catch (e) {}
        } else {
          // Other 401: invalidate auth query so useAuth refetches /auth/me to confirm.
          // Only /auth/me 401 clears token – prevents false logout from stray 401s after login.
          if (!isAdPostingFlow) {
            try {
              const queryClient = getQueryClient();
              queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
            } catch (e) {}
          }
        }
        // Ad posting 401: Don't invalidate here - mutation will clear token and redirect to avoid race/logout during form fill
      }
    }

    // Handle 403 Forbidden
    if (error.response.status === 403) {
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Access forbidden:', error.config?.url);
      }
    }

    // 429 Rate limit - reject silently (callers handle gracefully; no extra logging)
    if (error.response.status === 429) {
      return Promise.reject(error);
    }

    // 500 Server Error - log endpoint and backend message for debugging
    if (error.response.status === 500 && typeof window !== 'undefined') {
      const url = error?.config?.url ?? 'unknown';
      const method = (error?.config?.method ?? 'get').toUpperCase();
      const fullUrl = error?.config?.baseURL
        ? `${error.config.baseURL}${url}`
        : url;
      const data = error.response?.data as { message?: string; error?: string } | undefined;
      const msg = data?.message ?? data?.error ?? '';
      console.error(
        `❌ 500 Server Error: ${method} ${fullUrl}`,
        msg ? `\nBackend: ${msg}` : '',
        data ?? ''
      );
    }

    return Promise.reject(error);
  }
);

export default api;
