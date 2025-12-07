'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { FiGrid, FiChevronDown } from 'react-icons/fi';
import { useState, useRef, useEffect } from 'react';
import { dummyCategories } from '@/lib/dummyData';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  _count?: { ads: number };
  subcategories?: Subcategory[];
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  _count?: { ads: number };
}

export default function CategoryNav() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showMegaMenu, setShowMegaMenu] = useState(false);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Get current category from URL
  const currentCategory = pathname.startsWith('/category/') 
    ? pathname.split('/')[2] 
    : searchParams.get('category');

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const response = await api.get('/categories');
        return response.data.categories;
      } catch (error) {
        return null;
      }
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Get all categories for mega menu
  const allCategories = (data as Category[]) || dummyCategories;

  // Get top 12 most popular categories based on ad count for quick links
  const topCategories = [...allCategories]
    .sort((a, b) => {
      const countA = a._count?.ads || 0;
      const countB = b._count?.ads || 0;
      return countB - countA; // Sort descending by ad count
    })
    .slice(0, 12);

  // Auto-scroll to active category
  useEffect(() => {
    if (currentCategory && scrollContainerRef.current) {
      const activeTab = scrollContainerRef.current.querySelector(`[data-slug="${currentCategory}"]`);
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentCategory]);

  // Close mega menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (megaMenuRef.current && !megaMenuRef.current.contains(event.target as Node)) {
        setShowMegaMenu(false);
      }
    };

    if (showMegaMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMegaMenu]);

  // Handle category navigation
  const handleCategoryClick = (categorySlug: string) => {
    router.push(`/category/${categorySlug}`);
    setShowMegaMenu(false);
  };

  if (isLoading) {
    return (
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-14">
            <div className="flex gap-4 animate-pulse">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-8 w-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 py-2">
          {/* All Categories Mega Menu Button */}
          <div className="relative" ref={megaMenuRef}>
            <button
              onClick={() => setShowMegaMenu(!showMegaMenu)}
              onMouseEnter={() => setShowMegaMenu(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors"
            >
              <FiGrid className="w-4 h-4" />
              All Categories
              <FiChevronDown className={`w-4 h-4 transition-transform ${showMegaMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* OLX-Style Mega Menu */}
            {showMegaMenu && (
              <div 
                className="fixed left-0 right-0 top-[calc(4rem+3.5rem)] bg-white shadow-2xl border-t border-gray-200 z-50"
                onMouseLeave={() => setShowMegaMenu(false)}
              >
                <div className="container mx-auto px-4 py-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {allCategories.map((category) => (
                      <div key={category.id} className="space-y-3">
                        {/* Category Title */}
                        <button
                          onClick={() => handleCategoryClick(category.slug)}
                          className="w-full flex items-center gap-2 text-sm font-bold text-gray-900 hover:text-primary-600 transition-colors group pb-2 border-b border-gray-200 text-left"
                        >
                          {category.icon && (
                            <span className="text-xl group-hover:scale-110 transition-transform">
                              {category.icon}
                            </span>
                          )}
                          <span className="flex-1">{category.name}</span>
                        </button>

                        {/* Subcategories List */}
                        {category.subcategories && category.subcategories.length > 0 ? (
                          <div className="space-y-2">
                            {/* View All Link */}
                            <button
                              onClick={() => handleCategoryClick(category.slug)}
                              className="block text-xs font-semibold text-primary-600 hover:text-primary-700 hover:translate-x-1 transition-all text-left w-full"
                            >
                              View All
                            </button>

                            {/* Subcategories */}
                            {category.subcategories.map((subcategory) => (
                              <button
                                key={subcategory.id}
                                onClick={() => {
                                  router.push(`/category/${category.slug}?subcategory=${subcategory.slug}`);
                                  setShowMegaMenu(false);
                                }}
                                className="block text-xs text-gray-600 hover:text-primary-600 hover:translate-x-1 transition-all text-left w-full"
                              >
                                {subcategory.name}
                                {subcategory._count?.ads !== undefined && (
                                  <span className="ml-1 text-xs text-gray-400">
                                    ({subcategory._count.ads})
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleCategoryClick(category.slug)}
                            className="block text-xs text-gray-600 hover:text-primary-600 hover:translate-x-1 transition-all text-left w-full"
                          >
                            View All
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Category Links - Top 12 Most Popular with Active State */}
          <div 
            ref={scrollContainerRef}
            className="flex items-center gap-1 overflow-x-auto hide-scrollbar flex-1 scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {topCategories.map((category) => {
              const isActive = currentCategory === category.slug;
              
              return (
                <button
                  key={category.id}
                  data-slug={category.slug}
                  onClick={() => handleCategoryClick(category.slug)}
                  className={`
                    flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium
                    transition-all duration-200 whitespace-nowrap
                    ${isActive 
                      ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg scale-105' 
                      : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50 hover:scale-105'
                    }
                  `}
                >
                  {category.icon && <span className="mr-1.5">{category.icon}</span>}
                  {category.name}
                  {isActive && category._count?.ads ? (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-white/20 rounded-full">
                      {category._count.ads}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
