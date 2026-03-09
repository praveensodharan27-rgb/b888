'use client';

/**
 * HomeFeedCard - OLX-style ad card with badges and distance
 * 
 * Features:
 * - TOP AD badge (red)
 * - FEATURED badge (yellow)
 * - BOOSTED badge (green)
 * - Distance display
 * - Plan indicators
 */

import { useRouter } from 'next/navigation';
import { FiMapPin, FiClock } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import type { HomeFeedAd } from '@/hooks/useHomeFeed';
import { formatAdTitle } from '@/lib/formatText';

interface HomeFeedCardProps {
  ad: HomeFeedAd;
}

export default function HomeFeedCard({ ad }: HomeFeedCardProps) {
  const router = useRouter();

  // Format price
  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
    if (price >= 1000) return `₹${(price / 1000).toFixed(2)} K`;
    return `₹${price.toLocaleString('en-IN')}`;
  };

  // Format time ago
  const formatTimeAgo = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  // Get badges
  const badges = [];
  
  if (ad.isTopAdActive) {
    badges.push({
      text: 'TOP AD',
      color: 'bg-red-600',
      priority: 1,
    });
  }
  
  if (ad.isFeaturedActive) {
    badges.push({
      text: 'FEATURED',
      color: 'bg-yellow-500',
      priority: 2,
    });
  }
  
  if ((ad as any).isUrgent) {
    badges.push({
      text: 'URGENT',
      color: 'bg-orange-600',
      priority: 3,
    });
  }
  
  if (ad.isBumpActive) {
    badges.push({
      text: 'BOOSTED',
      color: 'bg-green-600',
      priority: 4,
    });
  }

  // Sort badges by priority
  badges.sort((a, b) => a.priority - b.priority);

  // Get plan badge
  const getPlanBadge = () => {
    if (ad.planType === 'enterprise') {
      return (
        <div className="absolute top-2 right-2 px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded shadow-lg flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          VERIFIED
        </div>
      );
    }
    if (ad.planType === 'pro') {
      return (
        <div className="absolute top-2 right-2 px-2 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold rounded shadow-lg">
          PRO
        </div>
      );
    }
    if (ad.planType === 'basic') {
      return (
        <div className="absolute top-2 right-2 px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded shadow-lg">
          BASIC
        </div>
      );
    }
    return null;
  };

  return (
    <div
      onClick={() => router.push(`/ads/${ad.id}`)}
      className={`bg-white rounded-lg overflow-hidden shadow hover:shadow-xl transition-all cursor-pointer border-2 ${
        ad.isTopAdActive
          ? 'border-red-500'
          : ad.isFeaturedActive
          ? 'border-yellow-500'
          : 'border-gray-200 hover:border-blue-300'
      }`}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-100">
        {ad.images && ad.images[0] ? (
          <img
            src={ad.images[0]}
            alt={formatAdTitle(ad.title)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        
        {/* Plan Badge */}
        {getPlanBadge()}

        {/* Promotion Badges */}
        {badges.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {badges.map((badge, index) => (
              <div
                key={index}
                className={`${badge.color} text-white text-xs font-bold px-2 py-1 rounded shadow-lg`}
              >
                {badge.text}
              </div>
            ))}
          </div>
        )}

        {/* Distance Badge */}
        {ad.distanceText && (
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs font-medium rounded">
            📍 {ad.distanceText}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Price */}
        <div className="text-2xl font-bold text-gray-900 mb-2">
          {formatPrice(ad.price)}
        </div>

        {/* Title */}
        <h3 className="text-base font-medium text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors">
          {formatAdTitle(ad.title)}
        </h3>

        {/* Category */}
        {ad.categoryName && (
          <div className="text-sm text-gray-500 mb-2">
            {ad.categoryName}
          </div>
        )}

        {/* Location & Time */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <FiMapPin size={14} />
            <span>{ad.city || ad.location || 'Location'}</span>
          </div>
          <div className="flex items-center gap-1">
            <FiClock size={14} />
            <span>{formatTimeAgo(ad.createdAt)}</span>
          </div>
        </div>

        {/* User Info */}
        {ad.user && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
            {ad.user.avatar ? (
              <img
                src={ad.user.avatar}
                alt={ad.user.name}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">
                {ad.user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm text-gray-600">{ad.user.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}
