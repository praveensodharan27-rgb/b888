'use client';

import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import LazyAdCard from '@/components/LazyAdCard';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function FavoritesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      const response = await api.get('/user/favorites');
      return response.data;
    },
    enabled: isAuthenticated && mounted,
  });

  // Show loading during initial mount to prevent hydration mismatch
  if (!mounted || authLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-600 mb-4">Please login to view your favorites</p>
        <Link href="/login" className="text-primary-600 hover:text-primary-700">
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-[1400px]">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Favorites</h1>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-500">Loading favorites...</p>
          </div>
        ) : (
          <>
            {data?.favorites && data.favorites.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8 items-stretch">
                {data.favorites.map((favorite: any, index: number) => (
                  <LazyAdCard key={favorite.id} ad={favorite.ad} variant="olx" priority={index < 6} eager={index < 8} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="max-w-md mx-auto">
                  <div className="text-6xl mb-4">❤️</div>
                  <p className="text-gray-600 text-lg font-medium mb-2">No favorites yet</p>
                  <p className="text-gray-500 text-sm mb-6">Start saving your favorite ads!</p>
                  <Link
                    href="/ads"
                    className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    Browse Ads
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

