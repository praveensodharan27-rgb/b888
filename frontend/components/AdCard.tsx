'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiMapPin, FiHeart, FiStar, FiTrendingUp, FiRefreshCw } from 'react-icons/fi';
import { useMemo, type MouseEvent } from 'react';
import ImageWithFallback from './ImageWithFallback';
import { useIsFavorite, useToggleFavorite } from '@/hooks/useAds';
import { useAuth } from '@/hooks/useAuth';

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
  };
  priority?: boolean;
}

function AdCard({ ad, priority = false }: AdCardProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { data: isFavorite } = useIsFavorite(ad.id, true);
  const toggleFavorite = useToggleFavorite();

  const handleWishlist = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!toggleFavorite.isPending) {
      toggleFavorite.mutate(ad.id);
    }
  };

  const handleCardClick = (e: MouseEvent) => {
    // Allow Ctrl+Click (Windows/Linux) or Cmd+Click (Mac) to open in new tab
    // Allow middle-click to open in new tab
    if (e.ctrlKey || e.metaKey || e.button === 1) {
      // Let the browser handle it naturally
      return;
    }
    // For regular clicks, Next.js Link will handle navigation
  };

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
    // Fallback image when missing
    return 'https://via.placeholder.com/600x400?text=No+Image';
  }, [ad.images]);

  const displayLocation = useMemo(() => {
    const parts = [
      ad.location?.name,
      ad.location?.city || ad.city,
      ad.location?.state || ad.state,
    ].filter(Boolean);
    return parts[0] || 'Location not specified';
  }, [ad.location, ad.city, ad.state]);

  const timeAgo = useMemo(() => {
    if (!ad.postedAt) return 'Just now';
    const posted = new Date(ad.postedAt);
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

  return (
    <Link 
      href={`/ads/${ad.id}`} 
      className="block group"
      onClick={handleCardClick}
      onAuxClick={(e) => {
        // Handle middle-click (mouse wheel click)
        if (e.button === 1) {
          window.open(`/ads/${ad.id}`, '_blank');
        }
      }}
    >
      <div className="group bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all duration-300 cursor-pointer transform hover:-translate-y-1">
        <div className="relative aspect-[4/3] overflow-hidden">
          {imageUrl ? (
            <ImageWithFallback
              src={imageUrl}
              alt={ad.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              priority={priority}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <span className="text-4xl">📷</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          {/* Badges - Bottom Left */}
          {ad.isPremium && ad.premiumType && (
            <div className={`absolute bottom-2 left-3 text-xs font-bold px-2 py-1 rounded shadow-sm opacity-90 ${
              ad.premiumType === 'FEATURED' ? 'bg-yellow-400 text-black' :
              ad.premiumType === 'RENT' ? 'bg-blue-500 text-white' :
              ad.premiumType === 'ECO' ? 'bg-green-500 text-white' :
              ad.premiumType === 'TOP' ? 'bg-orange-500 text-white' :
              'bg-green-500 text-white'
            }`}>
              {ad.premiumType === 'FEATURED' ? 'FEATURED' : 
               ad.premiumType === 'RENT' ? 'RENT' :
               ad.premiumType === 'ECO' ? 'ECO' :
               ad.premiumType === 'TOP' ? 'TOP' : 'BUMP UP'}
            </div>
          )}
          
          {/* Urgent Badge */}
          {ad.isUrgent && !ad.isPremium && (
            <div className="absolute bottom-2 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm opacity-90">
              URGENT
            </div>
          )}

          <button
            onClick={handleWishlist}
            className={`absolute top-3 right-3 p-2 bg-white/90 dark:bg-slate-900/80 rounded-full transition-all shadow-sm ${
              isFavorite
                ? 'text-red-500'
                : 'text-slate-400 hover:text-red-500 hover:scale-110'
            }`}
            aria-label={isFavorite ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <span className={`material-symbols-outlined text-[20px] ${isFavorite ? 'filled' : ''}`}>favorite</span>
          </button>
        </div>
        <div className="p-4">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">₹{ad.price.toLocaleString('en-IN')}</h3>
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate mb-3 group-hover:text-primary transition-colors">
            {ad.title}
          </p>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">location_on</span>
              <span className="truncate max-w-[100px]">{displayLocation}</span>
            </div>
            <span>{timeAgo}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default AdCard;
