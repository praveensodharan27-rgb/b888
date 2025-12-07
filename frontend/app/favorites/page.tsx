'use client';

import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import AdCard from '@/components/AdCard';
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Favorites</h1>

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {data?.favorites.map((favorite: any) => (
              <AdCard key={favorite.id} ad={favorite.ad} />
            ))}
          </div>
          {data?.favorites.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No favorites yet</p>
              <Link
                href="/ads"
                className="text-primary-600 hover:text-primary-700"
              >
                Browse ads
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

