'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, useMemo } from 'react';
import { UseFormRegister, UseFormWatch, UseFormSetValue, FieldErrors } from 'react-hook-form';
import api from '@/lib/api';
import Select from 'react-select';

interface Specification {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect';
  required: boolean;
  placeholder?: string;
  order: number;
  options?: SpecificationOption[];
  customValues?: string[];
}

interface SpecificationOption {
  id: string;
  value: string;
  label?: string;
}

interface DynamicSpecificationsProps {
  categorySlug?: string;
  subcategorySlug?: string;
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  errors: FieldErrors<any>;
  aiPriceSuggestion?: {
    suggested?: number | null;
    min?: number | null;
    max?: number | null;
    source?: 'db' | 'ai';
  } | null;
  onApplySuggestedPrice?: () => void;
}

export default function DynamicSpecifications({
  categorySlug,
  subcategorySlug,
  register,
  watch,
  setValue,
  errors,
  aiPriceSuggestion,
  onApplySuggestedPrice,
}: DynamicSpecificationsProps) {
  // State for brands-models data
  const [brandsModelsData, setBrandsModelsData] = useState<any>(null);
  const [isLoadingBrandsModels, setIsLoadingBrandsModels] = useState(false);

  // Normalize slug for matching (backend may return different casing)
  const norm = (s: string) => (s || '').toString().trim().toLowerCase();

  // Fetch brands-models data for brand/model fields
  useEffect(() => {
    if (categorySlug && subcategorySlug) {
      setIsLoadingBrandsModels(true);
      api.get('/categories/brands-models', {
        params: {
          categorySlug: (categorySlug || '').toString().trim(),
          subcategorySlug: (subcategorySlug || '').toString().trim(),
        },
      })
        .then(response => {
          if (response.data.success && response.data.categories?.length > 0) {
            const categories = response.data.categories;
            // Match category by slug/id (case-insensitive)
            let categoryData = categories.find((c: any) =>
              norm(c.slug) === norm(categorySlug) || norm(c.id) === norm(categorySlug)
            );
            if (!categoryData && categories.length === 1) categoryData = categories[0];

            if (categoryData?.subcategories?.length > 0) {
              const subs = categoryData.subcategories;
              let subcategoryData = subs.find((s: any) =>
                norm(s.slug) === norm(subcategorySlug) || norm(s.id) === norm(subcategorySlug)
              );
              if (!subcategoryData && subs.length === 1) subcategoryData = subs[0];

              if (subcategoryData?.brands && subcategoryData.brands.length > 0) {
                setBrandsModelsData(subcategoryData);
              } else {
                setBrandsModelsData(null);
              }
            } else {
              setBrandsModelsData(null);
            }
          } else {
            setBrandsModelsData(null);
          }
        })
        .catch(() => {
          setBrandsModelsData(null);
        })
        .finally(() => {
          setIsLoadingBrandsModels(false);
        });
    } else {
      setBrandsModelsData(null);
    }
  }, [categorySlug, subcategorySlug]);

  // Use /categories/specifications for product-wise specs (brand, model, year, fuel_type, etc.)
  // v4: Spec config with fields + brands per subcategory
  const { data: specsData, isLoading, error } = useQuery<{
    success: boolean;
    specifications: Specification[];
  }>({
    queryKey: ['categories-specifications', 'v4', categorySlug, subcategorySlug],
    queryFn: async () => {
      if (!categorySlug || !subcategorySlug) {
        return { success: true, specifications: [] };
      }
      try {
        console.log('🔄 Fetching product specifications for post-ad form:', { categorySlug, subcategorySlug });
        const response = await api.get('/categories/specifications', {
          params: { categorySlug, subcategorySlug },
        });
        const safeData = response.data || {};
        const specs = Array.isArray(safeData.specifications) ? safeData.specifications : [];
        return {
          success: safeData.success !== false,
          specifications: specs,
        };
      } catch (err: any) {
        const errMsg = typeof err?.message === 'string' ? err.message : 'Unknown error';
        if (process.env.NODE_ENV === 'development') {
          console.warn('❌ Failed to fetch product specifications:', errMsg);
        }
        return { success: false, specifications: [] };
      }
    },
    enabled: !!(categorySlug && subcategorySlug),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const specifications = useMemo(() => {
    if (!specsData?.specifications || !Array.isArray(specsData.specifications)) return [];
    return specsData.specifications;
  }, [specsData]);

  const isVehicleCategory = (categorySlug || '').toLowerCase().trim() === 'vehicles';
  const vehicleSubcategories = ['cars', 'motorcycles', 'scooters', 'bicycles', 'commercial-vehicles'];
  const isVehicleSpecContext = isVehicleCategory && vehicleSubcategories.includes((subcategorySlug || '').toLowerCase().trim());

  // Fallback specs for vehicles when API returns empty — so dropdowns always show
  const VEHICLE_FALLBACK_SPECS = useMemo(
    () => [
      { id: 'spec-brand', name: 'brand', label: 'Brand', type: 'text' as const, required: true, order: 1, options: [], customValues: [] },
      { id: 'spec-model', name: 'model', label: 'Model', type: 'text' as const, required: true, order: 2, options: [], customValues: [] },
      { id: 'spec-year', name: 'year', label: 'Year', type: 'number' as const, required: true, order: 3, options: [], customValues: [] },
      { id: 'spec-color', name: 'color', label: 'Colour', type: 'text' as const, required: true, order: 4, options: [], customValues: [] },
      { id: 'spec-fuel_type', name: 'fuel_type', label: 'Fuel Type', type: 'select' as const, required: true, order: 5, options: [], customValues: [] },
      { id: 'spec-transmission', name: 'transmission', label: 'Transmission', type: 'select' as const, required: true, order: 6, options: [], customValues: [] },
      { id: 'spec-price', name: 'price', label: 'Price', type: 'number' as const, required: true, order: 999, options: [], customValues: [] },
    ],
    []
  );

  const effectiveSpecifications = useMemo(() => {
    if (specifications && specifications.length > 0) return specifications;
    if (isVehicleSpecContext) return VEHICLE_FALLBACK_SPECS;
    return [];
  }, [specifications, isVehicleSpecContext, VEHICLE_FALLBACK_SPECS]);

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(
    () => Array.from({ length: currentYear - 2000 + 1 }, (_, idx) => currentYear - idx),
    [currentYear]
  );

  const VEHICLE_COLOUR_OPTIONS = [
    'White',
    'Black',
    'Silver',
    'Grey',
    'Red',
    'Blue',
    'Green',
    'Yellow',
    'Orange',
    'Brown',
    'Beige',
    'Maroon',
    'Gold',
    'Other',
  ] as const;

  const VEHICLE_FUEL_OPTIONS = [
    'Petrol',
    'Diesel',
    'CNG',
    'Electric',
    'Hybrid',
  ] as const;

  const VEHICLE_TRANSMISSION_OPTIONS = [
    'Manual',
    'Automatic',
    'AMT',
    'CVT',
  ] as const;
  
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 DynamicSpecifications State:', {
        categorySlug,
        subcategorySlug,
        enabled: !!(categorySlug && subcategorySlug),
        isLoading,
        error: error?.message,
        specificationsCount: specifications?.length || 0,
        hasSpecs: !!(specifications && specifications.length > 0),
      });
    }
  }, [categorySlug, subcategorySlug, isLoading, error, specifications]);

  if (!categorySlug || !subcategorySlug) {
    console.log('⚠️ DynamicSpecifications: Missing slugs', { categorySlug, subcategorySlug });
    return (
      <div className="text-center py-4 text-gray-400 text-sm">
        Please select a category and subcategory to see specifications
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500 bg-red-50 rounded-lg border border-red-200">
        <p className="text-sm font-medium">Error loading specifications</p>
        <p className="text-xs mt-1">Please try again later</p>
      </div>
    );
  }

  // ✅ Handle empty specifications (use effectiveSpecifications so vehicle fallback still shows)
  if (!effectiveSpecifications || effectiveSpecifications.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm font-medium">No filter fields available for this category/subcategory.</p>
        <p className="text-xs mt-2 text-gray-400">
          Category: {categorySlug}, Subcategory: {subcategorySlug}
        </p>
        <p className="text-xs mt-1 text-gray-300">
          {error ? `Error: ${(error as Error)?.message ?? 'Unknown'}` : 'Filter configurations will appear here when available'}
        </p>
      </div>
    );
  }

  // Sort specifications by order and remove duplicates
  const sortedSpecs = [...effectiveSpecifications].sort((a, b) => a.order - b.order);
  
  // Get selected brand value
  const selectedBrand = watch('attributes.brand');
  
  // Normalize for matching (trim, lowercase) so "Maruti Suzuki" matches "maruti suzuki"
  const normalizeBrandName = (name: string) =>
    (name || '').toString().trim().toLowerCase();

  // Get available models for selected brand (case-insensitive match, with fallback for "Maruti" → "Maruti Suzuki")
  const getModelsForBrand = (brandName: string) => {
    if (!brandsModelsData?.brands || !brandName) return [];
    const key = normalizeBrandName(brandName);
    let brandData = brandsModelsData.brands.find(
      (b: any) => normalizeBrandName(b.name) === key
    );
    if (!brandData && key) {
      brandData = brandsModelsData.brands.find(
        (b: any) => normalizeBrandName(b.name).startsWith(key) || key.startsWith(normalizeBrandName(b.name))
      );
    }
    return brandData?.models || [];
  };

  // ✅ PROMPT 4: Remove duplicates by name (keep first occurrence) - silent deduplication
  const uniqueSpecs = sortedSpecs.filter((spec, index, self) => 
    index === self.findIndex(s => s.name === spec.name)
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {uniqueSpecs.map((spec) => {
        const fieldName = `attributes.${spec.name}`;
        const error = (errors.attributes as any)?.[spec.name];
        const currentValue = watch(fieldName);

        // Vehicles: Year searchable dropdown (2000 → current, latest first) — same UI as Brand
        if (isVehicleSpecContext && spec.name === 'year') {
          return (
            <div key={spec.id}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {spec.label || 'Year'}{' '}
                {spec.required && <span className="text-red-500">*</span>}
              </label>
              <Select
                options={yearOptions.map((year) => ({
                  value: String(year),
                  label: String(year),
                }))}
                value={
                  currentValue !== undefined && currentValue !== null && currentValue !== ''
                    ? { value: String(currentValue), label: String(currentValue) }
                    : null
                }
                onChange={(newValue) => {
                  const raw = newValue?.value ?? '';
                  const num = Number(raw);
                  if (!Number.isNaN(num)) {
                    setValue(fieldName, num, { shouldValidate: true });
                  } else {
                    setValue(fieldName, null as any, { shouldValidate: true });
                  }
                }}
                placeholder="Select year"
                isClearable
                isSearchable={false}
                className="react-select-container"
                classNamePrefix="react-select"
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: '48px',
                    borderColor: error ? '#ef4444' : '#d1d5db',
                    '&:hover': {
                      borderColor: error ? '#ef4444' : '#9ca3af',
                    },
                  }),
                }}
              />
              <input
                type="hidden"
                {...register(fieldName, {
                  required: spec.required ? `${spec.label || 'Year'} is required` : false,
                  valueAsNumber: true,
                  validate: (value) => {
                    if (!spec.required && (value === undefined || value === null || value === '')) {
                      return true;
                    }
                    const numValue =
                      typeof value === 'number' ? value : Number(value ?? NaN);
                    if (Number.isNaN(numValue)) {
                      return `${spec.label || 'Year'} is required`;
                    }
                    if (numValue < 2000 || numValue > currentYear) {
                      return `Year must be between 2000 and ${currentYear}`;
                    }
                    return true;
                  },
                })}
              />
              {error && (
                <p className="text-red-500 text-sm mt-1">
                  {error.message as string}
                </p>
              )}
            </div>
          );
        }

        // Vehicles: Colour searchable dropdown with common car colours — same UI as Brand
        if (isVehicleSpecContext && spec.name === 'color') {
          return (
            <div key={spec.id}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Colour {spec.required && <span className="text-red-500">*</span>}
              </label>
              <Select
                options={VEHICLE_COLOUR_OPTIONS.map((colour) => ({
                  value: colour,
                  label: colour,
                }))}
                value={
                  currentValue
                    ? { value: String(currentValue), label: String(currentValue) }
                    : null
                }
                onChange={(newValue) => {
                  const value = newValue?.value ?? '';
                  setValue(fieldName, value, { shouldValidate: true });
                }}
                placeholder="Select colour"
                isClearable
                isSearchable={false}
                className="react-select-container"
                classNamePrefix="react-select"
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: '48px',
                    borderColor: error ? '#ef4444' : '#d1d5db',
                    '&:hover': {
                      borderColor: error ? '#ef4444' : '#9ca3af',
                    },
                  }),
                }}
              />
              <input
                type="hidden"
                {...register(fieldName, {
                  required: spec.required ? 'Colour is required' : false,
                })}
              />
              {error && (
                <p className="text-red-500 text-sm mt-1">
                  {error.message as string}
                </p>
              )}
            </div>
          );
        }

        // Vehicles: Fuel Type searchable dropdown — same UI as Brand
        if (isVehicleSpecContext && (spec.name === 'fuel_type' || spec.name === 'fuel')) {
          return (
            <div key={spec.id}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {spec.label || 'Fuel Type'}{' '}
                {spec.required && <span className="text-red-500">*</span>}
              </label>
              <Select
                options={VEHICLE_FUEL_OPTIONS.map((fuel) => ({
                  value: fuel,
                  label: fuel,
                }))}
                value={
                  currentValue
                    ? { value: String(currentValue), label: String(currentValue) }
                    : null
                }
                onChange={(newValue) => {
                  const value = newValue?.value ?? '';
                  setValue(fieldName, value, { shouldValidate: true });
                }}
                placeholder="Select fuel type"
                isClearable
                isSearchable={false}
                className="react-select-container"
                classNamePrefix="react-select"
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: '48px',
                    borderColor: error ? '#ef4444' : '#d1d5db',
                    '&:hover': {
                      borderColor: error ? '#ef4444' : '#9ca3af',
                    },
                  }),
                }}
              />
              <input
                type="hidden"
                {...register(fieldName, {
                  required: spec.required ? `${spec.label || 'Fuel Type'} is required` : false,
                })}
              />
              {error && (
                <p className="text-red-500 text-sm mt-1">
                  {error.message as string}
                </p>
              )}
            </div>
          );
        }

        // Vehicles: Transmission searchable dropdown — same UI as Brand
        if (isVehicleSpecContext && spec.name === 'transmission') {
          return (
            <div key={spec.id}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {spec.label || 'Transmission'}{' '}
                {spec.required && <span className="text-red-500">*</span>}
              </label>
              <Select
                options={VEHICLE_TRANSMISSION_OPTIONS.map((tr) => ({
                  value: tr,
                  label: tr,
                }))}
                value={
                  currentValue
                    ? { value: String(currentValue), label: String(currentValue) }
                    : null
                }
                onChange={(newValue) => {
                  const value = newValue?.value ?? '';
                  setValue(fieldName, value, { shouldValidate: true });
                }}
                placeholder="Select transmission"
                isClearable
                isSearchable={false}
                className="react-select-container"
                classNamePrefix="react-select"
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: '48px',
                    borderColor: error ? '#ef4444' : '#d1d5db',
                    '&:hover': {
                      borderColor: error ? '#ef4444' : '#9ca3af',
                    },
                  }),
                }}
              />
              <input
                type="hidden"
                {...register(fieldName, {
                  required: spec.required ? `${spec.label || 'Transmission'} is required` : false,
                })}
              />
              {error && (
                <p className="text-red-500 text-sm mt-1">
                  {error.message as string}
                </p>
              )}
            </div>
          );
        }

        // Skip rent field if it's handled elsewhere
        if (spec.name === 'rent') {
          return null;
        }
        
        // Special handling for price field - simple numeric input
        if (spec.name === 'price' && spec.type === 'number') {
          return (
            <div key={spec.id}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {spec.label} {spec.required && <span className="text-red-500">*</span>}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register(fieldName, {
                  required: spec.required ? `${spec.label} is required` : false,
                  valueAsNumber: true,
                  validate: (value) => {
                    if (spec.required) {
                      if (value === null || value === undefined || value === '') {
                        return `${spec.label} is required`;
                      }
                      const numValue = typeof value === 'number' ? value : parseFloat(String(value));
                      if (isNaN(numValue)) {
                        return `${spec.label} must be a valid number`;
                      }
                      if (numValue < 0) {
                        return `${spec.label} must be greater than or equal to 0`;
                      }
                    } else if (value !== null && value !== undefined && value !== '') {
                      const numValue = typeof value === 'number' ? value : parseFloat(String(value));
                      if (isNaN(numValue)) {
                        return `${spec.label} must be a valid number`;
                      }
                      if (numValue < 0) {
                        return `${spec.label} must be greater than or equal to 0`;
                      }
                    }
                    return true;
                  },
                  setValueAs: (value) => {
                    if (value === null || value === undefined || value === '') {
                      return undefined;
                    }
                    const numValue = typeof value === 'number' ? value : parseFloat(String(value));
                    return isNaN(numValue) ? undefined : numValue;
                  }
                })}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  error ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {error && (
                <p className="text-red-500 text-sm mt-1">
                  {error.message as string}
                </p>
              )}
              {aiPriceSuggestion && (aiPriceSuggestion.min || aiPriceSuggestion.max || aiPriceSuggestion.suggested) && (
                <div className="mt-2 text-xs text-gray-600 flex items-center justify-between gap-2">
                  <span>
                    Suggested price:{' '}
                    {aiPriceSuggestion.min && aiPriceSuggestion.max
                      ? `₹${aiPriceSuggestion.min.toLocaleString('en-IN')} – ₹${aiPriceSuggestion.max.toLocaleString('en-IN')}`
                      : `₹${(aiPriceSuggestion.suggested ?? aiPriceSuggestion.min ?? aiPriceSuggestion.max)?.toLocaleString('en-IN')}`}
                    {aiPriceSuggestion.source === 'db'
                      ? ' (based on similar ads)'
                      : ' (AI estimate)'}
                  </span>
                  {onApplySuggestedPrice && (
                    <button
                      type="button"
                      onClick={() => {
                        const num =
                          aiPriceSuggestion.suggested ??
                          aiPriceSuggestion.min ??
                          aiPriceSuggestion.max;
                        if (num != null) {
                          setValue(fieldName, num, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                          onApplySuggestedPrice();
                        }
                      }}
                      className="shrink-0 px-2 py-1 rounded border border-primary-300 text-primary-700 text-[11px] font-medium hover:bg-primary-50"
                    >
                      Use price
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        }

        // Special handling for brand field
        if (spec.name === 'brand') {
          // Filter out unwanted test entries
          const unwantedEntries = ['mokia', 'yyytytty'];
          
          // Get brand options from brands-models API if available
          let brandOptionsFromAPI: any[] = [];
          if (brandsModelsData?.brands && brandsModelsData.brands.length > 0) {
            brandOptionsFromAPI = brandsModelsData.brands
              .filter((brand: any) => {
                const brandName = (brand.name || brand || '').toLowerCase();
                return !unwantedEntries.some(entry => 
                  brandName === entry || brandName.includes(entry)
                );
              })
              .map((brand: any) => ({
                value: brand.name || brand,
                label: brand.name || brand
              }));
          }
          
          // Get brand options from specification options (database)
          const brandOptionsFromSpec = (spec.options || [])
            .filter(opt => {
              const optValue = (opt.value || '').toLowerCase();
              return !unwantedEntries.some(entry => optValue.includes(entry));
            })
            .map(opt => ({
              value: opt.value,
              label: opt.label || opt.value
            }));
          
          // Combine both sources, prefer API data, then spec options
          const allBrandOptions = [
            ...brandOptionsFromAPI,
            ...brandOptionsFromSpec.filter(apiOpt => 
              !brandOptionsFromAPI.some(dbOpt => dbOpt.value === apiOpt.value)
            )
          ];

          return (
            <div key={spec.id}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {spec.label} {spec.required && <span className="text-red-500">*</span>}
              </label>
              <Select
                options={allBrandOptions}
                value={currentValue ? { value: currentValue, label: currentValue } : null}
                onChange={(newValue) => {
                  const value = (newValue as any)?.value || '';
                  setValue(fieldName, value);
                  setValue('attributes.model', '');
                }}
                placeholder={isLoadingBrandsModels ? 'Loading brands...' : (spec.placeholder || `Select ${spec.label.toLowerCase()}`)}
                noOptionsMessage={() => isLoadingBrandsModels ? 'Loading...' : (allBrandOptions.length === 0 ? 'No brands found' : 'No matches')}
                isClearable
                isSearchable={false}
                openMenuOnFocus
                tabSelectsValue={false}
                className="react-select-container"
                classNamePrefix="react-select"
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: '48px',
                    borderColor: error ? '#ef4444' : '#d1d5db',
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: error ? '#ef4444' : '#9ca3af'
                    }
                  })
                }}
              />
              {error && (
                <p className="text-red-500 text-sm mt-1">
                  {error.message as string || `${spec.label} is required`}
                </p>
              )}
            </div>
          );
        }

        // Special handling for model field
        if (spec.name === 'model') {
          // Filter out unwanted test entries
          const unwantedEntries = ['mokia', 'yyytytty'];
          
          // Get model options from brands-models API if brand is selected
          let modelOptionsFromAPI: any[] = [];
          if (brandsModelsData?.brands && selectedBrand) {
            const models = getModelsForBrand(selectedBrand);
            modelOptionsFromAPI = models
              .filter((model: string) => {
                const modelName = (model || '').toLowerCase();
                return !unwantedEntries.some(entry => 
                  modelName === entry || modelName.includes(entry)
                );
              })
              .map((model: string) => ({
                value: model,
                label: model
              }));
          }
          
          // Get model options from specification options (database)
          const modelOptionsFromSpec = (spec.options || [])
            .filter(opt => {
              const optValue = (opt.value || '').toLowerCase();
              return !unwantedEntries.some(entry => optValue.includes(entry));
            })
            .map(opt => ({
              value: opt.value,
              label: opt.label || opt.value
            }));
          
          // Combine both sources
          const allModelOptions = [
            ...modelOptionsFromAPI,
            ...modelOptionsFromSpec.filter(specOpt => 
              !modelOptionsFromAPI.some(apiOpt => apiOpt.value === specOpt.value)
            )
          ];

          return (
            <div key={spec.id}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {spec.label} {spec.required && <span className="text-red-500">*</span>}
              </label>
              <Select
                options={allModelOptions}
                value={currentValue ? { value: currentValue, label: currentValue } : null}
                onChange={(newValue) => {
                  const value = (newValue as any)?.value || '';
                  setValue(fieldName, value);
                }}
                placeholder={
                  selectedBrand
                    ? (allModelOptions.length === 0 ? 'Loading models...' : `Select ${spec.label.toLowerCase()}`)
                    : spec.required
                      ? 'Select brand first'
                      : `Select ${spec.label.toLowerCase()}`
                }
                noOptionsMessage={() => !selectedBrand ? 'Select brand first' : (allModelOptions.length === 0 ? 'No models for this brand' : 'No matches')}
                isClearable
                isSearchable={false}
                openMenuOnFocus
                tabSelectsValue={false}
                isDisabled={spec.required && !selectedBrand}
                className="react-select-container"
                classNamePrefix="react-select"
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: '48px',
                    borderColor: error ? '#ef4444' : '#d1d5db',
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: error ? '#ef4444' : '#9ca3af'
                    }
                  })
                }}
              />
              {spec.required && !selectedBrand && (
                <p className="text-gray-400 text-xs mt-1">Please select a brand first</p>
              )}
              {error && (
                <p className="text-red-500 text-sm mt-1">
                  {error.message as string || `${spec.label} is required`}
                </p>
              )}
            </div>
          );
        }

        // Regular select field
        if (spec.type === 'select') {
          // Filter out unwanted test entries from options and custom values
          const unwantedEntries = ['mokia', 'yyytytty'];
          const filteredOptions = (spec.options || [])
            .filter(opt => {
              const optValue = (opt.value || '').toLowerCase();
              const optLabel = (opt.label || '').toLowerCase();
              return !unwantedEntries.some(entry => 
                optValue.includes(entry) || optLabel.includes(entry)
              );
            })
            .map(opt => ({
              value: opt.value,
              label: opt.label || opt.value
            }));
          
          const filteredCustomValues = (spec.customValues || [])
            .filter(val => {
              const valLower = (val || '').toLowerCase();
              return !unwantedEntries.some(entry => valLower.includes(entry));
            })
            .map(val => ({
              value: val,
              label: val
            }));

          return (
            <div key={spec.id}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {spec.label} {spec.required && <span className="text-red-500">*</span>}
              </label>
              <Select
                options={[
                  ...filteredOptions,
                  ...filteredCustomValues
                ]}
                value={currentValue ? { value: currentValue, label: currentValue } : null}
                onChange={(newValue) => {
                  const value = (newValue as any)?.value || '';
                  setValue(fieldName, value);
                }}
                placeholder={spec.placeholder || `Select ${spec.label.toLowerCase()}`}
                isClearable
                isSearchable={false}
                className="react-select-container"
                classNamePrefix="react-select"
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: '48px',
                    borderColor: error ? '#ef4444' : '#d1d5db',
                    '&:hover': {
                      borderColor: error ? '#ef4444' : '#9ca3af'
                    }
                  })
                }}
              />
              {error && (
                <p className="text-red-500 text-sm mt-1">
                  {error.message as string || `${spec.label} is required`}
                </p>
              )}
            </div>
          );
        }

        // Text field
        if (spec.type === 'text') {
          return (
            <div key={spec.id}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {spec.label} {spec.required && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                {...register(fieldName, {
                  required: spec.required ? `${spec.label} is required` : false
                })}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  error ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder={spec.placeholder || `Enter ${spec.label.toLowerCase()}`}
              />
              {error && (
                <p className="text-red-500 text-sm mt-1">
                  {error.message as string}
                </p>
              )}
            </div>
          );
        }

        // Number field
        if (spec.type === 'number') {
          return (
            <div key={spec.id}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {spec.label} {spec.required && <span className="text-red-500">*</span>}
              </label>
              <input
                type="number"
                {...register(fieldName, {
                  required: spec.required ? `${spec.label} is required` : false,
                  valueAsNumber: true
                })}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  error ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder={spec.placeholder || `Enter ${spec.label.toLowerCase()}`}
              />
              {error && (
                <p className="text-red-500 text-sm mt-1">
                  {error.message as string}
                </p>
              )}
            </div>
          );
        }

        // Multiselect field
        if (spec.type === 'multiselect') {
          // Filter out unwanted test entries from options and custom values
          const unwantedEntries = ['mokia', 'yyytytty'];
          const filteredMultiOptions = (spec.options || [])
            .filter(opt => {
              const optValue = (opt.value || '').toLowerCase();
              const optLabel = (opt.label || '').toLowerCase();
              return !unwantedEntries.some(entry => 
                optValue.includes(entry) || optLabel.includes(entry)
              );
            })
            .map(opt => ({
              value: opt.value,
              label: opt.label || opt.value
            }));
          
          const filteredMultiCustomValues = (spec.customValues || [])
            .filter(val => {
              const valLower = (val || '').toLowerCase();
              return !unwantedEntries.some(entry => valLower.includes(entry));
            })
            .map(val => ({
              value: val,
              label: val
            }));

          return (
            <div key={spec.id}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {spec.label} {spec.required && <span className="text-red-500">*</span>}
              </label>
              <Select
                isMulti
                options={[
                  ...filteredMultiOptions,
                  ...filteredMultiCustomValues
                ]}
                value={Array.isArray(currentValue) 
                  ? currentValue.map((v: any) => ({ value: v, label: v }))
                  : []}
                onChange={(newValues) => {
                  const values = (newValues as any[]).map(v => v.value);
                  setValue(fieldName, values);
                }}
                placeholder={spec.placeholder || `Select ${spec.label.toLowerCase()}`}
                isClearable
                isSearchable={false}
                className="react-select-container"
                classNamePrefix="react-select"
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: '48px',
                    borderColor: error ? '#ef4444' : '#d1d5db',
                    '&:hover': {
                      borderColor: error ? '#ef4444' : '#9ca3af'
                    }
                  })
                }}
              />
              {error && (
                <p className="text-red-500 text-sm mt-1">
                  {error.message as string || `${spec.label} is required`}
                </p>
              )}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
