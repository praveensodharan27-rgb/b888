'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import InterstitialAd from './InterstitialAd';

export default function InterstitialAdWrapper() {
  const pathname = usePathname();
  const [showPageLoad, setShowPageLoad] = useState(false);
  const [showBetweenPages, setShowBetweenPages] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only running client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Show page_load ad on initial page load (only once per session)
  useEffect(() => {
    if (!mounted) return;
    
    const hasShownPageLoad = typeof window !== 'undefined' 
      ? sessionStorage.getItem('interstitial_page_load_shown') 
      : null;
    
    if (!hasShownPageLoad) {
      // Show after a short delay to ensure page is loaded
      const timer = setTimeout(() => {
        setShowPageLoad(true);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('interstitial_page_load_shown', 'true');
        }
      }, 1500); // Show after 1.5 seconds

      return () => clearTimeout(timer);
    }
  }, [mounted]);

  // Show between_pages ad when route changes
  useEffect(() => {
    if (!mounted) return;
    
    // Only show between_pages ad when navigating between pages (not on initial load)
    if (prevPathname && prevPathname !== pathname && prevPathname !== '/') {
      // Add a small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setShowBetweenPages(true);
      }, 300); // Small delay for smooth page transition
      
      return () => clearTimeout(timer);
    }
    setPrevPathname(pathname);
  }, [pathname, prevPathname, mounted]);

  // Don't render anything until mounted (prevents hydration mismatch)
  if (!mounted) {
    return null;
  }

  return (
    <>
      {showPageLoad && (
        <InterstitialAd
          position="page_load"
          trigger={showPageLoad}
          onClose={() => setShowPageLoad(false)}
        />
      )}
      {showBetweenPages && (
        <InterstitialAd
          position="between_pages"
          trigger={showBetweenPages}
          onClose={() => {
            setShowBetweenPages(false);
          }}
        />
      )}
      {/* Page exit ad - always rendered, uses beforeunload event */}
      <InterstitialAd
        position="page_exit"
        trigger={true}
        onClose={() => {}}
      />
    </>
  );
}

