import { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const categoryName = params.slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    title: `${categoryName} - Buy & Sell Online | SellIt`,
    description: `Browse ${categoryName} on SellIt. Find the best deals, compare prices, and buy or sell ${categoryName} in your area. Thousands of listings updated daily.`,
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

