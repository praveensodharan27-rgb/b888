'use client';

import { useState } from 'react';
import ImageWithFallback from '@/components/ImageWithFallback';
import { getApiBaseOrigin } from '@/lib/seo';
import { PLACEHOLDER_IMAGE } from '@/lib/imageConstants';
import { formatAdTitle } from '@/lib/formatText';

function buildImageUrl(ad: { images?: string[] | null }): string[] {
  const imgs = ad?.images ?? [];
  const origin = getApiBaseOrigin();
  return imgs
    .filter((img): img is string => !!img && typeof img === 'string' && String(img).trim() !== '')
    .map((img) => {
      const s = String(img).trim();
      if (s.startsWith('http')) return s;
      return s.startsWith('/') ? `${origin}${s}` : `${origin}/${s}`;
    });
}

type Props = {
  ad: { id: string; title?: string | null; images?: string[] | null };
  imageAlt: string;
};

export default function AdDetailGalleryClient({ ad, imageAlt }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showAllImages, setShowAllImages] = useState(false);

  const images = buildImageUrl(ad);
  const displayImages = images.length > 0 ? images : [PLACEHOLDER_IMAGE];
  const activeImage = displayImages[activeIndex];

  return (
    <>
      <div className="mb-4">
        {activeImage ? (
          <>
            {/* Main image: full-resolution (not thumbnail), sharp display, no stretching */}
            <div className="product-image relative w-full rounded-xl border border-gray-100 bg-gray-50 overflow-hidden">
              {displayImages.length > 1 && (
                <span className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-lg bg-black/60 text-white text-xs font-medium backdrop-blur-sm">
                  {activeIndex + 1} / {displayImages.length}
                </span>
              )}
              <div className="relative w-full min-h-[400px] h-[425px] max-h-[450px] overflow-hidden flex items-center justify-center">
                <ImageWithFallback
                  src={activeImage}
                  alt={imageAlt}
                  fill
                  objectFit="contain"
                  className="object-contain object-center"
                  sizes="(max-width: 1024px) 100vw, 1200px"
                  quality={90}
                />
              </div>
              {/* Carousel dots - OLX style */}
              {displayImages.length > 1 && (
                <div className="flex justify-center gap-1.5 py-2.5 border-t border-gray-100">
                  {displayImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveIndex(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i === activeIndex ? 'bg-primary-500' : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                      aria-label={`Image ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnails below main image – click to update main */}
            {displayImages.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {displayImages.map((img, index) => (
                  <button
                    key={`${img}-${index}`}
                    onClick={() => setActiveIndex(index)}
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 shrink-0 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                      activeIndex === index ? 'border-primary-500 ring-2 ring-primary-200 scale-[1.02]' : 'border-gray-200 hover:border-primary-300 hover:ring-1 hover:ring-primary-100'
                    }`}
                  >
                    <ImageWithFallback
                      src={img}
                      alt={`${imageAlt} thumbnail ${index + 1}`}
                      width={64}
                      height={64}
                      className="w-full h-full object-contain bg-gray-50"
                    />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full min-h-[400px] h-[425px] max-h-[450px] bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
            <div className="text-center px-6">
              <span className="text-5xl mb-3 block opacity-60">📷</span>
              <p className="text-gray-500 font-medium">No images available</p>
              <p className="text-gray-400 text-sm mt-1">Seller hasn&apos;t added photos yet</p>
            </div>
          </div>
        )}
      </div>

      {showAllImages && displayImages.length > 0 && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowAllImages(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-100/90"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-lg font-semibold">{formatAdTitle(ad.title)}</h3>
              <button
                onClick={() => setShowAllImages(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                aria-label="Close gallery"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-4">
              {displayImages.map((img, index) => (
                <button
                  key={`${img}-${index}`}
                  onClick={() => {
                    setActiveIndex(index);
                    setShowAllImages(false);
                  }}
                  className={`rounded-xl overflow-hidden border-2 transition-all ${
                    activeIndex === index ? 'border-primary-500 shadow ring-2 ring-primary-100' : 'border-transparent'
                  }`}
                >
                  <ImageWithFallback
                    src={img}
                    alt={`${formatAdTitle(ad.title)} image ${index + 1}`}
                    width={400}
                    height={300}
                    className="w-full h-48 object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
