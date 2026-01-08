'use client';

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useInfiniteAds } from '@/hooks/useInfiniteAds';
import dynamic from 'next/dynamic';
import AdCardOLX from '@/components/AdCardOLX';
import EmptyState from '@/components/EmptyState';

// Lazy load heavy components
const Filters = dynamic(() => import('@/components/Filters'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
});
const AdvancedSearchBar = dynamic(() => import('@/components/AdvancedSearchBar'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-12 rounded-lg"></div>
});
const SmartFiltersPanel = dynamic(() => import('@/components/SmartFiltersPanel'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>
});
const FilterChips = dynamic(() => import('@/components/FilterChips'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-10 rounded-lg"></div>
});
const Banners = dynamic(() => import('@/components/Banners'), {
  loading: () => null
});
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { dummyAds } from '@/lib/dummyData';

function AdsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [filters, setFilters] = useState<{
    limit: number;
    category?: string;
    subcategory?: string;
    location?: string;
    minPrice?: string;
    maxPrice?: string;
    search?: string;
    condition?: string;
    sort?: 'newest' | 'oldest' | 'price_low' | 'price_high' | 'featured' | 'bumped';
    latitude?: string;
    longitude?: string;
    radius?: string;
  }>({
    limit: 20,
    category: searchParams.get('category') || undefined,
    subcategory: searchParams.get('subcategory') || undefined,
    location: searchParams.get('location') || undefined,
    minPrice: searchParams.get('minPrice') || undefined,
    maxPrice: searchParams.get('maxPrice') || undefined,
    search: searchParams.get('search') || undefined,
    condition: searchParams.get('condition') || undefined,
    sort: (searchParams.get('sort') || 'newest') as 'newest' | 'oldest' | 'price_low' | 'price_high' | 'featured' | 'bumped',
    latitude: searchParams.get('latitude') || undefined,
    longitude: searchParams.get('longitude') || undefined,
    radius: searchParams.get('radius') || '50',
  });

  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);

  // Sync URL searchParams to filters state when URL changes
  useEffect(() => {
    const categoryFromUrl = searchParams.get('category') || undefined;
    const subcategoryFromUrl = searchParams.get('subcategory') || undefined;
    const locationFromUrl = searchParams.get('location') || undefined;
    const minPriceFromUrl = searchParams.get('minPrice') || undefined;
    const maxPriceFromUrl = searchParams.get('maxPrice') || undefined;
    const searchFromUrl = searchParams.get('search') || undefined;
    const conditionFromUrl = searchParams.get('condition') || undefined;
    const sortFromUrl = (searchParams.get('sort') || 'newest') as 'newest' | 'oldest' | 'price_low' | 'price_high' | 'featured' | 'bumped';
    
    // Update filters from URL - this will trigger a refetch via React Query
    setFilters({
      limit: 20,
      category: categoryFromUrl,
      subcategory: subcategoryFromUrl,
      location: locationFromUrl,
      minPrice: minPriceFromUrl,
      maxPrice: maxPriceFromUrl,
      search: searchFromUrl,
      condition: conditionFromUrl,
      sort: sortFromUrl,
      latitude: searchParams.get('latitude') || undefined,
      longitude: searchParams.get('longitude') || undefined,
      radius: searchParams.get('radius') || '50',
    });
  }, [
    searchParams.get('category'),
    searchParams.get('subcategory'),
    searchParams.get('location'),
    searchParams.get('minPrice'),
    searchParams.get('maxPrice'),
    searchParams.get('search'),
    searchParams.get('condition'),
    searchParams.get('sort'),
  ]); // Re-run when any search param changes

  // Use infinite scroll (lazy loading) for better performance
  const infiniteQuery = useInfiniteAds(filters);
  
  // Flatten infinite query pages
  const adsData = infiniteQuery.data && infiniteQuery.data.pages && infiniteQuery.data.pages.length > 0
    ? {
        ads: infiniteQuery.data.pages.flatMap(page => (page.ads && Array.isArray(page.ads)) ? page.ads : []),
        pagination: infiniteQuery.data.pages[infiniteQuery.data.pages.length - 1]?.pagination || { page: 1, limit: 20, total: 0, pages: 1 }
      }
    : { 
        ads: [], 
        pagination: { page: 1, limit: 20, total: 0, pages: 1 } 
      };
  
  const isLoading = infiniteQuery.isLoading || infiniteQuery.isFetchingNextPage;
  const isError = infiniteQuery.isError;
  const hasNextPage = infiniteQuery.hasNextPage;
  const fetchNextPage = infiniteQuery.fetchNextPage;
  
  // Debug logging
  useEffect(() => {
    if (infiniteQuery.data) {
      console.log('📊 Infinite Query Data:', {
        pages: infiniteQuery.data.pages.length,
        totalAds: adsData.ads.length,
        hasNextPage,
        isLoading,
        isError
      });
    }
  }, [infiniteQuery.data, adsData.ads.length, hasNextPage, isLoading, isError]);

  // Intersection observer for infinite scroll
  const { elementRef: loadMoreRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '200px',
    triggerOnce: false
  });

  // Auto-load more when intersection occurs
  useEffect(() => {
    if (isIntersecting && hasNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isLoading, fetchNextPage]);

  const handleFilterChange = (newFilters: any) => {
    const updatedFilters = { ...filters, ...newFilters };
    
    // IMPORTANT: If search keyword exists, remove category and subcategory filters (search overrides category)
    if (updatedFilters.search && updatedFilters.search.trim()) {
      updatedFilters.category = '';
      updatedFilters.subcategory = '';
    }
    
    setFilters(updatedFilters);
    
    // Update URL with new filters - only include non-empty values
    const params = new URLSearchParams();
    Object.entries(updatedFilters).forEach(([key, value]) => {
      if (value && value !== '' && key !== 'limit') {
        params.append(key, String(value));
      }
    });
    const queryString = params.toString();
    router.push(queryString ? `/ads?${queryString}` : '/ads', { scroll: false });
  };

  const handleRemoveFilter = (key: string) => {
    // Remove the filter by setting it to empty string
    // handleFilterChange will automatically exclude empty values from URL
    if (key === 'price') {
      // Price filter removes both min and max
      handleFilterChange({ minPrice: '', maxPrice: '' });
    } else {
      handleFilterChange({ [key]: '' });
    }
  };

  const handleClearAllFilters = () => {
    handleFilterChange({
      category: '',
      subcategory: '',
      location: '',
      minPrice: '',
      maxPrice: '',
      condition: '',
      search: '',
    });
  };

  const handleSearch = (searchTerm: string) => {
    // When search exists, remove category and subcategory filters (search overrides category)
    if (searchTerm && searchTerm.trim()) {
      handleFilterChange({ 
        search: searchTerm,
        category: '', // Clear category when searching
        subcategory: '' // Clear subcategory when searching
      });
    } else {
      // If search is cleared, keep other filters
      handleFilterChange({ search: searchTerm });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Banners at the top */}
        <div className="mb-6">
          <Banners position="search" />
        </div>
        
        {/* Advanced Search Bar */}
        <div className="mb-6">
          <AdvancedSearchBar 
            initialSearch={filters.search} 
            onSearch={handleSearch}
            showQuickFilters={true}
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Smart Filters Panel */}
          <aside className="lg:w-80 flex-shrink-0">
            <SmartFiltersPanel
              filters={filters}
              onFilterChange={handleFilterChange}
              isExpanded={isFiltersExpanded}
              onToggleExpand={() => setIsFiltersExpanded(!isFiltersExpanded)}
            />
          </aside>

          <main className="flex-1">
            {/* Results Header with Filter Chips */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">All Ads</h1>
                    <p className="text-gray-500 mt-1">
                      {adsData.pagination?.total || adsData.ads.length} listings found
                    </p>
                  </div>
                  <select
                    value={filters.sort}
                    onChange={(e) => handleFilterChange({ sort: e.target.value })}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                    <option value="featured">Featured</option>
                    <option value="bumped">Recently Bumped</option>
                  </select>
                </div>

                {/* Filter Chips */}
                <FilterChips
                  filters={filters}
                  onRemove={handleRemoveFilter}
                  onClearAll={handleClearAllFilters}
                />
              </div>
            </div>

            {isLoading && adsData.ads.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                <p className="mt-4 text-gray-500">Loading ads...</p>
              </div>
            ) : isError && adsData.ads.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-red-500 mb-4">Failed to load ads. Please try again.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {adsData.ads.map((ad: any, index: number) => (
                    <AdCardOLX key={ad.id} ad={ad} />
                  ))}
                </div>

                {adsData.ads.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">No ads found</p>
                    <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
                  </div>
                )}

                {/* Lazy Loading - Infinite Scroll Trigger */}
                <div ref={loadMoreRef} className="py-8">
                  {hasNextPage && (
                    <div className="text-center">
                      {isLoading && (
                        <div className="flex items-center justify-center gap-2 text-gray-500">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                          <span>Loading more ads...</span>
                        </div>
                      )}
                    </div>
                  )}
                  {!hasNextPage && adsData.ads.length > 0 && (
                    <div className="text-center text-gray-500 py-4">
                      <p>No more ads to load</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function AdsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    }>
      <AdsPageContent />
    </Suspense>
  );
}
