'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import ProgressiveLoader from '@/components/ProgressiveLoader';

// Lazy load home page components for better performance
// Hero loads immediately (above the fold)
const Hero = dynamic(() => import('@/components/Hero'), {
  loading: () => (
    <div className="h-96 bg-gradient-to-r from-primary-500 to-primary-700 rounded-lg animate-pulse flex items-center justify-center">
      <div className="text-white text-xl">Loading...</div>
    </div>
  ),
  ssr: true // Hero should be SSR for SEO
});

// FeaturedAds load on demand
const FeaturedAds = dynamic(() => import('@/components/FeaturedAds'), {
  ssr: false // FeaturedAds can be client-side only
});

// Loading placeholders

const FeaturedAdsPlaceholder = () => (
  <div className="my-12">
    <div className="h-8 bg-gray-200 rounded w-48 mb-6 animate-pulse"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow animate-pulse">
          <div className="h-48 bg-gray-200 rounded-t-lg"></div>
          <div className="p-4 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Using ProgressiveLoader component for cleaner code

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Hero loads immediately (above the fold) */}
        <Suspense fallback={
          <div className="h-96 bg-gradient-to-r from-primary-500 to-primary-700 rounded-lg animate-pulse flex items-center justify-center">
            <div className="text-white text-xl">Loading Hero...</div>
          </div>
        }>
          <Hero />
        </Suspense>
        
        {/* FeaturedAds - Load when scrolled into view */}
        <ProgressiveLoader
          fallback={<FeaturedAdsPlaceholder />}
          threshold={0.1}
          rootMargin="100px"
        >
          <FeaturedAds />
        </ProgressiveLoader>
      </div>
    </div>
  );
}

