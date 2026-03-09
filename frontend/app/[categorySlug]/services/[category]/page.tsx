import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocationBySlug } from '@/lib/locationBySlug';
import { getServiceCategoryUrl, getServicesBaseUrl } from '@/lib/servicesUrl';
import { getServiceCategoryBySlug } from '@/lib/serviceCategories';
import { getBaseUrl } from '@/lib/seo';
import ServicesCategoryClient from './ServicesCategoryClient';

type Props = { params: Promise<{ categorySlug: string; category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug: citySlug, category: categorySlug } = await params;
  const location = await getLocationBySlug(citySlug);
  const cat = getServiceCategoryBySlug(categorySlug);
  if (!location) return { title: 'Services' };
  const title = categorySlug === 'all'
    ? `All Services in ${location.name}`
    : `Best ${cat.label} in ${location.name}`;
  const description = categorySlug === 'all'
    ? `Find local services in ${location.name} – plumbers, electricians, cleaning, AC repair and more.`
    : `Find the best ${cat.label} in ${location.name}. Compare and contact local service providers.`;
  const canonical = `${getBaseUrl()}${getServiceCategoryUrl(citySlug, categorySlug)}`;
  return {
    title: title.slice(0, 60),
    description: description.slice(0, 160),
    openGraph: { title, description, url: canonical, type: 'website' },
    alternates: { canonical },
  };
}

export default async function ServiceCategoryPage({ params }: Props) {
  const { categorySlug: citySlug, category: categorySlug } = await params;
  const location = await getLocationBySlug(citySlug);
  if (!location) notFound();
  const cat = getServiceCategoryBySlug(categorySlug);

  const base = getBaseUrl();
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: base },
      { '@type': 'ListItem', position: 2, name: location.name, item: `${base}${getServicesBaseUrl(citySlug)}` },
      { '@type': 'ListItem', position: 3, name: cat.label, item: `${base}${getServiceCategoryUrl(citySlug, categorySlug)}` },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <ServicesCategoryClient
        citySlug={citySlug}
        categorySlug={categorySlug}
        locationName={location.name}
        categoryLabel={cat.label}
      />
    </div>
  );
}
