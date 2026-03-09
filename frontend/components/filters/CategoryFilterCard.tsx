'use client';

import FilterCard from './FilterCard';
import { 
  FiHome, 
  FiBriefcase, 
  FiGrid, 
  FiLayers,
  FiSmartphone,
  FiTruck,
  FiMonitor,
  FiMusic,
  FiCamera,
  FiWatch,
  FiBook,
  FiDroplet,
  FiHeart
} from 'react-icons/fi';

export interface CategoryItem {
  id?: string;
  name: string;
  slug: string;
  count?: number;
  icon?: string;
}

const DEFAULT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  // Furniture & Home
  'living-room': FiHome,
  'bedroom': FiGrid,
  'furniture': FiLayers,
  'home': FiHome,
  'kitchen': FiDroplet,
  // Office & Business
  'office': FiBriefcase,
  'office-space': FiBriefcase,
  'business': FiBriefcase,
  // Electronics
  'mobile': FiSmartphone,
  'smartphone': FiSmartphone,
  'electronics': FiMonitor,
  'computer': FiMonitor,
  'laptop': FiMonitor,
  // Vehicles
  'car': FiTruck,
  'vehicle': FiTruck,
  'bike': FiTruck,
  'motorcycle': FiTruck,
  // Other
  'music': FiMusic,
  'camera': FiCamera,
  'watch': FiWatch,
  'books': FiBook,
  'gaming': FiGrid,
  'fashion': FiGrid,
  'clothing': FiGrid,
  'health': FiHeart,
  default: FiGrid,
};

interface CategoryFilterCardProps {
  title?: string;
  items?: CategoryItem[];
  selectedSlug?: string;
  onSelect?: (slug: string) => void;
  /** Used by FilterPanel */
  selectedCategory?: string;
  selectedSubcategory?: string;
  onCategoryChange?: (categorySlug: string | null) => void;
  onSubcategoryChange?: (subcategorySlug: string | null) => void;
}

export default function CategoryFilterCard({
  title = 'CATEGORIES',
  items = [],
  selectedSlug: selectedSlugProp,
  onSelect,
  selectedCategory,
  onCategoryChange,
}: CategoryFilterCardProps) {
  const selectedSlug = selectedSlugProp ?? selectedCategory;
  const handleSelect = onSelect ?? (onCategoryChange ? (slug: string) => onCategoryChange(slug) : undefined);
  const displayItems = items.length > 0 ? items : [
    { name: 'Living Room', slug: 'living-room', count: 428 },
    { name: 'Office Space', slug: 'office-space', count: 312 },
    { name: 'Bedroom', slug: 'bedroom', count: 184 },
  ];

  return (
    <FilterCard title={title} icon={<FiGrid className="w-4 h-4" />}>
      <ul className="space-y-1">
        {displayItems.map((item) => {
          const IconComponent = DEFAULT_ICONS[item.slug?.toLowerCase().replace(/\s+/g, '-')] ?? DEFAULT_ICONS.default;
          const count = item.count ?? 0;
          const isSelected = selectedSlug === item.slug;

          return (
            <li key={item.slug}>
              <button
                type="button"
                onClick={() => handleSelect?.(item.slug)}
                className={`w-full flex items-center gap-3 py-2.5 px-0 text-left rounded-lg transition-colors ${
                  isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                {/* Icon Container - Blue theme */}
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <IconComponent className="w-4 h-4" />
                </span>
                {/* Category Name */}
                <span className="flex-1 text-sm font-medium text-gray-900 truncate">{item.name}</span>
                {/* Count Badge - Blue theme */}
                {count > 0 && (
                  <span className="flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-600">
                    {count}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </FilterCard>
  );
}
