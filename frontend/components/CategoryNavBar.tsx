'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { FiGrid, FiChevronDown, FiMoreHorizontal } from 'react-icons/fi';
import { useCategories } from '@/hooks/useCategories';

const VISIBLE_CATEGORIES = 9;

export default function CategoryNavBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showAllCategoriesDropdown, setShowAllCategoriesDropdown] = useState(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const allCategoriesRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);

  const { categories: categoriesData, isLoading } = useCategories();
  const allCategories = categoriesData?.length ? categoriesData : [];

  // Get active category from URL
  const activeCategory = searchParams.get('category') || pathname.split('/')[1];

  // Sort categories by ad count (most popular first)
  const sortedCategories = [...allCategories].sort((a, b) => {
    const countA = a._count?.ads || 0;
    const countB = b._count?.ads || 0;
    return countB - countA;
  });

  // Split into visible and more categories
  const visibleCategories = sortedCategories.slice(0, VISIBLE_CATEGORIES);
  const moreCategories = sortedCategories.slice(VISIBLE_CATEGORIES);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        allCategoriesRef.current &&
        !allCategoriesRef.current.contains(event.target as Node)
      ) {
        setShowAllCategoriesDropdown(false);
      }
      if (
        moreDropdownRef.current &&
        !moreDropdownRef.current.contains(event.target as Node)
      ) {
        setShowMoreDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 h-12">
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
            {[...Array(9)].map((_, i) => (
              <div key={i} className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </nav>
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

      <nav
        className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm"
        aria-label="Categories navigation"
      >
        <div className="w-full overflow-x-auto hide-scrollbar lg:overflow-x-visible">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 h-12">
              {/* ALL CATEGORIES Button - Primary */}
              <div className="relative flex-shrink-0" ref={allCategoriesRef}>
                <button
                  type="button"
                  onClick={() => setShowAllCategoriesDropdown(!showAllCategoriesDropdown)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600 text-white font-medium text-xs hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md whitespace-nowrap"
                  aria-expanded={showAllCategoriesDropdown}
                  aria-haspopup="true"
                >
                  <FiGrid className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
                  <span>ALL CATEGORIES</span>
                  <FiChevronDown
                    className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${
                      showAllCategoriesDropdown ? 'rotate-180' : ''
                    }`}
                    aria-hidden
                  />
                </button>

                {/* All Categories Dropdown */}
                {showAllCategoriesDropdown && (
                  <div
                    className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 max-h-96 overflow-y-auto"
                    role="menu"
                  >
                    {allCategories.map((category) => (
                      <Link
                        key={category.id}
                        href={`/ads?category=${category.slug}`}
                        onClick={() => setShowAllCategoriesDropdown(false)}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-gray-700 hover:text-blue-600"
                        role="menuitem"
                      >
                        {category.icon && (
                          <span className="text-lg flex-shrink-0">{category.icon}</span>
                        )}
                        <span className="text-sm font-medium">{category.name}</span>
                        {category._count?.ads ? (
                          <span className="ml-auto text-xs text-gray-500">
                            {category._count.ads}
                          </span>
                        ) : null}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Visible Categories (9 items) */}
              {visibleCategories.map((category) => {
                const isActive = activeCategory === category.slug;

                return (
                  <Link
                    key={category.id}
                    href={`/ads?category=${category.slug}`}
                    className={`
                      flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium text-xs whitespace-nowrap transition-all duration-200
                      ${
                        isActive
                          ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                          : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                      }
                    `}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {category.icon && (
                      <span className="text-sm flex-shrink-0" aria-hidden>
                        {category.icon}
                      </span>
                    )}
                    <span>{category.name}</span>
                  </Link>
                );
              })}

              {/* More Dropdown (if more than 9 categories) */}
              {moreCategories.length > 0 && (
                <div className="relative flex-shrink-0" ref={moreDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-50 font-medium text-xs transition-colors whitespace-nowrap"
                    aria-expanded={showMoreDropdown}
                    aria-haspopup="true"
                  >
                    <FiMoreHorizontal className="w-4 h-4 flex-shrink-0" aria-hidden />
                    <span>More</span>
                    <FiChevronDown
                      className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${
                        showMoreDropdown ? 'rotate-180' : ''
                      }`}
                      aria-hidden
                    />
                  </button>

                  {/* More Categories Dropdown */}
                  {showMoreDropdown && (
                    <div
                      className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 max-h-96 overflow-y-auto"
                      role="menu"
                    >
                      {moreCategories.map((category) => {
                        const isActive = activeCategory === category.slug;

                        return (
                          <Link
                            key={category.id}
                            href={`/ads?category=${category.slug}`}
                            onClick={() => setShowMoreDropdown(false)}
                            className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                              isActive
                                ? 'text-blue-600 bg-blue-50'
                                : 'text-gray-700 hover:text-blue-600'
                            }`}
                            role="menuitem"
                          >
                            {category.icon && (
                              <span className="text-lg flex-shrink-0">{category.icon}</span>
                            )}
                            <span className="text-sm font-medium">{category.name}</span>
                            {category._count?.ads ? (
                              <span className="ml-auto text-xs text-gray-500">
                                {category._count.ads}
                              </span>
                            ) : null}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
