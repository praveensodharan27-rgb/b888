'use client';

import { Suspense, ReactNode } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface ProgressiveLoaderProps {
  children: ReactNode;
  fallback?: ReactNode;
  threshold?: number;
  rootMargin?: string;
  className?: string;
}

/**
 * ProgressiveLoader - A reusable component that loads content only when it enters the viewport
 * 
 * @param children - The content to load progressively
 * @param fallback - Loading placeholder (optional)
 * @param threshold - Intersection threshold (0-1, default: 0.1)
 * @param rootMargin - Margin around root (default: '100px')
 * @param className - Additional CSS classes
 */
export default function ProgressiveLoader({
  children,
  fallback,
  threshold = 0.1,
  rootMargin = '100px',
  className = ''
}: ProgressiveLoaderProps) {
  const { elementRef, hasIntersected } = useIntersectionObserver({
    threshold,
    rootMargin,
    triggerOnce: true
  });

  return (
    <div ref={elementRef} className={className}>
      {hasIntersected ? (
        <Suspense fallback={fallback}>
          {children}
        </Suspense>
      ) : (
        fallback
      )}
    </div>
  );
}

