import type { Metadata } from 'next';
import Link from 'next/link';
import { getBaseUrl } from '@/lib/seo';
import { getStates } from '@/lib/directory';

const BASE = getBaseUrl();

export const metadata: Metadata = {
  title: 'Business Directory India | Find Local Businesses in 28 States & 700+ Cities',
  description: 'Discover the best local businesses across India. Search by state and city – spas, restaurants, clinics, schools, and more. Verified listings and reviews.',
  keywords: 'business directory India, local businesses, find businesses in India, state city directory',
  openGraph: {
    title: 'Business Directory India | Find Local Businesses',
    description: 'Discover the best local businesses across India. Search by state and city.',
    url: `${BASE}/in`,
    type: 'website',
    siteName: 'Sell Box Directory',
  },
  twitter: { card: 'summary_large_image', title: 'Business Directory India', description: 'Find local businesses across India.' },
  alternates: { canonical: `${BASE}/in` },
};

export default async function DirectoryHomePage() {
  const { states = [] } = await getStates();

  const webSiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Business Directory India',
    url: `${BASE}/in`,
    description: 'Find local businesses across India by state and city.',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${BASE}/in/{state}/{city}?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteLd) }} />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Business Directory India
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Find local businesses across 28+ states and 700+ cities. Browse by state and city for the best spas, restaurants, clinics, schools, and more.
        </p>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-gray-900">Browse by State</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {states.map((s: { slug: string; name: string }) => (
              <li key={s.slug}>
                <Link
                  href={`/in/${s.slug}`}
                  className="block rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-800 shadow-sm transition hover:border-blue-300 hover:shadow"
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-gray-900">Why use our directory?</h2>
          <ul className="mt-3 list-inside list-disc space-y-1 text-gray-600">
            <li>SEO-friendly URLs: /state/city/category/business-name</li>
            <li>Verified businesses and real reviews</li>
            <li>Contact via phone, WhatsApp, and contact form</li>
            <li>Coverage across all Indian states and major cities</li>
          </ul>
        </section>

        <nav className="mt-8 flex flex-wrap gap-4 text-sm">
          <Link href="/blog" className="text-blue-600 hover:underline">Blog</Link>
          <Link href="/contact" className="text-blue-600 hover:underline">Contact</Link>
        </nav>
      </div>
    </div>
  );
}
