import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getStateBySlug, normalizeSegment } from '@/lib/directory';
import SubcategoryPageClient from './SubcategoryPageClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function getSubcategoryData(categorySlug: string, subcategorySlug: string) {
  try {
    const res = await fetch(`${API_URL}/categories/${categorySlug}/${subcategorySlug}`, {
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
  params: Promise<{ categorySlug: string; subcategorySlug: string }>;
}): Promise<Metadata> {
  const { categorySlug, subcategorySlug } = await params;
  const first = normalizeSegment(categorySlug);
  const second = normalizeSegment(subcategorySlug);
  const state = await getStateBySlug(first);
  if (state) return { title: 'Not Found', description: 'The requested page could not be found.' };
  const data = await getSubcategoryData(first, second);
  if (!data?.subcategory) return { title: 'Not Found', description: 'The requested page could not be found.' };
  const { subcategory, category } = data;
  const metaTitle = subcategory.metaTitle || `${subcategory.name} - ${category.name} | Buy & Sell Online`;
  const metaDescription = subcategory.metaDescription || `Browse ${subcategory.name} listings in ${category.name}. Find the best deals in your area.`;
  return {
    title: metaTitle,
    description: metaDescription,
    openGraph: { title: metaTitle, description: metaDescription, type: 'website' },
    alternates: { canonical: `/${category.slug}/${subcategory.slug}` },
  };
}

export default async function SecondSegmentPage({
  params,
}: {
  params: Promise<{ categorySlug: string; subcategorySlug: string }>;
}) {
  const { categorySlug, subcategorySlug } = await params;
  const first = normalizeSegment(categorySlug);
  const second = normalizeSegment(subcategorySlug);
  const state = await getStateBySlug(first);
  // City directory pages (e.g. /kerala/ernakulam) are disabled
  if (state) notFound();

  const data = await getSubcategoryData(first, second);
  if (!data?.subcategory) notFound();
  return (
    <SubcategoryPageClient
      data={data}
      categorySlug={first}
      subcategorySlug={second}
    />
  );
}
