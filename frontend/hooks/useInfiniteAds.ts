import { useInfiniteQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface AdsFilters {
  page?: number;
  limit?: number;
  category?: string;
  subcategory?: string;
  location?: string;
  latitude?: string;
  longitude?: string;
  radius?: string;
  minPrice?: number | string;
  maxPrice?: number | string;
  search?: string;
  condition?: string;
  sort?: 'newest' | 'oldest' | 'price_low' | 'price_high' | 'featured' | 'bumped';
}

export const useInfiniteAds = (filters: AdsFilters = {}) => {
  return useInfiniteQuery({
    queryKey: ['ads', 'infinite', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && key !== 'page') {
          // Normalize price filter names: priceMin/priceMax -> minPrice/maxPrice
          if (key === 'priceMin') {
            params.append('minPrice', String(value));
            return;
          }
          if (key === 'priceMax') {
            params.append('maxPrice', String(value));
            return;
          }
          
          // Handle array values (for multiselect filters like brand)
          if (Array.isArray(value)) {
            value.forEach(v => {
              if (v !== undefined && v !== null && v !== '') {
                params.append(key, String(v));
              }
            });
          } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // Handle range filters (e.g., {min: 100, max: 500})
            // Only process plain objects (not Date, etc.)
            try {
              Object.entries(value).forEach(([subKey, subValue]) => {
                if (subValue !== undefined && subValue !== null && subValue !== '') {
                  // Convert camelCase subKey to proper format
                  // e.g., {min: 100, max: 500} -> minPrice=100&maxPrice=500
                  if (key === 'price' && subKey === 'min') {
                    params.append('minPrice', String(subValue));
                  } else if (key === 'price' && subKey === 'max') {
                    params.append('maxPrice', String(subValue));
                  } else {
                  const paramKey = `${key}${subKey.charAt(0).toUpperCase() + subKey.slice(1)}`;
                  params.append(paramKey, String(subValue));
                  }
                }
              });
            } catch (e) {
              // If object serialization fails, skip it
              console.warn(`Failed to serialize filter ${key}:`, e);
            }
          } else {
            // Handle primitive values (string, number, boolean)
            params.append(key, String(value));
          }
        }
      });
      params.append('page', String(pageParam));
      params.append('limit', String(filters.limit || 20));

      const queryString = params.toString();
      const url = `/ads${queryString ? `?${queryString}` : ''}`;
      
      try {
        const response = await api.get(url);
        return response.data;
      } catch (error: any) {
        // Check if it's a timeout error
        const isTimeoutError = error?.code === 'ECONNABORTED' ||
                              error?.message?.toLowerCase().includes('timeout') ||
                              (error?.config?.timeout && error?.message?.includes('timeout'));
        
        // Log network errors with more context - only if we have meaningful information
        const isNetworkError = error?.code === 'ERR_NETWORK' || 
                              error?.message === 'Network Error' ||
                              (!error?.response && (
                                error?.message?.toLowerCase().includes('network') ||
                                error?.code === 'ECONNREFUSED' ||
                                error?.code === 'ETIMEDOUT' ||
                                error?.code === 'ECONNABORTED'
                              ));
        
        // Handle timeout errors separately
        if (isTimeoutError) {
          // Throttle timeout error logging
          if (!(window as any).__lastAdsTimeoutError) {
            console.warn('⚠️ Request timeout fetching ads - backend may be slow or unavailable. Try refreshing the page.');
            (window as any).__lastAdsTimeoutError = Date.now();
            setTimeout(() => {
              (window as any).__lastAdsTimeoutError = null;
            }, 10000); // 10 seconds throttle for timeout errors
          }
        } else if (isNetworkError) {
          // Build error info only with meaningful values
          const errorInfo: any = {};
          let hasAnyValidProperty = false;
          
          if (url && url.trim() !== '') {
            errorInfo.url = url;
            hasAnyValidProperty = true;
          }
          if (api.defaults?.baseURL && api.defaults.baseURL.trim() !== '') {
            errorInfo.baseURL = api.defaults.baseURL;
            hasAnyValidProperty = true;
          }
          if (filters && typeof filters === 'object' && Object.keys(filters).length > 0) {
            errorInfo.filters = filters;
            hasAnyValidProperty = true;
          }
          if (error?.message && error.message.trim() !== '') {
            errorInfo.error = error.message;
            hasAnyValidProperty = true;
          }
          if (error?.code && error.code.trim && error.code.trim() !== '') {
            errorInfo.code = error.code;
            hasAnyValidProperty = true;
          }
          
          // Only log if we have at least one valid property
          if (hasAnyValidProperty && Object.keys(errorInfo).length > 0) {
            // Final check: ensure all values are non-empty
            const hasNonEmptyValue = Object.values(errorInfo).some(value => {
              if (value === undefined || value === null) return false;
              if (typeof value === 'string' && value.trim() === '') return false;
              if (typeof value === 'object' && Object.keys(value).length === 0) return false;
              return true;
            });
            
            if (hasNonEmptyValue) {
              // Throttle network error logging to reduce console noise
              if (!(window as any).__lastAdsNetworkError) {
                console.warn('⚠️ Network error fetching ads - backend may be unavailable');
                (window as any).__lastAdsNetworkError = Date.now();
                setTimeout(() => {
                  (window as any).__lastAdsNetworkError = null;
                }, 5000);
                
                // Log detailed info only once
                console.error('❌ Network Error fetching ads:', errorInfo);
              }
            }
            // If no non-empty values, suppress completely
          }
          // If no valid properties or empty errorInfo, suppress completely
        }
        throw error;
      }
    },
    getNextPageParam: (lastPage) => {
      const { page, pages } = lastPage.pagination || {};
      if (page && pages && page < pages) {
        return page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000, // 2 minutes (increased from 1 minute)
    gcTime: 15 * 60 * 1000, // 15 minutes (increased from 10 minutes)
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch on mount if data is fresh
  });
};

