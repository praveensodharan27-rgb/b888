'use client';

import { useMemo, memo, useRef, useEffect } from 'react';
import {
  FiCalendar,
  FiDroplet,
  FiActivity,
  FiSmartphone,
  FiCpu,
  FiHardDrive,
  FiLayers,
  FiPackage,
  FiHome,
  FiMaximize2,
  FiUser,
  FiSettings,
} from 'react-icons/fi';
import { getAdCardSpecs, type SpecIconKey } from '@/lib/adCardSpecs';
import { getSpecsLayout } from '@/lib/specsLayoutUtils';
import { useSpecsLayout } from '@/contexts/SpecsLayoutContext';

export interface AdSpecsProps {
  /** Category slug (e.g. "cars", "mobiles", "vehicles") */
  category?: string | null;
  /** Subcategory slug (e.g. "mobile-phones", "cars") */
  subcategory?: string | null;
  /** Ad attributes / specs object (from ad.attributes or ad.specs) */
  specs?: Record<string, string | number | null | undefined> | null;
  /** Max number of specs to show (default: 4) */
  maxCount?: number;
  /** Optional className for the container */
  className?: string;
  /** Use compact styling (smaller icons/text) */
  compact?: boolean;
  /** "icons" = icon per spec (detail/filter pages). "bullet" = single row with • separator, no icons (listing cards) */
  variant?: 'icons' | 'bullet';
}

const SPEC_ICONS: Record<SpecIconKey, typeof FiCalendar> = {
  calendar: FiCalendar,
  droplet: FiDroplet,
  activity: FiActivity,
  smartphone: FiSmartphone,
  cpu: FiCpu,
  hardDrive: FiHardDrive,
  layers: FiLayers,
  package: FiPackage,
  home: FiHome,
  maximize2: FiMaximize2,
  user: FiUser,
  settings: FiSettings,
};

const SPEC_STYLES = {
  bg: '#EFF6FF',
  icon: '#3B82F6',
} as const;

/**
 * Dynamic multi-line spec layout for OLX-style ad cards.
 * - First visible card measures container width → charsPerLine (context).
 * - All cards in same category use identical layout.
 * - Long text → short format (25,000 → 25k).
 * - Still no space → hide spec.
 * - Recalculates on resize.
 */
const SPECS_BULLET_COLOR = '#6b7280';

function AdSpecs({
  category,
  subcategory,
  specs,
  maxCount = 4,
  className = '',
  compact = false,
  variant = 'icons',
}: AdSpecsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { charsPerLine, reportWidth } = useSpecsLayout();

  const rawItems = useMemo(() => {
    const attrs = specs ?? undefined;
    const raw = getAdCardSpecs(category ?? undefined, subcategory ?? undefined, attrs);
    return raw.slice(0, Math.max(1, maxCount));
  }, [category, subcategory, specs, maxCount]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const w = el.offsetWidth;
      if (w > 0) reportWidth(w);
    };

    measure();
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(measure);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [reportWidth]);

  const displayItems = useMemo(() => {
    return rawItems.map(item => ({
      ...item,
      label: item.label.length > 15 ? item.label.substring(0, 12) + '...' : item.label
    }));
  }, [rawItems]);

  if (displayItems.length === 0) return null;

  // Bullet variant: single row "2023 • Diesel • 58,555 km", even gap between items
  if (variant === 'bullet') {
    return (
      <div
        ref={containerRef}
        className={`flex items-center flex-wrap min-w-0 w-full overflow-hidden gap-x-0 gap-y-0 [&>span]:after:content-['•'] [&>span]:after:ml-2 [&>span]:after:mr-2 [&>span]:after:opacity-60 [&>span:last-child]:after:content-none [&>span:last-child]:after:ml-0 [&>span:last-child]:after:mr-0 ${className}`}
        style={{ fontSize: '12px', color: SPECS_BULLET_COLOR, marginTop: '4px' }}
        role="list"
        aria-label="Ad specifications"
      >
        {displayItems.map((item, i) => (
          <span
            key={i}
            className="whitespace-nowrap truncate max-w-[110px] sm:max-w-[130px]"
            title={rawItems[i]?.label || item.label}
            role="listitem"
          >
            {item.label}
          </span>
        ))}
      </div>
    );
  }

  const iconSize = compact ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const boxSize = compact ? 'w-5 h-5' : 'w-6 h-6';
  const textSize = compact ? 'text-[10px]' : 'text-xs';

  return (
    <div
      ref={containerRef}
      className={`flex items-center gap-x-2 min-w-0 w-full overflow-hidden ${className}`}
      role="list"
      aria-label="Ad specifications"
    >
      {displayItems.map((item, i) => {
        const Icon = SPEC_ICONS[item.icon];
        return (
          <div
            key={i}
            className="flex items-center gap-1.5 min-w-0 flex-shrink-0"
            role="listitem"
          >
            <span
              className={`flex items-center justify-center rounded flex-shrink-0 ${boxSize}`}
              style={{ backgroundColor: SPEC_STYLES.bg }}
              aria-hidden
            >
              <Icon className={iconSize} style={{ color: SPEC_STYLES.icon }} />
            </span>
            <span
              className={`${textSize} text-gray-600 whitespace-nowrap font-medium`}
              title={rawItems[i]?.label || item.label}
            >
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default memo(AdSpecs);
