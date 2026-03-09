'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useInfiniteAds } from '@/hooks/useInfiniteAds';
import { SERVICE_CATEGORIES } from '@/lib/serviceCategories';
import type { ListingFilters, SortOption } from '@/hooks/useListingFilters';
import { CONTENT_CONTAINER_CLASS } from '@/lib/layoutConstants';
import { getAdUrl } from '@/lib/adUrl';
import ImageWithFallback from '@/components/ImageWithFallback';
import { FiMapPin, FiPhone, FiCheckCircle, FiCalendar } from 'react-icons/fi';
import SortDropdown from '@/components/SortDropdown';

interface ServicesListingClientProps {
  categorySlug: string;
  categoryLabel: string;
}

function ServiceCardJustDial({ ad, index = 0 }: { ad: any; index?: number }) {
  const adUrl = getAdUrl(ad);
  const imageUrl = ad.images?.[0]?.trim() || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=400&fit=crop';
  const locationName = ad.location?.name || [ad.city, ad.state].filter(Boolean).join(', ') || '—';
  const phone = ad.user?.phone;
  const phoneForWhatsApp = phone?.replace(/\D/g, '') || '';
  const isVerified = ad.user?.isVerified === true;
  const isSponsored = ad.premiumType != null || ad.isUrgent;
  const rating = ad.rating ?? 4.0;
  const ratingCount = ad.ratingCount ?? 0;
  const price = ad.price != null ? Number(ad.price) : null;
  const categoryName = ad.subcategory?.name || ad.category?.name || '';
  const serviceTags = [categoryName].filter(Boolean).slice(0, 3);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow relative">
      {isSponsored && (
        <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded bg-blue-600 text-white text-xs font-bold">
          SPONSORED
        </span>
      )}
      <div className="flex flex-col sm:flex-row">
        {/* Left: image ~1/3 width */}
        <Link
          href={adUrl}
          className="relative flex-shrink-0 w-full sm:w-56 sm:min-w-[14rem] h-52 sm:h-44 rounded-t-2xl sm:rounded-l-2xl sm:rounded-tr-none overflow-hidden bg-gray-100"
        >
          <ImageWithFallback
            src={imageUrl}
            alt={ad.title || 'Service listing'}
            width={224}
            height={176}
            className="w-full h-full object-cover"
          />
        </Link>

        {/* Right: content */}
        <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={adUrl} className="inline-flex items-center gap-1.5">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 line-clamp-1 hover:text-blue-600 transition-colors">
                  {ad.title}
                </h3>
                <FiCheckCircle
                  className={`w-5 h-5 flex-shrink-0 ${isVerified ? 'text-blue-600' : 'text-gray-300'}`}
                  aria-hidden
                />
              </Link>
            </div>
            {price != null && (
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-500">Starts from</p>
                <p className="text-xl font-bold text-gray-900">₹{price.toLocaleString('en-IN')}</p>
              </div>
            )}
          </div>

          {/* Rating + ratings count + years */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-100 text-green-800 text-sm font-semibold">
              <span>★</span> {Number(rating).toFixed(1)}
            </span>
            {ratingCount > 0 && (
              <span className="text-sm text-gray-500">{ratingCount.toLocaleString()} Ratings</span>
            )}
            {ad.yearsInBusiness != null && (
              <span className="text-sm text-gray-500">{ad.yearsInBusiness} Years in Business</span>
            )}
          </div>

          {/* Location + distance */}
          <p className="text-sm text-gray-600 mt-2 flex items-center gap-1.5 flex-wrap">
            <FiMapPin className="w-4 h-4 flex-shrink-0 text-gray-400" />
            <span className="line-clamp-1">{locationName}</span>
            <Link href={adUrl} className="text-blue-600 hover:underline text-sm flex-shrink-0">
              Near you
            </Link>
          </p>

          {/* Service tags + Open Now */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {serviceTags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium"
              >
                {tag}
              </span>
            ))}
            <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
              Open Now
            </span>
          </div>

          {/* Book Now + Show Number */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-100">
            <Link
              href={adUrl}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
            >
              <FiCalendar className="w-4 h-4" />
              Book Now
            </Link>
            {phone ? (
              <a
                href={`tel:${phone.replace(/\s/g, '')}`}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold text-sm transition-colors"
              >
                <FiPhone className="w-4 h-4" />
                Show Number
              </a>
            ) : (
              <Link
                href={adUrl}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold text-sm transition-colors"
              >
                <FiPhone className="w-4 h-4" />
                Show Number
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ServicesListingClient({ categorySlug, categoryLabel }: ServicesListingClientProps) {
  const [locationSlug, setLocationSlug] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>('All India');
  const [sort, setSort] = useState<SortOption>('newest');

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('selected_location') : null;
      if (raw) {
        const loc = JSON.parse(raw);
        if (loc?.name) setLocationName(loc.name);
        if (loc?.slug) setLocationSlug(loc.slug);
      }
    } catch {
      // ignore
    }
  }, []);

  const subcategoryFilter = categorySlug === 'all' ? undefined : categorySlug;
  const filters = useMemo<ListingFilters>(
    () => ({
      page: 1,
      limit: 20,
      location: locationSlug ?? '',
      category: 'services',
      subcategory: subcategoryFilter ?? '',
      sort,
    }),
    [locationSlug, subcategoryFilter, sort]
  );

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteAds({
    location: filters.location || undefined,
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

  const title = locationSlug ? `${categoryLabel} in ${locationName}` : categoryLabel;
  const subtitle = totalCount !== undefined ? `${totalCount} listings` : undefined;

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {/* JustDial-style header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className={`${CONTENT_CONTAINER_CLASS} py-5`}>
          <nav className="text-sm text-gray-500 mb-4">
            <Link href="/" className="hover:text-[#ff6b00] transition-colors">Home</Link>
            <span className="mx-1.5">/</span>
            <Link href="/services" className="hover:text-[#ff6b00] transition-colors">Services</Link>
            <span className="mx-1.5">/</span>
            <span className="text-gray-800 font-medium">{categoryLabel}</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {title}
          </h1>
        </div>
      </header>

      <div className={`${CONTENT_CONTAINER_CLASS} py-6`}>
        {/* Result count + Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <p className="text-gray-600 text-sm">
            {totalCount !== undefined ? `${totalCount} listings found` : 'Loading...'}
          </p>
          <SortDropdown value={filters.sort} onChange={(s) => setSort(s)} />
        </div>

        {/* Loading */}
        {isLoading && ads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#ff6b00] border-t-transparent" />
            <p className="mt-4 text-gray-500">Loading listings...</p>
          </div>
        )}

        {/* Error */}
        {isError && ads.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-red-600 mb-4">Failed to load listings. Please try again.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-[#ff6b00] text-white font-medium hover:opacity-90"
            >
              Retry
            </button>
          </div>
        )}

        {/* Listing - JustDial style cards */}
        {!isLoading && !isError && ads.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-700 font-medium">No {categoryLabel.toLowerCase()} found</p>
            <p className="text-gray-500 text-sm mt-1">Try another category or location.</p>
            <Link
              href="/services"
              className="inline-block mt-4 px-4 py-2 rounded-lg bg-[#ff6b00] text-white font-medium hover:opacity-90"
            >
              Browse services
            </Link>
          </div>
        )}

        {ads.length > 0 && (
          <div className="space-y-4">
            {ads.map((ad: any) => (
              <ServiceCardJustDial key={ad.id} ad={ad} />
            ))}
            {hasNextPage && (
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="px-6 py-3 rounded-lg bg-[#ff6b00] hover:bg-[#e65c00] text-white font-semibold disabled:opacity-50 transition-colors"
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Other service categories - JustDial style */}
        <section className="mt-10 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Other service categories</h2>
          <div className="flex flex-wrap gap-2">
            {SERVICE_CATEGORIES.filter((c) => (c.slug ?? 'all') !== categorySlug && (c.slug || c.id === 'all')).map(
              (c) => (
                <Link
                  key={c.id}
                  href={c.slug ? `/services/${c.slug}` : '/services/all'}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-gray-200 text-gray-700 font-medium text-sm hover:border-[#ff6b00] hover:text-[#ff6b00] transition-colors"
                >
                  {c.id === 'all' ? 'All Services' : c.label}
                </Link>
              )
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
