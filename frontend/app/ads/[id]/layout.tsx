import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getBaseUrl, getApiBaseOrigin } from '@/lib/seo';
import { getAd } from '@/lib/adsApi';
import { dirPath, slugify } from '@/lib/directory';
import {
  buildSeoMetaTitle,
  buildSeoMetaDescription,
  extractTopSpec,
  FALLBACK_CITY,
} from '@/lib/seoProduct';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

function buildAbsoluteImageUrl(ad: { images?: string[] | null }): string | undefined {
  const first = ad?.images?.[0];
  if (!first || typeof first !== 'string') return undefined;
  if (first.startsWith('http://') || first.startsWith('https://')) return first;
  const origin = getApiBaseOrigin();
  return first.startsWith('/') ? `${origin}${first}` : `${origin}/${first}`;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { id } = await params;
  const ad = await getAd(id);

  if (!ad) {
    return {
      title: 'Ad Not Found',
      description: 'The requested listing could not be found.',
    };
  }

  const baseUrl = getBaseUrl();
  const state = (ad as { state?: string | null }).state ?? null;
  const city =
    (ad as { city?: string | null }).city ??
    (ad as { location?: { city?: string } }).location?.city ??
    null;
  const category = (ad as { category?: { slug?: string; name?: string } }).category;
  const adSlug = (ad as { slug?: string | null }).slug;
  const adTitle = (ad as { title?: string | null }).title;
  const hasSeoPath = state && city && category?.slug;
  const canonicalPath = hasSeoPath
    ? dirPath(slugify(state), slugify(city), category!.slug!, (adSlug && String(adSlug).trim()) ? String(adSlug).trim().toLowerCase() : slugify(adTitle ?? '', 70))
    : null;
  const canonical = canonicalPath ? `${baseUrl}${canonicalPath}` : `${baseUrl}/ads/${ad.id}`;
  const attrs = (ad as { attributes?: Record<string, unknown> }).attributes;
  const brand = (attrs?.brand as string) ?? null;
  const topSpec = extractTopSpec(attrs);
  const cityForSeo = city || FALLBACK_CITY;
  const adPrice = (ad as { price?: number | null }).price;

  const title = buildSeoMetaTitle({
    productName: adTitle ?? '',
    city: cityForSeo,
    price: adPrice != null ? Number(adPrice) : null,
    brand: brand || undefined,
    topSpec: topSpec || undefined,
  });

  const metaDescInput = {
    productName: adTitle ?? '',
    city: cityForSeo,
    condition: (ad as { condition?: string }).condition ?? undefined,
    price: adPrice != null ? Number(adPrice) : null,
  };
  let description = buildSeoMetaDescription(metaDescInput);
  // Fallback: if user description exists and is short, use it; if too short, expand with SEO content
  const adDescription = (ad as { description?: string | null }).description;
  const userDesc = typeof adDescription === 'string' ? adDescription.trim() : '';
  if (userDesc && userDesc.length >= 50) {
    description =
      userDesc.length <= 155
        ? userDesc
        : userDesc.slice(0, 152).trim() + (userDesc.length > 155 ? '...' : '');
  }

  const imageUrl = buildAbsoluteImageUrl(ad);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonical,
      siteName: 'Sell Box',
      images: imageUrl
        ? [{ url: imageUrl, width: 1200, height: 630, alt: `${adTitle ?? 'Item'} for sale in ${city || FALLBACK_CITY}` }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
    alternates: { canonical },
  };
}

function buildProductJsonLd(ad: any, productUrl: string) {
  const imageUrl = buildAbsoluteImageUrl(ad);
  const price = ad.price != null && !Number.isNaN(Number(ad.price)) ? Number(ad.price) : null;
  const description =
    typeof ad.description === 'string' && ad.description.trim()
      ? ad.description.slice(0, 500)
      : ad.title;

  const offers: Record<string, unknown> = {
    '@type': 'Offer',
    priceCurrency: 'INR',
    availability: 'https://schema.org/InStock',
    url: productUrl,
  };
  if (price != null) (offers as Record<string, number>).price = price;

  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: ad.title,
    description,
    sku: ad.id,
    image: imageUrl ? [imageUrl] : undefined,
    url: productUrl,
    offers,
  };
  if (ad.attributes?.brand && typeof ad.attributes.brand === 'string') {
    ld.brand = { '@type': 'Brand', name: ad.attributes.brand };
  }
  if (ad.user?.name) {
    ld.seller = { '@type': 'Person', name: ad.user.name };
  }
  if (ad.condition && typeof ad.condition === 'string') {
    ld.itemCondition = `https://schema.org/${String(ad.condition).replace(/\s+/g, '')}Condition`;
  }
  return ld;
}

function buildBreadcrumbJsonLd(ad: any, productUrl: string) {
  const baseUrl = getBaseUrl();
  const state = ad.state ?? null;
  const city = ad.city ?? ad.location?.city ?? null;
  const category = ad.category;
  const stateName = state || 'India';
  const cityName = city || FALLBACK_CITY;
  const categoryName = category?.name || 'Category';

  const items: { '@type': string; position: number; name: string; item: string }[] = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
  ];

  if (state) {
    items.push({
      '@type': 'ListItem',
      position: items.length + 1,
      name: stateName,
      item: `${baseUrl}/ads?location=${encodeURIComponent(String(state).toLowerCase().replace(/\s+/g, '-'))}`,
    });
  }
  if (city) {
    items.push({
      '@type': 'ListItem',
      position: items.length + 1,
      name: cityName,
      item: `${baseUrl}/ads?location=${encodeURIComponent(String(city).toLowerCase().replace(/\s+/g, '-'))}`,
    });
  }
  if (category?.slug) {
    items.push({
      '@type': 'ListItem',
      position: items.length + 1,
      name: categoryName,
      item: `${baseUrl}/${category.slug}`,
    });
  }
  items.push({
    '@type': 'ListItem',
    position: items.length + 1,
    name: ad.title,
    item: productUrl,
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}

export default async function AdDetailLayout({ children, params }: LayoutProps) {
  const { id } = await params;
  const ad = await getAd(id);

  if (!ad) {
    notFound();
  }

  // 301 redirect to SEO URL /{state}/{city}/{category}/{slug} when we have location + category
  const state = (ad as { state?: string | null }).state;
  const city = (ad as { city?: string | null }).city;
  const category = (ad as { category?: { slug?: string } }).category;
  const adSlug = (ad as { slug?: string | null }).slug;
  const adTitleForRedirect = (ad as { title?: string | null }).title;
  if (state && city && category?.slug) {
    const stateSlug = slugify(state);
    const citySlug = slugify(city);
    const slug = (adSlug && String(adSlug).trim()) ? String(adSlug).trim().toLowerCase() : slugify(adTitleForRedirect ?? '', 70);
    const canonicalPath = dirPath(stateSlug, citySlug, category.slug, slug);
    if (canonicalPath) {
      redirect(canonicalPath);
    }
  }

  // When we render (no redirect), current URL is /ads/id; metadata canonical already points to SEO URL when applicable
  const productUrl = `${getBaseUrl()}/ads/${ad.id}`;
  const productLd = buildProductJsonLd(ad, productUrl);
  const breadcrumbLd = buildBreadcrumbJsonLd(ad, productUrl);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {children}
    </>
  );
}
