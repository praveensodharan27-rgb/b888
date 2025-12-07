'use client';

import { useState, useEffect } from 'react';
import ImageWithFallback from './ImageWithFallback';
import { FiX } from 'react-icons/fi';

interface SplashScreenProps {
  imageUrl: string;
  link?: string; // Optional link to navigate when image is clicked
  duration?: number; // Auto-close duration in milliseconds (0 = no auto-close)
  onClose?: () => void;
  showOnLoad?: boolean; // Show on page load
  storageKey?: string; // LocalStorage key to track if already shown
}

export default function SplashScreen({
  imageUrl,
  link,
  duration = 0,
  onClose,
  showOnLoad = true,
  storageKey = 'splash_screen_shown'
}: SplashScreenProps) {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    if (showOnLoad && typeof window !== 'undefined') {
      // Check if splash was already shown (using localStorage)
      const wasShown = localStorage.getItem(storageKey);
      
      if (!wasShown && imageUrl) {
        setShow(true);
        
        // Mark as shown
        localStorage.setItem(storageKey, 'true');
        
        // Auto-close after duration if set
        if (duration > 0) {
          const timer = setTimeout(() => {
            handleClose();
          }, duration);
          
          return () => clearTimeout(timer);
        }
      }
    }
  }, [showOnLoad, imageUrl, duration, storageKey]);

  const handleClose = () => {
    setShow(false);
    if (onClose) {
      onClose();
    }
  };

  const handleImageClick = () => {
    if (link) {
      window.open(link, '_blank');
    }
    handleClose();
  };

  if (!mounted || !show || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-90 animate-fadeIn">
      <div className="relative max-w-4xl max-h-[90vh] mx-4 w-full">
        <div className="relative rounded-lg overflow-visible shadow-2xl">
          {/* Close Button - Top Right - Outside image container for better visibility */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="absolute -top-2 -right-2 z-[10000] bg-white text-gray-800 rounded-full p-2.5 hover:bg-red-500 hover:text-white transition-all shadow-2xl border-2 border-white hover:scale-110"
            aria-label="Close splash screen"
            style={{ 
              minWidth: '48px', 
              minHeight: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FiX className="w-6 h-6" />
          </button>
          
          {/* Splash Image */}
          <div
            onClick={handleImageClick}
            className={`relative ${link ? 'cursor-pointer hover:opacity-95' : ''} transition-opacity`}
          >
            <ImageWithFallback
              src={imageUrl}
              alt="Splash Screen"
              width={1200}
              height={800}
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}

