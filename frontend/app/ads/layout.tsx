import type { Metadata } from 'next';
import { getBaseUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Browse Ads | Sell Box - Buy and Sell Anything',
  description: 'Browse thousands of classified ads. Find great deals on electronics, vehicles, property, services and more in your local area.',
  alternates: { canonical: `${getBaseUrl()}/ads` },
  openGraph: {
    title: 'Browse Ads | Sell Box - Buy and Sell Anything',
    description: 'Browse thousands of classified ads. Find great deals in your local area.',
    type: 'website',
    url: `${getBaseUrl()}/ads`,
    siteName: 'Sell Box',
    images: [{ url: `${getBaseUrl()}/og-default.jpg`, width: 1200, height: 630, alt: 'Sell Box - Buy and Sell Anything' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Browse Ads | Sell Box - Buy and Sell Anything',
    description: 'Browse thousands of classified ads. Find great deals in your local area.',
  },
};

export default function AdsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
