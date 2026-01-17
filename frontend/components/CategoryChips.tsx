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

  // Build category list - use API data if available, otherwise use defaults
  const allCategories = (data as Category[]) || dummyCategories;
  
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
    <div className="w-full bg-white border-b border-gray-200 relative" style={{ zIndex: 100, position: 'relative' }}>
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="overflow-x-auto scrollbar-hide" style={{ overflowY: 'visible' }}>
          <div className="flex items-center gap-2 py-3 min-w-max" style={{ position: 'relative' }}>
            {isLoading ? (
              // Loading skeleton
              <>
                {[...Array(9)].map((_, i) => (
                  <div
                    key={i}
                    className="h-9 w-32 bg-gray-200 rounded-full animate-pulse"
                  />
                ))}
              </>
            ) : (
              categoryList.map((category) => {
                const isActive = category.isDefault
                  ? !currentCategory // "ALL CATEGORIES" is active when no category is selected
                  : currentCategory === category.slug;

                const icon = getCategoryIcon(category.name, category.icon);

                if (category.isDefault) {
                  // "ALL CATEGORIES" button with hover mega menu
                  return (
                    <div 
                      key="all" 
                      className="relative"
                      style={{ zIndex: 1000 }}
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                    >
                      <button
                        ref={allCategoriesButtonRef}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCategoryClick('', true);
                        }}
                        className={`
                          px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap
                          transition-all duration-200 flex items-center gap-2
                          ${
                            isActive || showMegaMenu
                              ? 'bg-blue-600 text-white'
                              : 'bg-transparent text-gray-600 hover:text-gray-900'
                          }
                        `}
                      >
                        {category.name}
                        <span className={`material-symbols-outlined text-sm transition-transform ${showMegaMenu ? 'rotate-180' : ''}`}>
                          expand_more
                        </span>
                      </button>

                      {/* Mega Menu - 100vw Full Width Below Navbar */}
                      {showMegaMenu && (
                        <>
                          {/* Backdrop overlay - Mobile only */}
                          <div
                            className="fixed inset-0 bg-black/30 z-[99998] md:hidden"
                            onClick={() => setShowMegaMenu(false)}
                            style={{ zIndex: 99998 }}
                          />
                          
                          {/* Mega Menu - Fixed below navbar, 100vw full width */}
                          <div
                            ref={megaMenuRef}
                            onMouseEnter={handleMenuMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            onClick={(e) => e.stopPropagation()}
                            className={`
                              fixed
                              top-[80px] left-0 right-0
                              bg-white border-t border-gray-200
                              shadow-2xl
                              w-full
                              h-[calc(100vh-80px)] md:h-auto md:max-h-[600px]
                              overflow-y-auto
                              z-[99999]
                            `}
                            style={{
                              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                              zIndex: 99999,
                            }}
                          >
                            {/* Mobile Header with Close Button */}
                            <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
                              <h3 className="text-xl font-bold text-gray-900">All Categories</h3>
                              <button
                                onClick={() => setShowMegaMenu(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                aria-label="Close menu"
                              >
                                <span className="material-symbols-outlined text-2xl text-gray-600">
                                  close
                                </span>
                              </button>
                            </div>

                            <div className="p-4 md:p-6 max-w-7xl mx-auto">
                              {/* Desktop Header - Flipkart Style */}
                              <div className="hidden md:flex items-center justify-between mb-5 pb-4 border-b border-gray-200">
                                <h3 className="text-xl font-semibold text-gray-900">All Categories</h3>
                                <button
                                  onClick={() => setShowMegaMenu(false)}
                                  className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                                  aria-label="Close menu"
                                >
                                  <span className="material-symbols-outlined text-lg text-gray-600">
                                    close
                                  </span>
                                </button>
                              </div>
                              
                              {/* Flipkart-Style Multi-Column Layout */}
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 md:gap-8">
                                {allCategories.map((cat) => {
                                  const catIcon = getCategoryIcon(cat.name, cat.icon);
                                  const hasSubcategories = cat.subcategories && cat.subcategories.length > 0;
                                  
                                  return (
                                    <div
                                      key={cat.id}
                                      className="flex flex-col border-r border-gray-100 last:border-r-0 pr-4 last:pr-0"
                                    >
                                      {/* Category Column Header - Flipkart Style */}
                                      <button
                                        onClick={() => handleCategoryClick(cat.slug)}
                                        className="mb-3 text-left group"
                                      >
                                        <h4 className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
                                          {cat.name}
                                        </h4>
                                        {cat._count?.ads !== undefined && (
                                          <div className="text-xs text-gray-500">
                                            {cat._count.ads} items
                                          </div>
                                        )}
                                      </button>

                                      {/* Subcategories List - Flipkart Style */}
                                      {hasSubcategories && (
                                        <ul className="space-y-0.5">
                                          {cat.subcategories!.map((subcat) => (
                                            <li key={subcat.id}>
                                              <button
                                                onClick={() => {
                                                  router.push(`/ads?category=${cat.slug}&subcategory=${subcat.slug}`);
                                                  setShowMegaMenu(false);
                                                }}
                                                className={`
                                                  w-full text-left
                                                  text-sm text-gray-600
                                                  hover:text-blue-600
                                                  transition-colors
                                                  py-1
                                                  group/subcat
                                                `}
                                              >
                                                <span className="truncate">{subcat.name}</span>
                                              </button>
                                            </li>
                                          ))}
                                        </ul>
                                      )}

                                      {/* View All Link - Flipkart Style */}
                                      {hasSubcategories && (
                                        <button
                                          onClick={() => {
                                            router.push(`/ads?category=${cat.slug}`);
                                            setShowMegaMenu(false);
                                          }}
                                          className={`
                                            mt-2 text-left
                                            text-xs font-medium text-blue-600
                                            hover:text-blue-700
                                            transition-colors
                                          `}
                                        >
                                          View All
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                }

                // Regular category buttons with icons - Match the design style
                return (
                  <button
                    key={category.slug}
                    onClick={() => handleCategoryClick(category.slug)}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap
                      transition-all duration-200 flex items-center gap-2
                      ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-transparent text-gray-600 hover:text-gray-900'
                      }
                    `}
                  >
                    {category.name}
                  </button>
                );
              })
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

