'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { FiGrid, FiChevronDown } from 'react-icons/fi';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

const CATEGORIES: Category[] = [
  { id: '1', name: 'Cars', slug: 'cars', icon: '🚗' },
  { id: '2', name: 'Mobile Phones', slug: 'mobile-phones', icon: '📱' },
  { id: '3', name: 'Laptops', slug: 'laptops', icon: '💻' },
  { id: '4', name: 'Motorcycles', slug: 'motorcycles', icon: '🏍️' },
  { id: '5', name: 'Properties', slug: 'properties', icon: '🏠' },
  { id: '6', name: 'Fashion', slug: 'fashion', icon: '👗' },
  { id: '7', name: 'Jobs', slug: 'jobs', icon: '💼' },
  { id: '8', name: 'Services', slug: 'services', icon: '🔧' },
];

export default function HorizontalCategoryNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get active category from URL
  const activeCategory = searchParams.get('category') || pathname.split('/')[1];

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
        <div className="w-full overflow-x-auto hide-scrollbar">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 h-12 scroll-smooth">
            {/* ALL CATEGORIES Button - Primary */}
            <div className="relative flex-shrink-0" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600 text-white font-medium text-xs hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md whitespace-nowrap"
                aria-expanded={showDropdown}
                aria-haspopup="true"
              >
                <FiGrid className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
                <span>ALL CATEGORIES</span>
                <FiChevronDown
                  className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${
                    showDropdown ? 'rotate-180' : ''
                  }`}
                  aria-hidden
                />
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div
                  className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                  role="menu"
                >
                  {CATEGORIES.map((category) => (
                    <Link
                      key={category.id}
                      href={`/ads?category=${category.slug}`}
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-gray-700 hover:text-blue-600"
                      role="menuitem"
                    >
                      <span className="text-lg flex-shrink-0">{category.icon}</span>
                      <span className="text-sm font-medium">{category.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Category Menu Items - Horizontal Scroll */}
            {CATEGORIES.map((category, index) => {
              const isActive = activeCategory === category.slug;
              const isLast = index === CATEGORIES.length - 1;

              return (
                <Link
                  key={category.id}
                  href={`/ads?category=${category.slug}`}
                  className={`
                    flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium text-xs whitespace-nowrap transition-all duration-200
                    ${isLast ? 'mr-4' : ''}
                    ${
                      isActive
                        ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                    }
                  `}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="text-sm flex-shrink-0" aria-hidden>
                    {category.icon}
                  </span>
                  <span>{category.name}</span>
                </Link>
              );
            })}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
