'use client';

import { FiTag, FiLayers, FiHome, FiDroplet, FiMaximize2, FiPackage } from 'react-icons/fi';
import type { IconType } from 'react-icons';

interface KeyHighlightItem {
  label: string;
  icon?: 'brand' | 'model' | 'bedroom' | 'bathroom' | 'area' | 'package';
}

const ICON_MAP: Record<string, IconType> = {
  brand: FiTag,
  model: FiLayers,
  bedroom: FiHome,
  bathrooms: FiDroplet,
  bathroom: FiDroplet,
  area: FiMaximize2,
  package: FiPackage,
};

function getIcon(item: string | KeyHighlightItem): IconType | null {
  const label = typeof item === 'string' ? item : item.label;
  const key = typeof item === 'string' ? null : item.icon;
  if (key && ICON_MAP[key]) return ICON_MAP[key];
  const lower = label.toLowerCase();
  if (lower.includes('brand')) return FiTag;
  if (lower.includes('model')) return FiLayers;
  if (lower.includes('bedroom')) return FiHome;
  if (lower.includes('bathroom')) return FiDroplet;
  if (lower.includes('area') || lower.includes('sqft') || lower.includes('sq ft')) return FiMaximize2;
  if (lower.includes('ram') || lower.includes('storage')) return FiPackage;
  return null;
}

interface KeyHighlightsProps {
  items: (string | KeyHighlightItem)[];
}

export function KeyHighlights({ items }: KeyHighlightsProps) {
  if (!items?.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item, i) => {
        const label = typeof item === 'string' ? item : item.label;
        const Icon = getIcon(item);
        return (
          <span
            key={i}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium"
          >
            {Icon && <Icon className="w-4 h-4 text-gray-500 shrink-0" />}
            {label}
          </span>
        );
      })}
    </div>
  );
}
