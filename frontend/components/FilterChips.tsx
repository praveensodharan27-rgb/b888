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

  if (filters.minPrice || filters.maxPrice) {
    const priceLabel = filters.minPrice && filters.maxPrice
      ? `₹${filters.minPrice} - ₹${filters.maxPrice}`
      : filters.minPrice
      ? `From ₹${filters.minPrice}`
      : `Up to ₹${filters.maxPrice}`;
    
    chips.push({
      key: 'price',
      label: 'Price',
      value: priceLabel,
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

  const handleRemove = (key: string) => {
    if (key === 'price') {
      // Remove both min and max price
      onRemove('minPrice');
      onRemove('maxPrice');
    } else {
      onRemove(key);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-sm font-medium text-gray-700">Active Filters:</span>
      {chips.map((chip) => (
        <div
          key={chip.key}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-100 text-primary-800 rounded-full text-sm font-medium"
        >
          <span className="text-xs text-primary-600">{chip.label}:</span>
          <span className="max-w-[200px] truncate">{chip.value}</span>
          <button
            onClick={() => handleRemove(chip.key)}
            className="ml-1 hover:bg-primary-200 rounded-full p-0.5 transition-colors"
            aria-label={`Remove ${chip.label} filter`}
          >
            <FiX className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      {onClearAll && chips.length > 1 && (
        <button
          onClick={onClearAll}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        >
          Clear All
        </button>
      )}
    </div>
  );
}

