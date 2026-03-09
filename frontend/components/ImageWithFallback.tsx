'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import Image from 'next/image';
import { PLACEHOLDER_IMAGE, isInvalidImageSrc } from '@/lib/imageConstants';

/** URLs that have already failed - avoid re-requesting (prevents hundreds of failed requests) */
const failedUrls = new Set<string>();

function isLocalFallback(src: string): boolean {
  return src === PLACEHOLDER_IMAGE || src.startsWith('/placeholder');
}

interface ImageWithFallbackProps {
  src: string | null | undefined;
  alt: string;
  title?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  fallbackSrc?: string;
  priority?: boolean;
  quality?: number;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

function ImageWithFallback({
  src,
  alt,
  title,
  fill = false,
  width,
  height,
  className = '',
  sizes,
  fallbackSrc = PLACEHOLDER_IMAGE,
  priority = false,
  quality,
  objectFit = 'cover',
}: ImageWithFallbackProps) {
  const normalizedSrc =
    src && typeof src === 'string' && src.trim() !== '' && !isInvalidImageSrc(src)
      ? src.trim()
      : null;

  const effectiveFallback = fallbackSrc || PLACEHOLDER_IMAGE;

  const [imgSrc, setImgSrc] = useState<string>(() => {
    if (!normalizedSrc) return effectiveFallback;
    if (failedUrls.has(normalizedSrc)) return effectiveFallback;
    return normalizedSrc;
  });
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(!!normalizedSrc && !failedUrls.has(normalizedSrc!));
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const newSrc = normalizedSrc;
    if (newSrc && newSrc !== imgSrc) {
      if (failedUrls.has(newSrc)) {
        setImgSrc(effectiveFallback);
        setHasError(true);
        setIsLoading(false);
      } else {
        setImgSrc(newSrc);
        setHasError(false);
        setIsLoading(true);
      }
    } else if (!newSrc && imgSrc !== effectiveFallback) {
      setImgSrc(effectiveFallback);
      setHasError(false);
      setIsLoading(false);
    }
  }, [normalizedSrc, effectiveFallback, imgSrc, isMounted]);

  const handleError = useCallback(() => {
    if (imgSrc && !isLocalFallback(imgSrc)) {
      failedUrls.add(imgSrc);
      setHasError(true);
      setImgSrc(effectiveFallback);
    }
    setIsLoading(false);
  }, [imgSrc, effectiveFallback]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  if (!normalizedSrc) {
    return (
      <div
        className={`relative bg-gray-100 ${className}`}
        style={
          fill
            ? { width: '100%', height: '100%' }
            : { width: width ?? 400, height: height ?? 300 }
        }
      >
        <Image
          src={PLACEHOLDER_IMAGE}
          alt={alt}
          fill={fill}
          width={fill ? undefined : width ?? 400}
          height={fill ? undefined : height ?? 300}
          className={objectFit === 'cover' ? 'object-cover' : 'object-contain'}
          sizes={sizes ?? '(max-width: 768px) 100vw, 33vw'}
          unoptimized={false}
        />
      </div>
    );
  }

  const isExternal =
    imgSrc.startsWith('http://localhost') ||
    imgSrc.startsWith('https://localhost') ||
    imgSrc.startsWith('http://127.0.0.1') ||
    imgSrc.includes('googleusercontent.com') ||
    imgSrc.includes('graph.facebook.com') ||
    imgSrc.startsWith('data:');

  const useNativeImg = isExternal && !isLocalFallback(imgSrc);

  const boxStyle = fill
    ? { width: '100%', height: '100%' }
    : { width: width ?? 400, height: height ?? 300 };

  const content = useNativeImg ? (
    <img
      src={imgSrc}
      alt={alt}
      title={title}
      loading={priority ? undefined : 'lazy'}
      decoding="async"
      className={`${className} ${isLoading && isMounted ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
      style={{
        ...(fill ? { width: '100%', height: '100%', objectFit } : { width: width ?? 400, height: height ?? 300, objectFit }),
      }}
      onError={handleError}
      onLoad={handleLoad}
      referrerPolicy="no-referrer"
    />
  ) : (
    <Image
      src={imgSrc}
      alt={alt}
      title={title}
      fill={fill}
      width={fill ? undefined : width ?? 400}
      height={fill ? undefined : height ?? 300}
      className={`${className} ${isLoading && isMounted ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
      style={{ objectFit }}
      sizes={sizes ?? '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
      onError={handleError}
      onLoad={handleLoad}
      unoptimized={isExternal}
      priority={priority}
      quality={quality}
      loading={priority ? undefined : 'lazy'}
      fetchPriority={priority ? 'high' : 'low'}
    />
  );

  return (
    <div className={`relative ${className}`} style={boxStyle}>
      {isLoading && isMounted && (
        <div
          className="absolute inset-0 bg-gray-100 animate-pulse z-[1]"
          aria-hidden
        />
      )}
      {content}
    </div>
  );
}

export default memo(ImageWithFallback);
