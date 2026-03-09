'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useListingFilters } from '@/hooks/useListingFilters';
import ListingPageLayout from '@/components/ListingPageLayout';
import Pagination from '@/components/Pagination';
import dynamic from 'next/dynamic';

const BannersDynamic = dynamic(() => import('@/components/Banners'), {
  ssr: false,
  loading: () => <div className="mb-6 min-h-[120px]" aria-hidden />,
});

interface CategoryPageClientProps {
  data: {
    category: {
      id: string;
      name: string;
      slug: string;
      description?: string;
      metaTitle?: string;
      metaDescription?: string;
      image?: string;
      subcategories: Array<{
        id: string;
        name: string;
        slug: string;
        description?: string;
        _count?: {
          ads: number;
        };
      }>;
    };
    recentListings: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  categorySlug: string;
}

export default function CategoryPageClient({ data, categorySlug }: CategoryPageClientProps) {
  const { filters, handleFilterChange, handleRemoveFilter, handleClearAllFilters } = useListingFilters({
    defaultCategory: categorySlug,
    excludeFromUrl: ['category'],
  });

  const ads = useMemo(() => data.recentListings || [], [data.recentListings]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Banners at the top */}
        <div className="mb-6">
          <BannersDynamic position="category" categoryId={data.category.id} />
        </div>

        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-gray-600">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">{data.category.name}</span>
        </nav>

        {/* Category Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{data.category.name}</h1>
          {data.category.description && (
            <p className="text-gray-600 text-lg">{data.category.description}</p>
          )}
        </div>

        {/* Subcategories */}
        {data.category.subcategories && data.category.subcategories.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">Browse by Subcategory</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {data.category.subcategories.map((subcat) => (
                <Link
                  key={subcat.id}
                  href={`/${categorySlug}/${subcat.slug}`}
                  className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 hover:border-blue-500"
                >
                  <h3 className="font-semibold text-gray-900 mb-1">{subcat.name}</h3>
                  {subcat._count && (
                    <p className="text-sm text-gray-500">
                      {subcat._count.ads} {subcat._count.ads === 1 ? 'listing' : 'listings'}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        <ListingPageLayout
          filters={filters}
          onFilterChange={handleFilterChange}
          onRemoveFilter={handleRemoveFilter}
          onClearAllFilters={handleClearAllFilters}
          ads={ads}
          isLoading={false}
          isError={false}
          totalCount={data.pagination?.total}
          subtitle={`${data.pagination?.total ?? ads.length} listings in this category`}
          emptyStateTitle="No ads found for this category"
          emptyStateMessage={`We couldn't find any ads in ${data.category.name}. Try adjusting your filters or check back later.`}
        >
          {data.pagination && data.pagination.pages > 1 && (
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

