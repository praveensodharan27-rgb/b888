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
    <section className="my-12">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 md:gap-6">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/category/${category.slug}`}
            className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 text-center group hover:-translate-y-1"
          >
            {category.image ? (
              <div className="w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden ring-2 ring-gray-100 group-hover:ring-primary-200 transition-all">
                <ImageWithFallback
                  src={category.image}
                  alt={category.name}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 mx-auto mb-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-4xl">{category.icon || '📦'}</span>
              </div>
            )}
            <h3 className="font-semibold text-base mb-1 group-hover:text-primary-600 transition-colors">{category.name}</h3>
            <p className="text-xs text-gray-500">
              {category._count?.ads || 0} ads
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

