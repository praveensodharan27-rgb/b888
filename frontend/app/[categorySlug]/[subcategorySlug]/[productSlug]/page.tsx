import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductPageClient from './ProductPageClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

type ProductRouteParams = {
  categorySlug: string;
  subcategorySlug: string;
  productSlug: string;
};

async function getProductData(categorySlug: string, subcategorySlug: string, productSlug: string) {
  try {
    const res = await fetch(`${API_URL}/categories/${categorySlug}/${subcategorySlug}/${productSlug}`, {
      next: { revalidate: 60 } // Revalidate every minute
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.success ? data : null;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<ProductRouteParams>
}): Promise<Metadata> {
  const { categorySlug, subcategorySlug, productSlug } = await params;
  const data = await getProductData(categorySlug, subcategorySlug, productSlug);

  if (!data || !data.product) {
    return {
      title: 'Product Not Found',
      description: 'The requested product could not be found.'
    };
  }

  const product = data.product;
  const category = data.category;
  const subcategory = data.subcategory;

  const metaTitle = `${product.title} - ₹${product.price.toLocaleString('en-IN')} | ${category.name} - ${subcategory.name}`;
  const metaDescription = product.description 
    ? `${product.description.substring(0, 160)}...` 
    : `Buy ${product.title} for ₹${product.price.toLocaleString('en-IN')} in ${category.name} - ${subcategory.name}.`;

  const imageUrl = product.images && product.images.length > 0 
    ? (product.images[0].startsWith('http') ? product.images[0] : `${API_URL.replace('/api', '')}${product.images[0]}`)
    : undefined;

  return {
    title: metaTitle,
    description: metaDescription,
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      type: 'website',
      images: imageUrl ? [{ url: imageUrl, alt: product.title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: metaTitle,
      description: metaDescription,
      images: imageUrl ? [imageUrl] : undefined,
    },
    alternates: {
      canonical: `/${category.slug}/${subcategory.slug}/${product.slug || product.id}`,
    },
  };
}

export default async function ProductPage({ 
  params 
}: { 
  params: Promise<ProductRouteParams>
}) {
  const { categorySlug, subcategorySlug, productSlug } = await params;
  const data = await getProductData(categorySlug, subcategorySlug, productSlug);

  if (!data || !data.product) {
    notFound();
  }

  return (
    <ProductPageClient 
      data={data}
      categorySlug={categorySlug}
      subcategorySlug={subcategorySlug}
      productSlug={productSlug}
    />
  );
}

