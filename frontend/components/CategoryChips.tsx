'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useState, useRef, useEffect } from 'react';
import api from '@/lib/api';
import { dummyCategories } from '@/lib/dummyData';

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  _count?: { ads: number };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  subcategories?: Subcategory[];
  _count?: { ads: number };
}

// Map category names to Material Symbols icons
const getCategoryIcon = (categoryName: string, icon?: string): string => {
  if (icon && icon.startsWith('material-symbols:')) {
    return icon.replace('material-symbols:', '');
  }
  
  const iconMap: Record<string, string> = {
    'Cars': 'directions_car',
    'Motorcycles': 'motorcycle',
    'Mobile Phones': 'smartphone',
    'For Sale: Houses & Apartments': 'home',
    'For Rent: Houses & Apartments': 'apartment',
    'Beds & Wardrobes': 'bed',
    'TVs, Video – Audio': 'tv',
    'Vehicles': 'directions_car',
    'Properties': 'home',
    'Mobiles': 'smartphone',
    'Jobs': 'work',
    'Fashion': 'checkroom',
    'Furniture': 'chair',
    'Electronics': 'devices',
    'Real Estate': 'home',
    'Sports': 'sports_soccer',
    'Books': 'menu_book',
    'Pets': 'pets',
    'Services': 'build',
  };
  
  return iconMap[categoryName] || 'category';
};

function CategoryChipsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showMegaMenu, setShowMegaMenu] = useState(false);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const allCategoriesButtonRef = useRef<HTMLButtonElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        megaMenuRef.current &&
        !megaMenuRef.current.contains(event.target as Node) &&
        allCategoriesButtonRef.current &&
        !allCategoriesButtonRef.current.contains(event.target as Node)
      ) {
        setShowMegaMenu(false);
      }
    };

    if (showMegaMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMegaMenu]);

  // Fetch categories from API with subcategories
  const { data, isLoading } = useQuery({
    queryKey: ['categories', 'with-subcategories'],
    queryFn: async () => {
      try {
        const response = await api.get('/categories?includeSubcategories=true');
        return response.data.categories;
      } catch (error) {
        // Fallback to regular categories if subcategories endpoint fails
        try {
          const response = await api.get('/categories');
          return response.data.categories;
        } catch {
          return null;
        }
      }
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    refetchOnWindowFocus: false,
  });

  // Get current category from URL
  const currentCategory = searchParams.get('category') || '';
  const currentSubcategory = searchParams.get('subcategory') || '';

  // Build category list - use API data if available, otherwise use defaults
  const allCategories = (data as Category[]) || dummyCategories;
  const activeCategory = allCategories.find((cat) => cat.slug === currentCategory);
  const activeSubcategories = activeCategory?.subcategories || [];

  // Popular searches: show active category subcategories
  const popularSearches: string[] = activeSubcategories.map((s) => s.name).slice(0, 12);

  // Create category list with "ALL CATEGORIES" first - Show 8 regular categories (9 total)
  const categoryList: Array<{ name: string; slug: string; icon?: string; isDefault?: boolean }> = [
    { name: 'ALL CATEGORIES', slug: '', icon: 'apps', isDefault: true },
    ...(allCategories.length > 0
      ? allCategories
          .filter(cat => cat.slug) // Only include categories with slugs
          .slice(0, 8) // Limit to 8 regular categories (9 total including "ALL CATEGORIES")
          .map(cat => ({
            name: cat.name,
            slug: cat.slug,
            icon: cat.icon,
          }))
      : []), // Use API categories only
  ];

  // Handle hover to show mega menu
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setShowMegaMenu(true);
  };

  // Handle mouse leave with delay to keep menu open when moving to menu
  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setShowMegaMenu(false);
    }, 200); // Small delay to allow moving to menu
  };

  // Keep menu open when hovering over menu
  const handleMenuMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setShowMegaMenu(true);
  };

  const handleMenuMouseLeave = () => {
    setShowMegaMenu(false);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleCategoryClick = (slug: string, isAllCategoriesButton: boolean = false) => {
    if (isAllCategoriesButton) {
      // Toggle mega menu on click for "ALL CATEGORIES" button - NO NAVIGATION
      setShowMegaMenu(!showMegaMenu);
      return;
    }
    
    // For other categories, navigate and close menu
    if (slug) {
      // Navigate to /ads with category filter
      router.push(`/ads?category=${slug}`);
    } else {
      // Navigate to /ads without category filter (ALL CATEGORIES)
      router.push('/ads');
    }
    setShowMegaMenu(false);
  };

  return (
    <div className="w-full bg-white relative" style={{ zIndex: 100, position: 'relative' }}>
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="overflow-x-auto scrollbar-hide" style={{ overflowY: 'visible' }}>
          {/* Categories hidden (request: only show popular searches) */}
          <div className="hidden">
            {isLoading ? (
              <>
                {[...Array(9)].map((_, i) => (
                  <div
                    key={i}
                    className="h-9 w-32 bg-gray-200 rounded-full animate-pulse"
                  />
                ))}
              </>
            ) : (
              categoryList.map((category) => (
                <button key={category.slug} className="px-3 py-2">
                  {category.name}
                </button>
              ))
            )}
          </div>

          {/* Second row content: Popular Searches only */}
          <div className="pb-3">
            {popularSearches.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-900">Popular Searches:</span>
                <div className="flex items-center gap-0 flex-wrap">
                  {popularSearches.map((term, index, array) => (
                    <span key={`${term}-${index}`} className="flex items-center">
                      <button
                        type="button"
                        onClick={() => router.push(`/ads?search=${encodeURIComponent(term)}`)}
                        className="text-xs text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        {term}
                      </button>
                      {index < array.length - 1 && <span className="mx-2 text-gray-400 text-xs">-</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CategoryChips() {
  return (
    <Suspense fallback={
      <div className="w-full bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 py-3">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className="h-9 w-32 bg-gray-200 rounded-full animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    }>
      <CategoryChipsContent />
    </Suspense>
  );
}

