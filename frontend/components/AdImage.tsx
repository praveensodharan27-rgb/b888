'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { PLACEHOLDER_IMAGE, isInvalidImageSrc } from '@/lib/imageConstants';

/**
 * URLs that already failed (404, 500, CORS, etc.).
 * Never pass them to Next.js Image again to avoid repeated 500 / Internal Server Error.
 */
const failedUrls = new Set<string>();

function isLocalFallback(src: string): boolean {
  return src === PLACEHOLDER_IMAGE || src.startsWith('/placeholder');
}

export interface AdImageProps {
  /** Ad image URL; null/undefined/empty → show local fallback immediately */
  src?: string | null;
  alt: string;
  /** Wrapper class (e.g. aspect ratio, rounded) */
  className?: string;
  /** Image class (e.g. object-cover, group-hover:scale-105) */
  imageClassName?: string;
  /** Next.js Image sizes for responsive loading */
  sizes?: string;
  /** Above-the-fold cards (e.g. first 6) */
  priority?: boolean;
}

/**
 * Reusable ad card image:
 * - Local fallback from /public (no external placeholder → no 500 from _next/image)
 * - onError switches to fallback and skips re-requesting that URL
 * - Skeleton while loading
 * - Next.js Image with proper fill/sizes/priority
 */
export function AdImage({
  src,
  alt,
  className = '',
  imageClassName = '',
  sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
  priority = false,
}: AdImageProps) {
  const rawSrc =
    src && typeof src === 'string' && src.trim() !== '' && !isInvalidImageSrc(src)
      ? src.trim()
      : null;

  const [displaySrc, setDisplaySrc] = useState<string>(() => {
    if (!rawSrc) return PLACEHOLDER_IMAGE;
    if (failedUrls.has(rawSrc)) return PLACEHOLDER_IMAGE;
    return rawSrc;
  });

  const [loading, setLoading] = useState(() => !!rawSrc && !failedUrls.has(rawSrc));

  useEffect(() => {
    if (!rawSrc) {
      setDisplaySrc(PLACEHOLDER_IMAGE);
      setLoading(false);
      return;
    }
    if (failedUrls.has(rawSrc)) {
      setDisplaySrc(PLACEHOLDER_IMAGE);
      setLoading(false);
      return;
    }
    setDisplaySrc(rawSrc);
    setLoading(true);
  }, [rawSrc]);

  const handleError = useCallback(() => {
    if (displaySrc && !isLocalFallback(displaySrc)) {
      failedUrls.add(displaySrc);
      setDisplaySrc(PLACEHOLDER_IMAGE);
    }
    setLoading(false);
  }, [displaySrc]);

  const handleLoad = useCallback(() => setLoading(false), []);

  const useLocalOnly = !rawSrc || failedUrls.has(rawSrc) || isLocalFallback(displaySrc);
  const isExternal =
    displaySrc.startsWith('http://localhost') ||
    displaySrc.startsWith('https://localhost') ||
    displaySrc.startsWith('http://127.0.0.1') ||
    displaySrc.includes('googleusercontent.com') ||
    displaySrc.includes('graph.facebook.com') ||
    displaySrc.startsWith('data:');

  return (
    <div className={`relative w-full h-full overflow-hidden bg-gray-100 ${className}`}>
      {loading && (
        <div
          className="absolute inset-0 z-[1] animate-pulse bg-gray-200"
          aria-hidden
        />
      )}
      <Image
        src={displaySrc}
        alt={alt}
        fill
        sizes={sizes}
        className={`object-cover transition-opacity duration-200 ${loading ? 'opacity-0' : 'opacity-100'} ${imageClassName}`}
        onError={handleError}
        onLoad={handleLoad}
        unoptimized={isExternal}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        fetchPriority={priority ? 'high' : 'low'}
      />
    </div>
  );
}

export default AdImage;
