'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { FiGrid, FiChevronDown } from 'react-icons/fi';
import { useState, useRef, useEffect, memo } from 'react';
import { dummyCategories } from '@/lib/dummyData';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  _count?: { ads: number };
  subcategories?: Subcategory[];
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  _count?: { ads: number };
}

function CategoryNav() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showMegaMenu, setShowMegaMenu] = useState(false);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeCategorySlug, setActiveCategorySlug] = useState<string>('');

  // Get current category from URL
  const currentCategory = pathname.startsWith('/category/') 
    ? pathname.split('/')[2] 
    : searchParams.get('category');

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const response = await api.get('/categories');
        return response.data.categories;
      } catch (error) {
        return null;
      }
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Get all categories for mega menu
  const allCategories = (data as Category[]) || dummyCategories;

  // Get top 12 most popular categories based on ad count for quick links
  const topCategories = [...allCategories]
    .sort((a, b) => {
      const countA = a._count?.ads || 0;
      const countB = b._count?.ads || 0;
      return countB - countA; // Sort descending by ad count
    })
    .slice(0, 12);

  // Track active category based on URL only (no default selection)
  useEffect(() => {
    if (currentCategory) {
      setActiveCategorySlug(currentCategory);
    } else {
      // Clear active category if no category in URL (no default)
      setActiveCategorySlug('');
    }
  }, [currentCategory]);

  // Fetch subcategories / popular searches for the active category
  const { data: subcategoriesData, isLoading: isSubLoading } = useQuery({
    queryKey: ['subcategories', activeCategorySlug],
    queryFn: async () => {
      if (!activeCategorySlug) return [];
      const response = await api.get(`/categories/${activeCategorySlug}/subcategories`);
      return response.data?.subcategories || [];
    },
    enabled: Boolean(activeCategorySlug),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const fallbackSubcategories =
    allCategories.find((cat) => cat.slug === activeCategorySlug)?.subcategories || [];

  const subcategories = (subcategoriesData as Subcategory[] | undefined) ?? fallbackSubcategories;

  // Auto-scroll to active category
  useEffect(() => {
    const targetSlug = activeCategorySlug || currentCategory;
    if (targetSlug && scrollContainerRef.current) {
      const activeTab = scrollContainerRef.current.querySelector(`[data-slug="${targetSlug}"]`);
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeCategorySlug, currentCategory]);

  // Close mega menu when clicking outside
  useEffect(() => {
    if (!showMegaMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (megaMenuRef.current && !megaMenuRef.current.contains(target)) {
        setShowMegaMenu(false);
      }
    };

    // Use setTimeout to avoid immediate closure on button click
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showMegaMenu]);

  // Handle category navigation - filter on home page
  const handleCategoryClick = (categorySlug: string) => {
    setActiveCategorySlug(categorySlug);
    // Navigate to home page with category filter (stays on home)
    router.push(`/?category=${categorySlug}`, { scroll: false });
    setShowMegaMenu(false);
  };

  if (isLoading) {
    return (
      <div 
        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 sticky top-20 z-40 shadow-sm"
      >
        <div className="w-full px-4">
          <div className="flex items-center h-14">
            <div className="flex gap-4 animate-pulse">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-8 w-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      
      <div 
        className="bg-gray-100 border-b border-gray-200 sticky z-40 -mt-px"
        style={{ top: '64px' }}
      >
        <div className="w-full px-4">
          <div className="flex items-center gap-2 py-2">
            {/* Quick Category Links - Top 12 Most Popular with Active State - Left aligned */}
            <div 
              ref={scrollContainerRef}
              className="flex items-center gap-1 overflow-x-auto hide-scrollbar flex-1 scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {topCategories.map((category) => {
              const isActive = activeCategorySlug === category.slug;
              
              return (
                <Link
                  key={category.id}
                  href={`/?category=${category.slug}`}
                  data-slug={category.slug}
                  onClick={(e) => {
                    // Allow Ctrl+Click / Cmd+Click / Middle-click to open in new tab
                    if (e.ctrlKey || e.metaKey || e.button === 1) {
                      return; // Let browser handle it
                    }
                    e.preventDefault();
                    // For regular clicks, update active state and filter on home
                    handleCategoryClick(category.slug);
                  }}
                  onAuxClick={(e) => {
                    // Handle middle-click (mouse wheel click)
                    if (e.button === 1) {
                      window.open(`/?category=${category.slug}`, '_blank');
                    }
                  }}
                  className={`
                    flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium
                    transition-colors duration-200 whitespace-nowrap
                    ${isActive 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-700'
                    }
                  `}
                >
                  {category.icon && <span className="mr-1.5">{category.icon}</span>}
                  {category.name}
                  {isActive && category._count?.ads ? (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-white/20 rounded-full">
                      {category._count.ads}
                    </span>
                  ) : null}
                </Link>
              );
              })}
            </div>

            {/* All Categories Mega Menu Button - Fixed on Right side */}
            <div className="relative flex-shrink-0 ml-auto" ref={megaMenuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMegaMenu(!showMegaMenu);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 transition-colors"
            >
              <FiGrid className="w-4 h-4" />
              <span>All</span>
              <FiChevronDown className={`w-4 h-4 transition-transform ${showMegaMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Sell Box Style Mega Menu */}
            {showMegaMenu && (
              <div 
                className="fixed left-0 right-0 bg-white dark:bg-slate-800 shadow-2xl border-t border-gray-200 dark:border-slate-700"
                style={{ top: '120px', zIndex: 60 }}
              >
                <div className="max-w-7xl mx-auto px-4 py-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {allCategories.map((category) => (
                      <div key={category.id} className="space-y-3">
                        {/* Category Title */}
                        <Link
                          href={`/?category=${category.slug}`}
                          onClick={(e) => {
                            // Allow Ctrl+Click / Cmd+Click / Middle-click to open in new tab
                            if (e.ctrlKey || e.metaKey || e.button === 1) {
                              return; // Let browser handle it
                            }
                            e.preventDefault();
                            handleCategoryClick(category.slug);
                          }}
                          onAuxClick={(e) => {
                            // Handle middle-click (mouse wheel click)
                            if (e.button === 1) {
                              window.open(`/?category=${category.slug}`, '_blank');
                            }
                          }}
                          className="w-full flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white hover:text-blue-600 transition-colors group pb-2 border-b border-gray-200 dark:border-slate-700 text-left"
                        >
                          {category.icon && (
                            <span className="text-xl group-hover:scale-110 transition-transform">
                              {category.icon}
                            </span>
                          )}
                          <span className="flex-1">{category.name}</span>
                        </Link>

                        {/* Subcategories List */}
                        {category.subcategories && category.subcategories.length > 0 ? (
                          <div className="space-y-2">
                            {/* View All Link */}
                        <Link
                          href={`/?category=${category.slug}`}
                          onClick={(e) => {
                            // Allow Ctrl+Click / Cmd+Click / Middle-click to open in new tab
                            if (e.ctrlKey || e.metaKey || e.button === 1) {
                              return; // Let browser handle it
                            }
                            e.preventDefault();
                            handleCategoryClick(category.slug);
                          }}
                          onAuxClick={(e) => {
                            // Handle middle-click (mouse wheel click)
                            if (e.button === 1) {
                              window.open(`/?category=${category.slug}`, '_blank');
                            }
                          }}
                              className="block text-xs font-semibold text-primary-600 hover:text-primary-700 hover:translate-x-1 transition-all text-left w-full"
                            >
                              View All
                            </Link>

                            {/* Subcategories */}
                            {category.subcategories.map((subcategory) => (
                              <Link
                                key={subcategory.id}
                                href={`/category/${category.slug}?subcategory=${subcategory.slug}`}
                                onClick={(e) => {
                                  // Allow Ctrl+Click / Cmd+Click / Middle-click to open in new tab
                                  if (e.ctrlKey || e.metaKey || e.button === 1) {
                                    return; // Let browser handle it
                                  }
                                  setShowMegaMenu(false);
                                }}
                                onAuxClick={(e) => {
                                  // Handle middle-click (mouse wheel click)
                                  if (e.button === 1) {
                                    window.open(`/category/${category.slug}?subcategory=${subcategory.slug}`, '_blank');
                                  }
                                }}
                                className="block text-xs text-gray-600 hover:text-primary-600 hover:translate-x-1 transition-all text-left w-full"
                              >
                                {subcategory.name}
                                {subcategory._count?.ads !== undefined && (
                                  <span className="ml-1 text-xs text-gray-400">
                                    ({subcategory._count.ads})
                                  </span>
                                )}
                              </Link>
                            ))}
                          </div>
                        ) : (
                        <Link
                          href={`/?category=${category.slug}`}
                          onClick={(e) => {
                            // Allow Ctrl+Click / Cmd+Click / Middle-click to open in new tab
                            if (e.ctrlKey || e.metaKey || e.button === 1) {
                              return; // Let browser handle it
                            }
                            e.preventDefault();
                            handleCategoryClick(category.slug);
                          }}
                          onAuxClick={(e) => {
                            // Handle middle-click (mouse wheel click)
                            if (e.button === 1) {
                              window.open(`/?category=${category.slug}`, '_blank');
                            }
                          }}
                            className="block text-xs text-gray-600 hover:text-primary-600 hover:translate-x-1 transition-all text-left w-full"
                          >
                            View All
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Subcategory / Popular Searches Row */}
          {activeCategorySlug && (
            <div className="pt-2 pb-3">
              {isSubLoading ? (
                <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
                  {[...Array(8)].map((_, idx) => (
                    <div key={idx} className="h-8 w-28 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : subcategories && subcategories.length > 0 ? (
                <div
                  className="flex items-center gap-2 overflow-x-auto hide-scrollbar"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {subcategories.map((subcat) => (
                    <Link
                      key={subcat.id}
                      href={`/category/${activeCategorySlug}?subcategory=${subcat.slug}`}
                      onClick={(e) => {
                        // Allow Ctrl+Click / Cmd+Click / Middle-click to open in new tab
                        if (e.ctrlKey || e.metaKey || e.button === 1) {
                          return; // Let browser handle it
                        }
                        // For regular clicks, close mega menu if open
                        setShowMegaMenu(false);
                      }}
                      onAuxClick={(e) => {
                        // Handle middle-click (mouse wheel click)
                        if (e.button === 1) {
                          window.open(`/category/${activeCategorySlug}?subcategory=${subcat.slug}`, '_blank');
                        }
                      }}
                      className="
                        flex-shrink-0 px-3 py-2 rounded-full text-sm
                        bg-gray-100 text-gray-800 hover:bg-primary-50 hover:text-primary-700
                        border border-gray-200 hover:border-primary-300 transition-all
                      "
                    >
                      {subcat.name}
                      {subcat._count?.ads !== undefined && (
                        <span className="ml-1 text-xs text-gray-500">({subcat._count.ads})</span>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No popular searches found.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

export default memo(CategoryNav);
