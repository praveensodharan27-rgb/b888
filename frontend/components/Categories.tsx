'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { FiArrowRight } from 'react-icons/fi';
import { dummyCategories } from '@/lib/dummyData';
import ImageWithFallback from './ImageWithFallback';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  _count: { ads: number };
}

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
  const { data, isLoading, isError } = useQuery({
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

  // Use dummy data if API fails or is loading
  // Show more categories (24 instead of 12)
  const categories = (data as Category[])?.slice(0, 24) || dummyCategories.slice(0, 24);

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

