'use client';

import { ReactNode } from 'react';
import SmartFiltersPanel from './SmartFiltersPanel';
import EmptyState from './EmptyState';
import AdCardOGNOX from './AdCardOGNOX';
import SortDropdown from './SortDropdown';
import FilterChips from './FilterChips';
import { ListingFilters, SortOption } from '@/hooks/useListingFilters';
import dynamic from 'next/dynamic';

const SmartFiltersPanelDynamic = dynamic(() => import('@/components/SmartFiltersPanel'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>
});

interface ListingPageLayoutProps {
  filters: ListingFilters;
  onFilterChange: (filters: Partial<ListingFilters>) => void;
  onRemoveFilter: (key: keyof ListingFilters) => void;
  onClearAllFilters: () => void;
  ads: any[];
  isLoading: boolean;
  isError: boolean;
  totalCount?: number;
  title?: string;
  subtitle?: string;
  showFilters?: boolean;
  showFilterChips?: boolean;
  emptyStateTitle?: string;
  emptyStateMessage?: string;
  emptyStateIcon?: string;
  children?: ReactNode;
  headerActions?: ReactNode;
}

export default function ListingPageLayout({
  filters,
  onFilterChange,
  onRemoveFilter,
  onClearAllFilters,
  ads,
  isLoading,
  isError,
  totalCount,
  title,
  subtitle,
  showFilters = true,
  showFilterChips = false,
  emptyStateTitle = 'No ads found',
  emptyStateMessage = 'Try adjusting your filters or check back later.',
  emptyStateIcon = 'search',
  children,
  headerActions,
}: ListingPageLayoutProps) {
  const handleSortChange = (sort: SortOption) => {
    onFilterChange({ sort });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Smart Filters Panel */}
          {showFilters && (
            <aside className="lg:w-80 flex-shrink-0">
              <SmartFiltersPanelDynamic
                filters={filters}
                onFilterChange={onFilterChange}
                isExpanded={true}
                onToggleExpand={() => {}}
              />
            </aside>
          )}

          <main className="flex-1">
            {/* Header */}
            {(title || subtitle || headerActions) && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      {title && <h1 className="text-3xl font-bold text-gray-900">{title}</h1>}
                      {subtitle && (
                        <p className="text-gray-500 mt-1">
                          {subtitle || `${totalCount ?? ads.length} listings found`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {headerActions}
                      <SortDropdown value={filters.sort} onChange={handleSortChange} />
                    </div>
                  </div>

                  {/* Filter Chips */}
                  {showFilterChips && (
                    <FilterChips
                      filters={filters}
                      onRemove={onRemoveFilter}
                      onClearAll={onClearAllFilters}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && ads.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-500">Loading ads...</p>
              </div>
            ) : isError && ads.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-red-500 mb-4">Failed to load ads. Please try again.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : ads.length === 0 ? (
              <EmptyState
                title={emptyStateTitle}
                message={emptyStateMessage}
                icon={emptyStateIcon}
              />
            ) : (
              <>
                {/* Ads Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {ads.map((ad: any) => (
                    <AdCardOGNOX key={ad.id} ad={ad} />
                  ))}
                </div>

                {/* Custom Children (e.g., pagination, load more) */}
                {children}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

