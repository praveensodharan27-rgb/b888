'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FiFilter, FiX, FiMapPin, FiGrid } from 'react-icons/fi';
import LazyAdCard from '@/components/LazyAdCard';
import SponsoredAdFeedCard from '@/components/SponsoredAdFeedCard';
import EmptyState from '@/components/EmptyState';
import AdsGridSkeleton from '@/components/ads/AdsGridSkeleton';
import { useAdsPaginated } from '@/hooks/useAdsPaginated';
import dynamic from 'next/dynamic';

const FilterChips = dynamic(() => import('@/components/filters/FilterChips'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-10 rounded-lg"></div>,
});

const AdsFilterSidebar = dynamic(() => import('@/components/ads/AdsFilterSidebar'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-xl"></div>,
});

interface SearchResultsPageProps {
  initialQuery?: string;
  showFilters?: boolean;
}

export default function SearchResultsPage({ 
  initialQuery = '', 
  showFilters = true 
}: SearchResultsPageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Build filters from URL params
  const filters = useMemo(() => {
    const params: Record<string, any> = {};
    
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    return params;
  }, [searchParams]);

  // Fetch ads with filters
  const { 
    data, 
    isLoading, 
    isError,
    error 
  } = useAdsPaginated(filters);
  
  const ads = data?.ads ?? [];
  const pagination = data?.pagination;
  const loading = isLoading;

  // Get search query and location from params
  const searchQuery = searchParams.get('search') || '';
  const location = searchParams.get('location') || '';
  const category = searchParams.get('category') || '';
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');

  // Build result summary
  const resultSummary = useMemo(() => {
    const parts: string[] = [];
    
    if (searchQuery) parts.push(`"${searchQuery}"`);
    if (category) parts.push(`in ${category}`);
    if (location) parts.push(`near ${location.replace(/-/g, ' ')}`);
    if (minPrice || maxPrice) {
      if (minPrice && maxPrice) {
        parts.push(`₹${minPrice} - ₹${maxPrice}`);
      } else if (minPrice) {
        parts.push(`above ₹${minPrice}`);
      } else if (maxPrice) {
        parts.push(`under ₹${maxPrice}`);
      }
    }
    
    return parts.length > 0 ? parts.join(' ') : 'All products';
  }, [searchQuery, location, category, minPrice, maxPrice]);

  // Handle filter change
  const handleFilterChange = useCallback((key: string, value: any) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value === null || value === undefined || value === '') {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
    
    params.delete('page');
    router.push(`/ads?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleRemoveFilter = useCallback((key: string) => {
    handleFilterChange(key, null);
  }, [handleFilterChange]);

  const handleSidebarFilterChange = useCallback((newFilters: Record<string, any>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    
    params.delete('page');
    router.push(`/ads?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleClearFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    router.push(`/ads?${params.toString()}`, { scroll: false });
  }, [searchQuery, router]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    const excludeKeys = ['search', 'page', 'limit', 'sort'];
    
    searchParams.forEach((value, key) => {
      if (!excludeKeys.includes(key) && value) {
        count++;
      }
    });
    
    return count;
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6">
        {/* Header with result count and filters */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {loading ? 'Searching...' : `${pagination?.total || 0} results`}
              </h1>
              <p className="text-sm text-gray-600">{resultSummary}</p>
            </div>
            
            {/* Mobile Filter Button */}
            {showFilters && (
              <button
                onClick={() => setShowMobileFilters(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FiFilter className="w-5 h-5" />
                <span className="text-sm font-medium">Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Filter Chips */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <FilterChips 
                filters={filters}
                onRemove={handleRemoveFilter}
                onClearAll={handleClearFilters}
              />
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex gap-6">
          {/* Desktop Sidebar Filters */}
          {showFilters && (
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-24">
                <AdsFilterSidebar 
                  filters={filters}
                  onFilterChange={handleSidebarFilterChange}
                />
              </div>
            </aside>
          )}

          {/* Results Grid */}
          <main className="flex-1 min-w-0">
            {loading && ads.length === 0 ? (
              <AdsGridSkeleton count={12} />
            ) : error ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <p className="text-red-600 font-medium mb-2">Error loading results</p>
                <p className="text-sm text-gray-600">{error}</p>
              </div>
            ) : ads.length === 0 ? (
              <EmptyState
                title="No results found"
                description="Try adjusting your search or filters"
                actionLabel="Clear filters"
                onAction={handleClearFilters}
              />
            ) : (
              <>
                {/* Results Grid (normal ads + injected sponsored ads) */}
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {ads.map((ad: any, index: number) => {
                    if (ad?._type === 'sponsored') {
                      return <SponsoredAdFeedCard key={`sp-${ad.id}-${index}`} ad={ad} />;
                    }
                    return <LazyAdCard key={ad.id} ad={ad} />;
                  })}
                </div>

                {/* Pagination Info */}
                {pagination && (
                  <div className="mt-6 text-center text-sm text-gray-600">
                    Showing {ads.length} of {pagination.total} results
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filter Overlay */}
      {showMobileFilters && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden">
          <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white shadow-xl">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Filters</h2>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              {/* Filters Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <AdsFilterSidebar 
                  filters={filters}
                  onFilterChange={handleSidebarFilterChange}
                />
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex gap-3">
                  <button
                    onClick={handleClearFilters}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Show {pagination?.total || 0} Results
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
