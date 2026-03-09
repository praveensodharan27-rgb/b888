'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useInfiniteAds } from '@/hooks/useInfiniteAds';
import ListingPageLayout from '@/components/ListingPageLayout';
import { getServiceCategoryUrl, getServicesBaseUrl } from '@/lib/servicesUrl';
import { SERVICE_CATEGORIES } from '@/lib/serviceCategories';
import type { ListingFilters, SortOption } from '@/hooks/useListingFilters';

interface ServicesCategoryClientProps {
  citySlug: string;
  categorySlug: string;
  locationName: string;
  categoryLabel: string;
}

export default function ServicesCategoryClient({
  citySlug,
  categorySlug,
  locationName,
  categoryLabel,
}: ServicesCategoryClientProps) {
  const subcategoryFilter = categorySlug === 'all' ? undefined : categorySlug;
  const filters = useMemo<ListingFilters>(() => ({
    page: 1,
    limit: 20,
    location: citySlug,
    category: 'services',
    subcategory: subcategoryFilter ?? '',
    sort: 'newest' as SortOption,
  }), [citySlug, subcategoryFilter]);

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteAds({
    location: filters.location,
    category: filters.category,
    subcategory: filters.subcategory || undefined,
    limit: 20,
    sort: filters.sort,
  });

  const ads = useMemo(() => {
    const pages = data?.pages ?? [];
    return pages.flatMap((p) => p.ads ?? []);
  }, [data]);
  const totalCount = data?.pages?.[0]?.total ?? 0;

  const onFilterChange = () => {};
  const onRemoveFilter = () => {};
  const onClearAllFilters = () => {};

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8">
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-700">Home</Link>
        <span className="mx-1">/</span>
        <Link href={getServicesBaseUrl(citySlug)} className="hover:text-gray-700">{locationName}</Link>
        <span className="mx-1">/</span>
        <Link href={getServicesBaseUrl(citySlug)} className="hover:text-gray-700">Services</Link>
        <span className="mx-1">/</span>
        <span className="text-gray-900">{categoryLabel}</span>
      </nav>

      <ListingPageLayout
        filters={filters}
        onFilterChange={onFilterChange}
        onRemoveFilter={onRemoveFilter}
        onClearAllFilters={onClearAllFilters}
        ads={ads}
        isLoading={isLoading}
        isError={isError}
        totalCount={totalCount}
        title={`${categoryLabel} in ${locationName}`}
        subtitle={totalCount !== undefined ? `${totalCount} listings` : undefined}
        showFilters={false}
        showFilterChips={false}
        emptyStateTitle="No services found"
        emptyStateMessage={`No ${categoryLabel.toLowerCase()} listed in ${locationName} yet. Try another category or location.`}
        emptyStateIcon="filter"
      >
        {hasNextPage && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isFetchingNextPage ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </ListingPageLayout>

      <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Other service categories in {locationName}</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {SERVICE_CATEGORIES.filter((c) => c.slug !== categorySlug && (c.slug || c.id === 'all')).map((c) => (
            <li key={c.id}>
              <Link
                href={c.slug ? getServiceCategoryUrl(citySlug, c.slug) : getServiceCategoryUrl(citySlug, 'all')}
                className="inline-block rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                {c.id === 'all' ? 'All Services' : c.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
