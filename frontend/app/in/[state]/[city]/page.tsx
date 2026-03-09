import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBaseUrl } from '@/lib/seo';
import { getCityBySlug, getCategories, getBusinesses, dirUrl } from '@/lib/directory';

type Props = { params: Promise<{ state: string; city: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateSlug, city: citySlug } = await params;
  const city = await getCityBySlug(stateSlug, citySlug);
  if (!city) return { title: 'City Not Found' };
  const stateName = city.state?.name || stateSlug;
  const title = `Business Directory ${city.name} ${stateName} | Local Businesses`;
  const description = `Find the best local businesses in ${city.name}, ${stateName}. Spas, restaurants, clinics, schools and more. Reviews and contact details.`;
  const canonical = dirUrl(stateSlug, citySlug);
  return {
    title: title.slice(0, 60),
    description: description.slice(0, 160),
    keywords: `business directory ${city.name}, ${city.name} ${stateName} businesses, local ${city.name}`,
    openGraph: { title, description, url: canonical, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical },
  };
}

export default async function CityPage({ params }: Props) {
  const { state: stateSlug, city: citySlug } = await params;
  const city = await getCityBySlug(stateSlug, citySlug);
  if (!city) notFound();

  const [{ categories = [] }, { businesses = [] }] = await Promise.all([
    getCategories(),
    getBusinesses({ stateSlug, citySlug, limit: 12, sort: 'rating' }),
  ]);

  const base = getBaseUrl();
  const stateName = city.state?.name || stateSlug;

  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Businesses in ${city.name}, ${stateName}`,
    url: dirUrl(stateSlug, citySlug),
    numberOfItems: businesses.length,
    itemListElement: businesses.slice(0, 10).map((b: { slug: string; name: string; category?: { slug: string } }, i: number) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${base}/in/${stateSlug}/${citySlug}/${b.category?.slug || 'business'}/${b.slug}`,
      name: b.name,
    })),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'India', item: `${base}/in` },
      { '@type': 'ListItem', position: 2, name: stateName, item: `${base}/in/${stateSlug}` },
      { '@type': 'ListItem', position: 3, name: city.name, item: dirUrl(stateSlug, citySlug) },
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
          <Link href={`/in/${stateSlug}`} className="hover:text-gray-700">{stateName}</Link>
          <span className="mx-1">/</span>
          <span className="text-gray-900">{city.name}</span>
        </nav>
        <h1 className="text-3xl font-bold text-gray-900">
          Best Local Businesses in {city.name}
        </h1>
        <p className="mt-2 text-gray-600">
          Discover top-rated businesses in {city.name}, {stateName}. Browse by category or see featured listings below.
        </p>

        <section className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900">Categories</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {categories.map((c: { slug: string; name: string }) => (
              <li key={c.slug}>
                <Link
                  href={`/in/${stateSlug}/${citySlug}/${c.slug}`}
                  className="block rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-800 shadow-sm transition hover:border-blue-300 hover:shadow"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {businesses.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold text-gray-900">Featured in {city.name}</h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {businesses.map((b: { slug: string; name: string; rating?: number; reviewCount?: number; category?: { slug: string } }) => (
                <li key={b.slug}>
                  <Link
                    href={`/in/${stateSlug}/${citySlug}/${b.category?.slug || 'business'}/${b.slug}`}
                    className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                  >
                    <span className="font-semibold text-gray-900">{b.name}</span>
                    {(b.rating != null || b.reviewCount != null) && (
                      <p className="mt-1 text-sm text-gray-500">
                        {b.rating != null && `★ ${b.rating}`}
                        {b.reviewCount != null && ` (${b.reviewCount} reviews)`}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-10 rounded-xl border border-gray-200 bg-white p-6 text-gray-600">
          <h2 className="text-lg font-semibold text-gray-900">Local businesses in {city.name}</h2>
          <p className="mt-2">
            We list verified businesses across {city.name}, {stateName}. Each listing includes contact details, opening hours, and customer reviews. Use the categories above to find spas, restaurants, clinics, schools, and more near you.
          </p>
        </div>
      </div>
    </div>
  );
}
