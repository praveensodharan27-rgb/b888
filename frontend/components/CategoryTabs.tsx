'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import api from '@/lib/api';
import { dummyCategories } from '@/lib/dummyData';
import { useEffect, useRef } from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  _count: { ads: number };
}

interface CategoryTabsProps {
  showAll?: boolean;
  maxVisible?: number;
}

export default function CategoryTabs({ showAll = false, maxVisible = 12 }: CategoryTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Extract current category slug from pathname
  const currentCategorySlug = pathname.startsWith('/category/') 
    ? pathname.split('/')[2] 
    : null;

  // Fetch categories
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
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false,
  });

  const allCategories = (data as Category[]) || dummyCategories;
  const categories = showAll ? allCategories : allCategories.slice(0, maxVisible);

  // Auto-scroll to active tab
  useEffect(() => {
    if (currentCategorySlug && scrollContainerRef.current) {
      const activeTab = scrollContainerRef.current.querySelector(`[data-slug="${currentCategorySlug}"]`);
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentCategorySlug]);

  const handleTabClick = (slug: string) => {
    router.push(`/category/${slug}`);
  };

  const handleAllClick = () => {
    router.push('/ads');
  };

  if (isLoading) {
    return (
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-4 scrollbar-hide">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-10 w-24 bg-gray-200 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-b shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div 
          ref={scrollContainerRef}
          className="flex gap-2 overflow-x-auto py-4 scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* All Categories Tab */}
          <button
            onClick={handleAllClick}
            className={`
              flex-shrink-0 px-6 py-2.5 rounded-full font-medium text-sm
              transition-all duration-200 whitespace-nowrap
              ${!currentCategorySlug
                ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-200 scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
              }
            `}
          >
            <span className="flex items-center gap-2">
              <span>🏠</span>
              <span>All</span>
            </span>
          </button>

          {/* Category Tabs */}
          {categories.map((category) => {
            const isActive = currentCategorySlug === category.slug;
            
            return (
              <button
                key={category.id}
                data-slug={category.slug}
                onClick={() => handleTabClick(category.slug)}
                className={`
                  flex-shrink-0 px-6 py-2.5 rounded-full font-medium text-sm
                  transition-all duration-200 whitespace-nowrap
                  ${isActive
                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-200 scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                  }
                `}
              >
                <span className="flex items-center gap-2">
                  {category.icon && <span>{category.icon}</span>}
                  <span>{category.name}</span>
                  {category._count?.ads > 0 && (
                    <span className={`
                      text-xs px-2 py-0.5 rounded-full
                      ${isActive 
                        ? 'bg-white/20 text-white' 
                        : 'bg-gray-200 text-gray-600'
                      }
                    `}>
                      {category._count.ads}
                    </span>
                  )}
                </span>
              </button>
            );
          })}

          {/* Show More Button */}
          {!showAll && allCategories.length > maxVisible && (
            <button
              onClick={() => router.push('/#categories')}
              className="flex-shrink-0 px-6 py-2.5 rounded-full font-medium text-sm
                bg-gradient-to-r from-orange-500 to-orange-600 text-white
                hover:from-orange-600 hover:to-orange-700
                shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200
                whitespace-nowrap"
            >
              <span className="flex items-center gap-2">
                <span>View All</span>
                <span>→</span>
              </span>
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

