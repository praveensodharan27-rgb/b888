'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiMapPin, FiHeart, FiStar, FiTrendingUp, FiRefreshCw } from 'react-icons/fi';
import { useMemo, useCallback, memo, type MouseEvent } from 'react';
import ImageWithFallback from './ImageWithFallback';
import { PLACEHOLDER_IMAGE } from '@/lib/imageConstants';
import { useIsFavorite, useToggleFavorite } from '@/hooks/useAds';
import { useAuth } from '@/hooks/useAuth';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { getAdUrl } from '@/lib/adUrl';
import { formatPriceShort } from '@/lib/formatPrice';
import { formatAdTitle } from '@/lib/formatText';
import SpecPills from './SpecPills';

interface AdCardProps {
  ad: {
    id: string;
    title: string;
    price: number;
    images: string[];
    location?: { name?: string; city?: string; state?: string } | null;
    city?: string | null;
    state?: string | null;
    isPremium?: boolean;
    premiumType?: 'TOP' | 'FEATURED' | 'BUMP_UP' | 'RENT' | 'ECO' | null;
    isUrgent?: boolean;
    postedAt?: string | Date;
    createdAt?: string | Date;
    attributes?: Record<string, string | number | null | undefined>;
  };
  priority?: boolean;
}

function AdCard({ ad, priority = false }: AdCardProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { data: isFavorite } = useIsFavorite(ad.id, true);
  const toggleFavorite = useToggleFavorite();
  const { openLoginModal } = useAuthModal();

  const handleWishlist = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      openLoginModal(() => toggleFavorite.mutate(ad.id));
      return;
    }

    if (!toggleFavorite.isPending) {
      toggleFavorite.mutate(ad.id);
    }
  }, [isAuthenticated, openLoginModal, toggleFavorite, ad.id]);

  const handleCardClick = useCallback((e: MouseEvent) => {
    // Allow Ctrl+Click (Windows/Linux) or Cmd+Click (Mac) to open in new tab
    // Allow middle-click to open in new tab
    if (e.ctrlKey || e.metaKey || e.button === 1) {
      // Let the browser handle it naturally
      return;
    }
    // For regular clicks, Next.js Link will handle navigation
  }, []);

  const imageUrl = useMemo(() => {
    if (
      ad.images &&
      Array.isArray(ad.images) &&
      ad.images.length > 0 &&
      typeof ad.images[0] === 'string' &&
      ad.images[0].trim() !== ''
    ) {
      return ad.images[0].trim();
    }
    return PLACEHOLDER_IMAGE;
  }, [ad.images]);

  const displayLocation = useMemo(() => {
    const parts = [
      ad.location?.name,
      ad.location?.city || ad.city,
      ad.location?.state || ad.state,
    ].filter(Boolean);
    return parts[0] || 'Location not specified';
  }, [ad.location, ad.city, ad.state]);

  const attrs = ad.attributes || {};
  const specPills: string[] = [];
  const kmDriven = attrs.km_driven ?? attrs.kms_driven;
  if (kmDriven != null) {
    const km = Number(kmDriven);
    specPills.push(km >= 1000 ? `${Math.round(km).toLocaleString('en-IN')} km` : `${km} km`);
  }
  const fuelType = attrs.fuel_type ?? attrs.fuel;
  if (fuelType) specPills.push(String(fuelType));
  const transmission = attrs.transmission;
  if (transmission) specPills.push(String(transmission));
  const year = attrs.year || attrs.release_year || attrs.year_of_manufacture;
  if (year) specPills.push(String(year));
  const brand = attrs.brand;
  if (brand) specPills.push(String(brand));
  const condition = attrs.condition;
  if (condition) specPills.push(String(condition));

  const timeAgo = useMemo(() => {
    const timestamp = ad.postedAt ?? ad.createdAt;
    if (!timestamp) return 'Just now';
    const posted = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - posted.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    const hours = Math.floor(diffInSeconds / 3600);
    if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    const days = Math.floor(diffInSeconds / 86400);
    if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    const weeks = Math.floor(diffInSeconds / 604800);
    if (weeks < 4) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    return '1 month ago';
  }, [ad.postedAt]);

  const adUrl = getAdUrl(ad);
  const promotionType = ad.premiumType ?? (ad.isPremium ? 'FEATURED' : null);
  const imageCount = ad.images?.length ?? 0;

  return (
    <Link 
      href={adUrl} 
      className="block group h-full"
      onClick={handleCardClick}
      onAuxClick={(e) => {
        if (e.button === 1) {
          window.open(adUrl, '_blank');
        }
      }}
    >
      <div className="h-full flex flex-col rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300 cursor-pointer hover:-translate-y-0.5 active:translate-y-0">
        <div className="relative w-full aspect-[4/3] flex-shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-700/50">
          {imageUrl ? (
            <ImageWithFallback
              src={imageUrl}
              alt={ad.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover group-hover:scale-[1.04] transition-transform duration-400 ease-out"
              priority={priority}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center">
              <span className="text-4xl opacity-60">📷</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          
          {/* Promotion & urgent badges */}
          {(promotionType || ad.isUrgent) && (
            <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1">
              {promotionType && (
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wide shadow-sm ${
                  promotionType === 'TOP' ? 'bg-blue-500 text-white' :
                  promotionType === 'FEATURED' ? 'bg-amber-400 text-gray-900' :
                  promotionType === 'BUMP_UP' ? 'bg-emerald-500 text-white' :
                  promotionType === 'RENT' ? 'bg-indigo-500 text-white' :
                  promotionType === 'ECO' ? 'bg-green-500 text-white' :
                  'bg-slate-600 text-white'
                }`}>
                  {promotionType === 'TOP' ? 'TOP' : promotionType === 'FEATURED' ? 'Featured' : promotionType === 'BUMP_UP' ? 'Bump' : promotionType === 'RENT' ? 'Rent' : promotionType === 'ECO' ? 'Eco' : 'Premium'}
                </span>
              )}
              {ad.isUrgent && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wide bg-rose-500 text-white shadow-sm">
                  Urgent
                </span>
              )}
            </div>
          )}

          {/* Image count badge */}
          {imageCount > 1 && (
            <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 px-2 py-1 rounded-md bg-black/50 text-white text-[11px] font-medium">
              <span className="material-symbols-outlined text-[14px]">photo_library</span>
              {imageCount}
            </div>
          )}

          <button
            onClick={handleWishlist}
            className={`absolute top-2 right-2 z-10 p-2 rounded-full bg-white/95 dark:bg-slate-800/95 shadow-sm ring-1 ring-black/5 dark:ring-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isFavorite
                ? 'text-red-500'
                : 'text-slate-500 hover:text-red-500 hover:scale-105'
            }`}
            aria-label={isFavorite ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <span className={`material-symbols-outlined text-[20px] ${isFavorite ? 'filled' : ''}`}>favorite</span>
          </button>

          {/* Watermark: Sell Box logo */}
          <div className="absolute z-[5] flex items-center justify-center pointer-events-none" style={{ right: 8, bottom: 8, width: 40, opacity: 0.7 }} aria-hidden>
            <img src="/logo.png?v=7" alt="Sell Box" width={40} height={40} className="object-contain" style={{ width: 40, height: 40 }} />
          </div>
        </div>
        <div className="p-5 flex-1 flex flex-col min-h-0">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 min-h-[2.75rem] leading-snug mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {formatAdTitle(ad.title)}
          </h3>
          <div className="min-h-[1.75rem] mb-2">
            <SpecPills items={specPills} max={4} />
          </div>
          <div className="min-h-[1.25rem] flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="material-symbols-outlined text-[14px] flex-shrink-0 text-slate-400">location_on</span>
              <span className="truncate">{displayLocation}</span>
            </div>
            <span className="flex-shrink-0">{timeAgo}</span>
          </div>
          <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between gap-3">
              <span className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {formatPriceShort(ad.price)}
              </span>
              <span className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow-sm group-hover:bg-blue-700 transition-colors whitespace-nowrap">
                View Details
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default memo(AdCard);
