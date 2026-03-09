'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { FiMapPin, FiChevronDown, FiX, FiCheck } from 'react-icons/fi';

function toSlug(name: string): string {
  if (!name || typeof name !== 'string') return '';
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

interface LocationOption {
  slug: string;
  name: string;
  state?: string;
  city?: string;
}

interface LocationSelectDropdownProps {
  value: string[];
  onChange: (slugs: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Searchable multi-select location dropdown - fetches from DB
 */
export default function LocationSelectDropdown({
  value = [],
  onChange,
  placeholder = 'Select target locations...',
  disabled = false,
}: LocationSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: locationsData, isLoading } = useQuery({
    queryKey: ['locations', 'cities'],
    queryFn: async () => {
      const res = await api.get('/locations', { params: { type: 'city', detailed: 'true' } });
      const locs = res.data?.locations || res.data?.grouped?.cities || [];
      return Array.isArray(locs) ? locs : [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const options: LocationOption[] = (locationsData || []).map((loc: any) => ({
    slug: loc.slug || toSlug(loc.name || loc.city || ''),
    name: loc.name || loc.city || loc.slug || '',
    state: loc.state,
    city: loc.city,
  })).filter((o: LocationOption) => o.slug);

  const filtered = search.trim()
    ? options.filter(
        (o) =>
          o.name.toLowerCase().includes(search.toLowerCase()) ||
          o.slug.toLowerCase().includes(search.toLowerCase()) ||
          (o.state && o.state.toLowerCase().includes(search.toLowerCase())) ||
          (o.city && o.city.toLowerCase().includes(search.toLowerCase()))
      )
    : options;

  const toggleLocation = (slug: string) => {
    if (value.includes(slug)) {
      onChange(value.filter((s) => s !== slug));
    } else {
      onChange([...value, slug]);
    }
  };

  const addAllIndia = () => {
    if (!value.includes('all-india')) {
      onChange([...value, 'all-india']);
    }
  };

  const removeLocation = (slug: string) => {
    onChange(value.filter((s) => s !== slug));
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="space-y-2">
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((slug) => (
          <span
            key={slug}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-blue-100 text-blue-800 font-medium"
          >
            <FiMapPin className="w-3.5 h-3.5" />
            {slug}
            <button
              type="button"
              onClick={() => removeLocation(slug)}
              className="hover:bg-blue-200 rounded p-0.5 transition-colors"
              aria-label={`Remove ${slug}`}
            >
              <FiX className="w-3.5 h-3.5" />
            </button>
          </span>
        ))}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setOpen(!open)}
          disabled={disabled}
          className="w-full flex items-center justify-between gap-2 border border-gray-300 rounded-lg px-3 py-2.5 text-left bg-white hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
        >
          <span className="text-gray-500">{placeholder}</span>
          <FiChevronDown className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-72 overflow-hidden">
            <div className="p-2 border-b border-gray-100 space-y-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cities..."
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
              <button
                type="button"
                onClick={addAllIndia}
                disabled={value.includes('all-india')}
                className="w-full px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                + Add All India
              </button>
            </div>
            <div className="overflow-y-auto max-h-56 py-1">
              {isLoading ? (
                <div className="px-4 py-3 text-sm text-gray-500">Loading locations...</div>
              ) : (
                filtered.map((opt) => {
                  const selected = value.includes(opt.slug);
                  return (
                    <button
                      key={opt.slug}
                      type="button"
                      onClick={() => toggleLocation(opt.slug)}
                      className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${selected ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          selected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                        }`}
                      >
                        {selected && <FiCheck className="w-2.5 h-2.5 text-white" />}
                      </span>
                      <span className="font-medium">{opt.name}</span>
                      {opt.state && (
                        <span className="text-gray-500 text-xs">({opt.state})</span>
                      )}
                    </button>
                  );
                })
              )}
              {!isLoading && filtered.length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-500">No locations found</div>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Leave empty for all locations. Select cities from the dropdown or add &quot;All India&quot;.
      </p>
    </div>
  );
}
