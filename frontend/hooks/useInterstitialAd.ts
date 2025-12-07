'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function useInterstitialAd() {
  const pathname = usePathname();
  const [showPageLoad, setShowPageLoad] = useState(false);
  const [showAfterAction, setShowAfterAction] = useState(false);
  const [showBetweenPages, setShowBetweenPages] = useState(false);

  // Show page_load ad on initial page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPageLoad(true);
    }, 1000); // Show after 1 second

    return () => clearTimeout(timer);
  }, []);

  // Show between_pages ad when route changes
  useEffect(() => {
    setShowBetweenPages(true);
    const timer = setTimeout(() => {
      setShowBetweenPages(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname]);

  const triggerAfterAction = () => {
    setShowAfterAction(true);
    setTimeout(() => {
      setShowAfterAction(false);
    }, 100);
  };

  return {
    showPageLoad,
    showAfterAction,
    showBetweenPages,
    triggerAfterAction,
  };
}

