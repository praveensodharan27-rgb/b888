'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

type Category = { name: string; slug: string };

interface CategoryTabsProps {
  activeSlug?: string;
  baseAllHref?: string; // default /ads
}

/**
 * Simple horizontally scrollable category tabs rendered as links.
 * Supports normal click + ctrl/middle-click to open in new tab.
 */
export default function CategoryTabs({ activeSlug = '', baseAllHref = '/ads' }: CategoryTabsProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/categories');
        const list = res.data?.categories || [];
        setCategories(list.map((c: any) => ({ name: c.name, slug: c.slug })));
      } catch (e) {
        console.error('Failed to load categories', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const tabs = [{ name: 'All', slug: '' }, ...categories];

  return (
    <div className="mb-4 overflow-x-auto">
      <div className="flex gap-2 min-w-full pb-2">
        {tabs.map((cat) => {
          const active = activeSlug === cat.slug;
          const href = cat.slug ? `/category/${cat.slug}` : baseAllHref;
          return (
            <Link
              key={cat.slug || 'all'}
              href={href}
              onClick={(e) => {
                // Allow Ctrl+Click / Cmd+Click / Middle-click to open in new tab
                if (e.ctrlKey || e.metaKey || e.button === 1) {
                  return; // Let browser handle it
                }
              }}
              onAuxClick={(e) => {
                // Handle middle-click (mouse wheel click)
                if (e.button === 1) {
                  window.open(href, '_blank');
                }
              }}
              className={`px-4 py-2 rounded-full border whitespace-nowrap transition-all ${
                active
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600'
              } ${loading ? 'pointer-events-none opacity-60' : ''}`}
            >
              {cat.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

