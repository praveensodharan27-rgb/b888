'use client';

import { useCategories } from '@/hooks/useCategories';
import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi';

interface CategorySelectorProps {
  selectedCategoryId: string;
  selectedSubcategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  onSubcategoryChange: (subcategoryId: string) => void;
  categoryError?: string;
  subcategoryError?: string;
  /**
   * Optional: DOM id of the next step section.
   * When a final selection is made (subcategory chosen or category without subcategories),
   * the component will auto-scroll to this element.
   */
  autoScrollTargetId?: string;
}

export default function CategorySelector({
  selectedCategoryId,
  selectedSubcategoryId,
  onCategoryChange,
  onSubcategoryChange,
  categoryError,
  subcategoryError,
  autoScrollTargetId,
}: CategorySelectorProps) {
  const {
    categories,
    isLoading,
    isError,
    error,
    refetch,
    getSubcategories,
    getCategoryById,
  } = useCategories();

  // Get selected category and its subcategories
  const selectedCategory = selectedCategoryId
    ? getCategoryById(selectedCategoryId)
    : undefined;
  const subcategories = selectedCategoryId
    ? getSubcategories(selectedCategoryId)
    : [];
  const hasSubcategories = subcategories.length > 0;

  const scrollToNextStep = () => {
    if (!autoScrollTargetId || typeof window === 'undefined') return;
    const el = document.getElementById(autoScrollTargetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCategoryCardClick = (categoryId: string) => {
    if (categoryId === selectedCategoryId) return;
    onCategoryChange(categoryId);
    onSubcategoryChange('');
    const subs = getSubcategories(categoryId);
    if (!subs || subs.length === 0) {
      scrollToNextStep();
    }
  };

  const handleSubcategoryChipClick = (subcategoryId: string) => {
    if (subcategoryId === selectedSubcategoryId) return;
    onSubcategoryChange(subcategoryId);
    scrollToNextStep();
  };

  // Loading Skeleton
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          <span className="text-orange-600 font-bold">1.</span> Category & Subcategory
        </h2>
        <div className="space-y-4">
          {/* Category Skeleton */}
          <div>
            <div className="h-4 w-32 bg-gray-200 rounded mb-2 animate-pulse" />
            <div className="h-12 w-full bg-gray-200 rounded animate-pulse" />
          </div>
          {/* Subcategory Skeleton */}
          <div>
            <div className="h-4 w-28 bg-gray-200 rounded mb-2 animate-pulse" />
            <div className="h-12 w-full bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (isError) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          <span className="text-orange-600 font-bold">1.</span> Category & Subcategory
        </h2>
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-red-900 font-semibold mb-1">
                Failed to Load Categories
              </h3>
              <p className="text-red-700 text-sm mb-3">
                {error?.message || 'Unable to fetch categories. Please try again.'}
              </p>
              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
              >
                <FiRefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty State
  if (!categories || categories.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          <span className="text-orange-600 font-bold">1.</span> Category & Subcategory
        </h2>
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-yellow-900 font-semibold mb-1">
                No Categories Available
              </h3>
              <p className="text-yellow-700 text-sm mb-3">
                No categories found in the database. Please contact support or try again later.
              </p>
              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white text-sm font-semibold rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <FiRefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success State - Render Categories as cards (OLX/Facebook Marketplace style)
  return (
    <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        <span className="text-orange-600 font-bold">1.</span> Category & Subcategory
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Choose a category that best matches your ad. Subcategories will appear after you pick a category.
      </p>

      {/* Categories Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
        {categories.map((category) => {
          const categoryId = category.id || category._id;
          const isSelected = categoryId === selectedCategoryId;

          return (
            <button
              key={categoryId}
              type="button"
              onClick={() => handleCategoryCardClick(categoryId)}
              className={`group relative flex flex-col items-center justify-center rounded-xl border px-3 py-3 sm:px-4 sm:py-4 text-center transition-all
                ${isSelected
                  ? 'border-orange-500 bg-orange-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-orange-400 hover:bg-orange-50/60 shadow-sm hover:shadow-md'
                }`}
            >
              <div
                className={`flex items-center justify-center rounded-full w-10 h-10 sm:w-11 sm:h-11 mb-2 text-xs font-semibold uppercase tracking-wide transition-colors
                  ${isSelected ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600 group-hover:bg-orange-100 group-hover:text-orange-700'}`}
              >
                {category.name.charAt(0)}
              </div>
              <span className="text-xs sm:text-sm font-medium text-gray-900 truncate w-full">
                {category.name}
              </span>
              {category._count?.ads && category._count.ads > 0 && (
                <span className="mt-1 text-[10px] sm:text-[11px] text-gray-500">
                  {category._count.ads} ads
                </span>
              )}
              {isSelected && (
                <span className="absolute inset-0 rounded-xl ring-2 ring-orange-300 pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>

      {/* Error for category */}
      {categoryError && (
        <p className="text-red-500 text-sm mt-1 mb-3">{categoryError}</p>
      )}

      {/* Subcategories for selected category */}
      {selectedCategory && hasSubcategories && (
        <div className="mt-2 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Subcategory <span className="text-red-500">*</span>
              </h3>
              <p className="text-xs text-gray-500">
                Pick the most accurate subcategory for better reach.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {subcategories.map((subcategory) => {
              const subcategoryId = subcategory.id || subcategory._id;
              const isSelectedSub = subcategoryId === selectedSubcategoryId;

              return (
                <button
                  key={subcategoryId}
                  type="button"
                  onClick={() => handleSubcategoryChipClick(subcategoryId)}
                  className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium border transition-all
                    ${isSelectedSub
                      ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-orange-400 hover:bg-orange-50'
                    }`}
                >
                  {subcategory.name}
                </button>
              );
            })}
          </div>

          {subcategoryError && (
            <p className="text-red-500 text-sm mt-2">{subcategoryError}</p>
          )}
        </div>
      )}
    </div>
  );
}
