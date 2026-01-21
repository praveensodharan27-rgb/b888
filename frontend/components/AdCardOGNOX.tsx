'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiMapPin, FiHeart } from 'react-icons/fi';
import { useMemo, useCallback, memo, type MouseEvent } from 'react';
import ImageWithFallback from './ImageWithFallback';
import { useIsFavorite, useToggleFavorite } from '@/hooks/useAds';
import { useAuth } from '@/hooks/useAuth';

interface AdCardOGNOXProps {
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
    slug?: string;
    categorySlug?: string;
    subcategorySlug?: string;
    category?: { slug?: string };
    subcategory?: { slug?: string };
  };
}

function AdCardOGNOX({ ad }: AdCardOGNOXProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { data: isFavorite } = useIsFavorite(ad.id, true);
  const toggleFavorite = useToggleFavorite();

  const handleWishlist = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!toggleFavorite.isPending) {
      toggleFavorite.mutate(ad.id);
    }
  }, [isAuthenticated, router, toggleFavorite, ad.id]);

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
    return 'https://via.placeholder.com/400x300?text=No+Image';
  }, [ad.images]);

  const displayLocation = useMemo(() => {
    // Priority: location.name > city > state
    // Show best available location info
    if (ad.location?.name) {
      // If we have city/state, append them for better context
      const cityState = [
        ad.location.city || ad.city,
        ad.location.state || ad.state
      ].filter(Boolean).join(', ');
      
      return cityState 
        ? `${ad.location.name}${cityState ? `, ${cityState}` : ''}`
        : ad.location.name;
    }
    
    // Fallback to city/state if location name not available
    const cityState = [
      ad.location?.city || ad.city,
      ad.location?.state || ad.state
    ].filter(Boolean);
    
    return cityState.length > 0 
      ? cityState.join(', ')
      : 'Location not specified';
  }, [ad.location, ad.city, ad.state]);

  const timeAgo = useMemo(() => {
    if (!ad.postedAt) return 'JUST NOW';
    const posted = new Date(ad.postedAt);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - posted.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'JUST NOW';
    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes < 60) return `${minutes} ${minutes === 1 ? 'MIN' : 'MINS'} AGO`;
    const hours = Math.floor(diffInSeconds / 3600);
    if (hours < 24) return `${hours} ${hours === 1 ? 'HOUR' : 'HOURS'} AGO`;
    const days = Math.floor(diffInSeconds / 86400);
    if (days === 0) return 'TODAY';
    if (days === 1) return 'YESTERDAY';
    if (days < 7) return `${days} ${days === 1 ? 'DAY' : 'DAYS'} AGO`;
    const weeks = Math.floor(diffInSeconds / 604800);
    if (weeks < 4) return `${weeks} ${weeks === 1 ? 'WEEK' : 'WEEKS'} AGO`;
    return '1 MONTH AGO';
  }, [ad.postedAt]);

  // Get ad URL - always use ID-based route for consistency and reliability
  // This ensures the correct ad is always displayed, regardless of slug issues
  const adUrl = `/ads/${ad.id}`;

  const isFeatured = ad.isPremium && (ad.premiumType === 'FEATURED' || ad.premiumType === 'TOP');
  const isUrgent = ad.isUrgent;

  // Store current page URL when clicking ad (for back button)
  const handleAdClick = useCallback(() => {
    if (typeof window !== 'undefined') {
      // Store current page URL in sessionStorage for back navigation
      const currentUrl = window.location.href;
      sessionStorage.setItem('listing_page_url', currentUrl);
    }
  }, []);

  return (
    <Link 
      href={adUrl} 
      className="block group"
      onClick={handleAdClick}
    >
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-200 relative">
        {/* Tags */}
        {(isFeatured || isUrgent) && (
          <div className="absolute top-2 left-2 z-10">
            {isFeatured && (
              <span className="bg-yellow-400 text-gray-900 text-xs font-bold px-2 py-1 rounded uppercase">
                Featured
              </span>
            )}
            {isUrgent && !isFeatured && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded uppercase">
                Urgent
              </span>
            )}
          </div>
        )}

        {/* Favorite Button */}
        <button
          onClick={handleWishlist}
          className="absolute top-2 right-2 z-10 p-2 bg-white/90 hover:bg-white rounded-full shadow-md transition-colors"
          aria-label="Add to favorites"
        >
          <FiHeart 
            className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
          />
        </button>

        {/* Image */}
        <div className="relative w-full h-48 md:h-56 overflow-hidden bg-gray-100">
          <ImageWithFallback
            src={imageUrl}
            alt={ad.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-200"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={false}
          />
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Price */}
          <div className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
            ₹{ad.price.toLocaleString('en-IN')}
          </div>

          {/* Title */}
          <h3 className="text-sm md:text-base font-semibold text-gray-800 mb-2 line-clamp-2 min-h-[2.5rem] group-hover:text-blue-600 transition-colors">
            {ad.title}
          </h3>

          {/* Location and Time */}
          <div className="flex items-center justify-between text-xs md:text-sm text-gray-500">
            <div className="flex items-center gap-1 truncate">
              <FiMapPin className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
              <span className="truncate">{displayLocation}</span>
              {/* Show distance if available */}
              {ad.distance !== null && ad.distance !== undefined && (
                <span className="text-blue-600 font-medium flex-shrink-0 ml-1">
                  • {ad.distance < 1 
                    ? `${Math.round(ad.distance * 1000)}m` 
                    : `${ad.distance.toFixed(1)}km`}
                </span>
              )}
            </div>
            <span className="flex-shrink-0 ml-2">{timeAgo}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default memo(AdCardOGNOX);

