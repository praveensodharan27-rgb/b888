'use client';

import { useState, useEffect, memo } from 'react';
import AdCardOLX from './AdCardOLX';
import AdCardOGNOX from './AdCardOGNOX';
import ServiceCard from './ServiceCard';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

type AdCardVariant = 'olx' | 'ognox' | 'service';

interface LazyAdCardProps {
  ad: any;
  variant?: AdCardVariant;
  priority?: boolean;
  /** Skip lazy loading - render immediately (for first N cards) */
  eager?: boolean;
}

const LAZY_ROOT_MARGIN = '200px';

/**
 * LazyAdCard - Defers ad card rendering until it enters viewport.
 * Reduces initial DOM size and improves scroll performance for long lists.
 */
function LazyAdCard({
  ad,
  variant = 'ognox',
  priority = false,
  eager = false,
}: LazyAdCardProps) {
  const [showCard, setShowCard] = useState(eager);
  const { elementRef, hasIntersected } = useIntersectionObserver({
    threshold: 0,
    rootMargin: LAZY_ROOT_MARGIN,
    triggerOnce: true,
  });

  useEffect(() => {
    if (eager || hasIntersected) {
      setShowCard(true);
    }
  }, [eager, hasIntersected]);

  const Card = variant === 'service' ? ServiceCard : variant === 'olx' ? AdCardOLX : AdCardOGNOX;

  // Always render the same structure to maintain consistent hook calls
  // Placeholder - layout matches card variant
  if (variant === 'service') {
    return (
      <div ref={elementRef}>
        {eager || showCard ? (
          <Card ad={ad} priority={priority} />
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 animate-pulse flex flex-col sm:flex-row min-h-[200px]">
            <div className="w-full sm:w-[40%] aspect-[4/3] sm:aspect-auto sm:min-h-[200px] bg-gray-200" />
            <div className="flex-1 p-4 sm:p-5 space-y-3">
              <div className="h-6 bg-gray-200 rounded w-3/4" />
              <div className="flex gap-2"><div className="h-5 bg-gray-200 rounded w-16" /><div className="h-5 bg-gray-200 rounded w-28" /></div>
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="flex gap-3 mt-4"><div className="h-10 flex-1 bg-gray-200 rounded-lg" /><div className="h-10 flex-1 bg-gray-200 rounded-lg" /></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={elementRef}>
      {eager || showCard ? (
        <Card ad={ad} priority={priority} />
      ) : (
        <div className="h-full flex flex-col bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 min-h-[260px] animate-pulse">
          <div className="w-full aspect-square max-h-[180px] flex-shrink-0 bg-gray-200" />
          <div className="p-3 sm:p-4 flex-1 flex flex-col min-h-0 space-y-2">
            <div className="h-6 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(LazyAdCard);
