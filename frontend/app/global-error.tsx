'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global application error:', error);
    
    // Handle chunk loading errors specifically
    const isChunkError = error.message?.includes('chunk') || 
                         error.message?.includes('Loading chunk') ||
                         error.message?.includes('Failed to fetch dynamically imported module');
    
    if (isChunkError) {
      console.warn('Chunk loading error detected. Attempting automatic recovery...');
      
      // Clear Next.js cache and reload after a short delay
      setTimeout(() => {
        // Clear service worker cache if exists
        if ('serviceWorker' in navigator && 'caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => {
              caches.delete(name);
            });
          });
        }
        
        // Force reload after clearing cache
        window.location.reload();
      }, 1000);
    }
  }, [error]);

  const isChunkError = error.message?.includes('chunk') || 
                       error.message?.includes('Loading chunk') ||
                       error.message?.includes('Failed to fetch dynamically imported module');

  return (
    <html>
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', padding: '1rem' }}>
          <div style={{ maxWidth: '28rem', width: '100%', backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '2rem', textAlign: 'center' }}>
            <div style={{ width: '4rem', height: '4rem', color: '#ef4444', margin: '0 auto 1rem', fontSize: '4rem' }}>⚠️</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
              {isChunkError ? 'Loading Error' : 'Something went wrong!'}
            </h1>
            <p style={{ color: '#4b5563', marginBottom: '1.5rem' }}>
              {isChunkError 
                ? 'A loading error occurred. The page will reload automatically, or you can click the button below.'
                : error.message || 'An unexpected error occurred. Please refresh the page.'}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  // Clear cache and reload
                  if ('caches' in window) {
                    caches.keys().then((names) => {
                      names.forEach((name) => caches.delete(name));
                    });
                  }
                  window.location.reload();
                }}
                style={{ padding: '0.5rem 1.5rem', backgroundColor: '#2563eb', color: 'white', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}
              >
                {isChunkError ? 'Reload Page' : 'Try again'}
              </button>
              {!isChunkError && (
                <button
                  onClick={reset}
                  style={{ padding: '0.5rem 1.5rem', backgroundColor: '#6b7280', color: 'white', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

