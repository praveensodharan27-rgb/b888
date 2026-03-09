'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useState, useRef, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import { NAVBAR_FIXED_CHIPS, NAVBAR_FIXED_SLUGS, NAVBAR_EXCLUDED_SLUGS, NAVBAR_CATEGORY_NAV_ITEMS } from '@/lib/navbarCategories';
import { NAVBAR_CONTAINER_CLASS } from '@/lib/layoutConstants';

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
    'Bikes': 'two_wheeler',
    'Motorcycles': 'motorcycle',
    'Mobile Phones': 'smartphone',
    'Laptops': 'laptop_mac',
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
    'TVs': 'tv',
    'Books & Sports': 'menu_book',
    'Baby & Kids': 'child_care',
    'Beauty & Health': 'spa',
    'Free Stuff': 'card_giftcard',
    'Commercial': 'precision_manufacturing',
  };

  if (icon && !icon.startsWith('material-symbols:')) {
    return icon;
  }
  return iconMap[categoryName] || 'category';
};

function CategoryChipsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [showMegaMenu, setShowMegaMenu] = useState(false);
  const [expandedMegaCatIds, setExpandedMegaCatIds] = useState<Set<string>>(new Set());
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const allCategoriesButtonRef = useRef<HTMLButtonElement>(null);

  const toggleMegaCatExpanded = (catId: string) => {
    setExpandedMegaCatIds((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };
  
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

  // Initialize query cache immediately (before query runs) to prevent undefined errors
  const queryKey = ['categories', 'with-subcategories'];
  
  // Set initial data immediately if not present - do this synchronously before query
  const currentCache = queryClient.getQueryData<Category[]>(queryKey);
  if (currentCache === undefined || currentCache === null || !Array.isArray(currentCache)) {
    queryClient.setQueryData(queryKey, []);
  }
  
  // Clear any cached undefined/null values on mount and ensure query is properly initialized
  useEffect(() => {
    const cachedData = queryClient.getQueryData<Category[]>(queryKey);
    
    // If cached value is undefined or null, remove it and set to empty array
    if (cachedData === undefined || cachedData === null) {
      queryClient.setQueryData(queryKey, []);
    } else if (!Array.isArray(cachedData)) {
      // If cached value is not an array, fix it
      queryClient.setQueryData(queryKey, []);
    }
    
    // Also reset query state if it's in error state with undefined data
    const queryState = queryClient.getQueryState(queryKey);
    if (queryState?.data === undefined) {
      queryClient.resetQueries({ queryKey });
      queryClient.setQueryData(queryKey, []);
    }
  }, [queryClient, queryKey]);

  // Fetch categories from API with subcategories
  // Create a wrapper function that absolutely guarantees a return value
  const fetchCategories = async (): Promise<Category[]> => {
    // This function CANNOT return undefined - it always returns an array
    let categories: Category[] = [];
    
    try {
      const response = await api.get('/categories?includeSubcategories=true');
      if (response?.data?.categories && Array.isArray(response.data.categories)) {
        categories = response.data.categories;
      } else if (response?.data && Array.isArray(response.data)) {
        categories = response.data;
      }
      
      if (Array.isArray(categories) && categories.length > 0) {
        return categories;
      }
    } catch (error) {
      // Continue to fallback
    }
    
    // Fallback to regular categories
    try {
      const response = await api.get('/categories');
      if (response?.data?.categories && Array.isArray(response.data.categories)) {
        categories = response.data.categories;
      } else if (response?.data && Array.isArray(response.data)) {
        categories = response.data;
      }
    } catch (error) {
      // Return empty array if both fail
    }
    
    // Final guarantee - always return an array
    return Array.isArray(categories) ? categories : [];
  };

  // Use query with guaranteed return value
  const queryResult = useQuery<Category[]>({
    queryKey: ['categories', 'with-subcategories'],
    queryFn: fetchCategories,
    initialData: [], // Ensure initial data is always an array
    placeholderData: [], // Ensure placeholder data is always an array
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Use cache; refetch when mega menu opens if empty
    retry: 2,
    retryOnMount: false,
    enabled: true, // Always enable the query
    throwOnError: false, // Don't throw errors - handle them in queryFn
  });
  const { refetch } = queryResult;
  
  // Extract data with explicit default value - multiple safety checks
  const queryData: Category[] = (() => {
    const data = queryResult.data;
    if (data === undefined || data === null) {
      return [];
    }
    if (!Array.isArray(data)) {
      return [];
    }
    return data;
  })();
  const isLoading = queryResult.isLoading;

  // Get current category and subcategory from URL
  const currentCategory = searchParams.get('category') || '';
  const currentSubcategory = searchParams.get('subcategory') || '';

  // Build category list - use API data if available and not empty, otherwise use defaults
  // Ensure data is always defined and is an array - provide explicit default
  // Handle all possible undefined/null cases explicitly with useMemo for stability
  const data: Category[] = useMemo(() => {
    // Multiple layers of safety checks
    if (queryData === undefined || queryData === null) {
      return [];
    }
    if (!Array.isArray(queryData)) {
      return [];
    }
    return queryData;
  }, [queryData]);
  
  const allCategories = useMemo(() => {
    return (data && data.length > 0) ? data : [];
  }, [data]);
  
  // Navbar chip type: can be category or category+subcategory (with optional sibling subcategories for dropdown)
  type NavbarChip = {
    name: string;
    slug: string;
    icon?: string;
    isDefault?: boolean;
    subcategorySlug?: string;
    subcategories?: Subcategory[];
  };

  const fixedChips: NavbarChip[] = NAVBAR_FIXED_CHIPS as NavbarChip[];
  const restCategories = allCategories
    .filter(cat => cat.slug && !NAVBAR_FIXED_SLUGS.has(cat.slug) && !NAVBAR_EXCLUDED_SLUGS.has(cat.slug))
    .slice(0, 3)
    .map(cat => ({ name: cat.name, slug: cat.slug, icon: cat.icon } as NavbarChip));

  // Category nav: All Categories + NAVBAR_CATEGORY_NAV_ITEMS (11 total)
  const categoryList: NavbarChip[] = [
    { name: 'ALL CATEGORIES', slug: '', icon: 'apps', isDefault: true },
    ...(NAVBAR_CATEGORY_NAV_ITEMS as NavbarChip[]),
  ];

  const handleCategoryClick = (slug: string, isAllCategoriesButton: boolean = false, subcategorySlug?: string) => {
    if (isAllCategoriesButton) {
      // Toggle mega menu on click for "ALL CATEGORIES" button - NO NAVIGATION
      setShowMegaMenu(!showMegaMenu);
      return;
    }
    
    setShowMegaMenu(false);
    setSubDropdownOpen(null);
    
    if (slug === 'services') {
      router.push('/services');
      return;
    }
    
    if (slug) {
      if (subcategorySlug) {
        router.push(`/ads?category=${slug}&subcategory=${subcategorySlug}`);
      } else {
        router.push(`/ads?category=${slug}`);
      }
    } else {
      router.push('/ads');
    }
  };

  // Subcategory dropdown (Mobile Phones / Cars) - which chip dropdown is open
  const [subDropdownOpen, setSubDropdownOpen] = useState<string | null>(null);
  const subDropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subDropdownRef = useRef<HTMLDivElement | null>(null);

  // Refetch categories when All Categories mega menu opens (ensures fresh data)
  useEffect(() => {
    if (showMegaMenu && allCategories.length === 0 && !isLoading) {
      refetch();
    }
  }, [showMegaMenu, allCategories.length, isLoading, refetch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (subDropdownRef.current && !subDropdownRef.current.contains(e.target as Node)) {
        setSubDropdownOpen(null);
      }
    };
    if (subDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [subDropdownOpen]);

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
      <div className={`${NAVBAR_CONTAINER_CLASS} w-full`}>
        <div className="overflow-x-auto scrollbar-hide -mx-0" style={{ overflowY: 'visible' }}>
          <div className="category-nav flex items-center gap-2.5 py-1.5 min-w-max whitespace-nowrap" style={{ position: 'relative' }}>
            {isLoading ? (
              <>
                {[...Array(11)].map((_, i) => (
                  <div key={i} className="category-btn-skeleton h-9 w-28 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
                ))}
              </>
            ) : (
              categoryList.map((category) => {
                const isActive = category.isDefault
                  ? !currentCategory // "ALL CATEGORIES" is active when no category is selected
                  : category.subcategorySlug
                    ? currentCategory === category.slug && currentSubcategory === category.subcategorySlug
                    : currentCategory === category.slug;

                const icon = getCategoryIcon(category.name, category.icon);
                const hasSubDropdown = category.subcategorySlug && category.subcategories && category.subcategories.length > 0;

                if (category.isDefault) {
                  // "ALL CATEGORIES" button – full-width feel, strong blue, rounded, stands out
                  return (
                    <div 
                      key="all" 
                      className="relative flex-shrink-0"
                      style={{ zIndex: 1000 }}
                    >
                      <button
                        ref={allCategoriesButtonRef}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCategoryClick('', true);
                        }}
                        className={`all-categories-btn group nav-category flex items-center gap-1.5 py-1.5 px-3 rounded-full cursor-pointer whitespace-nowrap transition-all duration-200 border-0 ${isActive || showMegaMenu ? 'category-btn-active' : ''}`}
                        style={{ gap: '6px' }}
                      >
                        <span className="category-nav-icon">
                          <span className="material-symbols-outlined text-white" style={{ fontSize: '18px', width: '18px', height: '18px' }} aria-hidden>category</span>
                        </span>
                        <span className="text-sm font-semibold flex-shrink-0 text-white">{category.name}</span>
                        <span className={`material-symbols-outlined flex-shrink-0 transition-transform duration-200 text-white ${showMegaMenu ? 'rotate-180' : ''}`} style={{ fontSize: '16px', width: '16px', height: '16px' }}>expand_more</span>
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
                            onClick={(e) => e.stopPropagation()}
                            className="mega-menu-panel fixed top-[80px] left-0 right-0 w-full h-[calc(100vh-80px)] md:h-auto md:max-h-[560px] overflow-y-auto z-[99999] bg-white"
                            style={{ zIndex: 99999 }}
                          >
                            {/* Mobile Header with Close Button */}
                            <div className="mega-menu-header-wrap md:hidden flex items-center justify-between px-4 py-3.5 sticky top-0 z-10">
                              <h3 className="mega-menu-header-title">All Categories</h3>
                              <button
                                onClick={() => setShowMegaMenu(false)}
                                className="mega-menu-close-btn p-2.5 rounded-full text-gray-500"
                                aria-label="Close menu"
                              >
                                <span className="material-symbols-outlined text-xl">close</span>
                              </button>
                            </div>

                            <div className="mega-menu-inner min-w-[320px] w-full mx-auto">
                              {/* Desktop Header */}
                              <div className="mega-menu-header-wrap hidden md:flex items-center justify-between mb-6 pb-4">
                                <h3 className="mega-menu-header-title">All Categories</h3>
                                <button
                                  onClick={() => setShowMegaMenu(false)}
                                  className="mega-menu-close-btn p-2 text-gray-500 focus:outline-none"
                                  aria-label="Close menu"
                                >
                                  <span className="material-symbols-outlined text-xl">close</span>
                                </button>
                              </div>
                              
                              {/* Multi-Column Layout – equal spacing */}
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-10 gap-y-8 md:gap-x-12">
                                {isLoading ? (
                                  <div className="col-span-full flex items-center justify-center py-14">
                                    <div className="flex flex-col items-center gap-4">
                                      <span className="material-symbols-outlined animate-spin text-3xl text-blue-600" aria-hidden>progress_activity</span>
                                      <p className="mega-menu-loading-text">Loading categories...</p>
                                    </div>
                                  </div>
                                ) : allCategories.length === 0 ? (
                                  <div className="col-span-full flex flex-col items-center justify-center py-14 gap-4">
                                    <p className="mega-menu-empty-text text-center">No categories found. Please check your connection.</p>
                                    <button
                                      onClick={() => refetch()}
                                      className="mega-menu-retry-btn bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                      Retry
                                    </button>
                                  </div>
                                ) : allCategories.map((cat) => {
                                  const hasSubcategories = cat.subcategories && cat.subcategories.length > 0;
                                  const catIcon = getCategoryIcon(cat.name, cat.icon);
                                  return (
                                    <div
                                      key={cat.id}
                                      className="mega-menu-column flex flex-col"
                                    >
                                      {/* Category column header with icon */}
                                      <button
                                        onClick={() => handleCategoryClick(cat.slug)}
                                        className="mega-menu-cat-btn text-left w-full focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:ring-offset-2"
                                      >
                                        <span className="mega-menu-cat-icon" aria-hidden>
                                          <span className="material-symbols-outlined" style={{ fontSize: '18px', width: '18px', height: '18px' }}>{catIcon}</span>
                                        </span>
                                        <span className="min-w-0 flex-1">
                                          <h4 className="mega-menu-cat-title">{cat.name}</h4>
                                          {cat._count?.ads !== undefined && (
                                            <div className="mega-menu-item-count">{cat._count.ads} items</div>
                                          )}
                                        </span>
                                      </button>

                                      {/* Subcategories list – first 4 visible, rest behind View More */}
                                      {hasSubcategories && (() => {
                                        const subcats = cat.subcategories!;
                                        const limit = 4;
                                        const visibleCount = Math.min(limit, subcats.length);
                                        const initialSubcats = subcats.slice(0, visibleCount);
                                        const moreSubcats = subcats.slice(visibleCount);
                                        const hasMore = moreSubcats.length > 0;
                                        const isExpanded = expandedMegaCatIds.has(cat.id);
                                        return (
                                          <>
                                            <ul className="space-y-0.5 mega-menu-subcat-list">
                                              {initialSubcats.map((subcat) => (
                                                <li key={subcat.id}>
                                                  <button
                                                    onClick={() => {
                                                      setShowMegaMenu(false);
                                                      router.push(`/ads?category=${cat.slug}&subcategory=${subcat.slug}`);
                                                    }}
                                                    className="mega-menu-subcat-item w-full text-left"
                                                  >
                                                    <span className="truncate block">{subcat.name}</span>
                                                  </button>
                                                </li>
                                              ))}
                                            </ul>
                                            {/* Expandable: remaining subcategories with smooth animation */}
                                            {hasMore && (
                                              <div
                                                className="mega-menu-subcat-more overflow-hidden transition-[max-height] duration-300 ease-in-out"
                                                style={{ maxHeight: isExpanded ? `${moreSubcats.length * 48}px` : 0 }}
                                                aria-hidden={!isExpanded}
                                              >
                                                <ul className="space-y-0.5 mega-menu-subcat-list pt-0.5">
                                                  {moreSubcats.map((subcat) => (
                                                    <li key={subcat.id}>
                                                      <button
                                                        onClick={() => {
                                                          setShowMegaMenu(false);
                                                          router.push(`/ads?category=${cat.slug}&subcategory=${subcat.slug}`);
                                                        }}
                                                        className="mega-menu-subcat-item w-full text-left"
                                                      >
                                                        <span className="truncate block">{subcat.name}</span>
                                                      </button>
                                                    </li>
                                                  ))}
                                                </ul>
                                              </div>
                                            )}
                                            {/* View More / View Less */}
                                            {hasMore && (
                                              <button
                                                type="button"
                                                onClick={() => toggleMegaCatExpanded(cat.id)}
                                                className="mega-menu-view-more inline-block text-left"
                                              >
                                                {isExpanded ? 'View Less' : 'View More'}
                                              </button>
                                            )}
                                          </>
                                        );
                                      })()}
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

                // Chips with subcategory dropdown (Mobile Phones, Cars)
                if (hasSubDropdown) {
                  const isDropdownOpen = subDropdownOpen === category.slug;
                  return (
                    <div
                      key={`${category.slug}-${category.subcategorySlug}`}
                      className="relative"
                      ref={isDropdownOpen ? subDropdownRef : undefined}
                      onMouseEnter={() => {
                        if (subDropdownTimeoutRef.current) clearTimeout(subDropdownTimeoutRef.current);
                        subDropdownTimeoutRef.current = setTimeout(() => setSubDropdownOpen(category.slug), 150);
                      }}
                      onMouseLeave={() => {
                        if (subDropdownTimeoutRef.current) clearTimeout(subDropdownTimeoutRef.current);
                        subDropdownTimeoutRef.current = setTimeout(() => setSubDropdownOpen(null), 120);
                      }}
                    >
                      <button
                        onClick={() => handleCategoryClick(category.slug, false, category.subcategorySlug)}
                        className={`category-btn group nav-category flex items-center gap-1.5 py-1.5 px-3 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer flex-shrink-0 ${isActive ? 'category-btn-active' : ''}`}
                        style={{ gap: '6px' }}
                      >
                        <span className="category-nav-icon">
                          <span className={`material-symbols-outlined ${isActive ? 'text-white' : 'text-gray-600'}`} style={{ fontSize: '18px', width: '18px', height: '18px' }}>{icon}</span>
                        </span>
                        <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-700'}`}>{category.name}</span>
                        <span className={`material-symbols-outlined flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`} style={{ fontSize: '16px', width: '16px', height: '16px' }}>expand_more</span>
                      </button>
                      {isDropdownOpen && (
                        <div
                          className="absolute top-full left-0 mt-1 py-1.5 min-w-[180px] bg-white border border-gray-200 rounded-xl shadow-lg z-[1000]"
                          onMouseEnter={() => { if (subDropdownTimeoutRef.current) clearTimeout(subDropdownTimeoutRef.current); setSubDropdownOpen(category.slug); }}
                          onMouseLeave={() => { subDropdownTimeoutRef.current = setTimeout(() => setSubDropdownOpen(null), 120); }}
                        >
                          {category.subcategories!.map((sub) => (
                            <button
                              key={sub.slug}
                              onClick={() => {
                                setShowMegaMenu(false);
                                setSubDropdownOpen(null);
                                router.push(`/ads?category=${category.slug}&subcategory=${sub.slug}`);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 ${currentCategory === category.slug && currentSubcategory === sub.slug ? 'text-blue-600 font-semibold bg-blue-50' : 'text-gray-700'}`}
                            >
                              {sub.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                // Regular category buttons – simple text by default; filled pill when active
                return (
                  <button
                    key={category.slug + (category.subcategorySlug || '')}
                    onClick={() => handleCategoryClick(category.slug, false, category.subcategorySlug)}
                    className={`category-btn group nav-category flex items-center gap-1.5 py-1.5 px-3 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer flex-shrink-0 ${isActive ? 'category-btn-active' : ''}`}
                    style={{ gap: '6px' }}
                  >
                    <span className="category-nav-icon">
                      <span className={`material-symbols-outlined ${isActive ? 'text-white' : 'text-gray-600'}`} style={{ fontSize: '18px', width: '18px', height: '18px' }}>{icon}</span>
                    </span>
                    <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-700'}`}>{category.name}</span>
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
        <div className={NAVBAR_CONTAINER_CLASS}>
          <div className="category-nav flex items-center gap-2.5 py-1.5 overflow-x-auto">
            {[...Array(11)].map((_, i) => (
              <div key={i} className="h-9 w-28 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
            ))}
          </div>
        </div>
      </div>
    }>
      <CategoryChipsContent />
    </Suspense>
  );
}

