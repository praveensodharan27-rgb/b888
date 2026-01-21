import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SubcategoryPageClient from './SubcategoryPageClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

type SubcategoryRouteParams = {
  categorySlug: string;
  subcategorySlug: string;
};

async function getSubcategoryData(categorySlug: string, subcategorySlug: string) {
  try {
    const res = await fetch(`${API_URL}/categories/${categorySlug}/${subcategorySlug}`, {
      next: { revalidate: 300 } // Revalidate every 5 minutes
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.success ? data : null;
  } catch (error) {
    console.error('Error fetching subcategory:', error);
    return null;
  }
}

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<SubcategoryRouteParams>
}): Promise<Metadata> {
  const { categorySlug, subcategorySlug } = await params;
  const data = await getSubcategoryData(categorySlug, subcategorySlug);

  if (!data || !data.subcategory) {
    return {
      title: 'Subcategory Not Found',
      description: 'The requested subcategory could not be found.'
    };
  }

  const { subcategory, category } = data;
  const metaTitle = subcategory.metaTitle || 
    `${subcategory.name} - ${category.name} | Buy & Sell Online`;
  const metaDescription = subcategory.metaDescription || 
    `Browse ${subcategory.name} listings in ${category.name}. Find the best deals on ${subcategory.name} in your area.`;

  return {
    title: metaTitle,
    description: metaDescription,
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      type: 'website',
    },
    alternates: {
      canonical: `/${category.slug}/${subcategory.slug}`,
    },
  };
}

export default async function SubcategoryPage({ 
  params 
}: { 
  params: Promise<SubcategoryRouteParams>
}) {
  const { categorySlug, subcategorySlug } = await params;
  const data = await getSubcategoryData(categorySlug, subcategorySlug);

  if (!data || !data.subcategory) {
    notFound();
  }

  return (
    <SubcategoryPageClient 
      data={data} 
      categorySlug={categorySlug}
      subcategorySlug={subcategorySlug}
    />
  );
}

