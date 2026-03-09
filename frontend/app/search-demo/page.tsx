'use client';

import { useState } from 'react';
import SmartSearchBar from '@/components/search/SmartSearchBar';
import MobileSearchOverlay from '@/components/search/MobileSearchOverlay';
import { FiSearch, FiSmartphone } from 'react-icons/fi';

export default function SearchDemoPage() {
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-4xl px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Advanced Search System Demo
          </h1>
          <p className="text-lg text-gray-600">
            Try intelligent search with natural language queries
          </p>
        </div>

        {/* Desktop Search */}
        <div className="mb-12">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <FiSearch className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Desktop Search</h2>
            </div>
            <SmartSearchBar placeholder="Try: iPhone in Kochi, Car under 5 lakh..." />
          </div>
        </div>

        {/* Mobile Search Trigger */}
        <div className="mb-12">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <FiSmartphone className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Mobile Search</h2>
            </div>
            <button
              onClick={() => setShowMobileSearch(true)}
              className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              Open Mobile Search Overlay
            </button>
          </div>
        </div>

        {/* Example Queries */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Example Queries</h2>
          <div className="space-y-3">
            <ExampleQuery
              query="iPhone in Kochi"
              description="Searches for iPhone products in Kochi location"
            />
            <ExampleQuery
              query="Car under 5 lakh in Mumbai"
              description="Searches for cars under ₹5,00,000 in Mumbai"
            />
            <ExampleQuery
              query="Laptop above 50000"
              description="Searches for laptops priced above ₹50,000"
            />
            <ExampleQuery
              query="Bike between 50000 and 100000"
              description="Searches for bikes in ₹50,000 - ₹1,00,000 range"
            />
            <ExampleQuery
              query="Used furniture in Bangalore"
              description="Searches for used furniture in Bangalore"
            />
            <ExampleQuery
              query="New mobile phones"
              description="Searches for new condition mobile phones"
            />
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <FeatureCard
            title="Smart Parsing"
            description="Automatically detects location, price, and keywords from natural language"
          />
          <FeatureCard
            title="Autosuggest"
            description="Real-time suggestions as you type with product, category, and location hints"
          />
          <FeatureCard
            title="Recent Searches"
            description="Saves your recent searches for quick access"
          />
          <FeatureCard
            title="Popular Searches"
            description="Shows trending searches to help you discover products"
          />
          <FeatureCard
            title="Location-Aware"
            description="Prioritizes results from your selected location"
          />
          <FeatureCard
            title="Advanced Filters"
            description="Filter by condition, price, fuel type, brand, and more"
          />
        </div>
      </div>

      {/* Mobile Search Overlay */}
      <MobileSearchOverlay
        isOpen={showMobileSearch}
        onClose={() => setShowMobileSearch(false)}
      />
    </div>
  );
}

function ExampleQuery({ query, description }: { query: string; description: string }) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors group">
      <div className="font-mono text-sm text-blue-600 mb-1 group-hover:text-blue-700">
        {query}
      </div>
      <div className="text-sm text-gray-600">{description}</div>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
