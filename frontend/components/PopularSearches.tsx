'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface PopularSearch {
  term: string;
  count?: number;
}

const defaultSearches = [
  'Used Cars',
  'Apartments for Rent',
  'Mobile Phones',
  'Jobs',
  'Laptops',
  'Pets',
  'Motorcycles'
];

export default function PopularSearches({ location = '' }: { location?: string }) {
  const router = useRouter();
  const [searches, setSearches] = useState<PopularSearch[]>(defaultSearches.map(term => ({ term })));

  // Fetch popular searches if API available
  const { data } = useQuery({
    queryKey: ['popularSearches', location],
    queryFn: async () => {
      try {
        const response = await api.get('/search/popular', { params: { location } });
        return response.data.searches || defaultSearches.map(term => ({ term }));
      } catch (error) {
        return defaultSearches.map(term => ({ term }));
      }
    },
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
  });

  useEffect(() => {
    if (data) {
      setSearches(data);
    }
  }, [data]);

  const handleSearchClick = (term: string) => {
    router.push(`/ads?search=${encodeURIComponent(term)}${location ? `&location=${location}` : ''}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {searches.map((search, index) => (
        <a
          key={index}
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleSearchClick(search.term);
          }}
          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          {search.term}
        </a>
      ))}
    </div>
  );
}

