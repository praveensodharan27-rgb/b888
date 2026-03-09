'use client';

import { useRef } from 'react';
import Link from 'next/link';
import ImageWithFallback from '@/components/ImageWithFallback';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { getAdUrl } from '@/lib/adUrl';
import { PLACEHOLDER_IMAGE } from '@/lib/imageConstants';

interface RelatedAd {
  id: string;
  title: string;
  price: number;
  images?: string[];
  [key: string]: any;
}

interface RelatedItemsCarouselProps {
  title: string;
  items: RelatedAd[];
}

function RelatedAdCard({ ad }: { ad: RelatedAd }) {
  const imageUrl =
    ad.images?.length && typeof ad.images[0] === 'string'
      ? ad.images[0].trim()
      : PLACEHOLDER_IMAGE;
  const adUrl = getAdUrl(ad);

  return (
    <Link
      href={adUrl}
      onClick={() =>
        typeof window !== 'undefined' &&
        sessionStorage.setItem('listing_page_url', window.location.href)
      }
      className="block shrink-0 w-[260px] sm:w-[280px] group"
    >
      <article className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-lg transition-shadow">
        <div className="relative aspect-[4/3] bg-gray-50">
          <ImageWithFallback
            src={imageUrl}
            alt={ad.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="280px"
          />
        </div>
        <div className="p-4">
          <p className="font-bold text-gray-900 line-clamp-2 group-hover:text-primary-600 transition-colors">
            {ad.title}
          </p>
          <p className="mt-1 text-lg font-bold text-primary-600">
            ₹{Number(ad.price).toLocaleString('en-IN')}
          </p>
        </div>
      </article>
    </Link>
  );
}

export function RelatedItemsCarousel({ title, items }: RelatedItemsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const cardWidth = 280;
    const gap = 16;
    const step = (cardWidth + gap) * 3;
    scrollRef.current.scrollBy({
      left: dir === 'right' ? step : -step,
      behavior: 'smooth',
    });
  };

  if (!items?.length) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scroll('left')}
            className="p-2.5 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            aria-label="Previous"
          >
            <FiChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            className="p-2.5 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            aria-label="Next"
          >
            <FiChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 scroll-smooth scrollbar-hide"
      >
        {items.map((ad) => (
          <RelatedAdCard key={ad.id} ad={ad} />
        ))}
      </div>
    </section>
  );
}
