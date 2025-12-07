'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import AdCard from '@/components/AdCard';
import { FiFilter, FiGrid, FiList, FiChevronRight } from 'react-icons/fi';
import Link from 'next/link';
import ImageWithFallback from '@/components/ImageWithFallback';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  description?: string;
  _count?: { ads: number };
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  _count?: { ads: number };
}

interface Ad {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  images: string[];
  category: Category;
  subcategory?: Subcategory;
  state?: string;
  city?: string;
  createdAt: string;
  featured?: boolean;
  urgent?: boolean;
  user: {
    id: string;
    name: string;
  };
}

function CategoryPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [condition, setCondition] = useState('');

  // Get subcategory from URL if present
  useEffect(() => {
    const subcategoryFromUrl = searchParams.get('subcategory');
    if (subcategoryFromUrl) {
      setSelectedSubcategory(subcategoryFromUrl);
    }
  }, [searchParams]);

  // Fetch category details
  const { data: categoryData, isLoading: categoryLoading } = useQuery({
    queryKey: ['category', slug],
    queryFn: async () => {
      const response = await api.get(`/categories/${slug}`);
      return response.data.category;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch subcategories for this category
  const { data: subcategoriesData } = useQuery({
    queryKey: ['subcategories', categoryData?.id],
    queryFn: async () => {
      if (!categoryData?.id) return [];
      const response = await api.get(`/categories/${categoryData.id}/subcategories`);
      return response.data.subcategories;
    },
    enabled: !!categoryData?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch ads for this category
  const { data: adsData, isLoading: adsLoading } = useQuery({
    queryKey: ['category-ads', slug, selectedSubcategory, sortBy, priceRange, condition],
    queryFn: async () => {
      const params: any = {
        category: slug,
        sort: sortBy,
        limit: 50,
      };
      
      if (selectedSubcategory) params.subcategory = selectedSubcategory;
      if (priceRange.min) params.minPrice = priceRange.min;
      if (priceRange.max) params.maxPrice = priceRange.max;
      if (condition) params.condition = condition;

      const response = await api.get('/ads', { params });
      return response.data.ads;
    },
    staleTime: 60 * 1000,
  });

  const category = categoryData as Category;
  const subcategories = (subcategoriesData || []) as Subcategory[];
  const ads = (adsData || []) as Ad[];

  const handleSubcategoryClick = (subcategorySlug: string) => {
    if (selectedSubcategory === subcategorySlug) {
      setSelectedSubcategory('');
      router.push(`/category/${slug}`);
    } else {
      setSelectedSubcategory(subcategorySlug);
      router.push(`/category/${slug}?subcategory=${subcategorySlug}`);
    }
  };

  const handleApplyFilters = () => {
    // Filters are already applied via React Query
  };

  const handleResetFilters = () => {
    setPriceRange({ min: '', max: '' });
    setCondition('');
    setSelectedSubcategory('');
    setSortBy('newest');
    router.push(`/category/${slug}`);
  };

  if (categoryLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-48 bg-gray-200 rounded-lg mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Category Not Found</h1>
        <p className="text-gray-600 mb-6">The category you're looking for doesn't exist.</p>
        <Link href="/" className="text-primary-600 hover:underline">
          Go back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Category Header Banner */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center gap-2 text-sm mb-4 opacity-90">
            <Link href="/" className="hover:underline">Home</Link>
            <FiChevronRight className="w-4 h-4" />
            <span>Categories</span>
            <FiChevronRight className="w-4 h-4" />
            <span className="font-semibold">{category.name}</span>
          </div>
          
          <div className="flex items-center gap-6">
            {category.image ? (
              <div className="w-24 h-24 bg-white rounded-full overflow-hidden ring-4 ring-white/20">
                <ImageWithFallback
                  src={category.image}
                  alt={category.name}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center text-5xl backdrop-blur-sm">
                {category.icon || '📦'}
              </div>
            )}
            
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{category.name}</h1>
              {category.description && (
                <p className="text-lg opacity-90 mb-2">{category.description}</p>
              )}
              <p className="text-sm opacity-75">
                {category._count?.ads || ads.length} ads available
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Subcategories */}
      {subcategories.length > 0 && (
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-6">
            <h2 className="text-lg font-semibold mb-4">Browse by Subcategory</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleSubcategoryClick('')}
                className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                  !selectedSubcategory
                    ? 'bg-primary-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All {category.name}
                <span className="ml-2 text-sm opacity-80">({category._count?.ads || 0})</span>
              </button>
              {subcategories.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => handleSubcategoryClick(sub.slug)}
                  className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                    selectedSubcategory === sub.slug
                      ? 'bg-primary-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {sub.name}
                  <span className="ml-2 text-sm opacity-80">({sub._count?.ads || 0})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <FiFilter className="w-5 h-5" />
                  Filters
                </h2>
                {(priceRange.min || priceRange.max || condition) && (
                  <button
                    onClick={handleResetFilters}
                    className="text-sm text-primary-600 hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-3">Price Range (₹)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Condition */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-3">Condition</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Conditions</option>
                  <option value="NEW">New</option>
                  <option value="LIKE_NEW">Like New</option>
                  <option value="USED">Used</option>
                  <option value="REFURBISHED">Refurbished</option>
                </select>
              </div>

              {/* Quick Filters */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-3">Quick Filters</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sortBy === 'price_low'}
                      onChange={(e) => setSortBy(e.target.checked ? 'price_low' : 'newest')}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm">Lowest Price First</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sortBy === 'price_high'}
                      onChange={(e) => setSortBy(e.target.checked ? 'price_high' : 'newest')}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm">Highest Price First</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Ads Grid */}
          <div className="lg:col-span-3">
            {/* Toolbar */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  Showing <span className="font-semibold text-gray-900">{ads.length}</span> ads
                  {selectedSubcategory && (
                    <span className="ml-1">
                      in{' '}
                      <span className="font-semibold">
                        {subcategories.find((s) => s.slug === selectedSubcategory)?.name}
                      </span>
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-4">
                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  <option value="newest">Latest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                </select>

                {/* View Mode */}
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded transition-all ${
                      viewMode === 'grid'
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <FiGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded transition-all ${
                      viewMode === 'list'
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <FiList className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Ads List */}
            {adsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                    <div className="bg-white p-4 rounded-b-lg">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : ads.length > 0 ? (
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
                    : 'space-y-4'
                }
              >
                {ads.map((ad) => (
                  <AdCard key={ad.id} ad={ad} viewMode={viewMode} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-bold mb-2">No ads found</h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your filters or check back later for new listings.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CategoryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CategoryPageContent />
    </Suspense>
  );
}

