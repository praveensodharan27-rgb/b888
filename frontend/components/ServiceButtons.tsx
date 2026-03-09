'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  FiGrid,
  FiTool,
  FiZap,
  FiRefreshCw,
  FiCamera,
  FiCloud,
} from 'react-icons/fi';
import {
  HiOutlineBugAnt,
  HiOutlinePaintBrush,
  HiOutlineCube,
  HiOutlineWrenchScrewdriver,
  HiOutlineUserCircle,
} from 'react-icons/hi2';
import { useLocationPersistence } from '@/hooks/useLocationPersistence';
import { getServiceCategoryUrl } from '@/lib/servicesUrl';

const SERVICE_BUTTONS = [
  { id: 'all', label: 'All Services', slug: 'services', subSlug: undefined, Icon: FiGrid },
  { id: 'plumbers', label: 'Plumbers', slug: 'services', subSlug: 'plumbing', Icon: FiTool },
  { id: 'electricians', label: 'Electricians', slug: 'services', subSlug: 'electrician', Icon: FiZap },
  { id: 'cleaning', label: 'Cleaning', slug: 'services', subSlug: 'cleaning', Icon: FiRefreshCw },
  { id: 'pest-control', label: 'Pest Control', slug: 'services', subSlug: 'pest-control', Icon: HiOutlineBugAnt },
  { id: 'painters', label: 'Painters', slug: 'services', subSlug: 'painters', Icon: HiOutlinePaintBrush },
  { id: 'ac-repair', label: 'AC Repair', slug: 'services', subSlug: 'ac_repair', Icon: FiCloud },
  { id: 'carpenters', label: 'Carpenters', slug: 'services', subSlug: 'carpenters', Icon: HiOutlineCube },
  { id: 'appliance-repair', label: 'Appliance Repair', slug: 'services', subSlug: 'appliance-repair', Icon: HiOutlineWrenchScrewdriver },
  { id: 'salon', label: 'Salon & Beauty', slug: 'services', subSlug: 'salon-beauty', Icon: HiOutlineUserCircle },
  { id: 'photography', label: 'Photography', slug: 'services', subSlug: 'photography', Icon: FiCamera },
];

export default function ServiceButtons() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { location: persistedLocation } = useLocationPersistence();
  const [activeId, setActiveId] = useState<string>('all');

  const citySlug = persistedLocation?.slug?.trim().toLowerCase();
  const useJustDialUrls = Boolean(citySlug);

  // Sync active state from URL (ads page with services, or JustDial /:city/services/:category)
  useEffect(() => {
    if (pathname?.match(/^\/[^/]+\/services\/[^/]+$/)) {
      const segment = pathname.split('/').filter(Boolean);
      const categorySegment = segment[2];
      if (categorySegment === 'all') {
        setActiveId('all');
      } else {
        const match = SERVICE_BUTTONS.find((b) => b.subSlug === categorySegment);
        setActiveId(match?.id ?? 'all');
      }
      return;
    }
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    if (category === 'services') {
      if (!subcategory) setActiveId('all');
      else {
        const match = SERVICE_BUTTONS.find((b) => b.subSlug === subcategory);
        setActiveId(match?.id ?? 'all');
      }
    }
  }, [pathname, searchParams]);

  const handleClick = (item: (typeof SERVICE_BUTTONS)[number]) => {
    setActiveId(item.id);
    if (useJustDialUrls && citySlug) {
      const path = item.subSlug ? getServiceCategoryUrl(citySlug, item.subSlug) : getServiceCategoryUrl(citySlug, 'all');
      router.push(path);
    } else {
      const params = new URLSearchParams();
      params.set('category', item.slug);
      if (item.subSlug) params.set('subcategory', item.subSlug);
      router.push(`/ads?${params.toString()}`);
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide justify-center flex-wrap py-2">
        {SERVICE_BUTTONS.map((item) => {
          const isActive = activeId === item.id;
          const Icon = item.Icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleClick(item)}
              className={`group relative flex flex-col items-center justify-center gap-2 py-4 px-4 rounded-xl min-w-[95px]
                transition-all duration-500 ease-out flex-shrink-0 bg-transparent
                ring-0 ring-blue-400 ring-offset-2 hover:ring-2
                ${isActive ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
              `}
            >
              <Icon
                className="w-7 h-7 text-blue-600"
              />
              <span className="text-[10px] font-medium text-black uppercase tracking-widest text-center leading-tight line-clamp-2">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
