'use client';

import { useState } from 'react';
import CategorySelector from './CategorySelector';
import { useCategories } from '@/hooks/useCategories';

/**
 * Example usage of CategorySelector component
 * 
 * This demonstrates how to integrate the CategorySelector
 * into your form with validation
 */
export default function CategorySelectorExample() {
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');
  const [errors, setErrors] = useState<{
    category?: string;
    subcategory?: string;
  }>({});

  const { getCategoryById, getSubcategories } = useCategories();

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: { category?: string; subcategory?: string } = {};

    if (!selectedCategoryId) {
      newErrors.category = 'Please select a category';
    }

    // Check if subcategory is required
    const selectedCategory = getCategoryById(selectedCategoryId);
    const subcategories = getSubcategories(selectedCategoryId);
    const hasSubcategories = subcategories.length > 0;

    if (selectedCategoryId && hasSubcategories && !selectedSubcategoryId) {
      newErrors.subcategory = 'Please select a subcategory';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Clear errors
    setErrors({});

    // Submit form
    console.log('Form submitted:', {
      categoryId: selectedCategoryId,
      subcategoryId: selectedSubcategoryId,
      categoryName: selectedCategory?.name,
      subcategoryName: subcategories.find(
        (sub) => (sub.id || sub._id) === selectedSubcategoryId
      )?.name,
    });

    alert('Form submitted successfully! Check console for details.');
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Category Selector Example
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <CategorySelector
          selectedCategoryId={selectedCategoryId}
          selectedSubcategoryId={selectedSubcategoryId}
          onCategoryChange={(categoryId) => {
            setSelectedCategoryId(categoryId);
            setErrors((prev) => ({ ...prev, category: undefined }));
          }}
          onSubcategoryChange={(subcategoryId) => {
            setSelectedSubcategoryId(subcategoryId);
            setErrors((prev) => ({ ...prev, subcategory: undefined }));
          }}
          categoryError={errors.category}
          subcategoryError={errors.subcategory}
        />

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            className="px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
          >
            Submit
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedCategoryId('');
              setSelectedSubcategoryId('');
              setErrors({});
            }}
            className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Selected Values Display */}
        {(selectedCategoryId || selectedSubcategoryId) && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Selected Values:</h3>
            <div className="space-y-1 text-sm text-gray-700">
              <p>
                <span className="font-medium">Category ID:</span>{' '}
                {selectedCategoryId || 'None'}
              </p>
              <p>
                <span className="font-medium">Subcategory ID:</span>{' '}
                {selectedSubcategoryId || 'None'}
              </p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
