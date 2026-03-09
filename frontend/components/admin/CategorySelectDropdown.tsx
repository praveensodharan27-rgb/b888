'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { FiChevronDown, FiCheck } from 'react-icons/fi';

interface CategoryOption {
  slug: string;
  label: string;
  isMain: boolean;
  optionKey: string; // Unique key (main/sub can share slug e.g. "books")
}

interface CategorySelectDropdownProps {
  value: string;
  onChange: (slug: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Searchable category dropdown - fetches from admin API (works in admin panel)
 */
export default function CategorySelectDropdown({
  value,
  onChange,
  placeholder = 'Select category (optional)',
  disabled = false,
}: CategorySelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [useManual, setUseManual] = useState(false);
  const [manualSlug, setManualSlug] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use admin/categories - works in admin panel (user is authenticated)
  const { data: categories = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const res = await api.get('/admin/categories');
      return res.data?.categories || [];
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Sync manual slug when value changes (e.g. editing ad)
  useEffect(() => {
    if (value && !useManual) setManualSlug(value);
  }, [value, useManual]);

  // Build flat options: main categories + subcategories (use composite key - main/sub can share slug)
  const options: CategoryOption[] = useMemo(() => {
    const opts: CategoryOption[] = [];
    for (const cat of categories) {
      if (cat?.slug) opts.push({
        slug: cat.slug,
        label: cat.name || cat.slug,
        isMain: true,
        optionKey: `${cat.slug}-main`,
      });
      for (const sub of cat.subcategories || []) {
        if (sub?.slug) opts.push({
          slug: sub.slug,
          label: `${cat.name || ''} › ${sub.name || sub.slug}`,
          isMain: false,
          optionKey: `${cat.slug}-${sub.slug}`,
        });
      }
    }
    return opts;
  }, [categories]);

  const filtered = search.trim()
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(search.toLowerCase()) ||
          o.slug.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  const displayValue = useManual ? manualSlug : value;
  const selectedLabel = displayValue
    ? options.find((o) => o.slug === displayValue)?.label || displayValue
    : '';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fallback: manual input when no categories from DB
  if (useManual || (options.length === 0 && !isLoading)) {
    return (
      <div className="space-y-1">
        <input
          type="text"
          value={useManual ? manualSlug : value}
          onChange={(e) => {
            const v = e.target.value;
            if (useManual) setManualSlug(v);
            onChange(v);
          }}
          placeholder="e.g. cars, property (optional)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {options.length === 0 && !isLoading && (
          <div className="space-y-1">
            <p className="text-xs text-amber-600">No categories found. Enter slug manually or seed the database.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-xs text-blue-600 hover:underline"
            >
              Retry fetch
            </button>
          </div>
        )}
        {options.length > 0 && (
          <button
            type="button"
            onClick={() => setUseManual(false)}
            className="text-xs text-blue-600 hover:underline"
          >
            Switch to dropdown
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className="w-full flex items-center justify-between gap-2 border border-gray-300 rounded-lg px-3 py-2.5 text-left bg-white hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
      >
        <span className={selectedLabel ? 'text-gray-900' : 'text-gray-500'}>
          {selectedLabel || placeholder}
        </span>
        <FiChevronDown className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories..."
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-48 py-1">
            {isLoading ? (
              <div className="px-4 py-3 text-sm text-gray-500">Loading...</div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setUseManual(true);
                    setManualSlug('');
                    onChange('');
                    setOpen(false);
                    setSearch('');
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-gray-500 hover:bg-gray-50"
                >
                  Or type slug manually →
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${!value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                >
                  {!value && <FiCheck className="w-4 h-4" />}
                  <span className="text-gray-500">Any category</span>
                </button>
                {filtered.map((opt) => (
                  <button
                    key={opt.optionKey}
                    type="button"
                    onClick={() => {
                      onChange(opt.slug);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${value === opt.slug ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                  >
                    {value === opt.slug && <FiCheck className="w-4 h-4 flex-shrink-0" />}
                    <span className={value === opt.slug ? 'font-medium' : ''}>{opt.label}</span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="px-4 py-3 text-sm text-gray-500">No categories found</div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
