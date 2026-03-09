'use client';

import Link from 'next/link';
import ImageWithFallback from './ImageWithFallback';
import api from '@/lib/api';

interface SponsoredAdFeedCardProps {
  ad: {
    id: string;
    title: string;
    bannerImage?: string | null;
    redirectUrl?: string | null;
    ctaType?: string;
    ctaLabel?: string | null;
  };
}

const API_BASE = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000') : '';

function getAdUrl(ad: SponsoredAdFeedCardProps['ad']): string {
  if (!ad?.redirectUrl) return '/business-package';
  if (ad.ctaType === 'whatsapp') return `https://wa.me/${ad.redirectUrl.replace(/\D/g, '')}`;
  if (ad.ctaType === 'call') return `tel:${ad.redirectUrl}`;
  return ad.redirectUrl;
}

export default function SponsoredAdFeedCard({ ad }: SponsoredAdFeedCardProps) {
  const href = getAdUrl(ad);
  const isExternal = href.startsWith('http') || href.startsWith('tel') || href.startsWith('https://wa.me');
  const imgSrc = ad.bannerImage?.startsWith('http') ? ad.bannerImage : `${API_BASE}${ad.bannerImage || ''}`;

  const handleClick = () => {
    if (ad.id) api.post(`/sponsored-ads/${ad.id}/click`).catch(() => {});
  };

  const content = (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300 relative group h-full flex flex-col">
      {/* Full-width image with fixed aspect ratio, no text overlay */}
      <div className="relative w-full aspect-[16/9] flex-shrink-0 overflow-hidden bg-gray-100">
        <ImageWithFallback
          src={imgSrc || undefined}
          alt={ad.title}
          fill
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 100vw, 33vw"
        />
        <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
          Sponsored
        </span>
      </div>
      <div className="p-3 sm:p-4 flex-1 flex flex-col min-h-0">
        <h3 className="text-sm font-medium text-gray-800 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {ad.title}
        </h3>
        {ad.ctaLabel && (
          <span className="inline-block mt-2 text-xs font-medium text-blue-600">{ad.ctaLabel}</span>
        )}
      </div>
    </div>
  );

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block" onClick={handleClick}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className="block" onClick={handleClick}>
      {content}
    </Link>
  );
}
