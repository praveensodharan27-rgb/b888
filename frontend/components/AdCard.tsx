'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiHeart, FiMapPin, FiAlertCircle, FiUser, FiBarChart2, FiCheckCircle } from 'react-icons/fi';
import { useToggleFavorite, useIsFavorite } from '@/hooks/useAds';
import { useAuth } from '@/hooks/useAuth';
import { useComparison } from '@/hooks/useComparison';
import { useMemo } from 'react';
import ImageWithFallback from './ImageWithFallback';
import toast from 'react-hot-toast';

interface AdCardProps {
  ad: {
    id: string;
    title: string;
    description?: string;
    price: number;
    originalPrice?: number | null;
    discount?: number | null;
    condition?: string | null;
    images: string[];
    location?: { name: string } | null;
    category?: { name: string; slug?: string } | null;
    subcategory?: { name: string; slug?: string } | null;
    createdAt: string;
    expiresAt?: string | null;
    status?: string;
    views?: number;
    isPremium?: boolean;
    premiumType?: string;
    isUrgent?: boolean;
    _count?: { favorites: number };
    user?: { id: string; name: string; avatar?: string; isVerified?: boolean };
    attributes?: Record<string, any> | null;
  };
  priority?: boolean;
}

function AdCard({ ad, priority = false }: AdCardProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { data: isFavorite } = useIsFavorite(ad.id, isAuthenticated);
  const toggleFavorite = useToggleFavorite();
  const { addToComparison, removeFromComparison, isInComparison, canAddMore } = useComparison();

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAuthenticated) {
      toggleFavorite.mutate(ad.id);
    } else {
      window.location.href = '/login';
    }
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isInComparison(ad.id)) {
      removeFromComparison(ad.id);
      toast.success('Removed from comparison');
    } else {
      if (!canAddMore) {
        toast.error(`You can compare up to 4 items. Remove an item first.`);
        return;
      }
      addToComparison(ad as any);
      toast.success('Added to comparison');
    }
  };


  // Memoize expensive computations
  const isPremiumAd = useMemo(() => ad.isPremium === true || !!ad.premiumType, [ad.isPremium, ad.premiumType]);
  
  // Get premium type label - memoized
  const premiumLabel = useMemo(() => {
    if (ad.premiumType === 'TOP') return 'TOP';
    if (ad.premiumType === 'FEATURED') return 'FEATURED';
    if (ad.premiumType === 'BUMP_UP') return 'BUMP UP';
    return 'PREMIUM';
  }, [ad.premiumType]);

  // Memoize image URL
  const imageUrl = useMemo(() => {
    if (ad.images && Array.isArray(ad.images) && ad.images.length > 0 && ad.images[0] && typeof ad.images[0] === 'string' && ad.images[0].trim() !== '') {
      return ad.images[0].trim();
    }
    return null;
  }, [ad.images]);


  return (
    <Link href={`/ads/${ad.id}`} className="block group">
      <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden h-full flex flex-col">
        {/* Large Image */}
        <div className="relative h-64 bg-gray-200 overflow-hidden">
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
          {/* Premium Badge - Always show for premium ads */}
          {isPremiumAd && (
            <div className="absolute top-4 left-4 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1 z-10">
              <span>⭐</span> {premiumLabel}
            </div>
          )}
          {/* Urgent Badge */}
          {ad.isUrgent && (
            <div className={`absolute ${isPremiumAd ? 'top-16' : 'top-4'} left-4 bg-red-600 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1 z-10`}>
              <FiAlertCircle className="w-3 h-3" />
              URGENT
            </div>
          )}
          {/* Discount Badge - Show below premium badge if both exist */}
          {ad.discount && ad.discount > 0 && (
            <div className={`absolute ${isPremiumAd ? 'top-16' : 'top-4'} left-4 bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg z-10`}>
              {ad.discount}% OFF
            </div>
          )}
          {/* Action Buttons */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            {/* Favorite Button */}
            <button
              onClick={handleFavorite}
              className={`p-2.5 rounded-full backdrop-blur-sm transition-all shadow-lg ${
                isFavorite 
                  ? 'bg-red-500 text-white' 
                  : 'bg-white/90 text-gray-600 hover:bg-red-500 hover:text-white'
              }`}
            >
              <FiHeart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            {/* Compare Button */}
            <button
              onClick={handleCompare}
              className={`p-2.5 rounded-full backdrop-blur-sm transition-all shadow-lg ${
                isInComparison(ad.id)
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white/90 text-gray-600 hover:bg-blue-500 hover:text-white'
              }`}
              title={isInComparison(ad.id) ? 'Remove from comparison' : 'Add to comparison'}
            >
              <FiBarChart2 className={`w-5 h-5 ${isInComparison(ad.id) ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6 flex-1 flex flex-col">
          {/* Title with Premium Label */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-bold text-xl text-gray-900 line-clamp-1 group-hover:text-primary-600 transition-colors flex-1">
              {ad.title}
            </h3>
            {isPremiumAd && (
              <span className="flex-shrink-0 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full whitespace-nowrap">
                Paid
              </span>
            )}
          </div>

          {/* Price */}
          <div className="mb-3">
            {ad.originalPrice && ad.originalPrice > ad.price ? (
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-gray-900">
                  ₹{ad.price.toLocaleString('en-IN')}
                </p>
                <p className="text-base text-gray-500 line-through">
                  ₹{ad.originalPrice.toLocaleString('en-IN')}
                </p>
              </div>
            ) : (
              <p className="text-2xl font-bold text-gray-900">
                ₹{ad.price.toLocaleString('en-IN')}
              </p>
            )}
          </div>

          {/* Description */}
          {ad.description && (
            <p className="text-sm text-gray-600 mb-4 line-clamp-3 leading-relaxed">
              {ad.description}
            </p>
          )}

          {/* Seller Details */}
          {ad.user && (
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/user/${ad.user.id}`);
              }}
              className="flex items-center gap-3 mb-4 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              {ad.user.avatar ? (
                <ImageWithFallback
                  src={ad.user.avatar}
                  alt={ad.user.name}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <FiUser className="w-5 h-5 text-primary-600" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-0.5">Seller</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-gray-900 hover:text-primary-600 transition-colors">
                    {ad.user.name}
                  </p>
                  {ad.user.isVerified && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium" title="Verified Seller">
                      <FiCheckCircle className="w-3 h-3" />
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <FiMapPin className="w-4 h-4" />
            <span>{ad.location?.name || 'Location N/A'}</span>
          </div>

          {/* Action Button */}
          <button className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors mt-auto">
            View Details
          </button>
        </div>
      </div>
    </Link>
  );
}

// Memoize component to prevent unnecessary re-renders
// Temporarily disabled memo to debug rendering issue
export default AdCard;
