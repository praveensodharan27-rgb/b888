import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import toast from '@/lib/toast';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/hooks/useAuth';

export interface Ad {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number | null;
  discount?: number | null;
  condition?: string | null;
  images: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SOLD' | 'EXPIRED';
  isPremium: boolean;
  premiumType?: 'TOP' | 'FEATURED' | 'BUMP_UP';
  packageType?: 'NORMAL' | 'SELLER_PRIME' | 'SELLER_PLUS' | 'MAX_VISIBILITY' | null;
  views: number;
  createdAt: string;
  category: { id: string; name: string; slug: string };
  subcategory?: { id: string; name: string; slug: string };
  location: { id: string; name: string; slug: string; latitude?: number; longitude?: number } | null;
  user: { id: string; name: string; avatar?: string };
  _count?: { favorites: number };
  distance?: number; // Distance in kilometers (for live location feed)
}

interface AdsFilters {
  page?: number;
  limit?: number;
  category?: string;
  subcategory?: string;
  location?: string;
  city?: string;
  state?: string;
  userId?: string;
  minPrice?: number | string;
  maxPrice?: number | string;
  search?: string;
  condition?: string;
  sort?: 'newest' | 'oldest' | 'price_low' | 'price_high' | 'featured' | 'bumped';
  latitude?: number;
  longitude?: number;
  radius?: number;
}

/** Stable key from filter values to avoid duplicate requests when parent re-renders */
function getStableAdsFilterKey(filters: AdsFilters): string {
  const o: Record<string, string | number> = {};
  Object.keys(filters).forEach((k) => {
    const v = (filters as Record<string, unknown>)[k];
    if (v !== undefined && v !== null && v !== '') {
      o[k] = Array.isArray(v) ? (v as unknown[]).join(',') : (v as string | number);
    }
  });
  return JSON.stringify(o);
}

interface LiveLocationFilters {
  latitude: number;
  longitude: number;
  radius?: number;
  page?: number;
  limit?: number;
  category?: string;
  subcategory?: string;
  minPrice?: number | string;
  maxPrice?: number | string;
  search?: string;
  condition?: string;
}

export const useAds = (filters: AdsFilters = {}, options?: { enabled?: boolean }) => {
  const queryClient = useQueryClient();
  const filterKey = getStableAdsFilterKey(filters);

  const query = useQuery({
    queryKey: ['ads', filterKey],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const response = await api.get(`/ads?${params.toString()}`);
      return response.data;
    },
    enabled: options?.enabled !== false, // Default to true, can be disabled
    staleTime: 60 * 1000, // Consider data fresh for 60 seconds (increased from 30)
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (increased from 5)
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: 1, // Retry once on failure
  });

  // Listen for new ads via Socket.IO
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewAd = (newAd: Ad) => {
      // Check if the new ad matches current filters
      const matchesFilters = () => {
        if (filters.category && newAd.category?.slug !== filters.category) return false;
        if (filters.subcategory && newAd.subcategory?.slug !== filters.subcategory) return false;
        if (filters.location && newAd.location?.slug !== filters.location) return false;
        if (filters.minPrice && newAd.price < Number(filters.minPrice)) return false;
        if (filters.maxPrice && newAd.price > Number(filters.maxPrice)) return false;
        if (filters.condition && newAd.condition !== filters.condition) return false;
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          const matchesSearch = 
            newAd.title.toLowerCase().includes(searchLower) ||
            newAd.description.toLowerCase().includes(searchLower);
          if (!matchesSearch) return false;
        }
        return true;
      };

      if (matchesFilters()) {
        queryClient.setQueryData(['ads', filters], (old: any) => {
          if (!old || !old.ads) return old;
          
          // Check if ad already exists (prevent duplicates)
          const exists = old.ads.some((ad: Ad) => ad.id === newAd.id);
          if (exists) return old;
          
          // Add new ad at the beginning (newest first)
          return {
            ...old,
            ads: [newAd, ...old.ads],
            pagination: {
              ...old.pagination,
              total: old.pagination.total + 1,
            },
          };
        });
      }

      // Invalidate ads list so other open views can refetch when stale
      queryClient.invalidateQueries({ queryKey: ['ads'] });
    };

    socket.on('new_ad', handleNewAd);

    return () => {
      socket.off('new_ad', handleNewAd);
    };
  }, [filters, queryClient]);

  return query;
};

export const useAd = (id: string) => {
  // Validate and sanitize ID to prevent routing issues
  const sanitizedId = id?.trim() || '';
  
  return useQuery({
    queryKey: ['ad', sanitizedId],
    queryFn: async () => {
      // Double-check ID is valid before making request
      if (!sanitizedId || sanitizedId.length < 1) {
        console.error('Invalid ad ID provided:', id);
        return null;
      }
      
      try {
        const url = `/ads/${sanitizedId}`;
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 useAd - Fetching:', url);
        }
        const response = await api.get(url);
        const adData = response.data?.ad;
        
        // Verify the returned ad ID matches the requested ID
        if (adData && adData.id !== sanitizedId) {
          console.error('Ad ID mismatch! Requested:', sanitizedId, 'Received:', adData.id);
          // Don't return mismatched data - return null to force refetch
          return null;
        }
        
        // Return null explicitly if ad is undefined/null to distinguish from loading state
        return adData || null;
      } catch (error: unknown) {
        // CRITICAL: Never throw error - always return null to prevent automatic redirects
        // This ensures the page stays stable and shows notFound UI instead of redirecting
        const err = error as { response?: { status?: number; statusText?: string; data?: unknown }; message?: string; code?: string };
        const status = err?.response?.status;
        const is404 = status === 404;
        const is429 = status === 429;
        if (process.env.NODE_ENV === 'development') {
          if (is404) {
            // 404 is expected when ad doesn't exist - log as info, not error
            console.info('ℹ️ useAd - Ad not found (404):', sanitizedId);
          } else if (is429) {
            // 429 = rate limited - log as warning, not error (expected under heavy traffic)
            console.warn('⚠️ useAd - Rate limited (429):', sanitizedId, '| Try again in a few minutes');
          } else {
            // Build serializable details (avoid {} from undefined/circular refs)
            const message = err?.message ?? 'Unknown error';
            const details: Record<string, unknown> = {
              status: status ?? null,
              statusText: err?.response?.statusText ?? null,
              code: err?.code ?? null,
              url: `/ads/${sanitizedId}`,
              adId: sanitizedId,
              message,
            };
            if (err?.response?.data != null) details.responseData = err.response.data;
            console.error(
              `❌ useAd - Error fetching ad (returning null) | adId=${String(sanitizedId)} | ${message}`,
              details
            );
          }
        }
        
        // For all errors (404, 401, 500, network, etc.), return null
        // The page will show notFound UI instead of redirecting
        return null;
      }
    },
    enabled: !!sanitizedId && sanitizedId.length > 0,
    staleTime: 90 * 1000, // 90 seconds - reduces refetches and 429 rate limit hits
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: false, // Don't retry on errors
    // CRITICAL: Don't throw errors - they cause React Query to fail and potentially trigger redirects
    throwOnError: false,
  });
};

export const useCreateAd = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: FormData) => {
      const response = await api.post('/ads', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('📦 Ad creation API response:', {
        status: response.status,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        hasAd: !!response.data?.ad,
        adId: response.data?.ad?.id
      });
      return response.data;
    },
    onSuccess: (data) => {
      console.log('✅ useCreateAd onSuccess - Full response:', data);
      
      // Backend returns: { success: true, ad: {...} }
      const createdAd = data?.ad;
      const adId = createdAd?.id;
      
      if (adId && createdAd) {
        // Cache the ad for immediate access
        queryClient.setQueryData(['ad', adId], createdAd);
        console.log('✅ Ad cached in React Query:', adId);

        // Optimistically add new ad to My Ads cache so it shows immediately after redirect
        queryClient.setQueriesData(
          { queryKey: ['user', 'ads'] },
          (old: any) => {
            if (!old?.ads) return { success: true, ads: [createdAd], pagination: { page: 1, limit: 10, total: 1, pages: 1 } };
            const existingIds = new Set((old.ads || []).map((a: any) => a.id));
            if (existingIds.has(adId)) return old;
            return {
              ...old,
              ads: [createdAd, ...(old.ads || [])],
              pagination: { ...old.pagination, total: (old.pagination?.total || 0) + 1 }
            };
          }
        );
      }
      
      // Invalidate queries to refresh lists (triggers refetch in background)
      queryClient.invalidateQueries({ queryKey: ['ads'] });
      queryClient.invalidateQueries({ queryKey: ['my-ads'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'ads'] });
      // Invalidate ad limit status to refresh premium slots count
      // This is critical for profile page updates
      console.log('🔄 useCreateAd: Invalidating business package status after ad creation');
      queryClient.invalidateQueries({ queryKey: ['ad-limit-status'] });
      queryClient.invalidateQueries({ queryKey: ['business-package', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] }); // Refresh profile page
      // Force refetch after a delay to ensure backend has updated
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['business-package', 'status'] });
        queryClient.refetchQueries({ queryKey: ['ad-limit-status'] });
        queryClient.refetchQueries({ queryKey: ['user-profile'] });
      }, 1200);
      // Don't show toast here - let the calling component handle it
    },
    onError: (error: any) => {
      // Handle 401 - session expired, clear token and redirect to login
      const status = error?.response?.status;
      if (status === 401) {
        Cookies.remove('token', { path: '/' });
        queryClient.setQueryData(['auth', 'me'], null);
        toast.error('Your session has expired. Please log in again to continue.', { duration: 5000 });
        router.push('/login');
        return;
      }

      // Simplified error handling - avoid complex serialization
      let errorMessage = 'Failed to create ad';
      let errorData: any = null;
      let adLimitReached = false;
      
      // Extract error message safely
      if (error) {
        // Try response.data first (Axios error)
        if (error.response?.data) {
          errorData = error.response.data;
          errorMessage = errorData.message || errorMessage;
          adLimitReached = errorData.adLimitReached || false;
        }
        // Try direct message
        else if (error.message) {
          errorMessage = error.message;
        }
        // Try data property
        else if (error.data?.message) {
          errorMessage = error.data.message;
          errorData = error.data;
        }
      }
      
      // Handle validation errors
      if (errorData?.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
        const validationErrors = errorData.errors
          .map((err: any) => err.msg || err.message || String(err))
          .filter(Boolean)
          .join(', ');
        toast.error(`Validation failed: ${validationErrors}`, { duration: 5000 });
        return;
      }
      
      // Show error toast
      if (adLimitReached) {
        toast.error(errorMessage, { duration: 5000 });
      } else {
        toast.error(errorMessage);
      }
      
      // Simple, direct error logging without complex serialization
      console.group('❌ Ad Creation Error');
      
      console.log('Message:', errorMessage);
      
      if (error?.response) {
        console.log('Status:', error.response.status);
        console.log('Status Text:', error.response.statusText);
        if (errorData) {
          console.log('Response Data:', errorData);
        }
      }
      
      if (error?.config) {
        console.log('Request URL:', error.config.url);
        console.log('Request Method:', error.config.method);
      }
      
      if (error?.stack) {
        console.log('Stack:', error.stack);
      }
      
      // Log error object structure without trying to serialize
      console.log('Error object type:', typeof error);
      console.log('Error object keys:', error ? Object.keys(error) : 'N/A');
      
      console.groupEnd();
    },
  });
};

export const useUpdateAd = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData | any }) => {
      const response = await api.put(`/ads/${id}`, data, {
        headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['ads'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'ads'] }); // My Ads page
      queryClient.setQueryData(['ad', variables.id], data.ad); // Optimistically update ad
      queryClient.invalidateQueries({ queryKey: ['ad', variables.id] });
      toast.success('Ad updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update ad');
    },
  });
};

export const useDeleteAd = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/ads/${id}`);
      return response.data;
    },
    onSuccess: (_, id) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['ads'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'ads'] }); // My Ads page
      queryClient.invalidateQueries({ queryKey: ['ad', id] }); // Single ad detail
      queryClient.removeQueries({ queryKey: ['ad', id] }); // Remove from cache
      toast.success('Ad deleted successfully');
    },
    onError: (error: any) => {
      console.error('Delete ad error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete ad';
      toast.error(errorMessage);
    },
  });
};

export const useToggleFavorite = () => {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  return useMutation({
    mutationFn: async (adId: string) => {
      const response = await api.post(`/ads/${adId}/favorite`);
      return response.data;
    },
    onMutate: async (adId) => {
      await queryClient.cancelQueries({ queryKey: ['favorite', adId] });
      const previous = queryClient.getQueryData(['favorite', adId]);
      queryClient.setQueryData(['favorite', adId], (prev: boolean | undefined) => !prev);
      return { previous, adId };
    },
    onSuccess: async (data, adId) => {
      queryClient.setQueryData(['favorite', adId], data.isFavorite);
      queryClient.invalidateQueries({ queryKey: ['ad', adId] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['ads'] });
      toast.success(data.isFavorite ? 'Added to favorites' : 'Removed from favorites');
    },
    onError: (error: any, _adId, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['favorite', context.adId], context.previous);
      }
      toast.error(error.response?.data?.message || 'Failed to update favorite');
    },
  });
};

export const useIsFavorite = (adId: string, enabled: boolean = true) => {
  const { isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: ['favorite', adId],
    queryFn: async () => {
      if (!adId || !isAuthenticated) {
        return false;
      }
      
      try {
        const url = `/ads/${adId}/favorite`;
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 useIsFavorite - Fetching:', url);
        }
        const response = await api.get(url);
        return response.data.isFavorite;
      } catch (error: any) {
        // For 401 errors (not authenticated), return false instead of throwing
        // This allows unauthenticated users to view ads without redirects
        if (error.response?.status === 401) {
          // Silently return false for unauthenticated users (expected behavior)
          return false; // Not authenticated = not favorite
        }
        // For 404 errors, log but don't break the page
        if (error.response?.status === 404) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ useIsFavorite - 404 Not Found:', `/ads/${adId}/favorite`);
          }
          return false; // Endpoint not found = not favorite
        }
        // For other errors, return false as well (don't break the page)
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ useIsFavorite - Error:', {
            status: error.response?.status,
            url: `/ads/${adId}/favorite`,
            message: error.message
          });
        }
        return false;
      }
    },
    enabled: !!adId && enabled && isAuthenticated, // Only fetch if adId exists, enabled, and user is authenticated
    staleTime: 30 * 1000, // Consider fresh for 30 seconds
    refetchOnWindowFocus: false,
    retry: false, // Don't retry on errors
    // Return false as initial data if not authenticated (so UI shows "not favorite")
    initialData: () => false,
  });
};

// Get free ads status
export const useFreeAdsStatus = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['freeAdsStatus'],
    queryFn: async () => {
      const response = await api.get('/user/free-ads-status');
      return response.data;
    },
    enabled: enabled, // Only fetch if enabled (user is authenticated)
    staleTime: 60 * 1000, // Consider fresh for 1 minute
    refetchOnWindowFocus: false,
    retry: false, // Don't retry on 401 errors
  });
};

// Create ad posting payment order
export const useCreateAdPostingOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (adData: any) => {
      console.log('📤 Sending ad data to create payment order:', adData);
      const response = await api.post('/premium/ad-posting/order', { adData });
      console.log('✅ Payment order response:', response.data);
      return response.data;
    },
    onError: (error: any) => {
      console.error('❌ Payment order creation error:', error);
      const status = error.response?.status;
      const errorData = error.response?.data;

      // Handle 401 - session expired, clear token and redirect to login
      if (status === 401) {
        Cookies.remove('token', { path: '/' });
        queryClient.setQueryData(['auth', 'me'], null);
        toast.error('Your session has expired. Please log in again to continue.', { duration: 5000 });
        if (typeof window !== 'undefined') window.location.href = '/login';
        return;
      }
      // Handle 402 Payment Required
      if (status === 402) {
        const errorMessage = errorData?.message || 'You have reached your free ad limit. Please purchase a Business Package or Premium Options to continue posting ads.';
        toast.error(errorMessage, { duration: 6000 });
      } else {
        toast.error(errorData?.message || 'Failed to create payment order', { duration: 5000 });
      }
    },
  });
};

// Check ad limit status (premiumSelected = user has selected TOP/Featured/Bump in form)
// Query key omits premiumSelected to avoid cache miss + UI flicker when toggling; we refetch when it changes.
export const useAdLimitStatus = (userId: string | undefined = undefined, premiumSelected: boolean = false) => {
  const enabled = userId !== undefined;
  const query = useQuery({
    queryKey: ['ad-limit-status', userId],
    queryFn: async () => {
      try {
        const response = await api.get('/ads/check-limit', {
          params: { premiumSelected: premiumSelected ? 'true' : 'false' },
        });
        
        // Ensure packages array exists even if empty
        const data = response.data || {};
        if (!data.packages) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ useAdLimitStatus - No packages array in response, setting to empty array');
          }
          data.packages = [];
        }
        
        // Ensure all required fields exist; premium visibility from backend only (no local logic)
        const result = {
          success: data.success !== undefined ? data.success : true,
          hasLimit: data.hasLimit !== undefined ? data.hasLimit : false,
          canPost: data.canPost !== undefined ? data.canPost : true,
          activePackagesCount: data.activePackagesCount || 0,
          premiumSlotsTotal: data.premiumSlotsTotal || 0,
          premiumSlotsUsed: data.premiumSlotsUsed || 0,
          premiumSlotsAvailable: data.premiumSlotsAvailable || 0,
          packages: data.packages || [],
          // Quota information
          freeAdsRemaining: data.freeAdsRemaining ?? 0,
          freeAdsUsed: data.freeAdsUsed || 0,
          freeAdsLimit: data.freeAdsLimit || 2,
          businessAdsRemaining: data.businessAdsRemaining ?? 0,
          totalRemaining: data.totalRemaining ?? Math.max(0, (data.freeAdsRemaining ?? 0) + (data.businessAdsRemaining ?? 0)),
          totalPurchased: data.totalPurchased || 0, // Total packages purchased
          // Backend-controlled premium UI flags (frontend must follow; no independent logic)
          activeBusinessPackage: data.activeBusinessPackage === true,
          hidePremiumSection: data.hidePremiumSection === true,
          hideSingleBuy: data.hideSingleBuy === true,
          showOnlyBusinessPosting: data.showOnlyBusinessPosting === true,
          // Upgrade popup: show only when backend says showUpgradePopup === true
          showUpgradePopup: data.showUpgradePopup === true,
          upgradeReason: data.upgradeReason ?? undefined,
          businessPackageExpired: data.businessPackageExpired === true,
          premiumSelected: data.premiumSelected === true,
          showBusinessPackageStatusSection: data.showBusinessPackageStatusSection === true,
          // businessPlanActive + planExpiryValid + businessAdsUsed < businessAdsLimit → show post button, hide popup, allow direct post
          businessPlanActive: data.businessPlanActive === true,
          planExpiryValid: data.planExpiryValid === true,
          businessAdsUsed: data.businessAdsUsed ?? 0,
          businessAdsLimit: data.businessAdsLimit ?? 0,
          allowDirectPost: data.allowDirectPost === true,
          ...data // Spread all other properties (may override above)
        };
        
        if (process.env.NODE_ENV === 'development') {
          console.log('📡 useAdLimitStatus - Final result:', result);
        }
        return result;
      } catch (error: any) {
        const status = error.response?.status;
        const data = error.response?.data;
        const message = error.message || (typeof data?.message === 'string' ? data.message : 'Request failed');
        if (process.env.NODE_ENV === 'development') {
          console.warn('useAdLimitStatus:', message, status != null ? `(${status})` : '', data && typeof data === 'object' ? data : '');
        }
        // Return default structure on error (401/404/500 - don't throw, so UI can still show post form)
        const defaultData = {
          success: false,
          hasLimit: false,
          canPost: true,
          activePackagesCount: 0,
          premiumSlotsTotal: 0,
          premiumSlotsUsed: 0,
          premiumSlotsAvailable: 0,
          packages: [],
          // Quota information defaults
          freeAdsRemaining: 0,
          freeAdsUsed: 0,
          freeAdsLimit: 2,
          businessAdsRemaining: 0,
          totalRemaining: 0,
          totalPurchased: 0,
          // Backend flags: when API fails, show premium options (don't hide)
          activeBusinessPackage: false,
          hidePremiumSection: false,
          hideSingleBuy: false,
          showOnlyBusinessPosting: false,
          showUpgradePopup: false,
          upgradeReason: undefined,
          businessPackageExpired: true,
          premiumSelected: false,
          showBusinessPackageStatusSection: true,
          businessPlanActive: false,
          planExpiryValid: false,
          businessAdsUsed: 0,
          businessAdsLimit: 0,
          allowDirectPost: false,
        };
        if (process.env.NODE_ENV === 'development') {
          console.log('📡 useAdLimitStatus - Returning default data:', defaultData);
        }
        return defaultData;
      }
    },
    enabled: enabled, // Only fetch if enabled
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds (reduced refetches)
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus (reduce API calls)
    refetchOnMount: false, // Don't refetch on mount if data exists (use cache)
    retry: false, // Don't retry on 401 errors
  });
  // Refetch when premium selection changes so backend gets correct param; same cache entry = no flicker
  useEffect(() => {
    if (enabled) query.refetch();
  }, [premiumSelected]); // eslint-disable-line react-hooks/exhaustive-deps -- only refetch when premium toggle changes
  return query;
};

export const useVerifyAdPostingPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { orderId: string; paymentId: string; signature: string }) => {
      const response = await api.post('/premium/ad-posting/verify', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Payment verified successfully');
    },
    onError: (error: any) => {
      if (error.response?.status === 401) {
        Cookies.remove('token', { path: '/' });
        queryClient.setQueryData(['auth', 'me'], null);
        toast.error('Your session has expired. Please log in again to continue.', { duration: 5000 });
        if (typeof window !== 'undefined') window.location.href = '/login';
        return;
      }
      toast.error(error.response?.data?.message || 'Payment verification failed');
    },
  });
};

// Live Location Feed - Get ads within 100km radius
export const useLiveLocationFeed = (filters: LiveLocationFilters, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['ads', 'live-location', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const response = await api.get(`/ads/live-location?${params.toString()}`);
      return response.data;
    },
    enabled: options?.enabled !== false && !!filters.latitude && !!filters.longitude,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds (shorter for live feed)
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: true, // Refetch on window focus for live updates
    refetchInterval: 60 * 1000, // Auto-refetch every 60 seconds for live feed
    retry: 1, // Retry once on failure
  });
};

