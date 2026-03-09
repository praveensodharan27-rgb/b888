import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBaseUrl } from '@/lib/seo';
import {
  getStateBySlug,
  getCityBySlug,
  getCategories,
  getBusinesses,
  dirUrl,
  dirPath,
  normalizeSegment,
} from '@/lib/directory';
import { DirectoryCategoryClient } from '@/components/directory/DirectoryCategoryClient';
import ProductPageClient from './ProductPageClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function getProductData(categorySlug: string, subcategorySlug: string, productSlug: string) {
  try {
    const res = await fetch(
      `${API_URL}/categories/${categorySlug}/${subcategorySlug}/${productSlug}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string; subcategorySlug: string; productSlug: string }>;
}): Promise<Metadata> {
  const { categorySlug, subcategorySlug, productSlug } = await params;
  const first = normalizeSegment(categorySlug);
  const second = normalizeSegment(subcategorySlug);
  const third = normalizeSegment(productSlug);
  const state = await getStateBySlug(first);
  if (state) {
    const city = await getCityBySlug(first, second);
    const { categories = [] } = await getCategories();
    const cat = categories.find((c: { slug: string }) => c.slug === third) || { name: third, metaTitle: '', metaDescription: '' };
    if (!city) return { title: 'Not Found' };
    const title = (cat.metaTitle as string) || `Best ${cat.name} in ${city.name} | ${state.name} Directory`;
    const description = (cat.metaDescription as string) || `Find the best ${cat.name} in ${city.name}, ${state.name}. Compare ratings, read reviews and contact businesses directly.`;
    const canonical = dirUrl(first, second, third);
    return {
      title: title.slice(0, 60),
      description: description.slice(0, 160),
      keywords: `${cat.name} ${city.name}, best ${cat.name} in ${city.name}`,
      openGraph: { title, description, url: canonical, type: 'website' },
      twitter: { card: 'summary_large_image', title, description },
      alternates: { canonical },
    };
  }
  const data = await getProductData(first, second, third);
  if (!data?.product) {
    return { title: 'Product Not Found', description: 'The requested product could not be found.' };
  }
  const product = data.product;
  const category = data.category;
  const subcategory = data.subcategory;
  const metaTitle = `${product.title} - ₹${product.price?.toLocaleString('en-IN')} | ${category.name} - ${subcategory.name}`;
  const metaDescription = product.description
    ? `${product.description.substring(0, 160)}...`
    : `Buy ${product.title} for ₹${product.price?.toLocaleString('en-IN')} in ${category.name} - ${subcategory.name}.`;
  const imageUrl =
    product.images?.length > 0
      ? product.images[0].startsWith('http')
        ? product.images[0]
        : `${API_URL.replace('/api', '')}${product.images[0]}`
      : undefined;
  return {
    title: metaTitle,
    description: metaDescription,
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      type: 'website',
      images: imageUrl ? [{ url: imageUrl, alt: product.title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: metaTitle,
      description: metaDescription,
      images: imageUrl ? [imageUrl] : undefined,
    },
    alternates: {
      canonical: `/${category.slug}/${subcategory.slug}/${product.slug || product.id}`,
    },
  };
}

export default async function ThirdSegmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ categorySlug: string; subcategorySlug: string; productSlug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  const { categorySlug, subcategorySlug, productSlug } = await params;
  const { page: pageStr, sort } = await searchParams;
  const first = normalizeSegment(categorySlug);
  const second = normalizeSegment(subcategorySlug);
  const third = normalizeSegment(productSlug);
  const state = await getStateBySlug(first);

  if (state) {
    const city = await getCityBySlug(first, second);
    if (!city) notFound();
    const { categories = [] } = await getCategories();
    const cat = categories.find((c: { slug: string; name: string }) => c.slug === third);
    const categoryName = cat?.name || third;
    const page = Math.max(1, parseInt(String(pageStr || '1'), 10));
    const businessesData = await getBusinesses({
      stateSlug: first,
      citySlug: second,
      categorySlug: third,
      page,
      limit: 20,
      sort: sort || 'rating',
    });
    const { businesses = [], pagination } = businessesData;
    const base = getBaseUrl();
    const itemListLd = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Best ${categoryName} in ${city.name}`,
      description: `List of ${categoryName} in ${city.name}, ${state.name}.`,
      url: dirUrl(first, second, third),
      numberOfItems: businesses.length,
      itemListElement: businesses.map(
        (b: { slug: string; name: string; category?: { slug: string } }, i: number) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: dirUrl(first, second, b.category?.slug || third, b.slug),
          name: b.name,
        })
      ),
    };
    const breadcrumbLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: base },
        { '@type': 'ListItem', position: 2, name: state.name, item: dirUrl(first) },
        { '@type': 'ListItem', position: 3, name: city.name, item: dirUrl(first, second) },
        { '@type': 'ListItem', position: 4, name: categoryName, item: dirUrl(first, second, third) },
      ],
    };
    return (
      <div className="min-h-screen bg-gray-50">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <nav className="mb-4 text-sm text-gray-500" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-gray-700">Home</Link>
            <span className="mx-1">/</span>
            <Link href={dirPath(first)} className="hover:text-gray-700">{state.name}</Link>
            <span className="mx-1">/</span>
            <Link href={dirPath(first, second)} className="hover:text-gray-700">{city.name}</Link>
            <span className="mx-1">/</span>
            <span className="text-gray-900">{categoryName}</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">Best {categoryName} in {city.name}</h1>
          <p className="mt-2 text-gray-600">
            Compare top {categoryName} in {city.name}, {state.name}. Read reviews, check ratings and contact businesses directly.
          </p>
          <DirectoryCategoryClient
            stateSlug={first}
            citySlug={second}
            categorySlug={third}
            categoryName={categoryName}
            stateName={state.name}
            cityName={city.name}
            initialBusinesses={businesses}
            initialPagination={pagination}
            sort={sort || 'rating'}
          />
          <section className="mt-10 rounded-xl border border-gray-200 bg-white p-6 text-gray-600">
            <h2 className="text-lg font-semibold text-gray-900">{categoryName} in {city.name} – Guide</h2>
            <p className="mt-2">
              Looking for the best {categoryName} in {city.name}? Our directory lists verified businesses with real customer reviews. Sort by rating or newest, and contact each business via phone or WhatsApp.
            </p>
          </section>
        </div>
      </div>
    );
  }

  const data = await getProductData(first, second, third);
  if (!data?.product) notFound();
  return (
    <ProductPageClient
      data={data}
      categorySlug={first}
      subcategorySlug={second}
      productSlug={third}
    />
  );
}
