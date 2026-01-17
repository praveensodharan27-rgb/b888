'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useListingFilters } from '@/hooks/useListingFilters';
import ListingPageLayout from '@/components/ListingPageLayout';
import Pagination from '@/components/Pagination';
import dynamic from 'next/dynamic';

const BannersDynamic = dynamic(() => import('@/components/Banners'), {
  loading: () => null
});

interface SubcategoryPageClientProps {
  data: {
    subcategory: {
      id: string;
      name: string;
      slug: string;
      description?: string;
      metaTitle?: string;
      metaDescription?: string;
      _count?: {
        ads: number;
      };
    };
    category: {
      id: string;
      name: string;
      slug: string;
    };
    listings: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  categorySlug: string;
  subcategorySlug: string;
}

export default function SubcategoryPageClient({ 
  data, 
  categorySlug, 
  subcategorySlug 
}: SubcategoryPageClientProps) {
  const { filters, handleFilterChange, handleRemoveFilter, handleClearAllFilters } = useListingFilters({
    defaultCategory: categorySlug,
    defaultSubcategory: subcategorySlug,
    excludeFromUrl: ['category', 'subcategory'],
  });

  const ads = useMemo(() => data.listings || [], [data.listings]);

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
          <Link href={`/${categorySlug}`} className="hover:text-blue-600">
            {data.category.name}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">{data.subcategory.name}</span>
        </nav>

        {/* Subcategory Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{data.subcategory.name}</h1>
          {data.subcategory.description && (
            <p className="text-gray-600 text-lg">{data.subcategory.description}</p>
          )}
          {data.subcategory._count && (
            <p className="text-gray-500 mt-2">
              {data.subcategory._count.ads} {data.subcategory._count.ads === 1 ? 'listing' : 'listings'} available
            </p>
          )}
        </div>

        <ListingPageLayout
          filters={filters}
          onFilterChange={handleFilterChange}
          onRemoveFilter={handleRemoveFilter}
          onClearAllFilters={handleClearAllFilters}
          ads={ads}
          isLoading={false}
          isError={false}
          totalCount={data.pagination?.total}
          subtitle={`${data.pagination?.total ?? ads.length} listings in this subcategory`}
          emptyStateTitle="No ads found for this subcategory"
          emptyStateMessage={`We couldn't find any ads in ${data.subcategory.name}. Try adjusting your filters or check back later.`}
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

