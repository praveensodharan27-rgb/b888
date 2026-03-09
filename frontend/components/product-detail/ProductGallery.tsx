'use client';

import { useState, useCallback } from 'react';
import ImageWithFallback from '@/components/ImageWithFallback';
import { PLACEHOLDER_IMAGE } from '@/lib/imageConstants';
import { FiHeart, FiMaximize2, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface ProductGalleryProps {
  images: string[];
  title: string;
  condition?: string | null;
  /** For image alt: {Product Name} for sale in {City} */
  imageAlt?: string | null;
  /** For image title: Used {Product Name} in {State} */
  imageTitle?: string | null;
  isFavorite?: boolean;
  onWishlist?: (e?: React.MouseEvent) => void;
}

function formatConditionBadge(condition: string | null | undefined): string | null {
  if (!condition) return null;
  const v = String(condition).toUpperCase().replace(/-/g, '_');
  const map: Record<string, string> = {
    NEW: 'NEW',
    USED: 'USED',
    LIKE_NEW: 'LIKE NEW',
    REFURBISHED: 'REFURBISHED',
  };
  return map[v] ?? String(condition).replace(/[_-]+/g, ' ');
}

export function ProductGallery({
  images,
  title,
  condition,
  imageAlt,
  imageTitle,
  isFavorite = false,
  onWishlist,
}: ProductGalleryProps) {
  const alt = imageAlt || `${title} for sale`;
  const imgTitle = imageTitle || `Used ${title}`;
  const conditionBadge = formatConditionBadge(condition);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  const displayImages =
    images?.length > 0 ? images : [PLACEHOLDER_IMAGE];

  const currentImage = displayImages[selectedIndex];

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isZoomed || !isFullscreen) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setZoomPos({ x, y });
    },
    [isZoomed, isFullscreen]
  );

  const goPrev = () =>
    setSelectedIndex((i) => (i === 0 ? displayImages.length - 1 : i - 1));
  const goNext = () =>
    setSelectedIndex((i) => (i === displayImages.length - 1 ? 0 : i + 1));

  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      {/* Main image area */}
      <div
        className="relative aspect-[4/3] min-h-[280px] sm:min-h-[360px] bg-gray-50 rounded-xl overflow-hidden group"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
      >
        <div
          className="absolute inset-0"
          style={
            isZoomed && !isFullscreen
              ? {
                  transform: `scale(1.5)`,
                  transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                }
              : undefined
          }
        >
          <ImageWithFallback
            src={currentImage}
            alt={alt}
            title={imgTitle}
            fill
            className="object-contain transition-transform duration-200"
            sizes="(max-width: 768px) 100vw, 65vw"
          />
        </div>
        {/* Condition badge overlay */}
        {conditionBadge && (
          <span className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-lg bg-white/95 shadow-md text-xs font-bold text-gray-900 uppercase tracking-wide">
            {conditionBadge}
          </span>
        )}
        {/* Wishlist overlay */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onWishlist?.(e);
          }}
          className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-white/95 shadow-md flex items-center justify-center text-gray-700 hover:bg-white transition-colors"
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <FiHeart
            className={`w-5 h-5 ${
              isFavorite ? 'fill-red-500 text-red-500' : ''
            }`}
          />
        </button>
        {/* Fullscreen button */}
        <button
          type="button"
          onClick={() => setIsFullscreen(true)}
          className="absolute bottom-3 right-3 z-10 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100 sm:opacity-100"
          aria-label="View fullscreen"
        >
          <FiMaximize2 className="w-5 h-5" />
        </button>
        {/* Image counter */}
        {displayImages.length > 1 && (
          <span className="absolute bottom-3 left-3 z-10 px-2.5 py-1 rounded-lg bg-black/50 text-xs font-medium text-white">
            {selectedIndex + 1} / {displayImages.length}
          </span>
        )}
        {/* Nav arrows (desktop) */}
        {displayImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center text-gray-700 hover:bg-white sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              aria-label="Previous image"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center text-gray-700 hover:bg-white sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              aria-label="Next image"
            >
              <FiChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail gallery */}
      {displayImages.length > 1 && (
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-hide">
          {displayImages.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all ${
                selectedIndex === i
                  ? 'border-primary-600 ring-2 ring-primary-100'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <ImageWithFallback
                src={img}
                alt={`${alt} - image ${i + 1}`}
                title={imgTitle}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Image gallery fullscreen"
        >
          <div className="flex items-center justify-between p-4">
            <span className="text-white text-sm font-medium">
              {selectedIndex + 1} / {displayImages.length}
            </span>
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
              aria-label="Close fullscreen"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 relative">
            <ImageWithFallback
              src={currentImage}
              alt={alt}
              title={imgTitle}
              fill
              className="object-contain"
              sizes="100vw"
            />
            {displayImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30"
                  aria-label="Previous"
                >
                  <FiChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30"
                  aria-label="Next"
                >
                  <FiChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
