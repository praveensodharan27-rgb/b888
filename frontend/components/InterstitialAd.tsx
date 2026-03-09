'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import ImageWithFallback from './ImageWithFallback';
import { FiX } from 'react-icons/fi';

const API_BASE = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '').replace(/\/api$/, '') + '/api'
  : '';

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
      if (!API_BASE) return [];
      try {
        // Use fetch - never throws on 4xx/5xx, so 429 won't cause AxiosError in console
        const res = await fetch(`${API_BASE}/interstitial-ads?position=${encodeURIComponent(position)}`);
        if (!res.ok) return []; // 429, 500, etc. - fail silently
        const json = await res.json().catch(() => ({}));
        return json?.ads ?? json ?? [];
      } catch {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000, // 10 min cache - reduces 429 hits
    gcTime: 15 * 60 * 1000,
    enabled: true,
    retry: false,
    throwOnError: false, // Suppress 429/network from bubbling to React Query
  });

  // Get the first active ad for this position
  const ad = ads && ads.length > 0 ? ads.find((a: any) => a.isActive !== false) || ads[0] : null;

  useEffect(() => {
    if (typeof window === 'undefined') return; // Prevent SSR issues
    
    // Wait for ads to finish loading
    if (adsLoading) {
      return;
    }
    
    // If trigger is set but no ad yet, return
    if (trigger && !ad && !adsLoading) {
      return;
    }
    
    // Show ad if trigger is set, ad exists, hasn't been shown, and has an image
    if (trigger && ad && !adShown && ad.image) {
      // Check frequency - show only every N times
      const frequency = ad.frequency || 1;
      const storageKey = `interstitial_ad_${ad.id}_count`;
      const count = parseInt(localStorage.getItem(storageKey) || '0');
      
      if (count % frequency === 0) {
        setShowAd(true);
        setAdShown(true);
        setImageLoading(true); // Reset loading state when showing new ad
        
        // Track view
        api.post(`/interstitial-ads/${ad.id}/view`).catch(() => {});
      }
      
      // Increment count
      localStorage.setItem(storageKey, String(count + 1));
    } else if (trigger && ad && !ad.image) {
      // Ad found but no image - skip silently
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
          api.post(`/interstitial-ads/${ad.id}/view`).catch(() => {});
          localStorage.setItem(storageKey, String(count + 1));
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [position, ad, adShown]);

  const handleClose = () => {
    setShowAd(false);
    if (onClose) onClose();
  };

  const handleClick = () => {
    if (ad?.link) {
      // Track click
      api.post(`/interstitial-ads/${ad.id}/click`).catch(() => {});
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

  if (!showAd || !ad) {
    return null;
  }

  // Get width and height from ad config for aspect ratio
  const adWidth = ad.width || 1080;
  const adHeight = ad.height || 1920;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      {/* Close button - top-right of screen */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          handleClose();
        }}
        className="absolute top-4 right-4 z-[60] bg-white text-gray-800 rounded-full p-2 sm:p-3 hover:bg-red-500 hover:text-white transition-all shadow-2xl border-2 border-white hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
        aria-label="Close ad"
        type="button"
      >
        <FiX className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
      
      {/* Ad container - centered, no fixed dimensions, respects viewport */}
      <div className="relative flex items-center justify-center max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] p-4">
        {/* Loading placeholder */}
        {imageLoading && (
          <div className="absolute inset-0 bg-gray-200 rounded-lg flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        )}
        
        <div
          ref={imageRef}
          onClick={handleClick}
          className={`relative flex items-center justify-center ${ad.link ? 'cursor-pointer hover:opacity-90' : ''} transition-opacity`}
          style={{ maxWidth: '100%', maxHeight: '100%' }}
        >
          <ImageWithFallback
            src={ad.image}
            alt={ad.title}
            width={adWidth}
            height={adHeight}
            priority
            objectFit="contain"
            className="!max-w-full !max-h-full !w-auto !h-auto !object-contain rounded-lg shadow-2xl"
          />
        </div>
      </div>
    </div>
  );
}

