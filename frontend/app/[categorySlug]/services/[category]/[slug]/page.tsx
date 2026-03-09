import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocationBySlug } from '@/lib/locationBySlug';
import { fetchAdByServicePath } from '@/lib/fetchAdByServicePath';
import { getServiceDetailUrl, getServiceCategoryUrl, getServicesBaseUrl } from '@/lib/servicesUrl';
import { getServiceCategoryBySlug } from '@/lib/serviceCategories';
import { getBaseUrl } from '@/lib/seo';
import ServiceDetailClient from './ServiceDetailClient';

type Props = { params: Promise<{ categorySlug: string; category: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug: citySlug, category: categorySlug, slug } = await params;
  const location = await getLocationBySlug(citySlug);
  const ad = await fetchAdByServicePath(citySlug, categorySlug, slug);
  const cat = getServiceCategoryBySlug(categorySlug);
  if (!location || !ad) return { title: 'Service' };
  const title = `${(ad as any).title || 'Service'} - ${cat.label} in ${location.name}`;
  const description = (ad as any).description
    ? String((ad as any).description).slice(0, 160) + '...'
    : `Contact for ${cat.label} in ${location.name}.`;
  const canonical = `${getBaseUrl()}${getServiceDetailUrl(citySlug, categorySlug, slug)}`;
  const imageUrl = (ad as any).images?.[0];
  return {
    title: title.slice(0, 60),
    description: description.slice(0, 160),
    openGraph: { title, description, url: canonical, type: 'website', images: imageUrl ? [imageUrl] : undefined },
    alternates: { canonical },
  };
}

export default async function ServiceSlugPage({ params }: Props) {
  const { categorySlug: citySlug, category: categorySlug, slug } = await params;
  const [location, ad] = await Promise.all([
    getLocationBySlug(citySlug),
    fetchAdByServicePath(citySlug, categorySlug, slug),
  ]);
  if (!location || !ad) notFound();
  const cat = getServiceCategoryBySlug(categorySlug);

  const base = getBaseUrl();
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: base },
      { '@type': 'ListItem', position: 2, name: location.name, item: `${base}${getServicesBaseUrl(citySlug)}` },
      { '@type': 'ListItem', position: 3, name: 'Services', item: `${base}${getServicesBaseUrl(citySlug)}` },
      { '@type': 'ListItem', position: 4, name: cat.label, item: `${base}${getServiceCategoryUrl(citySlug, categorySlug)}` },
      { '@type': 'ListItem', position: 5, name: (ad as any).title, item: `${base}${getServiceDetailUrl(citySlug, categorySlug, slug)}` },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <nav className="mb-4 text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-700">Home</Link>
          <span className="mx-1">/</span>
          <Link href={getServicesBaseUrl(citySlug)} className="hover:text-gray-700">{location.name}</Link>
          <span className="mx-1">/</span>
          <Link href={getServicesBaseUrl(citySlug)} className="hover:text-gray-700">Services</Link>
          <span className="mx-1">/</span>
          <Link href={getServiceCategoryUrl(citySlug, categorySlug)} className="hover:text-gray-700">{cat.label}</Link>
          <span className="mx-1">/</span>
          <span className="text-gray-900 line-clamp-1">{(ad as any).title}</span>
        </nav>
        <ServiceDetailClient
          ad={ad as any}
          citySlug={citySlug}
          categorySlug={categorySlug}
          locationName={location.name}
          categoryLabel={cat.label}
        />
      </div>
    </div>
  );
}
