import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
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
  minPrice?: number | string;
  maxPrice?: number | string;
  search?: string;
  condition?: string;
  sort?: 'newest' | 'oldest' | 'price_low' | 'price_high' | 'featured' | 'bumped';
  latitude?: number;
  longitude?: number;
  radius?: number;
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
  
  const query = useQuery({
    queryKey: ['ads', filters],
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

  // Listen for new ads via Socket.IO (for real-time dummy ads)
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
        // Update the query cache with the new ad
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

      // Also invalidate all ads queries to refresh other views
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
        const response = await api.get(`/ads/${sanitizedId}`);
        const adData = response.data?.ad;
        
        // Verify the returned ad ID matches the requested ID
        if (adData && adData.id !== sanitizedId) {
          console.error('Ad ID mismatch! Requested:', sanitizedId, 'Received:', adData.id);
          // Don't return mismatched data - return null to force refetch
          return null;
        }
        
        // Return null explicitly if ad is undefined/null to distinguish from loading state
        return adData || null;
      } catch (error: any) {
        // CRITICAL: Never throw error - always return null to prevent automatic redirects
        // This ensures the page stays stable and shows notFound UI instead of redirecting
        console.error('Error fetching ad (returning null, NOT redirecting):', {
          status: error.response?.status,
          message: error.message,
          adId: sanitizedId,
          requestedId: id
        });
        
        // For all errors (404, 401, 500, network, etc.), return null
        // The page will show notFound UI instead of redirecting
        return null;
      }
    },
    enabled: !!sanitizedId && sanitizedId.length > 0,
    staleTime: 30 * 1000, // Reduced to 30 seconds to prevent stale data issues
    gcTime: 5 * 60 * 1000, // Reduced to 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Always refetch on mount to ensure correct ad
    retry: false, // Don't retry on errors
    // CRITICAL: Don't throw errors - they cause React Query to fail and potentially trigger redirects
    throwOnError: false,
  });
};

export const useCreateAd = () => {
  const queryClient = useQueryClient();

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
      }
      
      // Invalidate queries to refresh lists
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

  return useMutation({
    mutationFn: async (adId: string) => {
      const response = await api.post(`/ads/${adId}/favorite`);
      return response.data;
    },
    onSuccess: (data, adId) => {
      // Optimistically update the favorite status
      queryClient.setQueryData(['favorite', adId], data.isFavorite);
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['ad', adId] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['ads'] }); // Also invalidate ads list
      // Show toast notification
      toast.success(data.isFavorite ? 'Added to favorites' : 'Removed from favorites');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update favorite');
    },
  });
};

export const useIsFavorite = (adId: string, enabled: boolean = true) => {
  const { isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: ['favorite', adId],
    queryFn: async () => {
      try {
        const response = await api.get(`/ads/${adId}/favorite`);
        return response.data.isFavorite;
      } catch (error: any) {
        // For 401 errors (not authenticated), return false instead of throwing
        // This allows unauthenticated users to view ads without redirects
        if (error.response?.status === 401) {
          return false; // Not authenticated = not favorite
        }
        // For other errors, return false as well (don't break the page)
        console.error('Error checking favorite status:', error);
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
  return useMutation({
    mutationFn: async (adData: any) => {
      console.log('📤 Sending ad data to create payment order:', adData);
      const response = await api.post('/premium/ad-posting/order', { adData });
      console.log('✅ Payment order response:', response.data);
      return response.data;
    },
    onError: (error: any) => {
      console.error('❌ Payment order creation error:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to create payment order');
    },
  });
};

// Check ad limit status
export const useAdLimitStatus = (userId: string | undefined = undefined) => {
  const enabled = userId !== undefined;
  return useQuery({
    queryKey: ['ad-limit-status', userId],
    queryFn: async () => {
      try {
        // Reduced logging - only log in development
        if (process.env.NODE_ENV === 'development') {
          console.log('📡 useAdLimitStatus - Making API call to /ads/check-limit');
        }
        const response = await api.get('/ads/check-limit');
        
        // Ensure packages array exists even if empty
        const data = response.data || {};
        if (!data.packages) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ useAdLimitStatus - No packages array in response, setting to empty array');
          }
          data.packages = [];
        }
        
        // Ensure all required fields exist
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
          totalRemaining: data.totalRemaining ?? (data.freeAdsRemaining ?? 0) + (data.businessAdsRemaining ?? 0),
          totalPurchased: data.totalPurchased || 0, // Total packages purchased
          ...data // Spread all other properties (may override above)
        };
        
        if (process.env.NODE_ENV === 'development') {
          console.log('📡 useAdLimitStatus - Final result:', result);
        }
        return result;
      } catch (error: any) {
        // Always log errors
        console.error('❌ useAdLimitStatus error:', error);
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Error response:', error.response);
          console.error('❌ Error response data:', error.response?.data);
        }
        console.error('❌ Error message:', error.message);
        // Return default structure on error
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
          totalPurchased: 0
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
};

export const useVerifyAdPostingPayment = () => {
  return useMutation({
    mutationFn: async (data: { orderId: string; paymentId: string; signature: string }) => {
      const response = await api.post('/premium/ad-posting/verify', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Payment verified successfully');
    },
    onError: (error: any) => {
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

