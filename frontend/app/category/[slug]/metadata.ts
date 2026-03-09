import { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const categoryName = slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    title: `${categoryName} - Buy & Sell Online | Sell Box`,
    description: `Browse ${categoryName} on Sell Box. Find the best deals, compare prices, and buy or sell ${categoryName} in your area. Thousands of listings updated daily.`,
    keywords: [
      categoryName,
      `buy ${categoryName}`,
      `sell ${categoryName}`,
      `${categoryName} marketplace`,
      `used ${categoryName}`,
      `new ${categoryName}`,
    ],
    openGraph: {
      title: `${categoryName} Marketplace`,
      description: `Discover amazing deals on ${categoryName}. Buy and sell with confidence.`,
      type: 'website',
    },
  };
}

