import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';

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
  return useQuery({
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
};

export const useAd = (id: string) => {
  return useQuery({
    queryKey: ['ad', id],
    queryFn: async () => {
      const response = await api.get(`/ads/${id}`);
      return response.data.ad;
    },
    enabled: !!id,
    staleTime: 60 * 1000, // Consider data fresh for 1 minute
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
  });
};

export const useCreateAd = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: FormData) => {
      const response = await api.post('/ads', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ads'] });
      queryClient.invalidateQueries({ queryKey: ['my-ads'] });
      queryClient.setQueryData(['ad', data.ad.id], data.ad); // Optimistically set new ad
      // Invalidate ad limit status to refresh premium slots count
      // This is critical for profile page updates
      console.log('🔄 useCreateAd: Invalidating business package status after ad creation');
      queryClient.invalidateQueries({ queryKey: ['ad-limit-status'] });
      queryClient.invalidateQueries({ queryKey: ['business-package', 'status'] });
      // Force refetch after a delay to ensure backend has updated
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['business-package', 'status'] });
      }, 1200);
      // Don't show toast here - let the calling component handle it
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      const adLimitReached = errorData?.adLimitReached;
      
      // Handle validation errors
      if (errorData?.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
        const validationErrors = errorData.errors.map((err: any) => err.msg || err.message).join(', ');
        toast.error(`Validation failed: ${validationErrors}`, {
          duration: 5000,
        });
        console.error('Validation errors:', errorData.errors);
        return;
      }
      
      const errorMessage = errorData?.message || 'Failed to create ad';
      
      if (adLimitReached) {
        toast.error(errorMessage, {
          duration: 5000, // Show longer for important messages
        });
      } else {
        toast.error(errorMessage);
      }
      
      // Log full error for debugging
      console.error('Ad creation error:', {
        message: errorMessage,
        status: error.response?.status,
        data: errorData,
        fullError: error
      });
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
      toast.error(error.response?.data?.message || 'Failed to delete ad');
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
  return useQuery({
    queryKey: ['favorite', adId],
    queryFn: async () => {
      const response = await api.get(`/ads/${adId}/favorite`);
      return response.data.isFavorite;
    },
    enabled: !!adId && enabled, // Only fetch if adId exists and enabled
    staleTime: 30 * 1000, // Consider fresh for 30 seconds
    refetchOnWindowFocus: false,
    retry: false, // Don't retry on 401 errors
  });
};

// Get free ads status
export const useFreeAdsStatus = () => {
  return useQuery({
    queryKey: ['freeAdsStatus'],
    queryFn: async () => {
      const response = await api.get('/user/free-ads-status');
      return response.data;
    },
    staleTime: 60 * 1000, // Consider fresh for 1 minute
    refetchOnWindowFocus: false,
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
export const useAdLimitStatus = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['ad-limit-status'],
    queryFn: async () => {
      try {
        console.log('📡 useAdLimitStatus - Making API call to /ads/check-limit');
        const response = await api.get('/ads/check-limit');
        console.log('📡 useAdLimitStatus - Full response:', response);
        console.log('📡 useAdLimitStatus - Response status:', response.status);
        console.log('📡 useAdLimitStatus - Response data:', response.data);
        console.log('📡 useAdLimitStatus - Response data type:', typeof response.data);
        console.log('📡 useAdLimitStatus - Packages:', response.data?.packages);
        console.log('📡 useAdLimitStatus - Active packages count:', response.data?.activePackagesCount);
        console.log('📡 useAdLimitStatus - All data keys:', Object.keys(response.data || {}));
        
        // Ensure packages array exists even if empty
        const data = response.data || {};
        if (!data.packages) {
          console.warn('⚠️ useAdLimitStatus - No packages array in response, setting to empty array');
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
          ...data // Spread all other properties
        };
        
        console.log('📡 useAdLimitStatus - Final result:', result);
        return result;
      } catch (error: any) {
        console.error('❌ useAdLimitStatus error:', error);
        console.error('❌ Error response:', error.response);
        console.error('❌ Error response data:', error.response?.data);
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
          packages: []
        };
        console.log('📡 useAdLimitStatus - Returning default data:', defaultData);
        return defaultData;
      }
    },
    enabled: enabled, // Only fetch if enabled
    staleTime: 10 * 1000, // Consider data fresh for 10 seconds (reduced for faster updates)
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: true, // Refetch when window gains focus to get latest status
    refetchOnMount: true, // Refetch when component mounts to get latest data
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

