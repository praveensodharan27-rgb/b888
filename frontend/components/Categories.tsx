'use client';

import Link from 'next/link';
import { FiArrowRight } from 'react-icons/fi';
import ImageWithFallback from './ImageWithFallback';
import { useCategories, type Category } from '@/hooks/useCategories';

// Map category names to Material Symbols icons
const getCategoryIcon = (categoryName: string, icon?: string): string => {
  if (icon && icon.startsWith('material-symbols:')) {
    return icon.replace('material-symbols:', '');
  }
  
  const iconMap: Record<string, string> = {
    'Vehicles': 'directions_car',
    'Properties': 'home',
    'Mobiles': 'smartphone',
    'Jobs': 'work',
    'Fashion': 'checkroom',
    'Furniture': 'chair',
    'Electronics': 'devices',
    'Real Estate': 'home',
    'Sports': 'sports_soccer',
    'Books': 'menu_book',
    'Pets': 'pets',
    'Services': 'build',
  };
  
  return iconMap[categoryName] || 'category';
};

export default function Categories() {
  const { categories: data, isLoading, isError } = useCategories();
  const categories = (data?.length ? data.slice(0, 24) : []) as (Category & { _count?: { ads: number } })[];

  return (
    <section>
      {/* Marketplace Style: Grid categories with icon cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {categories.slice(0, 6).map((category) => (
          <Link
            key={category.id}
            href={`/category/${category.slug}`}
            className="group flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:shadow-lg transition-all duration-200 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-slate-700 flex items-center justify-center text-primary group-hover:scale-110 transition-transform mb-3">
              <span className="material-symbols-outlined text-3xl">
                {getCategoryIcon(category.name, category.icon)}
              </span>
            </div>
            <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-primary">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
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

