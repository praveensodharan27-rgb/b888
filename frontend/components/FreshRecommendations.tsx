'use client';

import { useAds } from '@/hooks/useAds';
import AdCard from './AdCard';
import Link from 'next/link';
import { useState } from 'react';
import { FiArrowRight } from 'react-icons/fi';
export default function FreshRecommendations() {
  const [page, setPage] = useState(1);
  const limit = 6; // Show 6 ads initially (2 rows of 3)
  
  const { data, isLoading } = useAds({ 
    limit: page * limit,
    sort: 'newest'
  });

  const ads = (data?.ads && Array.isArray(data.ads) && data.ads.length > 0) 
    ? data.ads.slice(0, page * limit)
    : [];

  const hasMore = data?.pagination ? page < data.pagination.pages : false;
  const totalAds = data?.pagination?.total || 0;

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  return (
    <div>
      {isLoading && page === 1 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-md animate-pulse overflow-hidden">
              <div className="h-48 sm:h-56 md:h-64 bg-gradient-to-br from-gray-200 to-gray-300"></div>
              <div className="p-4 sm:p-5 space-y-3">
                <div className="h-4 sm:h-5 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : ads.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8 items-stretch">
            {ads.map((ad: any, index: number) => {
              // Validate ad structure before rendering
              if (!ad || !ad.id || !ad.title) {
                return null;
              }
              return (
                <AdCard key={ad.id} ad={ad} priority={index < 4} />
              );
            })}
          </div>
          
          {/* Load More Button */}
          {hasMore && (
            <div className="mt-10 flex justify-center">
              <button
                onClick={handleLoadMore}
                className="px-8 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200"
              >
                Load More
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md border border-gray-200">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📦</span>
            </div>
            <p className="text-gray-600 text-lg font-medium mb-2">No ads available</p>
            <p className="text-gray-500 text-sm mb-6">Be the first to post an ad!</p>
            <Link 
              href="/post-ad" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-all hover:shadow-lg"
            >
              Post Your First Ad
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

