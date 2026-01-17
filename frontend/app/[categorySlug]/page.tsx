import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CategoryPageClient from './CategoryPageClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function getCategoryData(categorySlug: string) {
  try {
    const res = await fetch(`${API_URL}/categories/${categorySlug}`, {
      next: { revalidate: 300 } // Revalidate every 5 minutes
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.success ? data : null;
  } catch (error) {
    console.error('Error fetching category:', error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: { categorySlug: string } }): Promise<Metadata> {
  const data = await getCategoryData(params.categorySlug);

  if (!data || !data.category) {
    return {
      title: 'Category Not Found',
      description: 'The requested category could not be found.'
    };
  }

  const category = data.category;
  const metaTitle = category.metaTitle || `${category.name} - Buy & Sell ${category.name} Online`;
  const metaDescription = category.metaDescription || 
    `Browse ${category.name} listings. Find the best deals on ${category.name} in your area.`;

  return {
    title: metaTitle,
    description: metaDescription,
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      type: 'website',
    },
    alternates: {
      canonical: `/${category.slug}`,
    },
  };
}

export default async function CategoryPage({ params }: { params: { categorySlug: string } }) {
  const data = await getCategoryData(params.categorySlug);

  if (!data || !data.category) {
    notFound();
  }

  return <CategoryPageClient data={data} categorySlug={params.categorySlug} />;
}

