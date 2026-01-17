import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export type SortOption = 'newest' | 'oldest' | 'price_low' | 'price_high' | 'featured' | 'bumped';

export interface ListingFilters {
  page: number;
  limit: number;
  category?: string;
  subcategory?: string;
  location?: string;
  minPrice?: string;
  maxPrice?: string;
  condition?: string;
  sort: SortOption;
  search?: string;
}

interface UseListingFiltersOptions {
  defaultCategory?: string;
  defaultSubcategory?: string;
  limit?: number;
  excludeFromUrl?: string[];
}

export function useListingFilters(options: UseListingFiltersOptions = {}) {
  const { defaultCategory, defaultSubcategory, limit = 20, excludeFromUrl = [] } = options;
  const searchParams = useSearchParams();
  const router = useRouter();

  const [filters, setFilters] = useState<ListingFilters>(() => {
    const category = defaultCategory || searchParams.get('category') || undefined;
    const subcategory = defaultSubcategory || searchParams.get('subcategory') || undefined;
    
    return {
      page: parseInt(searchParams.get('page') || '1'),
      limit,
      category,
      subcategory,
      location: searchParams.get('location') || undefined,
      minPrice: searchParams.get('minPrice') || undefined,
      maxPrice: searchParams.get('maxPrice') || undefined,
      condition: searchParams.get('condition') || undefined,
      sort: (searchParams.get('sort') || 'newest') as SortOption,
      search: searchParams.get('search') || undefined,
    };
  });

  // Sync filters with URL changes
  useEffect(() => {
    const newFilters: ListingFilters = { ...filters };
    let changed = false;

    const updateFilter = (key: keyof ListingFilters, param: string) => {
      const urlValue = searchParams.get(param) || undefined;
      if (newFilters[key] !== urlValue) {
        (newFilters[key] as any) = urlValue;
        changed = true;
      }
    };

    updateFilter('category', 'category');
    updateFilter('subcategory', 'subcategory');
    updateFilter('location', 'location');
    updateFilter('minPrice', 'minPrice');
    updateFilter('maxPrice', 'maxPrice');
    updateFilter('search', 'search');
    updateFilter('condition', 'condition');
    updateFilter('sort', 'sort');
    
    const page = parseInt(searchParams.get('page') || '1');
    if (newFilters.page !== page) {
      newFilters.page = page;
      changed = true;
    }

    if (changed) {
      setFilters(newFilters);
    }
  }, [searchParams]);

  const handleFilterChange = (newFilters: Partial<ListingFilters>, updateUrl: boolean = true) => {
    const updatedFilters = { ...filters, ...newFilters, page: 1 };
    setFilters(updatedFilters);

    if (updateUrl) {
      const urlParams = new URLSearchParams();
      Object.entries(updatedFilters).forEach(([key, value]) => {
        if (
          value &&
          key !== 'page' &&
          key !== 'limit' &&
          !excludeFromUrl.includes(key)
        ) {
          urlParams.append(key, String(value));
        }
      });
      const queryString = urlParams.toString();
      const currentPath = window.location.pathname;
      router.push(`${currentPath}${queryString ? `?${queryString}` : ''}`, { scroll: false });
    }
  };

  const handleRemoveFilter = (key: keyof ListingFilters) => {
    if (key === 'minPrice' || key === 'maxPrice') {
      handleFilterChange({ minPrice: undefined, maxPrice: undefined });
    } else {
      handleFilterChange({ [key]: undefined } as Partial<ListingFilters>);
    }
  };

  const handleClearAllFilters = () => {
    const clearedFilters: Partial<ListingFilters> = {
      page: 1,
      location: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      condition: undefined,
      search: undefined,
      sort: 'newest',
    };
    if (!defaultCategory) {
      clearedFilters.category = undefined;
    }
    if (!defaultSubcategory) {
      clearedFilters.subcategory = undefined;
    }
    handleFilterChange(clearedFilters);
  };

  return {
    filters,
    setFilters,
    handleFilterChange,
    handleRemoveFilter,
    handleClearAllFilters,
  };
}

