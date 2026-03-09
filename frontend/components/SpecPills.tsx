'use client';

import { memo } from 'react';

/**
 * Creative specification pills for ad cards.
 * Cycles through soft color themes for a modern, varied look.
 */
const PILL_THEMES = [
  'bg-sky-50 text-sky-700 ring-1 ring-sky-200/60 dark:bg-sky-900/30 dark:text-sky-200 dark:ring-sky-700/50',
  'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-700/50',
  'bg-amber-50 text-amber-800 ring-1 ring-amber-200/60 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-700/50',
  'bg-violet-50 text-violet-700 ring-1 ring-violet-200/60 dark:bg-violet-900/30 dark:text-violet-200 dark:ring-violet-700/50',
  'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60 dark:bg-rose-900/30 dark:text-rose-200 dark:ring-rose-700/50',
  'bg-teal-50 text-teal-700 ring-1 ring-teal-200/60 dark:bg-teal-900/30 dark:text-teal-200 dark:ring-teal-700/50',
] as const;

export interface SpecPillsProps {
  items: string[];
  max?: number;
  className?: string;
}

function SpecPills({ items, max = 6, className = '' }: SpecPillsProps) {
  if (!items.length) return null;
  const show = items.slice(0, max);
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {show.map((label, i) => (
        <span
          key={`${label}-${i}`}
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-tight truncate max-w-[120px] ${PILL_THEMES[i % PILL_THEMES.length]}`}
          title={label}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

export default memo(SpecPills);
