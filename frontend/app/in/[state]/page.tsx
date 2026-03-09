import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBaseUrl } from '@/lib/seo';
import { getStateBySlug, dirUrl } from '@/lib/directory';

type Props = { params: Promise<{ state: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) return { title: 'State Not Found' };
  const title = `Business Directory ${state.name} | Find Local Businesses`;
  const description = `Find the best local businesses in ${state.name}. Browse cities and categories – spas, restaurants, clinics, schools and more.`;
  const canonical = dirUrl(state.slug);
  return {
    title: title.slice(0, 60),
    description: description.slice(0, 160),
    keywords: `business directory ${state.name}, local businesses ${state.name}, ${state.name} cities`,
    openGraph: { title, description, url: canonical, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical },
  };
}

export default async function StatePage({ params }: Props) {
  const { state: stateSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) notFound();

  const base = getBaseUrl();
  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Businesses in ${state.name}`,
    description: `List of cities and local businesses in ${state.name}, India.`,
    url: dirUrl(state.slug),
    numberOfItems: state.cities?.length ?? 0,
    itemListElement: (state.cities || []).slice(0, 50).map((c: { slug: string; name: string }, i: number) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${base}/in/${state.slug}/${c.slug}`,
      name: c.name,
    })),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'India', item: `${base}/in` },
      { '@type': 'ListItem', position: 2, name: state.name, item: dirUrl(state.slug) },
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
          <span className="text-gray-900">{state.name}</span>
        </nav>
        <h1 className="text-3xl font-bold text-gray-900">
          Business Directory – {state.name}
        </h1>
        <p className="mt-2 text-gray-600">
          Browse local businesses by city in {state.name}. We list verified spas, restaurants, clinics, schools, and more across the state.
        </p>

        <section className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900">Cities in {state.name}</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {(state.cities || []).map((c: { slug: string; name: string }) => (
              <li key={c.slug}>
                <Link
                  href={`/in/${state.slug}/${c.slug}`}
                  className="block rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-800 shadow-sm transition hover:border-blue-300 hover:shadow"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-10 rounded-xl border border-gray-200 bg-white p-6 text-gray-600">
          <h2 className="text-lg font-semibold text-gray-900">About businesses in {state.name}</h2>
          <p className="mt-2">
            Our directory covers major cities and towns across {state.name}. Each city page lists top categories and featured businesses. You can filter by category, read reviews, and contact businesses directly via phone or WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
}
