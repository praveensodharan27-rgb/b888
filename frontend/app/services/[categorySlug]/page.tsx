import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getServiceCategoryBySlug } from '@/lib/serviceCategories';
import { getBaseUrl } from '@/lib/seo';
import ServicesListingClient from './ServicesListingClient';

type Props = { params: Promise<{ categorySlug: string }> };

const VALID_SLUGS = new Set([
  'all',
  'plumbing',
  'electrician',
  'cleaning',
  'pest-control',
  'painters',
  'ac_repair',
  'carpenters',
  'appliance-repair',
  'salon-beauty',
  'photography',
]);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug } = await params;
  const slug = (categorySlug || '').trim().toLowerCase();
  const cat = getServiceCategoryBySlug(slug);
  const title = slug === 'all' ? 'All Services' : `${cat.label} - Local Services`;
  const description =
    slug === 'all'
      ? 'Find plumbers, electricians, cleaning, AC repair and more. Browse service listings.'
      : `Find the best ${cat.label} near you. Compare and contact local service providers.`;
  const canonical = `${getBaseUrl()}/services/${slug}`;
  return {
    title: title.slice(0, 60),
    description: description.slice(0, 160),
    openGraph: { title: title.slice(0, 60), description: description.slice(0, 160), url: canonical, type: 'website' },
    alternates: { canonical },
  };
}

export default async function ServiceCategoryPage({ params }: Props) {
  const { categorySlug } = await params;
  const slug = (categorySlug || '').trim().toLowerCase();
  if (!slug || !VALID_SLUGS.has(slug)) notFound();
  const cat = getServiceCategoryBySlug(slug);
  return <ServicesListingClient categorySlug={slug} categoryLabel={cat.label} />;
}
