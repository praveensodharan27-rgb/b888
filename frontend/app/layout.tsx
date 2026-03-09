import type { Metadata } from 'next';
import { Poppins, Inter, Roboto } from 'next/font/google';
import './globals.css';
import JsonLdSite from '@/components/seo/JsonLdSite';
import { getBaseUrl } from '@/lib/seo';
import AppWithShell from '@/components/AppWithShell';

const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-poppins',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const roboto = Roboto({
  subsets: ['latin'],
  variable: '--font-roboto',
  weight: ['400', '500', '700'],
});

const isDev = process.env.NODE_ENV === 'development';
const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  title: 'Sell Box - Buy and Sell Anything',
  description: 'Buy and sell anything in your local area. Post free classified ads.',
  keywords: 'classifieds, buy, sell, marketplace, local',
  robots: isDev ? 'noindex, nofollow' : 'index, follow',
  openGraph: {
    title: 'Sell Box - Buy and Sell Anything',
    description: 'Buy and sell anything in your local area. Post free classified ads.',
    type: 'website',
    url: baseUrl,
    siteName: 'Sell Box',
    images: [
      { url: `${baseUrl}/og-default.jpg`, width: 1200, height: 630, alt: 'Sell Box - Buy and Sell Anything' },
      { url: `${baseUrl}/logo.png`, width: 512, height: 512, alt: 'Sell Box' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sell Box - Buy and Sell Anything',
    description: 'Buy and sell anything in your local area. Post free classified ads.',
    images: [`${baseUrl}/og-default.jpg`],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const splashImageUrl = process.env.NEXT_PUBLIC_SPLASH_IMAGE_URL || '';
  const splashLinkUrl = process.env.NEXT_PUBLIC_SPLASH_LINK_URL;
  const splashDuration = parseInt(process.env.NEXT_PUBLIC_SPLASH_DURATION || '0');
  const splashEnabled = process.env.NEXT_PUBLIC_SPLASH_ENABLED === 'true';

  return (
    <html lang="en" className={`light ${poppins.variable} ${inter.variable} ${roboto.variable}`} data-scroll-behavior="smooth">
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
                
                // Listen for chunk loading errors and network errors
                window.addEventListener('error', function(e) {
                  const msg = (e.message || '').toLowerCase();
                  const isNetworkError = e.message && (
                    msg.includes('networkerror') ||
                    msg.includes('failed to fetch') ||
                    msg.includes('fetch resource')
                  );
                  const isChunkError = e.message && (
                    e.message.includes('chunk') ||
                    e.message.includes('Loading chunk') ||
                    e.message.includes('Failed to fetch dynamically imported module') ||
                    e.message.includes('Importing a module script failed')
                  );
                  if (isNetworkError && !isChunkError) {
                    e.preventDefault();
                    console.warn('Network error: check if the API server is running and your connection is stable.');
                    return;
                  }
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
                  const reasonLower = reason.toLowerCase();
                  const isNetworkError = reasonLower.includes('networkerror') ||
                                        reasonLower.includes('failed to fetch') ||
                                        reasonLower.includes('fetch resource');
                  const isChunkError = reason.includes('chunk') ||
                                       reason.includes('Loading chunk') ||
                                       reason.includes('Failed to fetch dynamically imported module');
                  if (isNetworkError && !isChunkError) {
                    e.preventDefault();
                    console.warn('Network error: check if the API server is running (e.g. backend on port 5000) and your connection is stable.');
                    return;
                  }
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
      <body className={`${inter.variable} font-sans bg-background-light text-gray-900 overflow-x-visible`} style={{ margin: 0, padding: 0, color: '#111827' }}>
        <JsonLdSite />
        <AppWithShell
          splashImageUrl={splashImageUrl}
          splashLinkUrl={splashLinkUrl}
          splashDuration={Number.isFinite(splashDuration) ? splashDuration : 0}
          splashEnabled={splashEnabled}
        >
          {children}
        </AppWithShell>
      </body>
    </html>
  );
}

