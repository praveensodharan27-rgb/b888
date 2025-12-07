import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface Ad {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  images: string[];
  category: any;
  subcategory?: any;
  location?: any;
  state?: string;
  city?: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
}

interface CategoryAdsFilters {
  category?: string;
  subcategory?: string;
  location?: string;
  minPrice?: string | number;
  maxPrice?: string | number;
  condition?: string;
  sort?: string;
  limit?: number;
  page?: number;
}

export const useCategoryAds = (filters: CategoryAdsFilters) => {
  return useQuery({
    queryKey: ['category-ads', filters],
    queryFn: async () => {
      const params: any = {
        ...filters,
        limit: filters.limit || 50,
      };

      // Clean up empty params
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await api.get('/ads', { params });
      return response.data.ads as Ad[];
    },
    staleTime: 60 * 1000, // 1 minute - data stays fresh
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    enabled: !!filters.category, // Only fetch if category is provided
  });
};

// Hook to get single category details
export const useCategory = (slug: string) => {
  return useQuery({
    queryKey: ['category', slug],
    queryFn: async () => {
      const response = await api.get(`/categories/${slug}`);
      return response.data.category;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    enabled: !!slug,
  });
};

// Hook to get subcategories for a category
export const useSubcategories = (categoryId: string) => {
  return useQuery({
    queryKey: ['subcategories', categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      const response = await api.get(`/categories/${categoryId}/subcategories`);
      return response.data.subcategories;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!categoryId,
  });
};

