'use client';

/**
 * SearchResultsGrid - Grid layout for search results
 * 
 * Features:
 * - Responsive grid (1-4 columns)
 * - Loading states
 * - Empty states
 * - Pagination
 * - Load more button
 */

import SearchResultCard from './SearchResultCard';
import { SearchResult } from '@/hooks/useSearch';

interface SearchResultsGridProps {
  results: SearchResult[];
  total: number;
  page: number;
  totalPages: number;
  isLoading?: boolean;
  onLoadMore?: () => void;
  processingTime?: number;
}

export default function SearchResultsGrid({
  results,
  total,
  page,
  totalPages,
  isLoading = false,
  onLoadMore,
  processingTime,
}: SearchResultsGridProps) {
  if (isLoading && results.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg overflow-hidden shadow animate-pulse">
            <div className="aspect-[4/3] bg-gray-200"></div>
            <div className="p-4 space-y-3">
              <div className="h-6 bg-gray-200 rounded w-2/3"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!isLoading && results.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gray-100 mb-6">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">No results found</h3>
        <p className="text-gray-600 mb-6">Try adjusting your search or filters</p>
        <div className="space-y-2 text-sm text-gray-500">
          <p>• Check your spelling</p>
          <p>• Try more general keywords</p>
          <p>• Try different keywords</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results Info */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div>
          Showing <span className="font-semibold">{results.length}</span> of{' '}
          <span className="font-semibold">{total.toLocaleString()}</span> results
        </div>
        {processingTime && (
          <div>
            Found in <span className="font-semibold">{processingTime}ms</span>
          </div>
        )}
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {results.map((ad) => (
          <SearchResultCard key={ad.id} ad={ad} />
        ))}
      </div>

      {/* Load More Button */}
      {page < totalPages && (
        <div className="flex justify-center pt-8">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading...
              </span>
            ) : (
              `Load More (${totalPages - page} pages remaining)`
            )}
          </button>
        </div>
      )}

      {/* Pagination Info */}
      <div className="text-center text-sm text-gray-500">
        Page {page} of {totalPages}
      </div>
    </div>
  );
}
