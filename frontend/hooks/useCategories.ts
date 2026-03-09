import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Subcategory {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  categoryId?: string;
  _count?: { ads: number };
}

export interface Category {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  categoryId?: string | null;
  category_id?: string | null;
  subcategories?: Subcategory[];
  _count?: { ads: number };
}

interface UseCategoriesReturn {
  categories: Category[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  mainCategories: Category[];
  getSubcategories: (categoryId: string) => Subcategory[];
  getCategoryById: (categoryId: string) => Category | undefined;
  getSubcategoryById: (categoryId: string, subcategoryId: string) => Subcategory | undefined;
}

/**
 * Custom hook to fetch and manage categories with React Query
 * 
 * Features:
 * - Automatic caching with React Query
 * - Loading and error states
 * - Helper functions to get subcategories
 * - Filters out invalid categories
 * 
 * @returns Categories data and helper functions
 */
export function useCategories(): UseCategoriesReturn {
  const {
    data: rawCategories,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Category[]>({
    queryKey: ['categories', 'with-subcategories'],
    queryFn: async (): Promise<Category[]> => {
      try {
        console.log('🔄 [useCategories] Fetching categories from API...');
        
        const response = await api.get('/categories', {
          timeout: 15000,
          validateStatus: (status) => status < 500,
        });
        
        console.log('📡 [useCategories] API Response:', {
          status: response.status,
          hasData: !!response.data,
        });
        
        // Handle different response formats
        let categories: Category[] = [];
        
        if (response.data?.success && Array.isArray(response.data.categories)) {
          categories = response.data.categories;
          console.log('✅ [useCategories] Using response.data.categories format');
        } else if (Array.isArray(response.data?.categories)) {
          categories = response.data.categories;
          console.log('✅ [useCategories] Using response.data.categories (no success field)');
        } else if (Array.isArray(response.data)) {
          categories = response.data;
          console.warn('⚠️ [useCategories] Using direct array format (unexpected)');
        } else {
          console.error('❌ [useCategories] Unexpected response format:', response.data);
          return [];
        }
        
        // Filter to get only main categories (no categoryId field)
        const mainCategories = categories.filter((cat: any) => {
          const hasCategoryId = !!(cat.categoryId || cat.category_id);
          
          if (hasCategoryId) {
            console.warn('⚠️ [useCategories] Filtering out subcategory:', cat.name);
            return false;
          }
          
          return true;
        });
        
        console.log('✅ [useCategories] Processed categories:', {
          total: categories.length,
          mainCategories: mainCategories.length,
          withSubcategories: mainCategories.filter(c => c.subcategories && c.subcategories.length > 0).length,
        });
        
        return mainCategories;
      } catch (err: any) {
        console.error('❌ [useCategories] Error fetching categories:', err.message);
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
    retry: 2, // Retry failed requests twice
  });

  // Memoized main categories (already filtered in queryFn)
  const mainCategories = rawCategories || [];

  // Helper function to get subcategories for a specific category
  const getSubcategories = (categoryId: string): Subcategory[] => {
    const category = mainCategories.find(
      (cat) => (cat.id || cat._id) === categoryId
    );
    return category?.subcategories || [];
  };

  // Helper function to get category by ID
  const getCategoryById = (categoryId: string): Category | undefined => {
    return mainCategories.find(
      (cat) => (cat.id || cat._id) === categoryId
    );
  };

  // Helper function to get subcategory by ID
  const getSubcategoryById = (
    categoryId: string,
    subcategoryId: string
  ): Subcategory | undefined => {
    const subcategories = getSubcategories(categoryId);
    return subcategories.find(
      (sub) => (sub.id || sub._id) === subcategoryId
    );
  };

  return {
    categories: mainCategories,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    mainCategories,
    getSubcategories,
    getCategoryById,
    getSubcategoryById,
  };
}
