'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface RangeSliderProps {
  min: number;
  max: number;
  value: [number, number] | { min: number; max: number };
  onChange: (value: [number, number] | { min: number; max: number }) => void;
  step?: number;
  formatValue?: (value: number) => string;
}

export default function RangeSlider({
  min,
  max,
  value,
  onChange,
  step = 1,
  formatValue = (v) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}K` : `₹${v}`),
}: RangeSliderProps) {
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Normalize value to array format
  const normalizedValue: [number, number] = Array.isArray(value) 
    ? value 
    : [value.min, value.max];

  const getPercentage = (val: number) => ((val - min) / (max - min)) * 100;

  const handleMouseDown = useCallback((type: 'min' | 'max', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(type);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const newValue = min + (percentage / 100) * (max - min);
    const steppedValue = Math.round(newValue / step) * step;

    if (isDragging === 'min') {
      const newMin = Math.max(min, Math.min(steppedValue, normalizedValue[1] - step));
      onChange([newMin, normalizedValue[1]]);
    } else {
      const newMax = Math.min(max, Math.max(steppedValue, normalizedValue[0] + step));
      onChange([normalizedValue[0], newMax]);
    }
  }, [isDragging, min, max, step, normalizedValue, onChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const minPercentage = getPercentage(normalizedValue[0]);
  const maxPercentage = getPercentage(normalizedValue[1]);

  const handleClass =
    'absolute w-6 h-6 bg-white rounded-full border-2 border-primary-500 shadow-lg cursor-grab active:cursor-grabbing transform -translate-x-1/2 -translate-y-1/2 top-1/2 z-10 hover:scale-105 active:scale-100 transition-transform duration-200 select-none overflow-hidden';

  return (
    <div className="space-y-3 w-full min-w-0">
      <div className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
        <span className="flex-shrink-0 tabular-nums">{formatValue(normalizedValue[0])}</span>
        <span className="flex-shrink-0 tabular-nums">{formatValue(normalizedValue[1])}</span>
      </div>
      <div
        ref={sliderRef}
        className="relative h-3 rounded-full cursor-pointer w-full select-none bg-gray-200 flex-shrink-0"
        onMouseDown={(e) => {
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          const percentage = ((e.clientX - rect.left) / rect.width) * 100;
          const newValue = min + (percentage / 100) * (max - min);
          const steppedValue = Math.round(newValue / step) * step;

          if (Math.abs(steppedValue - normalizedValue[0]) < Math.abs(steppedValue - normalizedValue[1])) {
            handleMouseDown('min', e);
          } else {
            handleMouseDown('max', e);
          }
        }}
      >
        {/* Inactive track: light gray (default bg) */}
        {/* Active range track: vibrant blue */}
        <div
          className="absolute h-3 rounded-full pointer-events-none bg-primary-500 transition-all duration-150 ease-out"
          style={{
            left: `${minPercentage}%`,
            width: `${maxPercentage - minPercentage}%`,
          }}
        />
        {/* Min handle – white circle with blue arc on top half */}
        <div
          className={handleClass}
          style={{ left: `${minPercentage}%` }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleMouseDown('min', e);
          }}
        >
          <span className="absolute inset-0 rounded-full bg-primary-500 pointer-events-none" style={{ transform: 'translateY(50%)' }} aria-hidden />
        </div>
        {/* Max handle – white circle with blue arc on top half */}
        <div
          className={handleClass}
          style={{ left: `${maxPercentage}%` }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleMouseDown('max', e);
          }}
        >
          <span className="absolute inset-0 rounded-full bg-primary-500 pointer-events-none" style={{ transform: 'translateY(50%)' }} aria-hidden />
        </div>
      </div>
    </div>
  );
}
