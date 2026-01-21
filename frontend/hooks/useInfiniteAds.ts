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
  // New UI filters
  premiumOnly?: boolean | string;
  brands?: string; // comma-separated brand slugs/names
  sort?: 'newest' | 'oldest' | 'price_low' | 'price_high' | 'featured' | 'bumped';
}

export const useInfiniteAds = (filters: AdsFilters = {}) => {
  return useInfiniteQuery({
    queryKey: ['ads', 'infinite', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && key !== 'page') {
          params.append(key, String(value));
        }
      });
      params.append('page', String(pageParam));
      params.append('limit', String(filters.limit || 20));

      const response = await api.get(`/ads?${params.toString()}`);
      return response.data;
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

