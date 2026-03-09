'use client';

import {
  FiPackage,
  FiSmartphone,
  FiCpu,
  FiHardDrive,
  FiCalendar,
  FiDroplet,
  FiActivity,
  FiSettings,
  FiLayers,
  FiMaximize2,
  FiHome,
  FiUser,
} from 'react-icons/fi';

type IconKey =
  | 'package'
  | 'smartphone'
  | 'cpu'
  | 'hardDrive'
  | 'calendar'
  | 'droplet'
  | 'activity'
  | 'settings'
  | 'layers'
  | 'maximize2'
  | 'home'
  | 'user';

const ICONS: Record<IconKey, typeof FiPackage> = {
  package: FiPackage,
  smartphone: FiSmartphone,
  cpu: FiCpu,
  hardDrive: FiHardDrive,
  calendar: FiCalendar,
  droplet: FiDroplet,
  activity: FiActivity,
  settings: FiSettings,
  layers: FiLayers,
  maximize2: FiMaximize2,
  home: FiHome,
  user: FiUser,
};

interface SpecItem {
  label: string;
  value: string | number;
  icon?: IconKey;
}

interface SpecificationsGridProps {
  items: SpecItem[];
}

function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SpecificationsGrid({ items }: SpecificationsGridProps) {
  if (!items?.length) return null;

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <FiLayers className="w-5 h-5 text-primary-600" />
        Features & Specifications
      </h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
        {items.map((item, i) => {
          const Icon = item.icon && item.icon in ICONS ? ICONS[item.icon as IconKey] : FiPackage;
          return (
            <div
              key={i}
              className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-gray-100 last:border-0 gap-1 sm:gap-4"
            >
              <dt className="flex items-center gap-2 text-sm text-gray-500 min-w-[120px]">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-50">
                  <Icon className="w-4 h-4 text-primary-600" />
                </span>
                {typeof item.label === 'string'
                  ? formatLabel(item.label)
                  : item.label}
              </dt>
              <dd className="font-semibold text-gray-900 sm:text-right">
                {String(item.value)}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
