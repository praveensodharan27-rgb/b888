'use client';

import { memo } from 'react';
import { UseFormRegister, UseFormSetValue, UseFormClearErrors, UseFormTrigger, FieldErrors } from 'react-hook-form';
import { FiLayers, FiChevronDown } from 'react-icons/fi';

interface Category {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  subcategories?: Subcategory[];
}

interface Subcategory {
  id: string;
  _id?: string;
  name: string;
  slug: string;
}

interface CategorySectionProps {
  register: UseFormRegister<any>;
  setValue: UseFormSetValue<any>;
  clearErrors: UseFormClearErrors<any>;
  trigger: UseFormTrigger<any>;
  errors: FieldErrors<any>;
  selectedCategoryId: string;
  selectedSubcategoryId: string;
  displayCategories: Category[];
  selectedCategory?: Category;
  categoriesLoading: boolean;
  categoriesError: any;
}

const CategorySection = memo(function CategorySection({
  register,
  setValue,
  clearErrors,
  trigger,
  errors,
  selectedCategoryId,
  selectedSubcategoryId,
  displayCategories,
  selectedCategory,
  categoriesLoading,
  categoriesError,
}: CategorySectionProps) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600" aria-hidden>
          <FiLayers className="w-4 h-4" />
        </span>
        Category Details
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            {...register('categoryId', { required: 'Category is required' })}
            className={`w-full pl-4 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white appearance-none cursor-pointer ${
              errors.categoryId ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            onChange={(e) => {
              const newCategoryId = e.target.value;
              setValue('categoryId', newCategoryId, { shouldValidate: true });
              setValue('subcategoryId', '', { shouldValidate: false });
              clearErrors('subcategoryId');
              trigger('categoryId');
            }}
            value={selectedCategoryId || ''}
            disabled={categoriesLoading}
          >
            <option value="">
              {categoriesLoading ? 'Loading...' : 'Select Category'}
            </option>
            {!categoriesLoading && !categoriesError && displayCategories && displayCategories.length > 0 &&
              displayCategories
                .filter((cat: any) => !(cat.categoryId || cat.category_id))
                .map((cat: any) => {
                  const categoryId = cat.id || cat._id;
                  const categoryName = cat.name;
                  return (
                    <option key={categoryId} value={categoryId}>
                      {categoryName}
                    </option>
                  );
                })}
            {categoriesError && <option value="" disabled>Error loading categories</option>}
            {!categoriesLoading && !categoriesError && (!displayCategories || displayCategories.length === 0) && (
              <option value="" disabled>No categories available</option>
            )}
          </select>
          <FiChevronDown className="absolute right-3 top-[2.6rem] w-5 h-5 text-gray-500 pointer-events-none" aria-hidden />
          {errors.categoryId && (
            <p className="text-red-500 text-sm mt-1">{errors.categoryId.message as string}</p>
          )}
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subcategory <span className="text-red-500">*</span>
          </label>
          <select
            {...register('subcategoryId', {
              required: selectedCategory?.subcategories && selectedCategory.subcategories.length > 0
                ? 'Subcategory is required'
                : false,
            })}
            className={`w-full pl-4 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white appearance-none ${
              !selectedCategory ? 'cursor-not-allowed bg-gray-50' : 'cursor-pointer'
            } ${errors.subcategoryId ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
            onChange={(e) => {
              setValue('subcategoryId', e.target.value, { shouldValidate: true });
              trigger('subcategoryId');
            }}
            value={selectedSubcategoryId || ''}
            disabled={!selectedCategory || (selectedCategory.subcategories && selectedCategory.subcategories.length === 0)}
          >
            <option value="">
              {!selectedCategory
                ? 'Select category first'
                : !selectedCategory.subcategories || selectedCategory.subcategories.length === 0
                  ? 'No subcategories'
                  : 'Select Subcategory'}
            </option>
            {selectedCategory?.subcategories?.map((sub: any) => {
              const subcategoryId = sub.id || sub._id;
              return (
                <option key={subcategoryId} value={subcategoryId}>
                  {sub.name}
                </option>
              );
            })}
          </select>
          <FiChevronDown className="absolute right-3 top-[2.6rem] w-5 h-5 text-gray-500 pointer-events-none" aria-hidden />
          {errors.subcategoryId && (
            <p className="text-red-500 text-sm mt-1">{errors.subcategoryId.message as string}</p>
          )}
        </div>
      </div>

      {selectedCategory && (!selectedCategory.subcategories || selectedCategory.subcategories.length === 0) && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-blue-700 text-sm">
            This category has no subcategories. You can proceed with just the category selection.
          </p>
        </div>
      )}
    </div>
  );
});

export default CategorySection;
