'use client';

import { useState, useEffect } from 'react';
import FilterCard from './FilterCard';

interface PriceFilterCardProps {
  title?: string;
  min?: number;
  max?: number;
  step?: number;
  value?: { min: number; max: number } | [number, number];
  onChange?: (value: { min: number; max: number }) => void;
  minPrice?: number;
  maxPrice?: number;
  onPriceChange?: (min: number | undefined, max: number | undefined) => void;
  currency?: string;
}

const PRICE_MIN = 0;
const PRICE_MAX = 10000000;

export default function PriceFilterCard({
  title = 'PRICE',
  min = PRICE_MIN,
  max = PRICE_MAX,
  step = 100,
  value,
  onChange,
  minPrice,
  maxPrice,
  onPriceChange,
}: PriceFilterCardProps) {
  const initialMin = minPrice !== undefined ? minPrice : (value ? (Array.isArray(value) ? value[0] : value.min) : min);
  const initialMax = maxPrice !== undefined ? maxPrice : (value ? (Array.isArray(value) ? value[1] : value.max) : max);

  const [localMin, setLocalMin] = useState(initialMin);
  const [localMax, setLocalMax] = useState(initialMax);

  useEffect(() => {
    setLocalMin(initialMin);
    setLocalMax(initialMax);
  }, [initialMin, initialMax]);

  const handleMinInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value ? Number(e.target.value) : min;
    const num = Math.max(min, Math.min(max, v));
    setLocalMin(num);
    if (num <= localMax) {
      if (onPriceChange) {
        onPriceChange(num === min ? undefined : num, localMax === max ? undefined : localMax);
      } else {
        onChange?.({ min: num, max: localMax });
      }
    }
  };

  const handleMaxInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value ? Number(e.target.value) : max;
    const num = Math.max(min, Math.min(max, v));
    setLocalMax(num);
    if (num >= localMin) {
      if (onPriceChange) {
        onPriceChange(localMin === min ? undefined : localMin, num === max ? undefined : num);
      } else {
        onChange?.({ min: localMin, max: num });
      }
    }
  };

  return (
    <FilterCard title={title}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
            MIN
          </label>
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={localMin === min ? '0' : localMin}
            onChange={handleMinInput}
            placeholder="0"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
            MAX
          </label>
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={localMax === max ? '10000000' : localMax}
            onChange={handleMaxInput}
            placeholder="10000000"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </FilterCard>
  );
}
