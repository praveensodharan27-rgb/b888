import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import Image from 'next/image';
import { getBaseUrl, getApiBaseOrigin } from '@/lib/seo';
import {
  getStateBySlug,
  getBusinessBySlug,
  getRedirectForPath,
  getAdByPath,
  dirUrl,
  dirPath,
  normalizeSegment,
} from '@/lib/directory';
import { BusinessPageClient } from '@/app/in/[state]/[city]/[category]/[businessSlug]/BusinessPageClient';
import { LeadTrackLink } from '@/components/directory/LeadTrackLink';
import AdDetailPage from '@/app/ads/[id]/page';

type Props = {
  params: Promise<{ categorySlug: string; subcategorySlug: string; productSlug: string; businessSlug: string }>;
};

/** Safe metadata when data is missing or API fails. Always noindex. */
function notFoundMetadata(): Metadata {
  const baseUrl = getBaseUrl();
  return {
    title: 'Not Found | Sell Box',
    description: 'The requested page could not be found.',
    robots: 'noindex, nofollow',
    metadataBase: new URL(baseUrl),
    openGraph: {
      title: 'Not Found | Sell Box',
      description: 'The requested page could not be found.',
      type: 'website',
      url: baseUrl,
      siteName: 'Sell Box',
    },
    twitter: {
      card: 'summary',
      title: 'Not Found | Sell Box',
      description: 'The requested page could not be found.',
    },
    alternates: { canonical: baseUrl },
  };
}

/** Safe fetch wrappers - never throw, return null on 404/error so SSR never crashes. */
async function safeGetStateBySlug(slug: string) {
  try {
    return await getStateBySlug(slug);
  } catch {
    return null;
  }
}

async function safeGetBusinessBySlug(
  stateSlug: string,
  citySlug: string,
  categorySlug: string,
  businessSlug: string
) {
  try {
    return await getBusinessBySlug(stateSlug, citySlug, categorySlug, businessSlug);
  } catch {
    return null;
  }
}

async function safeGetRedirectForPath(path: string) {
  try {
    return await getRedirectForPath(path);
  } catch {
    return null;
  }
}

async function safeGetAdByPath(
  stateSlug: string,
  citySlug: string,
  categorySlug: string,
  slug: string
) {
  try {
    return await getAdByPath(stateSlug, citySlug, categorySlug, slug);
  } catch {
    return null;
  }
}

function buildLocalBusinessLd(
  business: any,
  base: string,
  stateSlug: string,
  citySlug: string,
  categorySlug: string
) {
  const url = dirUrl(stateSlug, citySlug, categorySlug, business.slug);
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
  if (business.reviews?.length) {
    ld.review = business.reviews.slice(0, 10).map(
      (r: { authorName: string; rating: number; content?: string; createdAt: string }) => ({
        '@type': 'Review',
        author: { '@type': 'Person', name: r.authorName },
        reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
        reviewBody: r.content,
        datePublished: r.createdAt,
      })
    );
  }
  return ld;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const baseUrl = getBaseUrl();
  const metadataBase = new URL(baseUrl);

  try {
    const resolved = params ? await params : null;
    if (!resolved) return notFoundMetadata();
    const { categorySlug, subcategorySlug, productSlug, businessSlug } = resolved;
    const first = normalizeSegment(categorySlug);
    const second = normalizeSegment(subcategorySlug);
    const third = normalizeSegment(productSlug);
    const fourth = normalizeSegment(businessSlug);

    const state = await safeGetStateBySlug(first);
    if (!state) return notFoundMetadata();

    const business = await safeGetBusinessBySlug(first, second, third, fourth);
    if (!business) {
      const ad = await safeGetAdByPath(first, second, third, fourth);
      if (ad) {
        const title = `${(ad.title as string) || 'Ad'} - ₹${Number(ad.price || 0).toLocaleString('en-IN')}`;
        const desc =
          typeof ad.description === 'string' ? ad.description.slice(0, 155) : title;
        const canonical = dirUrl(first, second, third, fourth);
        const img = (ad.images as string[])?.[0];
        const imageUrl = img
          ? img.startsWith('http')
            ? img
            : `${getApiBaseOrigin()}${img.startsWith('/') ? '' : '/'}${img}`
          : undefined;
        return {
          metadataBase,
          title: title.slice(0, 60),
          description: desc.slice(0, 160),
          openGraph: {
            title: title.slice(0, 60),
            description: desc.slice(0, 160),
            url: canonical,
            type: 'website',
            siteName: 'Sell Box',
            ...(imageUrl && {
              images: [{ url: imageUrl, alt: String(ad.title) }],
            }),
          },
          twitter: {
            card: imageUrl ? 'summary_large_image' : 'summary',
            title: title.slice(0, 60),
            description: desc.slice(0, 160),
          },
          alternates: { canonical },
        };
      }
      return notFoundMetadata();
    }

    const cityName = business.city?.name || second;
    const title = `${business.name} in ${cityName}`;
    const description =
      business.description?.slice(0, 155) ||
      `Contact ${business.name} in ${cityName}. ${business.phone ? `Call ${business.phone}. ` : ''}Read reviews and get in touch.`;
    const canonical = dirUrl(first, second, third, business.slug);
    const image = business.images?.[0]
      ? business.images[0].startsWith('http')
        ? business.images[0]
        : `${getApiBaseOrigin()}${business.images[0].startsWith('/') ? '' : '/'}${business.images[0]}`
      : undefined;

    return {
      metadataBase,
      title: title.slice(0, 60),
      description: description.slice(0, 160),
      keywords: `${business.name} ${cityName}, ${business.category?.name} ${cityName}`,
      openGraph: {
        title: title.slice(0, 60),
        description: description.slice(0, 160),
        url: canonical,
        type: 'website',
        siteName: 'Sell Box',
        ...(image && { images: [{ url: image, alt: business.name }] }),
      },
      twitter: {
        card: image ? 'summary_large_image' : 'summary',
        title: title.slice(0, 60),
        description: description.slice(0, 160),
      },
      alternates: { canonical },
    };
  } catch {
    return notFoundMetadata();
  }
}

export default async function DirectoryBusinessPage({ params }: Props) {
  try {
    const resolved = params ? await params : null;
    if (!resolved) notFound();
    const { categorySlug, subcategorySlug, productSlug, businessSlug } = resolved;
    const first = normalizeSegment(categorySlug);
    const second = normalizeSegment(subcategorySlug);
    const third = normalizeSegment(productSlug);
    const fourth = normalizeSegment(businessSlug);

    const state = await safeGetStateBySlug(first);
    if (!state) notFound();

    let business = await safeGetBusinessBySlug(first, second, third, fourth);
    if (!business) {
      const currentPath = dirPath(first, second, third, fourth);
      const toPath = await safeGetRedirectForPath(currentPath);
      if (toPath) redirect(toPath);

      const ad = await safeGetAdByPath(first, second, third, fourth);
      if (ad?.id) {
        return (
          <AdDetailPage
            adId={ad.id}
            initialAd={ad}
            stateSlug={first}
            citySlug={second}
            categorySlug={third}
          />
        );
      }
      notFound();
    }

    const base = getBaseUrl();
    const localBusinessLd = buildLocalBusinessLd(business, base, first, second, third);
    const breadcrumbLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: base },
        { '@type': 'ListItem', position: 2, name: business.state?.name, item: dirUrl(first) },
        { '@type': 'ListItem', position: 3, name: business.city?.name, item: dirUrl(first, second) },
        {
          '@type': 'ListItem',
          position: 4,
          name: business.category?.name,
          item: dirUrl(first, second, third),
        },
        {
          '@type': 'ListItem',
          position: 5,
          name: business.name,
          item: dirUrl(first, second, third, fourth),
        },
      ],
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <nav className="mb-4 text-sm text-gray-500" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-gray-700">
              Home
            </Link>
            <span className="mx-1">/</span>
            <Link href={dirPath(first)} className="hover:text-gray-700">
              {business.state?.name}
            </Link>
            <span className="mx-1">/</span>
            <Link href={dirPath(first, second)} className="hover:text-gray-700">
              {business.city?.name}
            </Link>
            <span className="mx-1">/</span>
            <Link href={dirPath(first, second, third)} className="hover:text-gray-700">
              {business.category?.name}
            </Link>
            <span className="mx-1">/</span>
            <span className="text-gray-900">{business.name}</span>
          </nav>
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h1 className="text-2xl font-bold text-gray-900">
                  {business.name} in {business.city?.name}
                </h1>
                {business.isVerified && (
                  <span className="mt-1 inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                    Verified
                  </span>
                )}
                {(business.rating != null || business.reviewCount != null) && (
                  <p className="mt-2 text-gray-600">
                    {business.rating != null && `★ ${business.rating}`}
                    {business.reviewCount != null && ` (${business.reviewCount} reviews)`}
                  </p>
                )}
                {business.description && (
                  <div className="mt-4 text-gray-600">
                    <h2 className="text-lg font-semibold text-gray-900">
                      About &amp; services
                    </h2>
                    <p className="mt-2 whitespace-pre-wrap">{business.description}</p>
                  </div>
                )}
              </div>
              {business.images && business.images.length > 1 && (
                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900">Gallery</h2>
                  <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {business.images.map((img: string, i: number) => (
                      <li
                        key={i}
                        className="relative aspect-square overflow-hidden rounded-lg bg-gray-100"
                      >
                        <Image
                          src={
                            img.startsWith('http')
                              ? img
                              : `${getApiBaseOrigin()}${img.startsWith('/') ? '' : '/'}${img}`
                          }
                          alt={`${business.name} – image ${i + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, 200px"
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {business.reviews?.length > 0 && (
                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900">Reviews</h2>
                  <ul className="mt-4 space-y-4">
                    {business.reviews.map(
                      (r: {
                        id: string;
                        authorName: string;
                        rating: number;
                        content?: string;
                        createdAt: string;
                      }) => (
                        <li
                          key={r.id}
                          className="border-b border-gray-100 pb-4 last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {r.authorName}
                            </span>
                            <span className="text-amber-500">★ {r.rating}</span>
                            <span className="text-sm text-gray-500">
                              {new Date(r.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {r.content && (
                            <p className="mt-1 text-gray-600">{r.content}</p>
                          )}
                        </li>
                      )
                    )}
                  </ul>
                </section>
              )}
              <BusinessPageClient businessId={business.id} />
            </div>
            <aside className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
                {business.images?.[0] && (
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-100">
                    <Image
                      src={
                        business.images[0].startsWith('http')
                          ? business.images[0]
                          : `${getApiBaseOrigin()}${business.images[0].startsWith('/') ? '' : '/'}${business.images[0]}`
                      }
                      alt={`${business.name} – ${business.category?.name || 'Business'}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 400px"
                    />
                  </div>
                )}
                <div className="mt-4 space-y-3">
                  {business.phone && (
                    <LeadTrackLink
                      href={`tel:${business.phone.replace(/\s/g, '')}`}
                      type="call"
                      businessId={business.id}
                      className="flex items-center gap-2 text-gray-700 hover:text-blue-600"
                    >
                      📞 Call
                    </LeadTrackLink>
                  )}
                  {(business.whatsapp || business.phone) && (
                    <LeadTrackLink
                      href={`https://wa.me/${(business.whatsapp || business.phone)?.replace(/\D/g, '')}`}
                      type="whatsapp"
                      businessId={business.id}
                      className="flex items-center gap-2 text-gray-700 hover:text-green-600"
                    >
                      WhatsApp
                    </LeadTrackLink>
                  )}
                  {business.website && (
                    <a
                      href={
                        business.website.startsWith('http')
                          ? business.website
                          : `https://${business.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      Website
                    </a>
                  )}
                  {business.address && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-700">Address:</span>{' '}
                      {business.address}
                    </p>
                  )}
                </div>
                {business.latitude != null && business.longitude != null && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-gray-900">Map</h3>
                    <a
                      href={`https://www.google.com/maps?q=${business.latitude},${business.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex items-center gap-2 text-sm text-blue-600 hover:underline"
                    >
                      View on Google Maps
                    </a>
                  </div>
                )}
                {business.openingHours &&
                  typeof business.openingHours === 'object' && (
                    <div className="mt-4">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Working hours
                      </h3>
                      <ul className="mt-2 space-y-1 text-sm text-gray-600">
                        {Object.entries(business.openingHours).map(
                          ([day, value]) => (
                            <li key={day}>
                              {day}: {String(value)}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  } catch (err: unknown) {
    const d = err && typeof err === 'object' && 'digest' in err ? (err as { digest?: string }).digest : '';
    if (d === 'NEXT_REDIRECT' || d === 'NEXT_NOT_FOUND') throw err;
    notFound();
  }
}
