import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import dynamic from 'next/dynamic';
import { Toaster } from 'react-hot-toast';
import { ConditionalNavbar, ConditionalFooter } from '@/components/ConditionalNav';

const InterstitialAdWrapper = dynamic(() => import('@/components/InterstitialAdWrapper'), {
  ssr: false // Don't SSR ads
});

const PushNotificationPrompt = dynamic(() => import('@/components/PushNotificationPrompt'), {
  ssr: false // Client-side only
});

const SplashScreen = dynamic(() => import('@/components/SplashScreen'), {
  ssr: false // Client-side only
});

const GoogleTranslateProvider = dynamic(
  () => import('@/components/GoogleTranslateProvider').catch((error) => {
    console.error('Failed to load GoogleTranslateProvider:', error);
    // Return a fallback component that just renders children
    return { default: ({ children }: { children: React.ReactNode }) => <>{children}</> };
  }),
  {
    ssr: false, // Client-side only to prevent hydration issues
    loading: () => null // Don't show loading state, just render children
  }
);

const inter = Inter({ subsets: ['latin'] });

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
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <GoogleTranslateProvider>
            <ConditionalNavbar />
            <main className="min-h-screen">{children}</main>
            <ConditionalFooter />
            <InterstitialAdWrapper />
            <PushNotificationPrompt />
            <SplashScreen
              imageUrl={process.env.NEXT_PUBLIC_SPLASH_IMAGE_URL || ''}
              link={process.env.NEXT_PUBLIC_SPLASH_LINK_URL}
              duration={parseInt(process.env.NEXT_PUBLIC_SPLASH_DURATION || '0')}
              showOnLoad={process.env.NEXT_PUBLIC_SPLASH_ENABLED === 'true'}
              storageKey="splash_screen_shown"
            />
            <Toaster position="top-right" />
          </GoogleTranslateProvider>
        </Providers>
      </body>
    </html>
  );
}

