'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface ImageWithFallbackProps {
  src: string | null | undefined;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  fallbackSrc?: string;
  priority?: boolean;
}

export default function ImageWithFallback({
  src,
  alt,
  fill = false,
  width,
  height,
  className = '',
  sizes,
  fallbackSrc = 'https://via.placeholder.com/400x300?text=No+Image',
  priority = false,
}: ImageWithFallbackProps) {
  // Normalize src: handle null, undefined, empty string, and non-string values
  const normalizedSrc = src && typeof src === 'string' && src.trim() !== '' ? src.trim() : null;
  
  const [imgSrc, setImgSrc] = useState<string>(normalizedSrc || fallbackSrc);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Start as false to prevent pop on first load
  const [isMounted, setIsMounted] = useState(false);

  // Set mounted flag to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update imgSrc when src prop changes
  useEffect(() => {
    if (!isMounted) return;
    
    const newSrc = src && typeof src === 'string' && src.trim() !== '' ? src.trim() : null;
    
    if (newSrc && newSrc !== imgSrc) {
      setImgSrc(newSrc);
      setHasError(false);
      setIsLoading(true);
    } else if (!newSrc && imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
      setHasError(false);
      setIsLoading(false);
    }
    
    // Debug logging in development
    if (process.env.NODE_ENV === 'development' && !newSrc && src !== null && src !== undefined) {
      console.warn('[ImageWithFallback] Invalid src provided:', { src, alt });
    }
  }, [src, fallbackSrc, imgSrc, alt, isMounted]);

  const handleError = () => {
    if (!hasError && imgSrc !== fallbackSrc) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[ImageWithFallback] Image failed to load, using fallback:', { originalSrc: imgSrc, alt });
      }
      setHasError(true);
      setImgSrc(fallbackSrc);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  // If no valid src provided, show placeholder immediately
  if (!normalizedSrc) {
    return (
      <div 
        className={`bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center ${className}`}
        style={fill ? {} : { width: width || 400, height: height || 300 }}
      >
        <span className="text-4xl">📷</span>
      </div>
    );
  }

  // Determine if image should be unoptimized
  // Google and Facebook images must be unoptimized to avoid CORS issues
  const shouldUnoptimize = 
    imgSrc.startsWith('http://localhost') || 
    imgSrc.includes('via.placeholder.com') ||
    imgSrc.startsWith('data:') ||
    imgSrc.includes('googleusercontent.com') || // Google images need to be unoptimized to avoid CORS
    imgSrc.includes('graph.facebook.com'); // Facebook images need to be unoptimized

  // For Google/Facebook images, use regular img tag to avoid CORS issues with Next.js Image
  const isExternalImage = imgSrc.includes('googleusercontent.com') || imgSrc.includes('graph.facebook.com');
  
  if (isExternalImage) {
    // Use regular img tag for external images to avoid CORS issues
    // Don't use crossOrigin attribute as it can cause CORS issues with Google images
    if (fill) {
      return (
        <div className={`relative ${className}`} style={{ width: '100%', height: '100%' }}>
          {isLoading && isMounted && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse z-10" />
          )}
          <img
            src={imgSrc}
            alt={alt}
            className={`${className} ${isLoading && isMounted ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={handleError}
            onLoad={handleLoad}
            referrerPolicy="no-referrer"
          />
        </div>
      );
    }
    
    return (
      <div className="relative" style={{ width: width || 400, height: height || 300 }}>
        {isLoading && isMounted && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse z-10" />
        )}
        <img
          src={imgSrc}
          alt={alt}
          width={width || 400}
          height={height || 300}
          className={`${className} ${isLoading && isMounted ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          onError={handleError}
          onLoad={handleLoad}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Use Next.js Image for other images
  if (fill) {
    return (
      <div className={`relative ${className}`} style={{ width: '100%', height: '100%' }}>
        {isLoading && isMounted && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse z-10" />
        )}
        <Image
          src={imgSrc}
          alt={alt}
          fill
          sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
          className={`${className} ${isLoading && isMounted ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          onError={handleError}
          onLoad={handleLoad}
          unoptimized={shouldUnoptimize}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          fetchPriority={priority ? "high" : "low"}
        />
      </div>
    );
  }

  return (
    <div className="relative" style={{ width: width || 400, height: height || 300 }}>
      {isLoading && isMounted && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse z-10" />
      )}
      <Image
        src={imgSrc}
        alt={alt}
        width={width || 400}
        height={height || 300}
        className={`${className} ${isLoading && isMounted ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onError={handleError}
        onLoad={handleLoad}
        unoptimized={shouldUnoptimize}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        fetchPriority={priority ? "high" : "low"}
      />
    </div>
  );
}

