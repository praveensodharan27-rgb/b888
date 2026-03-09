'use client';

import { ReactNode } from 'react';

interface FilterCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  selectedCount?: number;
  selectedLabel?: string;
}

export default function FilterCard({ 
  title, 
  children, 
  className = '',
  icon,
  selectedCount,
  selectedLabel
}: FilterCardProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon && (
            <div className="text-blue-600">
              {icon}
            </div>
          )}
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">{title}</h3>
          {selectedCount !== undefined && selectedCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-600 text-xs font-semibold rounded-full">
              {selectedCount}
            </span>
          )}
        </div>
      </div>
      <div className="filter-card-content">{children}</div>
    </div>
  );
}
