'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import ImageWithFallback from './ImageWithFallback';
import { FiX } from 'react-icons/fi';

interface InterstitialAdProps {
  position: 'page_load' | 'page_exit' | 'after_action' | 'between_pages';
  onClose?: () => void;
  trigger?: boolean; // Trigger to show ad
}

export default function InterstitialAd({ position, onClose, trigger }: InterstitialAdProps) {
  const [showAd, setShowAd] = useState(false);
  const [adShown, setAdShown] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const imageRef = useRef<HTMLDivElement>(null);

  const { data: ads, isLoading: adsLoading, error: adsError } = useQuery({
    queryKey: ['interstitial-ads', position],
    queryFn: async () => {
      try {
        console.log(`[InterstitialAd] Fetching ads for position "${position}"...`);
        const response = await api.get(`/interstitial-ads?position=${position}`);
        const fetchedAds = response.data?.ads || response.data || [];
        console.log(`[InterstitialAd] ✅ Fetched ${fetchedAds.length} ads for position "${position}":`, fetchedAds);
        return fetchedAds;
      } catch (error: any) {
        // Handle network errors gracefully - return empty array instead of throwing
        const isNetworkError = !error.response && error.message;
        const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
        
        if (isNetworkError) {
          console.warn(`[InterstitialAd] ⚠️ Network error fetching ads for position "${position}":`, errorMessage);
          console.warn(`[InterstitialAd] This is usually harmless - ads will not be shown until backend is available`);
        } else {
          console.error(`[InterstitialAd] ❌ Error fetching interstitial ads for position "${position}":`, error);
          console.error(`[InterstitialAd] Error details:`, {
            status: error.response?.status,
            statusText: error.response?.statusText,
            message: errorMessage,
            url: `/interstitial-ads?position=${position}`,
          });
        }
        
        // Return empty array - don't break the UI
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled: true, // Always fetch
    retry: false, // Don't retry network errors (prevents console spam)
    retryDelay: 1000,
  });

  // Get the first active ad for this position
  const ad = ads && ads.length > 0 ? ads.find((a: any) => a.isActive !== false) || ads[0] : null;

  useEffect(() => {
    if (typeof window === 'undefined') return; // Prevent SSR issues
    
    // Debug logging
    console.log('[InterstitialAd] State check:', {
      position,
      trigger,
      adsLoading,
      adsError: adsError ? { message: (adsError as any).message, status: (adsError as any).response?.status } : null,
      adsCount: ads?.length,
      ads: ads,
      ad: ad ? { id: ad.id, title: ad.title, image: !!ad.image, isActive: ad.isActive } : null,
      adShown
    });
    
    // Wait for ads to finish loading
    if (adsLoading) {
      return;
    }
    
    // If trigger is set but no ad yet, log and return
    if (trigger && !ad && !adsLoading) {
      console.warn('[InterstitialAd] Trigger set but no ad found for position:', position, 'Available ads:', ads);
      return;
    }
    
    // Show ad if trigger is set, ad exists, hasn't been shown, and has an image
    if (trigger && ad && !adShown && ad.image) {
      // Check frequency - show only every N times
      const frequency = ad.frequency || 1;
      const storageKey = `interstitial_ad_${ad.id}_count`;
      const count = parseInt(localStorage.getItem(storageKey) || '0');
      
      console.log('[InterstitialAd] Frequency check:', { count, frequency, shouldShow: count % frequency === 0 });
      
      if (count % frequency === 0) {
        console.log('[InterstitialAd] ✅ Showing ad:', ad.id, 'for position:', position);
        setShowAd(true);
        setAdShown(true);
        setImageLoading(true); // Reset loading state when showing new ad
        
        // Track view
        api.post(`/interstitial-ads/${ad.id}/view`).catch(console.error);
      } else {
        console.log('[InterstitialAd] ⏭️ Ad frequency check failed:', { count, frequency, nextShow: count + 1 });
      }
      
      // Increment count
      localStorage.setItem(storageKey, String(count + 1));
    } else if (trigger && !ad && !adsLoading) {
      console.warn('[InterstitialAd] ⚠️ Trigger set but no ad available:', { 
        trigger, 
        ad, 
        position, 
        adsCount: ads?.length,
        ads: ads 
      });
    } else if (trigger && ad && !ad.image) {
      console.warn('[InterstitialAd] ⚠️ Ad found but no image:', { adId: ad.id, adTitle: ad.title });
    }
  }, [trigger, ad, adShown, adsLoading, position, ads]);

  // Handle page exit
  useEffect(() => {
    if (typeof window === 'undefined') return; // Prevent SSR issues
    
    if (position === 'page_exit' && ad && !adShown) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        const frequency = ad.frequency || 1;
        const storageKey = `interstitial_ad_${ad.id}_count`;
        const count = parseInt(localStorage.getItem(storageKey) || '0');
        
        if (count % frequency === 0) {
          e.preventDefault();
          setShowAd(true);
          setAdShown(true);
          api.post(`/interstitial-ads/${ad.id}/view`).catch(console.error);
          localStorage.setItem(storageKey, String(count + 1));
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [position, ad, adShown]);

  const handleClose = () => {
    console.log('[InterstitialAd] Closing ad:', ad?.id);
    setShowAd(false);
    if (onClose) onClose();
  };

  const handleClick = () => {
    if (ad?.link) {
      // Track click
      api.post(`/interstitial-ads/${ad.id}/click`).catch(console.error);
      window.open(ad.link, '_blank');
    }
    handleClose();
  };

  // Track image loading
  useEffect(() => {
    if (showAd && ad && imageRef.current) {
      setImageLoading(true);
      // Small delay to ensure image element is rendered
      setTimeout(() => {
        const img = imageRef.current?.querySelector('img');
        if (img) {
          if (img.complete && img.naturalHeight !== 0) {
            setImageLoading(false);
          } else {
            img.onload = () => setImageLoading(false);
            img.onerror = () => setImageLoading(false);
          }
        } else {
          // Fallback: hide loader after 2 seconds
          setTimeout(() => setImageLoading(false), 2000);
        }
      }, 100);
    }
  }, [showAd, ad]);

  // Debug: Log why ad is not showing
  if (!showAd || !ad) {
    if (trigger && !showAd) {
      console.log('[InterstitialAd] Not showing because:', { showAd, ad: !!ad, trigger });
    }
    return null;
  }

  // Get width and height from ad config or use defaults
  const adWidth = ad.width || 1080;
  const adHeight = ad.height || 1920;
  const maxWidth = Math.min(adWidth, 1920); // Cap at 1920px
  const maxHeight = Math.min(adHeight, 1920); // Cap at 1920px

  console.log('[InterstitialAd] Rendering ad with close button:', { showAd, ad: !!ad, imageLoading });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      {/* Close button - positioned relative to fixed overlay, top-right of screen */}
      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent triggering ad click
          e.preventDefault();
          console.log('[InterstitialAd] Close button clicked');
          handleClose();
        }}
        className="absolute bg-white text-gray-800 rounded-full p-3 hover:bg-red-500 hover:text-white transition-all shadow-2xl border-2 border-white hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
        aria-label="Close ad"
        type="button"
        style={{ 
          width: '48px', 
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'auto',
          zIndex: 10000,
          position: 'absolute',
          top: '20px',
          right: '20px',
          cursor: 'pointer',
          visibility: 'visible',
          opacity: 1
        }}
      >
        <FiX className="w-6 h-6" style={{ pointerEvents: 'none' }} />
      </button>
      
      <div 
        className="relative mx-4 w-full"
        style={{
          maxWidth: `${maxWidth}px`,
          maxHeight: `${maxHeight}px`,
          width: ad.width ? `${ad.width}px` : 'auto',
          height: ad.height ? `${ad.height}px` : 'auto'
        }}
      >
        <div
          className="relative rounded-lg overflow-visible shadow-2xl"
          style={{
            width: ad.width ? `${ad.width}px` : '100%',
            height: ad.height ? `${ad.height}px` : 'auto'
          }}
        >
          
          {/* Loading placeholder - shown while image loads */}
          {imageLoading && (
            <div className="absolute inset-0 bg-gray-200 rounded-lg flex items-center justify-center" style={{ zIndex: 1 }}>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          )}
          
          <div
            ref={imageRef}
            onClick={handleClick}
            className={`relative cursor-pointer ${ad.link ? 'hover:opacity-90' : ''} transition-opacity`}
            style={{ zIndex: 1 }}
          >
            <ImageWithFallback
              src={ad.image}
              alt={ad.title}
              width={adWidth}
              height={adHeight}
              priority
              className="w-full h-full object-contain rounded-lg max-w-full max-h-full block"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

