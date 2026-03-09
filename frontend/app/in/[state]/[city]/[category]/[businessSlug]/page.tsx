import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBaseUrl, getApiBaseOrigin } from '@/lib/seo';
import { getBusinessBySlug, dirUrl } from '@/lib/directory';
import { BusinessPageClient } from './BusinessPageClient';
import { LeadTrackLink } from '@/components/directory/LeadTrackLink';
import { BusinessMapEmbed } from '@/components/directory/BusinessMapEmbed';
import { FiMapPin, FiPhone, FiGlobe, FiClock, FiStar, FiMessageCircle, FiHeart } from 'react-icons/fi';

type Props = { params: Promise<{ state: string; city: string; category: string; businessSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateSlug, city: citySlug, category: categorySlug, businessSlug } = await params;
  const business = await getBusinessBySlug(stateSlug, citySlug, categorySlug, businessSlug);
  if (!business) return { title: 'Business Not Found' };
  const cityName = business.city?.name || citySlug;
  const title = `Best ${business.category?.name || 'Business'} in ${cityName} | ${business.name}`;
  const description =
    business.description?.slice(0, 155) ||
    `Contact ${business.name} in ${cityName}. ${business.phone ? `Call ${business.phone}. ` : ''}Read reviews and get in touch.`;
  const canonical = dirUrl(stateSlug, citySlug, categorySlug, businessSlug);
  const image = business.images?.[0]
    ? business.images[0].startsWith('http')
      ? business.images[0]
      : `${getApiBaseOrigin()}${business.images[0].startsWith('/') ? '' : '/'}${business.images[0]}`
    : undefined;
  return {
    title: title.slice(0, 60),
    description: description.slice(0, 160),
    keywords: `${business.name} ${cityName}, ${business.category?.name} ${cityName}, ${business.name} contact`,
    openGraph: {
      title: title.slice(0, 60),
      description: description.slice(0, 160),
      url: canonical,
      type: 'website',
      ...(image && { images: [{ url: image, alt: business.name }] }),
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: title.slice(0, 60), description: description.slice(0, 160) },
    alternates: { canonical },
  };
}

function buildLocalBusinessLd(business: any, base: string, stateSlug: string, citySlug: string, categorySlug: string) {
  const url = dirUrl(stateSlug, citySlug, categorySlug, business.slug);
  const openHours = business.openingHours && typeof business.openingHours === 'object';
  const days = openHours ? ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] : [];
  const openingHoursSpec = openHours
    ? days
        .filter((d) => business.openingHours[d])
        .map((d) => {
          const v = business.openingHours[d];
          return typeof v === 'string' ? v : null;
        })
        .filter(Boolean)
    : undefined;

  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    description: business.description || undefined,
    url,
    telephone: business.phone || undefined,
    email: business.email || undefined,
    address: business.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: business.address,
          addressLocality: business.city?.name,
          addressRegion: business.state?.name,
        }
      : undefined,
    geo:
      business.latitude != null && business.longitude != null
        ? { '@type': 'GeoCoordinates', latitude: business.latitude, longitude: business.longitude }
        : undefined,
    aggregateRating:
      business.reviewCount > 0 && business.rating != null
        ? {
            '@type': 'AggregateRating',
            ratingValue: business.rating,
            bestRating: 5,
            worstRating: 1,
            ratingCount: business.reviewCount,
          }
        : undefined,
  };
  if (openingHoursSpec && openingHoursSpec.length) ld.openingHoursSpecification = openingHoursSpec;
  if (business.reviews?.length) {
    ld.review = business.reviews.slice(0, 10).map((r: { authorName: string; rating: number; content?: string; createdAt: string }) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.authorName },
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
      reviewBody: r.content,
      datePublished: r.createdAt,
    }));
  }
  return ld;
}

const DAY_LABELS: Record<string, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

function formatOpeningHours(hours: Record<string, string> | null | undefined): string[] {
  if (!hours || typeof hours !== 'object') return [];
  const list: string[] = [];
  const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri'];
  const weekdayVal = weekdays.map((d) => hours[d]).filter(Boolean);
  const sameWeekday = weekdayVal.length === 5 && new Set(weekdayVal).size === 1;
  if (sameWeekday && weekdayVal[0]) {
    list.push(`Mon - Fri: ${weekdayVal[0]}`);
  } else {
    weekdays.forEach((d) => {
      if (hours[d]) list.push(`${DAY_LABELS[d]}: ${hours[d]}`);
    });
  }
  if (hours.sat) list.push(`Saturday: ${hours.sat}`);
  list.push(`Sunday: ${(hours.sun && String(hours.sun).toLowerCase() !== 'closed') ? hours.sun : 'Closed'}`);
  return list;
}

export default async function BusinessPage({ params }: Props) {
  const { state: stateSlug, city: citySlug, category: categorySlug, businessSlug } = await params;
  const business = await getBusinessBySlug(stateSlug, citySlug, categorySlug, businessSlug);
  if (!business) notFound();

  const base = getBaseUrl();
  const localBusinessLd = buildLocalBusinessLd(business, base, stateSlug, citySlug, categorySlug);
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'India', item: `${base}/in` },
      { '@type': 'ListItem', position: 2, name: business.state?.name, item: `${base}/in/${stateSlug}` },
      { '@type': 'ListItem', position: 3, name: business.city?.name, item: `${base}/in/${stateSlug}/${citySlug}` },
      { '@type': 'ListItem', position: 4, name: business.category?.name, item: `${base}/in/${stateSlug}/${citySlug}/${categorySlug}` },
      { '@type': 'ListItem', position: 5, name: business.name, item: dirUrl(stateSlug, citySlug, categorySlug, businessSlug) },
    ],
  };

  const locationLine = [business.city?.name, business.state?.name].filter(Boolean).join(', ');
  const openingHoursLines = formatOpeningHours(business.openingHours as Record<string, string> | undefined);
  const reviews = (business.reviews || []) as { id: string; authorName: string; rating: number; content?: string; createdAt: string }[];
  const initialReviews = reviews.slice(0, 3);
  const hasMoreReviews = reviews.length > 3;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* Hero / Banner */}
      <header className="relative overflow-hidden bg-gradient-to-br from-slate-700 to-slate-900">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.04\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-80" />
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-6 sm:px-6 lg:px-8">
          <nav className="mb-6 text-sm text-slate-300">
            <Link href="/in" className="hover:text-white">India</Link>
            <span className="mx-1">/</span>
            <Link href={`/in/${stateSlug}`} className="hover:text-white">{business.state?.name}</Link>
            <span className="mx-1">/</span>
            <Link href={`/in/${stateSlug}/${citySlug}`} className="hover:text-white">{business.city?.name}</Link>
            <span className="mx-1">/</span>
            <Link href={`/in/${stateSlug}/${citySlug}/${categorySlug}`} className="hover:text-white">{business.category?.name}</Link>
            <span className="mx-1">/</span>
            <span className="text-white">{business.name}</span>
          </nav>

          <div className="flex flex-wrap items-end gap-4 sm:gap-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-white/20 bg-white/10 text-2xl font-bold text-white shadow-lg">
              {(business.name || 'B').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-white sm:text-3xl">{business.name}</h1>
                {business.isVerified && (
                  <span className="inline-flex items-center rounded-full bg-blue-500/90 px-2 py-0.5 text-xs font-medium text-white">
                    Verified
                  </span>
                )}
              </div>
              {business.category?.name && (
                <p className="mt-1 text-slate-300">{business.category.name}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                {(business.rating != null || business.reviewCount != null) && (
                  <span className="flex items-center gap-1 text-amber-400">
                    <FiStar className="h-4 w-4 fill-current" />
                    {business.rating != null ? `${Number(business.rating).toFixed(1)}` : '—'}
                    {business.reviewCount != null && (
                      <span className="text-slate-400">({business.reviewCount} Reviews)</span>
                    )}
                  </span>
                )}
                {locationLine && (
                  <span className="flex items-center gap-1 text-slate-300">
                    <FiMapPin className="h-4 w-4 shrink-0" />
                    {locationLine}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-8">
            {/* About the Company */}
            {business.description && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="flex items-center gap-3 text-xl font-semibold text-gray-900">
                  <span className="h-8 w-1 shrink-0 rounded-full bg-blue-600" />
                  About the Company
                </h2>
                <div className="mt-4 whitespace-pre-wrap text-gray-600 leading-relaxed">
                  {business.description}
                </div>
              </section>
            )}

            {/* Our Core Services - category-focused */}
            {business.category?.name && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="flex items-center gap-3 text-xl font-semibold text-gray-900">
                  <span className="h-8 w-1 shrink-0 rounded-full bg-blue-600" />
                  What we offer
                </h2>
                <p className="mt-3 text-gray-600">
                  {business.category.name} services. Contact us for details and pricing.
                </p>
              </section>
            )}

            {/* Client Reviews */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-3 text-xl font-semibold text-gray-900">
                  <span className="h-8 w-1 shrink-0 rounded-full bg-blue-600" />
                  Client Reviews
                </h2>
                <a href="#write-review" className="text-sm font-medium text-blue-600 hover:underline">Write a Review</a>
              </div>

              {initialReviews.length > 0 ? (
                <ul className="mt-6 space-y-6">
                  {initialReviews.map((r) => (
                    <li key={r.id} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                      <div className="flex gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                          {(r.authorName || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-gray-900">{r.authorName}</span>
                            <span className="text-sm text-gray-500">
                              {typeof r.createdAt === 'string'
                                ? (() => {
                                    const d = new Date(r.createdAt);
                                    const now = new Date();
                                    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
                                    if (diffDays === 0) return 'Today';
                                    if (diffDays === 1) return 'Yesterday';
                                    if (diffDays < 7) return `${diffDays} days ago`;
                                    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
                                    return `${Math.floor(diffDays / 30)} months ago`;
                                  })()
                                : ''}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-1 text-amber-500">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <FiStar key={i} className={`h-4 w-4 ${i < (r.rating || 0) ? 'fill-current' : ''}`} />
                            ))}
                          </div>
                          {r.content && <p className="mt-2 text-gray-600">{r.content}</p>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-gray-500">No reviews yet. Be the first to write one.</p>
              )}

              {hasMoreReviews && (
                <div className="mt-6">
                  <button
                    type="button"
                    className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    Load more reviews
                  </button>
                </div>
              )}

              <div id="write-review" className="mt-8">
                <BusinessPageClient businessId={business.id} />
              </div>
            </section>
          </div>

          {/* Right sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3">
                <LeadTrackLink
                  href={`tel:${(business.phone || '').replace(/\s/g, '')}`}
                  type="contact"
                  businessId={business.id}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700"
                >
                  <FiMessageCircle className="h-5 w-5" />
                  Contact Business
                </LeadTrackLink>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 hover:bg-gray-50"
                >
                  <FiHeart className="h-5 w-5" />
                  Save to Favorites
                </button>
              </div>

              <div className="mt-6 space-y-3">
                {business.website && (
                  <a
                    href={business.website.startsWith('http') ? business.website : `https://${business.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-700 hover:text-blue-600"
                  >
                    <FiGlobe className="h-4 w-4 shrink-0" />
                    <span className="truncate">{business.website.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
                {business.phone && (
                  <LeadTrackLink
                    href={`tel:${business.phone.replace(/\s/g, '')}`}
                    type="call"
                    businessId={business.id}
                    className="flex items-center gap-2 text-gray-700 hover:text-blue-600"
                  >
                    <FiPhone className="h-4 w-4 shrink-0" />
                    {business.phone}
                  </LeadTrackLink>
                )}
              </div>

              {/* Business Hours */}
              <div className="mt-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <FiClock className="h-4 w-4" />
                  Business Hours
                </h3>
                {openingHoursLines.length > 0 ? (
                  <>
                    <div className="mt-2 inline-block rounded-lg bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                      OPEN NOW
                    </div>
                    <ul className="mt-2 space-y-1 text-sm text-gray-600">
                      {openingHoursLines.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">Set after approval</p>
                )}
              </div>

              {/* Location + Map */}
              <div className="mt-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <FiMapPin className="h-4 w-4" />
                  Location
                </h3>
                {business.address && (
                  <p className="mt-2 text-sm text-gray-600">{business.address}</p>
                )}
                <div className="mt-3 aspect-video w-full overflow-hidden rounded-xl border border-gray-200">
                  <BusinessMapEmbed
                    lat={business.latitude}
                    lng={business.longitude}
                    address={business.address}
                    className="h-full w-full"
                  />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-200 bg-white py-6">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            ©{new Date().getFullYear()} Sell Box. Business information is subject to verification.
          </p>
          <div className="mt-2 flex justify-center gap-4 text-sm">
            <Link href="/contact" className="text-gray-500 hover:text-gray-700">Terms of Service</Link>
            <Link href="/contact" className="text-gray-500 hover:text-gray-700">Privacy Policy</Link>
            <Link href="/contact" className="text-gray-500 hover:text-gray-700">Contact Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
