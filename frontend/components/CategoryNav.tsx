'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { FiGrid, FiChevronDown } from 'react-icons/fi';
import { useState, useRef, useEffect, memo, useMemo } from 'react';
import { useCategories, type Category } from '@/hooks/useCategories';

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  _count?: { ads: number };
}

// Shuffle function for randomizing dropdown categories
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function CategoryNav() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showMegaMenu, setShowMegaMenu] = useState(false);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeCategorySlug, setActiveCategorySlug] = useState<string>('');

  const { categories: allCategories, isLoading } = useCategories();

  // Get current category from URL
  const currentCategory = pathname.startsWith('/category/') 
    ? pathname.split('/')[2] 
    : searchParams.get('category');

  // DESKTOP: Get top 4 categories for navbar, rest go to dropdown (shuffled)
  const { visibleCategories, dropdownCategories } = useMemo(() => {
    if (!allCategories || allCategories.length === 0) {
      return { visibleCategories: [], dropdownCategories: [] };
    }

    // Sort by ad count and take top 4 for desktop
    const sortedByAdCount = [...allCategories].sort((a, b) => {
      const countA = a._count?.ads || 0;
      const countB = b._count?.ads || 0;
      return countB - countA;
    });

    const visible = sortedByAdCount.slice(0, 4);
    const remaining = sortedByAdCount.slice(4);
    
    // Shuffle remaining categories for dropdown (randomize on each load)
    const shuffled = shuffleArray(remaining);

    return {
      visibleCategories: visible,
      dropdownCategories: shuffled,
    };
  }, [allCategories]);

  // MOBILE: Fixed categories (Cars, Bikes, Motorcycles) + remaining scrollable
  const { mobileFixedCategories, mobileScrollableCategories } = useMemo(() => {
    if (!allCategories || allCategories.length === 0) {
      return { mobileFixedCategories: [], mobileScrollableCategories: [] };
    }

    // Find fixed categories by slug
    const fixedSlugs = ['cars', 'bikes', 'motorcycles'];
    const fixed: Category[] = [];
    const remaining: Category[] = [];

    // First, extract fixed categories in order
    fixedSlugs.forEach(slug => {
      const category = allCategories.find(cat => cat.slug === slug);
      if (category) {
        fixed.push(category);
      }
    });

    // Then get remaining categories (excluding fixed ones)
    allCategories.forEach(cat => {
      if (!fixedSlugs.includes(cat.slug)) {
        remaining.push(cat);
      }
    });

    return {
      mobileFixedCategories: fixed,
      mobileScrollableCategories: remaining,
    };
  }, [allCategories]);

  // Track active category based on URL only (no default selection)
  useEffect(() => {
    if (currentCategory) {
      setActiveCategorySlug(currentCategory);
    } else {
      setActiveCategorySlug('');
    }
  }, [currentCategory]);

  // Auto-scroll to active category on mobile
  useEffect(() => {
    const targetSlug = activeCategorySlug || currentCategory;
    if (targetSlug && scrollContainerRef.current) {
      const activeTab = scrollContainerRef.current.querySelector(`[data-slug="${targetSlug}"]`);
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeCategorySlug, currentCategory]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showMegaMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (megaMenuRef.current && !megaMenuRef.current.contains(target)) {
        setShowMegaMenu(false);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showMegaMenu]);

  // Handle category navigation
  const handleCategoryClick = (categorySlug: string) => {
    setActiveCategorySlug(categorySlug);
    router.push(`/?category=${categorySlug}`, { scroll: false });
    setShowMegaMenu(false);
  };

  if (isLoading) {
    return (
      <div 
        className="bg-white border-b border-gray-200 sticky z-40"
        style={{ top: '64px' }}
      >
        <div className="w-full px-4">
          <div className="flex items-center h-12">
            <div className="flex gap-2 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 w-20 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render category button
  const renderCategoryButton = (category: Category, isMobile = false) => {
    const isActive = activeCategorySlug === category.slug;
    
    return (
      <Link
        key={category.id}
        href={`/?category=${category.slug}`}
        data-slug={category.slug}
        onClick={(e) => {
          if (e.ctrlKey || e.metaKey || e.button === 1) return;
          e.preventDefault();
          handleCategoryClick(category.slug);
        }}
        onAuxClick={(e) => {
          if (e.button === 1) {
            window.open(`/?category=${category.slug}`, '_blank');
          }
        }}
        className={`
          flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium
          transition-all duration-200 whitespace-nowrap
          hover:shadow-sm
          ${isActive 
            ? 'bg-blue-600 text-white shadow-md' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
          }
        `}
      >
        {category.icon && <span className="mr-1.5">{category.icon}</span>}
        {category.name}
      </Link>
    );
  };

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
      
      <nav 
        className="bg-white border-b border-gray-200 sticky z-40"
        style={{ top: '64px' }}
        aria-label="Categories navigation"
      >
        <div className="w-full">
          {/* DESKTOP VIEW: 4 visible + All Categories dropdown */}
          <div className="hidden md:block">
            <div className="max-w-[1400px] mx-auto px-4">
              <div className="flex items-center gap-2 h-12">
                {/* 4 Visible Categories */}
                <div className="flex items-center gap-2 flex-1">
                  {visibleCategories.map((category) => renderCategoryButton(category))}
                </div>

                {/* All Categories Dropdown */}
                {dropdownCategories.length > 0 && (
                  <div className="relative flex-shrink-0" ref={megaMenuRef}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMegaMenu(!showMegaMenu);
                      }}
                      onMouseEnter={() => setShowMegaMenu(true)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                      aria-expanded={showMegaMenu}
                      aria-haspopup="true"
                    >
                      <FiGrid className="w-4 h-4" />
                      <span>All Categories</span>
                      <FiChevronDown className={`w-4 h-4 transition-transform duration-200 ${showMegaMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {showMegaMenu && (
                      <div
                        className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-2xl border border-gray-200 py-2 max-h-96 overflow-y-auto z-50"
                        onMouseLeave={() => setShowMegaMenu(false)}
                        role="menu"
                      >
                        {dropdownCategories.map((category) => (
                          <Link
                            key={category.id}
                            href={`/?category=${category.slug}`}
                            onClick={(e) => {
                              if (e.ctrlKey || e.metaKey || e.button === 1) return;
                              e.preventDefault();
                              handleCategoryClick(category.slug);
                            }}
                            onAuxClick={(e) => {
                              if (e.button === 1) {
                                window.open(`/?category=${category.slug}`, '_blank');
                              }
                            }}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-gray-700 hover:text-blue-600"
                            role="menuitem"
                          >
                            {category.icon && (
                              <span className="text-lg flex-shrink-0">{category.icon}</span>
                            )}
                            <span className="text-sm font-medium flex-1">{category.name}</span>
                            {category._count?.ads !== undefined && (
                              <span className="text-xs text-gray-400">
                                {category._count.ads}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* MOBILE VIEW: Fixed (Cars, Bikes, Motorcycles) + Scrollable rest */}
          <div className="md:hidden">
            <div 
              ref={scrollContainerRef}
              className="flex items-center gap-2 px-4 py-2 overflow-x-auto hide-scrollbar scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {/* Fixed Categories First (Cars, Bikes, Motorcycles) */}
              {mobileFixedCategories.map((category) => renderCategoryButton(category, true))}
              
              {/* Remaining Categories (Scrollable) */}
              {mobileScrollableCategories.map((category) => renderCategoryButton(category, true))}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

export default memo(CategoryNav);
