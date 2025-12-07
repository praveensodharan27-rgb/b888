import { useInfiniteQuery } from '@tanstack/react-query';
import api from '@/lib/api';

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
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

