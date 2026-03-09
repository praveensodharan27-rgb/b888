'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCategories, type Category } from '@/hooks/useCategories';

// Map category names to colors and icons (Sell Box style)
const getCategoryStyle = (categoryName: string) => {
  const styleMap: Record<string, { color: string; bgColor: string; icon: string }> = {
    'Vehicles': { color: 'text-orange-600', bgColor: 'bg-orange-50', icon: 'directions_car' },
    'Properties': { color: 'text-blue-600', bgColor: 'bg-blue-50', icon: 'home' },
    'Mobiles': { color: 'text-purple-600', bgColor: 'bg-purple-50', icon: 'smartphone' },
    'Jobs': { color: 'text-green-600', bgColor: 'bg-green-50', icon: 'work' },
    'Bikes': { color: 'text-red-600', bgColor: 'bg-red-50', icon: 'motorcycle' },
    'Furniture': { color: 'text-amber-600', bgColor: 'bg-amber-50', icon: 'chair' },
    'Electronics': { color: 'text-indigo-600', bgColor: 'bg-indigo-50', icon: 'devices' },
    'Fashion': { color: 'text-pink-600', bgColor: 'bg-pink-50', icon: 'checkroom' },
    'Sports': { color: 'text-teal-600', bgColor: 'bg-teal-50', icon: 'sports_soccer' },
    'Books': { color: 'text-cyan-600', bgColor: 'bg-cyan-50', icon: 'menu_book' },
    'Pets': { color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: 'pets' },
    'Services': { color: 'text-gray-600', bgColor: 'bg-gray-50', icon: 'build' },
  };

  return styleMap[categoryName] || { color: 'text-gray-600', bgColor: 'bg-gray-50', icon: 'category' };
};

const getCategoryIcon = (categoryName: string, icon?: string): string => {
  if (icon && icon.startsWith('material-symbols:')) {
    return icon.replace('material-symbols:', '');
  }
  
  const style = getCategoryStyle(categoryName);
  return style.icon;
};

// Get user's recently viewed categories from localStorage
const getRecentCategories = (): string[] => {
  if (typeof window === 'undefined') return [];
  const recent = localStorage.getItem('recentCategories');
  return recent ? JSON.parse(recent) : [];
};

// Track category view
const trackCategoryView = (categorySlug: string) => {
  if (typeof window === 'undefined') return;
  const recent = getRecentCategories();
  const updated = [categorySlug, ...recent.filter(s => s !== categorySlug)].slice(0, 10);
  localStorage.setItem('recentCategories', JSON.stringify(updated));
};

export default function CategoriesOGNOX() {
  const { isAuthenticated } = useAuth();
  const { categories: data, isLoading } = useCategories();
  const [recentCategorySlugs] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const recent = localStorage.getItem('recentCategories');
    return recent ? JSON.parse(recent) : [];
  });

  const allCategories = (data?.length ? data : []) as (Category & { _count?: { ads: number }; createdAt?: string })[];

  // Sort and categorize - MUST BE BEFORE EARLY RETURN
  const categorized = useMemo(() => {
    if (!allCategories || allCategories.length === 0) {
      return { mostUsed: [], recent: [], popular: [], all: [] };
    }

    // Most Used: Categories with highest ad count (top 6)
    const mostUsed = [...allCategories]
      .filter(cat => (cat._count?.ads ?? 0) > 0)
      .sort((a, b) => (b._count?.ads || 0) - (a._count?.ads || 0))
      .slice(0, 6);

    // Recent: Categories user recently viewed (from localStorage)
    const recentCategories = recentCategorySlugs
      .map(slug => allCategories.find(cat => cat.slug === slug))
      .filter(Boolean) as Category[];

    // Popular: Categories with ads, sorted by ad count (different from most used)
    const popular = [...allCategories]
      .filter(cat => (cat._count?.ads ?? 0) > 0 && !mostUsed.some(m => m.id === cat.id))
      .sort((a, b) => (b._count?.ads || 0) - (a._count?.ads || 0))
      .slice(0, 6);

    // All remaining categories sorted A-Z
    const mostUsedIds = new Set(mostUsed.map(c => c.id));
    const recentIds = new Set(recentCategories.map(c => c.id));
    const popularIds = new Set(popular.map(c => c.id));
    
    const allRemaining = allCategories
      .filter(cat => !mostUsedIds.has(cat.id) && !recentIds.has(cat.id) && !popularIds.has(cat.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      mostUsed,
      recent: recentCategories,
      popular,
      all: allRemaining
    };
  }, [allCategories, recentCategorySlugs]);

  // Combine all categories for display (avoid duplicates), sorted A-Z - MUST BE BEFORE EARLY RETURN
  const allUniqueCategories = useMemo(() => {
    const categoryMap = new Map<string, Category>();
    
    // Add all categories (avoid duplicates)
    [...categorized.mostUsed, ...categorized.recent, ...categorized.popular, ...categorized.all].forEach(cat => {
      if (!categoryMap.has(cat.id)) {
        categoryMap.set(cat.id, cat);
      }
    });
    
    // Sort all categories alphabetically A-Z
    return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [categorized]);

  const handleCategoryClick = (categorySlug: string) => {
    trackCategoryView(categorySlug);
  };

  const CategoryIcon = ({ category }: { category: Category }) => {
    const style = getCategoryStyle(category.name);
    const icon = getCategoryIcon(category.name, category.icon);
    
    return (
      <Link
        href={`/category/${category.slug}`}
        onClick={() => handleCategoryClick(category.slug)}
        className="flex-shrink-0 flex flex-col items-center group cursor-pointer"
      >
        <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full ${style.bgColor} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
          <span className={`material-symbols-outlined text-3xl md:text-4xl ${style.color}`}>
            {icon}
          </span>
        </div>
        <span className="text-xs md:text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors text-center">
          {category.name}
        </span>
        {(category._count?.ads ?? 0) > 0 && (
          <span className="text-xs text-gray-500 mt-1">
            {category._count?.ads ?? 0} ads
          </span>
        )}
      </Link>
    );
  };

  // Early return AFTER all hooks
  if (isLoading) {
    return (
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Browse Categories</h2>
        </div>
        <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 flex flex-col items-center animate-pulse">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-200 rounded-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Browse Categories</h2>
        <Link 
          href="/ads" 
          className="text-sm md:text-base font-semibold text-blue-600 hover:text-blue-700 hover:underline"
        >
          View all ads
        </Link>
      </div>

      {/* Most Used Categories */}
      {categorized.mostUsed.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wide">Most Used</h3>
          <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 scrollbar-hide">
            {categorized.mostUsed.map((category) => (
              <CategoryIcon key={category.id} category={category} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Categories */}
      {categorized.recent.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wide">Recently Viewed</h3>
          <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 scrollbar-hide">
            {categorized.recent.map((category) => (
              <CategoryIcon key={category.id} category={category} />
            ))}
          </div>
        </div>
      )}

      {/* Popular Categories */}
      {categorized.popular.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wide">Popular</h3>
          <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 scrollbar-hide">
            {categorized.popular.map((category) => (
              <CategoryIcon key={category.id} category={category} />
            ))}
          </div>
        </div>
      )}

      {/* All Categories Grid A-Z */}
      {allUniqueCategories.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wide">All Categories</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
            {allUniqueCategories.map((category) => (
              <CategoryIcon key={category.id} category={category} />
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
