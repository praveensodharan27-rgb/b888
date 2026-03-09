import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getStateBySlug, normalizeSegment } from '@/lib/directory';
import CategoryPageClient from './CategoryPageClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function getCategoryData(categorySlug: string) {
  try {
    const res = await fetch(`${API_URL}/categories/${categorySlug}`, {
      next: { revalidate: 300 },
    });
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
  params: Promise<{ categorySlug: string }>;
}): Promise<Metadata> {
  const { categorySlug } = await params;
  const slug = normalizeSegment(categorySlug);
  const state = await getStateBySlug(slug);
  if (state) return { title: 'Not Found', description: 'The requested page could not be found.' };
  const data = await getCategoryData(slug);
  if (!data?.category) {
    return { title: 'Not Found', description: 'The requested page could not be found.' };
  }
  const category = data.category;
  const metaTitle = category.metaTitle || `${category.name} - Buy & Sell ${category.name} Online`;
  const metaDescription =
    category.metaDescription || `Browse ${category.name} listings. Find the best deals on ${category.name} in your area.`;
  return {
    title: metaTitle,
    description: metaDescription,
    openGraph: { title: metaTitle, description: metaDescription, type: 'website' },
    alternates: { canonical: `/${category.slug}` },
  };
}

export default async function FirstSegmentPage({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  const { categorySlug } = await params;
  const slug = normalizeSegment(categorySlug);
  const state = await getStateBySlug(slug);
  // State directory pages (e.g. /kerala) are disabled
  if (state) notFound();

  const data = await getCategoryData(slug);
  if (!data?.category) notFound();
  return <CategoryPageClient data={data} categorySlug={slug} />;
}
