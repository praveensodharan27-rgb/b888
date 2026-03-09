import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBaseUrl } from '@/lib/seo';
import { getLocationBySlug } from '@/lib/locationBySlug';
import { getServicesBaseUrl } from '@/lib/servicesUrl';
import ServicesWithLocationClient from './ServicesWithLocationClient';

type Props = { params: Promise<{ categorySlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug: citySlug } = await params;
  const location = await getLocationBySlug(citySlug);
  if (!location) return { title: 'Services' };
  const title = `Services in ${location.name} | Local Plumbers, Electricians & More`;
  const description = `Find the best local services in ${location.name} – plumbers, electricians, cleaning, AC repair, painters and more. Compare and contact service providers.`;
  const canonical = `${getBaseUrl()}${getServicesBaseUrl(citySlug)}`;
  return {
    title: title.slice(0, 60),
    description: description.slice(0, 160),
    openGraph: { title, description, url: canonical, type: 'website' },
    alternates: { canonical },
  };
}

export default async function CityServicesPage({ params }: Props) {
  const { categorySlug: citySlug } = await params;
  const location = await getLocationBySlug(citySlug);
  if (!location) notFound();

  const base = getBaseUrl();
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: base },
      { '@type': 'ListItem', position: 2, name: location.name, item: `${base}${getServicesBaseUrl(citySlug)}` },
      { '@type': 'ListItem', position: 3, name: 'Services', item: `${base}${getServicesBaseUrl(citySlug)}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <ServicesWithLocationClient locationSlug={location.slug} locationName={location.name} />
    </>
  );
}
