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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Handle Next.js chunk loading errors
              (function() {
                if (typeof window === 'undefined') return;
                
                // Listen for chunk loading errors
                window.addEventListener('error', function(e) {
                  const isChunkError = e.message && (
                    e.message.includes('chunk') ||
                    e.message.includes('Loading chunk') ||
                    e.message.includes('Failed to fetch dynamically imported module') ||
                    e.message.includes('Importing a module script failed')
                  );
                  
                  if (isChunkError) {
                    console.warn('Chunk loading error detected, attempting recovery...');
                    e.preventDefault();
                    
                    // Clear caches and reload
                    if ('caches' in window) {
                      caches.keys().then(function(names) {
                        names.forEach(function(name) {
                          caches.delete(name);
                        });
                        setTimeout(function() {
                          window.location.reload();
                        }, 500);
                      });
                    } else {
                      setTimeout(function() {
                        window.location.reload();
                      }, 500);
                    }
                  }
                }, true);
                
                // Handle unhandled promise rejections (chunk loading failures and expected API errors)
                window.addEventListener('unhandledrejection', function(e) {
                  const reason = e.reason?.message || e.reason?.toString() || '';
                  const isChunkError = reason.includes('chunk') ||
                                       reason.includes('Loading chunk') ||
                                       reason.includes('Failed to fetch dynamically imported module');
                  
                  // Check if it's an expected Axios error (400, 404, etc.)
                  const isAxiosError = e.reason?.isAxiosError || e.reason?.response;
                  const status = e.reason?.response?.status;
                  const url = e.reason?.config?.url || '';
                  const errorMessage = e.reason?.response?.data?.message || '';
                  const errorData = e.reason?.response?.data || {};
                  
                  // Suppress expected 404 errors (neighborhoods may not exist for all states)
                  if (isAxiosError && status === 404 && (url.includes('/locations/neighborhoods') || e.reason?.isExpected404)) {
                    e.preventDefault();
                    // Silently suppress - this is expected behavior
                    return;
                  }
                  
                  // Suppress expected 400 errors
                  if (isAxiosError && status === 400) {
                    // Check if it's a geocoding API key error
                    const isGeocodingApiKeyError = url.includes('/geocoding/') && 
                      (errorMessage.includes('referrer restrictions') || 
                       errorMessage.includes('referer restrictions') ||
                       errorMessage.includes('API key'));
                    
                    // Check if it's an empty response
                    const hasKeys = errorData && typeof errorData === 'object' && Object.keys(errorData).length > 0;
                    const hasMessage = hasKeys && (errorData.message || errorData.error);
                    const hasValidationErrors = hasKeys && Array.isArray(errorData.errors) && errorData.errors.length > 0;
                    const isEmptyResponse = !hasMessage && !hasValidationErrors;
                    
                    // Suppress expected errors (geocoding API key issues or empty responses)
                    if (isGeocodingApiKeyError || isEmptyResponse) {
                      // Prevent default error logging for expected errors
                      e.preventDefault();
                      // Silently suppress - these are handled gracefully in the code
                      return;
                    }
                  }
                  
                  if (isChunkError) {
                    console.warn('Chunk loading promise rejection detected, attempting recovery...');
                    e.preventDefault();
                    
                    if ('caches' in window) {
                      caches.keys().then(function(names) {
                        names.forEach(function(name) {
                          caches.delete(name);
                        });
                        setTimeout(function() {
                          window.location.reload();
                        }, 500);
                      });
                    } else {
                      setTimeout(function() {
                        window.location.reload();
                      }, 500);
                    }
                  }
                });
              })();
            `,
          }}
        />
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

