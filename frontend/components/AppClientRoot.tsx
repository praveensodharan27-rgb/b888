'use client';

import dynamic from 'next/dynamic';
import { Toaster } from 'react-hot-toast';
import { ConditionalFooter, ConditionalNavbar } from '@/components/ConditionalNav';

const InterstitialAdWrapper = dynamic(() => import('@/components/InterstitialAdWrapper'), {
  ssr: false,
});

const PushNotificationPrompt = dynamic(() => import('@/components/PushNotificationPrompt'), {
  ssr: false,
});

const SplashScreen = dynamic(() => import('@/components/SplashScreen'), {
  ssr: false,
});

const GoogleTranslateProvider = dynamic(
  () =>
    import('@/components/GoogleTranslateProvider').catch((error) => {
      console.error('Failed to load GoogleTranslateProvider:', error);
      return { default: ({ children }: { children: React.ReactNode }) => <>{children}</> };
    }),
  {
    ssr: false,
    loading: () => null,
  }
);

export default function AppClientRoot({
  children,
  splashImageUrl,
  splashLinkUrl,
  splashDuration,
  splashEnabled,
}: {
  children: React.ReactNode;
  splashImageUrl: string;
  splashLinkUrl?: string;
  splashDuration: number;
  splashEnabled: boolean;
}) {
  return (
    <GoogleTranslateProvider>
      <ConditionalNavbar />
      <main className="min-h-screen" style={{ margin: 0, padding: 0 }}>
        {children}
      </main>
      <ConditionalFooter />
      <InterstitialAdWrapper />
      <PushNotificationPrompt />
      <SplashScreen
        imageUrl={splashImageUrl}
        link={splashLinkUrl}
        duration={splashDuration}
        showOnLoad={splashEnabled}
        storageKey="splash_screen_shown"
      />
      <Toaster position="top-right" />
    </GoogleTranslateProvider>
  );
}

