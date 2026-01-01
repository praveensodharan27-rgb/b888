import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
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
  return (
    <html lang="en" className="light">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link href="https://fonts.gstatic.com" rel="preconnect" crossOrigin="anonymous" />
      </head>
      <body className={`${plusJakartaSans.variable} font-display bg-background-light text-slate-900`} style={{ overflowX: 'hidden' }}>
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

