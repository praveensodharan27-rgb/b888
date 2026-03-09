'use client';

import { useAds } from '@/hooks/useAds';
import AdCard from './AdCard';
import Link from 'next/link';
import { FiArrowRight } from 'react-icons/fi';
export default function FeaturedAds() {
  // Fetch featured ads - component is already wrapped in ProgressiveLoader on home page
  const { data, isLoading } = useAds({ 
    limit: 8, 
    sort: 'featured' 
  });

  const ads = (data?.ads && Array.isArray(data.ads) && data.ads.length > 0) 
    ? data.ads 
    : [];

  return (
    <section className="my-12">
      <div className="mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Featured Ads</h2>
        <p className="text-gray-500 text-base">Premium listings with great deals</p>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-md animate-pulse overflow-hidden">
              <div className="h-64 bg-gradient-to-br from-gray-200 to-gray-300"></div>
              <div className="p-5 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : ads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {ads.map((ad: any, index: number) => {
            // Validate ad structure before rendering
            if (!ad || !ad.id || !ad.title) {
              return null;
            }
            // Mark first ad image with priority for LCP optimization
            return (
              <div 
                key={ad.id} 
                className="transform transition-all duration-300 hover:-translate-y-2"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <AdCard ad={ad} priority={index === 0} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md border border-gray-200">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📦</span>
            </div>
            <p className="text-gray-600 text-lg font-medium mb-2">No featured ads available</p>
            <p className="text-gray-500 text-sm mb-6">Be the first to showcase your premium listing!</p>
            <Link 
              href="/post-ad" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-all hover:shadow-lg"
            >
              Post Your First Ad
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

