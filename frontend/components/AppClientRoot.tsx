'use client';

import dynamic from 'next/dynamic';
import AppToast from '@/components/AppToast';
import { ConditionalFooter, ConditionalNavbar } from '@/components/ConditionalNav';
import { AuthModalProvider } from '@/contexts/AuthModalContext';
import GooglePlacesLoader from '@/components/GooglePlacesLoader';

const InterstitialAdWrapper = dynamic(
  () =>
    import('@/components/InterstitialAdWrapper')
      .then((m) => m?.default ?? (() => null))
      .catch(() => ({ default: () => null })),
  { ssr: false, loading: () => null }
);

const PushNotificationPrompt = dynamic(
  () => import('@/components/PushNotificationPrompt').catch(() => ({ default: () => null })),
  { ssr: false }
);

const SplashScreen = dynamic(
  () => import('@/components/SplashScreen').catch(() => ({ default: () => null })),
  { ssr: false }
);

const GoogleTranslateProvider = dynamic(
  () =>
    import('@/components/GoogleTranslateProvider')
      .then((m) => m?.default ?? (({ children }: { children: React.ReactNode }) => <>{children}</>))
      .catch(() => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> })),
  { ssr: false, loading: () => null }
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
    <>
      {/* Load Maps/Places immediately - not blocked by GoogleTranslateProvider dynamic import */}
      <GooglePlacesLoader />
      <GoogleTranslateProvider>
        <AuthModalProvider>
          <ConditionalNavbar />
          <main className="min-h-screen w-full max-w-full overflow-x-hidden box-border" style={{ margin: 0, padding: 0 }}>
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
        <AppToast />
        </AuthModalProvider>
      </GoogleTranslateProvider>
    </>
  );
}
