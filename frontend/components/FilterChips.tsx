'use client';

import { FiX } from 'react-icons/fi';

interface FilterChip {
  key: string;
  label: string;
  value: string;
  icon?: React.ReactNode;
}

interface FilterChipsProps {
  filters: any;
  onRemove: (key: string) => void;
  onClearAll?: () => void;
}

export default function FilterChips({ filters, onRemove, onClearAll }: FilterChipsProps) {
  const chips: FilterChip[] = [];

  // Build chips from active filters
  if (filters.category) {
    chips.push({
      key: 'category',
      label: 'Category',
      value: filters.category,
    });
  }

  if (filters.subcategory) {
    chips.push({
      key: 'subcategory',
      label: 'Subcategory',
      value: filters.subcategory,
    });
  }

  if (filters.location) {
    chips.push({
      key: 'location',
      label: 'Location',
      value: filters.location,
    });
  }

  const handleRemove = (key: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (key === 'price') {
      // Remove both min and max price
      onRemove('minPrice');
      onRemove('maxPrice');
      onRemove('priceMin');
      onRemove('priceMax');
    } else {
      onRemove(key);
    }
  };

  // Format price range (using priceMin/priceMax or minPrice/maxPrice)
  const priceMin = filters.priceMin || filters.minPrice;
  const priceMax = filters.priceMax || filters.maxPrice;
  
  if (priceMin || priceMax) {
    const priceLabel = priceMin && priceMax
      ? `₹${(priceMin / 1000).toFixed(0)}K-₹${(priceMax / 1000).toFixed(0)}K`
      : priceMin
      ? `From ₹${(priceMin / 1000).toFixed(0)}K`
      : `Up to ₹${(priceMax / 1000).toFixed(0)}K`;
    
    chips.push({
      key: 'price',
      label: 'Price',
      value: priceLabel,
    });
  }

  // Add brand filter
  if (filters.brand) {
    const brandValue = Array.isArray(filters.brand) ? filters.brand[0] : filters.brand;
    chips.push({
      key: 'brand',
      label: 'Brand',
      value: brandValue,
    });
  }

  if (filters.condition) {
    chips.push({
      key: 'condition',
      label: 'Condition',
      value: filters.condition.replace('_', ' '),
    });
  }

  if (filters.search) {
    chips.push({
      key: 'search',
      label: 'Search',
      value: filters.search,
    });
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 w-full overflow-hidden">
      {chips.map((chip) => (
        <div
          key={chip.key}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-full text-sm font-medium cursor-default"
        >
          <span className="max-w-[200px] truncate">{chip.value}</span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleRemove(chip.key, e);
            }}
            className="ml-1 hover:bg-blue-700 active:bg-blue-800 rounded-full p-0.5 transition-colors flex-shrink-0 flex items-center justify-center"
            aria-label={`Remove ${chip.label} filter`}
            title={`Remove ${chip.label} filter`}
          >
            <FiX className="w-3 h-3 text-white" />
          </button>
        </div>
      ))}
      {onClearAll && chips.length > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClearAll();
          }}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:underline transition-colors"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

