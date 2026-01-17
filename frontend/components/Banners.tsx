'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import ImageWithFallback from './ImageWithFallback';
import { dummyBanners } from '@/lib/dummyData';

interface BannersProps {
  position: 'homepage' | 'category' | 'search';
  categoryId?: string;
  locationId?: string;
}

export default function Banners({ position, categoryId, locationId }: BannersProps) {
  const { data } = useQuery({
    queryKey: ['banners', position, categoryId, locationId],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({ position });
        if (categoryId) params.append('categoryId', categoryId);
        if (locationId) params.append('locationId', locationId);

        const response = await api.get(`/banners?${params.toString()}`);
        return response.data.banners;
      } catch (error) {
        return null;
      }
    },
  });

  const banners = (data && data.length > 0) ? data : (position === 'homepage' ? dummyBanners : []);

  if (banners.length === 0) return null;

  const handleClick = async (bannerId: string) => {
    await api.post(`/banners/${bannerId}/click`);
  };

  if (banners.length === 0) return null;

  return (
    <div className="mb-6">
      {banners.map((banner: any) => (
        <Link
          key={banner.id}
          href={banner.link || '#'}
          onClick={() => handleClick(banner.id)}
          className="block mb-6 group"
        >
          <div className="relative h-40 md:h-64 rounded-xl overflow-hidden shadow-lg group-hover:shadow-2xl transition-shadow">
            <ImageWithFallback
              src={banner.image}
              alt={banner.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 80vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center">
              <div className="p-6 md:p-10 text-white">
                <h3 className="text-2xl md:text-4xl font-bold mb-2">{banner.title}</h3>
                <p className="text-primary-200 text-sm md:text-base">Click to explore →</p>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

