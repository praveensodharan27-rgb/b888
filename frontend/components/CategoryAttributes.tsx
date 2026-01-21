'use client';

import { useEffect, useState } from 'react';
import { UseFormRegister, UseFormWatch, UseFormSetValue, FieldErrors } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface SpecField {
  key: string;
  type: 'text' | 'number' | 'select';
  required: boolean;
  label: string;
  options?: string[];
  parentField?: string;
  nestedOptions?: Record<string, string[]>;
}

interface CategoryAttributesProps {
  categoryId?: string;
  subcategoryId?: string;
  categorySlug?: string;
  subcategorySlug?: string;
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  errors: FieldErrors<any>;
}

/**
 * Dynamic Category Attributes renderer
 * - Spec schema comes from backend: GET /categories/:categoryId/spec-schema
 * - Brand options come from backend: GET /brands?category=<slug> (fallback to /brands)
 * - No hard-coded dropdown values for Brand anywhere in this file.
 */
export default function CategoryAttributes({
  categoryId,
  subcategoryId,
  categorySlug,
  subcategorySlug,
  register,
  watch,
  setValue,
  errors,
}: CategoryAttributesProps) {
  const [selectedBrand, setSelectedBrand] = useState<string>('');

  // Resolve category slug / id
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data.categories || [];
    },
    enabled: !categoryId && !!categorySlug,
    staleTime: 10 * 60 * 1000,
  });

  const resolvedCategoryId =
    categoryId || categories?.find((c: any) => c.slug === categorySlug)?.id;

  const resolvedCategorySlug =
    categorySlug || categories?.find((c: any) => c.id === resolvedCategoryId)?.slug;

  // Load brands from backend (category-wise, with global popular fallback)
  const { data: brandsData } = useQuery({
    queryKey: ['brands', resolvedCategorySlug || 'popular'],
    queryFn: async () => {
      try {
        const params = resolvedCategorySlug ? `?category=${resolvedCategorySlug}` : '';
        const response = await api.get(`/brands${params}`);
        const categoryBrands = response.data?.brands || [];

        if (Array.isArray(categoryBrands) && categoryBrands.length > 0) {
          return categoryBrands;
        }

        // Fallback: global popular brands
        const popularResponse = await api.get('/brands');
        return popularResponse.data?.brands || [];
      } catch {
        return [];
      }
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });

  // Load spec schema from backend
  const { data: specSchemaData, isLoading } = useQuery({
    queryKey: ['spec-schema', resolvedCategoryId, subcategoryId],
    queryFn: async () => {
      if (!resolvedCategoryId) return null;
      const params = new URLSearchParams();
      if (subcategoryId) params.append('subcategoryId', subcategoryId);
      const response = await api.get(
        `/categories/${resolvedCategoryId}/spec-schema?${params.toString()}`
      );
      return response.data;
    },
    enabled: !!resolvedCategoryId,
    staleTime: 60 * 1000,
  });

  // Keep brand/model coherent
  const watchedBrand = watch('attributes.brand');
  useEffect(() => {
    if (watchedBrand !== selectedBrand) {
      setSelectedBrand(watchedBrand || '');
      // Clear model when brand changes
      setValue('attributes.model', '');
    }
  }, [watchedBrand, selectedBrand, setValue]);

  if (!resolvedCategoryId) {
    return null;
  }

  if (isLoading && !specSchemaData) {
    return <div className="text-sm text-gray-500 py-2">Loading specifications...</div>;
  }

  if (!specSchemaData || !specSchemaData.specSchema) {
    return <div className="text-sm text-gray-500 py-2">No specifications available for this category.</div>;
  }

  const fields: SpecField[] = specSchemaData.specSchema.fields || [];

  if (!fields || fields.length === 0) {
    return <div className="text-sm text-gray-500 py-2">No specification fields configured for this category.</div>;
  }

  // Compute options for a field
  const getFieldOptions = (field: SpecField): string[] => {
    // BRAND: 100% dynamic from Brands API, no hard-coded options
    if (field.key === 'brand') {
      if (Array.isArray(brandsData) && brandsData.length > 0) {
        return brandsData
          .map((b: any) => b?.name)
          .filter((n: any) => typeof n === 'string' && n.trim().length > 0);
      }
      return [];
    }

    // Nested options (e.g. model by brand)
    if (field.nestedOptions && field.parentField) {
      const parentValue = watch(`attributes.${field.parentField}`) || '';
      if (parentValue && field.nestedOptions[parentValue]) {
        return field.nestedOptions[parentValue];
      }
      return [];
    }

    return field.options || [];
  };

  return (
    <div className="space-y-4" style={{ pointerEvents: 'auto', position: 'relative', zIndex: 1 }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((field) => {
          const fieldName = `attributes.${field.key}`;
          const error = (errors.attributes as any)?.[field.key];
          const options = getFieldOptions(field);
          const isSelect = field.type === 'select';

          if (isSelect) {
            const isDisabled =
              Boolean(field.nestedOptions && field.parentField && !watch(`attributes.${field.parentField}`));

            return (
              <div
                key={`${resolvedCategoryId}-${subcategoryId}-${field.key}`}
                style={{ pointerEvents: 'auto', position: 'relative', zIndex: 1 }}
              >
                <label className="block text-sm font-medium mb-2">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                  {field.parentField && (
                    <span className="text-xs text-gray-500 ml-2">(depends on {field.parentField})</span>
                  )}
                </label>
                <select
                  {...register(fieldName, { required: field.required })}
                  disabled={isDisabled}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none bg-white ${
                    isDisabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                  onChange={(e) => {
                    setValue(fieldName, e.target.value);
                    // Reset children when parent changes
                    if (!field.parentField && field.nestedOptions) {
                      fields.forEach((f) => {
                        if (f.parentField === field.key) {
                          setValue(`attributes.${f.key}`, '');
                        }
                      });
                    }
                  }}
                >
                  <option value="">
                    {isDisabled ? `Select ${field.parentField} first` : `Select ${field.label}`}
                  </option>
                  {options && options.length > 0 ? (
                    options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      No options available (configure in Admin Panel)
                    </option>
                  )}
                </select>
                {error && <div className="text-red-500 text-sm mt-1">{error.message as string}</div>}
                {isDisabled && (
                  <p className="text-xs text-gray-500 mt-1">Please select {field.parentField} first</p>
                )}
              </div>
            );
          }

          // Text / number fields
          return (
            <div
              key={`${resolvedCategoryId}-${subcategoryId}-${field.key}`}
              style={{ pointerEvents: 'auto', position: 'relative', zIndex: 1 }}
            >
              <label className="block text-sm font-medium mb-2">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <input
                type={field.type === 'number' ? 'number' : 'text'}
                {...register(fieldName, { required: field.required })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              {error && <div className="text-red-500 text-sm mt-1">{error.message as string}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

