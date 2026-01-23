import { useInfiniteQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface HomeFeedFilters {
  page?: number;
  limit?: number;
  city?: string;
  state?: string;
  location?: string; // Location slug
}

export const useHomeFeed = (filters: HomeFeedFilters = {}) => {
  return useInfiniteQuery({
    queryKey: ['ads', 'home-feed', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      
      // Add location filters (priority: city/state > location slug)
      if (filters.city) {
        params.append('city', filters.city);
      }
      if (filters.state) {
        params.append('state', filters.state);
      }
      if (filters.location && !filters.city) {
        params.append('location', filters.location);
      }
      
      params.append('page', String(pageParam));
      params.append('limit', String(filters.limit || 12)); // Smaller batch size for lazy loading

      const response = await api.get(`/ads/home-feed?${params.toString()}`);
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
    staleTime: 4 * 60 * 60 * 1000, // 4 hours (matches backend refresh)
    gcTime: 6 * 60 * 60 * 1000, // 6 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};
