import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBaseUrl } from '@/lib/seo';
import { getStateBySlug, getCityBySlug, getCategories, getBusinesses, dirUrl } from '@/lib/directory';
import { DirectoryCategoryClient } from './DirectoryCategoryClient';

type Props = { params: Promise<{ state: string; city: string; category: string }>; searchParams: Promise<{ page?: string; sort?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateSlug, city: citySlug, category: categorySlug } = await params;
  const [state, city, { categories = [] }] = await Promise.all([
    getStateBySlug(stateSlug),
    getCityBySlug(stateSlug, citySlug),
    getCategories(),
  ]);
  const cat = categories.find((c: { slug: string }) => c.slug === categorySlug) || { name: categorySlug, metaTitle: '', metaDescription: '' };
  if (!state || !city) return { title: 'Not Found' };
  const stateName = state.name;
  const cityName = city.name;
  const title = (cat.metaTitle as string) || `Best ${cat.name} in ${cityName} | ${stateName} Directory`;
  const description = (cat.metaDescription as string) || `Find the best ${cat.name} in ${cityName}, ${stateName}. Compare ratings, read reviews and contact businesses directly.`;
  const canonical = dirUrl(stateSlug, citySlug, categorySlug);
  return {
    title: title.slice(0, 60),
    description: description.slice(0, 160),
    keywords: `${cat.name} ${cityName}, best ${cat.name} in ${cityName}, ${cityName} ${stateName} ${cat.name}`,
    openGraph: { title, description, url: canonical, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { state: stateSlug, city: citySlug, category: categorySlug } = await params;
  const { page: pageStr, sort } = await searchParams;
  const page = Math.max(1, parseInt(String(pageStr || '1'), 10));

  const [state, city, { categories = [] }, businessesData] = await Promise.all([
    getStateBySlug(stateSlug),
    getCityBySlug(stateSlug, citySlug),
    getCategories(),
    getBusinesses({ stateSlug, citySlug, categorySlug, page, limit: 20, sort: sort || 'rating' }),
  ]);

  if (!state || !city) notFound();
  const cat = categories.find((c: { slug: string; name: string }) => c.slug === categorySlug);
  const categoryName = cat?.name || categorySlug;
  const { businesses = [], pagination } = businessesData;

  const base = getBaseUrl();
  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Best ${categoryName} in ${city.name}`,
    description: `List of ${categoryName} in ${city.name}, ${state.name}.`,
    url: dirUrl(stateSlug, citySlug, categorySlug),
    numberOfItems: businesses.length,
    itemListElement: businesses.map((b: { slug: string; name: string; category?: { slug: string } }, i: number) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${base}/in/${stateSlug}/${citySlug}/${b.category?.slug || categorySlug}/${b.slug}`,
      name: b.name,
    })),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'India', item: `${base}/in` },
      { '@type': 'ListItem', position: 2, name: state.name, item: `${base}/in/${stateSlug}` },
      { '@type': 'ListItem', position: 3, name: city.name, item: `${base}/in/${stateSlug}/${citySlug}` },
      { '@type': 'ListItem', position: 4, name: categoryName, item: dirUrl(stateSlug, citySlug, categorySlug) },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <nav className="mb-4 text-sm text-gray-500">
          <Link href="/in" className="hover:text-gray-700">India</Link>
          <span className="mx-1">/</span>
          <Link href={`/in/${stateSlug}`} className="hover:text-gray-700">{state.name}</Link>
          <span className="mx-1">/</span>
          <Link href={`/in/${stateSlug}/${citySlug}`} className="hover:text-gray-700">{city.name}</Link>
          <span className="mx-1">/</span>
          <span className="text-gray-900">{categoryName}</span>
        </nav>
        <h1 className="text-3xl font-bold text-gray-900">
          Best {categoryName} in {city.name}
        </h1>
        <p className="mt-2 text-gray-600">
          Compare top {categoryName} in {city.name}, {state.name}. Read reviews, check ratings and contact businesses directly.
        </p>

        <DirectoryCategoryClient
          stateSlug={stateSlug}
          citySlug={citySlug}
          categorySlug={categorySlug}
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
            Looking for the best {categoryName} in {city.name}? Our directory lists verified businesses with real customer reviews. You can sort by rating or newest, and contact each business via phone or WhatsApp. All listings are updated regularly to ensure accuracy.
          </p>
        </section>
      </div>
    </div>
  );
}
