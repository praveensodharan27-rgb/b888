'use client';

/**
 * OLX-Style Search Page
 * 
 * Features:
 * - Smart search bar with autocomplete
 * - Search results grid with badges
 * - Filters sidebar
 * - Pagination
 * - Recent and trending searches
 */

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import OLXSearchBar from '@/components/search/OLXSearchBar';
import SearchResultsGrid from '@/components/search/SearchResultsGrid';
import { useSearch } from '@/hooks/useSearch';

function SearchPageContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || undefined;
  const location = searchParams.get('location') || undefined;
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
  const condition = searchParams.get('condition') || undefined;
  const sort = searchParams.get('sort') || 'newest';

  const {
    results,
    total,
    page,
    totalPages,
    processingTime,
    isSearching,
    search,
    loadMore,
  } = useSearch({
    autoSearch: false,
    initialQuery: query,
    category,
    location,
    minPrice,
    maxPrice,
    condition,
    sort,
  });

  // Perform search on mount and when params change
  useEffect(() => {
    if (query) {
      search(query, 1);
    }
  }, [query, category, location, minPrice, maxPrice, condition, sort]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <a href="/" className="text-2xl font-bold text-blue-600">
              Sell Box
            </a>
            <div className="flex-1">
              <OLXSearchBar showButton={true} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-4 py-8">
        {/* Search Query Display */}
        {query && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Search results for "{query}"
            </h1>
            {total > 0 && (
              <p className="text-gray-600 mt-1">
                {total.toLocaleString()} ads found
              </p>
            )}
          </div>
        )}

        {/* Filters Bar */}
        <div className="mb-6 flex items-center gap-4 overflow-x-auto pb-2">
          {/* Sort Dropdown */}
          <select
            value={sort}
            onChange={(e) => {
              const params = new URLSearchParams(searchParams.toString());
              params.set('sort', e.target.value);
              window.location.href = `/search-olx?${params.toString()}`;
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="featured">Featured</option>
            <option value="bumped">Recently Bumped</option>
          </select>

          {/* Active Filters */}
          {category && (
            <div className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2">
              Category: {category}
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete('category');
                  window.location.href = `/search-olx?${params.toString()}`;
                }}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </div>
          )}
          {location && (
            <div className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2">
              Location: {location}
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete('location');
                  window.location.href = `/search-olx?${params.toString()}`;
                }}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Results Grid */}
        <SearchResultsGrid
          results={results}
          total={total}
          page={page}
          totalPages={totalPages}
          isLoading={isSearching}
          onLoadMore={loadMore}
          processingTime={processingTime}
        />
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-[1400px] mx-auto px-4 py-8 text-center text-gray-600">
          <p>© 2026 Sell Box. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
