'use client';

import ListingPageLayout from '@/components/ListingPageLayout';
import { useListingFilters } from '@/hooks/useListingFilters';
import { useAds } from '@/hooks/useAds';

export default function AdsPage() {
  const { filters, handleFilterChange, handleRemoveFilter, handleClearAllFilters } =
    useListingFilters();

  const { data, isLoading, isError } = useAds({
    page: filters.page,
    limit: filters.limit,
    category: filters.category,
    subcategory: filters.subcategory,
    location: filters.location,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    search: filters.search,
    condition: filters.condition,
    sort: filters.sort,
  });

  const ads = data?.ads || [];
  const total = data?.pagination?.total ?? ads.length;

  return (
    <ListingPageLayout
              filters={filters}
              onFilterChange={handleFilterChange}
      onRemoveFilter={handleRemoveFilter}
      onClearAllFilters={handleClearAllFilters}
      ads={ads}
      isLoading={isLoading}
      isError={isError}
      totalCount={total}
      title="All Ads"
      subtitle={`${total} listings found`}
      showFilters={true}
      showFilterChips={true}
    />
  );
}

