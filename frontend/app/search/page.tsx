'use client';

import { Suspense } from 'react';
import SmartSearchBar from '@/components/search/SmartSearchBar';
import SearchResultsPage from '@/components/search/SearchResultsPage';

function SearchPageContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Bar Section */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-4">
          <SmartSearchBar placeholder="Search for products, brands, locations..." />
        </div>
      </div>

      {/* Results Section */}
      <SearchResultsPage showFilters={true} />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
