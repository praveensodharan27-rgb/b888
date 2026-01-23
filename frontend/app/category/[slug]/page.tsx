'use client';

import { useMemo } from 'react';
import { useAds } from '@/hooks/useAds';
import { useListingFilters } from '@/hooks/useListingFilters';
import ListingPageLayout from '@/components/ListingPageLayout';
import Pagination from '@/components/Pagination';
import dynamic from 'next/dynamic';

const BannersDynamic = dynamic(() => import('@/components/Banners'), {
  loading: () => null
});

// Next.js 15 types `params` as a Promise in PageProps; in client components we keep it flexible
// to avoid type-check failures while still supporting runtime usage.
export default function CategoryPage({ params }: { params: any }) {
  const { filters, handleFilterChange, handleRemoveFilter, handleClearAllFilters } = useListingFilters({
    defaultCategory: params.slug,
    excludeFromUrl: ['category'],
  });

  const { data, isLoading, isError } = useAds(filters);
  const ads = useMemo(() => data?.ads || [], [data]);

  const categoryName = params.slug.replace(/-/g, ' ');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Banners at the top */}
        <div className="mb-6">
          <BannersDynamic position="category" />
        </div>
        
        <ListingPageLayout
      filters={filters}
      onFilterChange={handleFilterChange}
      onRemoveFilter={handleRemoveFilter}
      onClearAllFilters={handleClearAllFilters}
      ads={ads}
      isLoading={isLoading}
      isError={isError}
      totalCount={data?.pagination?.total}
      title={categoryName.charAt(0).toUpperCase() + categoryName.slice(1)}
      subtitle={`${data?.pagination?.total ?? ads.length} listings in this category`}
      emptyStateTitle="No ads found for this category"
      emptyStateMessage={`We couldn't find any ads in ${categoryName}. Try adjusting your filters or check back later.`}
    >
      {data?.pagination && data.pagination.pages > 1 && (
        <div className="mt-8">
          <Pagination
            currentPage={filters.page}
            totalPages={data.pagination.pages}
            onPageChange={(page) => handleFilterChange({ page })}
          />
        </div>
      )}
      </ListingPageLayout>
      </div>
    </div>
  );
}

