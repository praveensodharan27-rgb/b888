import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import AppClientRoot from '@/components/AppClientRoot';

const plusJakartaSans = Plus_Jakarta_Sans({ 
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['200', '300', '400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'SellIt - Buy and Sell Anything',
  description: 'Buy and sell anything in your local area. Post free classified ads.',
  keywords: 'classifieds, buy, sell, marketplace, local',
  openGraph: {
    title: 'SellIt - Buy and Sell Anything',
    description: 'Buy and sell anything in your local area. Post free classified ads.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const splashImageUrl = process.env.NEXT_PUBLIC_SPLASH_IMAGE_URL || '';
  const splashLinkUrl = process.env.NEXT_PUBLIC_SPLASH_LINK_URL;
  const splashDuration = parseInt(process.env.NEXT_PUBLIC_SPLASH_DURATION || '0');
  const splashEnabled = process.env.NEXT_PUBLIC_SPLASH_ENABLED === 'true';

  return (
    <html lang="en" className="light">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link href="https://fonts.gstatic.com" rel="preconnect" crossOrigin="anonymous" />
      </head>
      <body className={`${plusJakartaSans.variable} font-display bg-background-light text-gray-900`} style={{ overflowX: 'hidden', margin: 0, padding: 0, color: '#111827' }}>
        <Providers>
          <AppClientRoot
            splashImageUrl={splashImageUrl}
            splashLinkUrl={splashLinkUrl}
            splashDuration={Number.isFinite(splashDuration) ? splashDuration : 0}
            splashEnabled={splashEnabled}
          >
            {children}
          </AppClientRoot>
        </Providers>
      </body>
    </html>
  );
}

