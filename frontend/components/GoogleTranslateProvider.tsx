'use client';

import { useEffect, useRef, useState } from 'react';
import { useGoogleTranslate } from '@/hooks/useGoogleTranslate';
import { getCurrentLanguage } from '@/lib/translations';
import { usePathname } from 'next/navigation';

/**
 * Provider component that automatically translates page content
 * Translates all pages including dynamic content and navigation
 */
export default function GoogleTranslateProvider({ children }: { children: React.ReactNode }) {
  const { translatePage } = useGoogleTranslate();
  const pathname = usePathname();
  const previousPathname = useRef<string>('');
  const [mounted, setMounted] = useState(false);

  // Ensure we're on the client side before accessing browser APIs
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Don't run on server side
    if (!mounted || typeof window === 'undefined' || !translatePage) return;

    // Translate page when language changes
    const handleLanguageChange = (event: CustomEvent) => {
      try {
        const newLang = event.detail.lang;
        if (newLang !== 'en') {
          // Small delay to ensure DOM is ready
          setTimeout(() => {
            translatePage(newLang);
          }, 200);
        } else {
          // Restore English content
          translatePage('en');
        }
      } catch (error) {
        console.error('Error in language change handler:', error);
      }
    };

    try {
      window.addEventListener('languageChanged', handleLanguageChange as EventListener);

      // Translate on mount if language is not English
      const savedLang = getCurrentLanguage();
      if (savedLang !== 'en') {
        setTimeout(() => {
          translatePage(savedLang);
        }, 800); // Delay to ensure page is fully loaded
      }
    } catch (error) {
      console.error('Error setting up translation:', error);
    }

    return () => {
      try {
        window.removeEventListener('languageChanged', handleLanguageChange as EventListener);
      } catch (error) {
        console.error('Error cleaning up translation:', error);
      }
    };
  }, [translatePage, mounted]);

  // Translate when navigating to a new page
  useEffect(() => {
    // Don't run on server side
    if (!mounted || typeof window === 'undefined' || !translatePage) return;

    // Only translate if pathname changed (new page loaded)
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      
      try {
        const savedLang = getCurrentLanguage();
        if (savedLang !== 'en') {
          // Wait for new page content to load (longer delay for dynamic content)
          setTimeout(() => {
            translatePage(savedLang);
          }, 800);
          
          // Also translate after a longer delay to catch any lazy-loaded content
          setTimeout(() => {
            translatePage(savedLang);
          }, 2000);
        }
      } catch (error) {
        console.error('Error translating on navigation:', error);
      }
    }
  }, [pathname, translatePage, mounted]);

  // Listen for dynamic content changes (e.g., React Query updates, lazy loading)
  useEffect(() => {
    // Don't run on server side
    if (!mounted || typeof window === 'undefined' || typeof document === 'undefined' || !translatePage) return;

    try {
      const savedLang = getCurrentLanguage();
      if (savedLang === 'en') return;

      // Use MutationObserver to detect DOM changes and retranslate
      let timeoutId: NodeJS.Timeout;
      const observer = new MutationObserver((mutations) => {
        let shouldRetranslate = false;
        
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Check if any added nodes contain text content
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                if (element.textContent && element.textContent.trim().length > 0) {
                  shouldRetranslate = true;
                }
              }
            });
          }
        });

        if (shouldRetranslate) {
          // Debounce retranslation
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            try {
              translatePage(savedLang);
            } catch (error) {
              console.error('Error in retranslation:', error);
            }
          }, 500);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      return () => {
        clearTimeout(timeoutId);
        observer.disconnect();
      };
    } catch (error) {
      console.error('Error setting up mutation observer:', error);
    }
  }, [translatePage, mounted]);

  return <>{children}</>;
}
