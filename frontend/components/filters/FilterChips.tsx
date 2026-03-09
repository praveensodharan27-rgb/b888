'use client';

import { FiX } from 'react-icons/fi';

interface FilterChipsProps {
  filters: Record<string, any>;
  onRemove: (key: string) => void;
  onClearAll: () => void;
}

const FILTER_LABELS: Record<string, (value: any) => string> = {
  category: (v) => String(v).charAt(0).toUpperCase() + String(v).slice(1),
  subcategory: (v) => String(v).charAt(0).toUpperCase() + String(v).slice(1),
  location: (v) => (v === 'india' || v === 'all-india' ? 'India' : String(v).charAt(0).toUpperCase() + String(v).slice(1)),
  search: (v) => String(v),
  brand: (v) => `Brand: ${String(v)}`,
  model: (v) => `Model: ${String(v)}`,
  condition: (v) => {
    const map: Record<string, string> = { NEW: 'New', LIKE_NEW: 'Like New', USED: 'Used', REFURBISHED: 'Refurbished' };
    return map[String(v)] || String(v);
  },
  minPrice: (v) => `Min ₹${Number(v).toLocaleString('en-IN')}`,
  maxPrice: (v) => `Max ₹${Number(v).toLocaleString('en-IN')}`,
  postedTime: (v) => {
    const map: Record<string, string> = { '24h': 'Last 24h', '3d': 'Last 3 days', '7d': 'Last 7 days', '30d': 'Last 30 days' };
    return map[String(v)] || String(v);
  },
  sort: (v) => {
    const map: Record<string, string> = {
      newest: 'Newest',
      oldest: 'Oldest',
      price_low: 'Price: Low to High',
      price_high: 'Price: High to Low',
      featured: 'Featured',
    };
    return map[String(v)] || String(v);
  },
};

export default function FilterChips({ filters, onRemove, onClearAll }: FilterChipsProps) {
  const chips: { key: string; label: string }[] = [];
  const skipKeys = new Set<string>();

  // Price chip (combined min+max or single)
  if (filters.minPrice || filters.maxPrice) {
    const min = Number(filters.minPrice) || 0;
    const max = Number(filters.maxPrice);
    if (min && max) {
      chips.push({ key: 'price', label: `₹${min.toLocaleString('en-IN')} - ₹${max.toLocaleString('en-IN')}` });
    } else if (max) {
      chips.push({ key: 'maxPrice', label: `Up to ₹${max.toLocaleString('en-IN')}` });
    } else if (min) {
      chips.push({ key: 'minPrice', label: `From ₹${min.toLocaleString('en-IN')}` });
    }
    skipKeys.add('minPrice').add('maxPrice');
  }

  // Don't show context chips (category, subcategory, location, sort) - already shown in page header
  const contextKeys = new Set(['category', 'subcategory', 'location', 'city', 'state', 'sort']);

  Object.entries(filters).forEach(([key, value]) => {
    if (skipKeys.has(key) || contextKeys.has(key) || value === undefined || value === null || value === '' || key === 'page' || key === 'limit' || key === 'latitude' || key === 'longitude' || key === 'radius') return;
    if (Array.isArray(value) && value.length === 0) return;

    const formatter = FILTER_LABELS[key];
    const label = formatter ? formatter(value) : String(value);
    chips.push({ key, label });
  });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map(({ key, label }) => (
        <span
          key={key}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-full"
        >
          {label}
          <button
            onClick={() => onRemove(key)}
            className="hover:bg-blue-700 rounded-full p-0.5 transition-colors"
            aria-label={`Remove ${label}`}
          >
            <FiX className="w-3.5 h-3.5" />
          </button>
        </span>
      ))}
      <button
        onClick={onClearAll}
        className="text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline"
      >
        Clear all filters
      </button>
    </div>
  );
}
