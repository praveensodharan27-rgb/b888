'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { FiCheck, FiPlus, FiSearch, FiDollarSign, FiCalendar, FiMapPin, FiTag, FiGrid, FiSliders, FiChevronDown, FiChevronUp, FiHome, FiSettings, FiCpu, FiCheckCircle } from 'react-icons/fi';
import { MdOutlineBed, MdOutlineBathtub, MdOutlineSquareFoot, MdOutlineWeekend, MdOutlineLocalGasStation, MdMemory, MdStorage, MdOutlineMonitor } from 'react-icons/md';
import { isMobileSpecKey, isVehiclesCategory, isPhoneCategory, PHONE_SPEC_KEYS, VEHICLE_HIDDEN_SPEC_KEYS } from '@/lib/filterConstants';
import { getCategoryPriceProfile, formatPriceForProfile } from '@/lib/categoryPriceRanges';
import { getBrandLogoUrl } from '@/lib/brandLogoDomains';
import RangeSlider from '@/components/RangeSlider';

interface AdsFilterSidebarProps {
  filters: Record<string, any>;
  onFilterChange: (filters: Record<string, any>) => void;
  categorySlug?: string;
  subcategorySlug?: string;
  /** Fallback total ads count from listing API when filter-options counts are not yet available */
  fallbackTotalCount?: number;
}


const PRICE_MIN = 0;
const PRICE_MAX = 10000000;
const INITIAL_OPTIONS_SHOW = 5; // Show 5 first, rest via search (for specs)
const BRAND_INITIAL_LIMIT = 8;  // Show 8 brands first, then View More / View Less

const RADIUS_OPTIONS = [
  { value: '10', label: '10 km' },
  { value: '25', label: '25 km' },
  { value: '50', label: '50 km' },
  { value: '100', label: '100 km' },
];

const POSTED_DATE_OPTIONS = [
  { value: '', label: 'Any time' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '3d', label: 'Last 3 days' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

// Label for spec keys (RAM, Storage, Processor, Cars, etc.)
const SPEC_LABELS: Record<string, string> = {
  ram: 'RAM',
  storage: 'Storage',
  processor: 'Processor',
  graphics: 'Graphics',
  screen_size: 'Screen Size',
  resolution: 'Resolution',
  os: 'OS',
  camera: 'Camera',
  battery: 'Battery',
  display: 'Display',
  connectivity: 'Connectivity',
  megapixel: 'Megapixel',
  lens_type: 'Lens Type',
  power: 'Power',
  capacity: 'Capacity',
  controllers: 'Controllers',
  type: 'Type',
  year: 'Year',
  fuel: 'Fuel Type',
  fuel_type: 'Fuel Type',
  km_driven: 'KM Driven',
  transmission: 'Transmission',
  owners: 'Owners',
  engine_cc: 'Engine (CC)',
  color: 'Color',
  warranty: 'Warranty',
  compatible_with: 'Compatible With',
  smart_tv: 'Smart TV',
};
function specKeyToLabel(key: string): string {
  return SPEC_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Icon component for each filter section – meaningful icons per category (20–22px, primary color). Matches Vehicles, Property, Electronics, and general filters. */
const SPEC_SECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  // Property
  type: FiHome,
  bedrooms: MdOutlineBed,
  bedroom: MdOutlineBed,
  bathrooms: MdOutlineBathtub,
  bathroom: MdOutlineBathtub,
  area_sqft: MdOutlineSquareFoot,
  area: MdOutlineSquareFoot,
  sqft: MdOutlineSquareFoot,
  furnishing: MdOutlineWeekend,
  // Vehicles
  year: FiCalendar,
  engine_cc: FiSettings,
  fuel_type: MdOutlineLocalGasStation,
  fuel: MdOutlineLocalGasStation,
  transmission: FiSettings,
  km_driven: FiSettings,
  owners: FiTag,
  color: FiTag,
  // Electronics / Laptop
  processor: FiCpu,
  ram: MdMemory,
  storage: MdStorage,
  graphics: MdOutlineMonitor,
  display: MdOutlineMonitor,
  screen_size: MdOutlineMonitor,
  resolution: MdOutlineMonitor,
  camera: FiTag,
  battery: FiTag,
  os: FiCpu,
  connectivity: FiSettings,
  // General
  condition: FiCheckCircle,
  warranty: FiCheckCircle,
};
function getSpecSectionIcon(key: string): React.ComponentType<{ className?: string }> {
  const normalized = key.toLowerCase().replace(/\s+/g, '_');
  return SPEC_SECTION_ICONS[key] ?? SPEC_SECTION_ICONS[normalized] ?? FiSliders;
}

function FilterSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="filter-card-content bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden px-5 py-4 pointer-events-auto">
      {children}
    </div>
  );
}

function RadioOption({
  value,
  label,
  selected,
  onChange,
}: {
  value: string;
  label: string;
  selected: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className="flex items-center gap-3 cursor-pointer py-2.5 group pointer-events-auto select-none"
      onClick={(e) => {
        e.preventDefault();
        onChange();
      }}
    >
      <input type="radio" checked={selected} onChange={onChange} className="sr-only" aria-label={label} />
      <div
        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 pointer-events-none ${
          selected ? 'border-primary-600 bg-primary-500' : 'border-gray-300 group-hover:border-primary-400'
        }`}
      >
        {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
      </div>
      <span className="text-sm font-medium text-gray-700 pointer-events-none">{label}</span>
    </label>
  );
}

/** Option with tick (checkmark) when selected - for Radius etc. */
function OptionWithTick({
  value,
  label,
  selected,
  onChange,
}: {
  value: string;
  label: string;
  selected: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className="flex items-center gap-3 cursor-pointer py-2.5 group pointer-events-auto select-none"
      onClick={(e) => {
        e.preventDefault();
        onChange();
      }}
    >
      <input type="radio" checked={selected} onChange={onChange} className="sr-only" aria-label={label} />
      <div
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 pointer-events-none ${
          selected ? 'border-primary-600 bg-primary-500 text-white' : 'border-gray-300 group-hover:border-primary-400'
        }`}
      >
        {selected && <FiCheck className="w-3.5 h-3.5" strokeWidth={3} />}
      </div>
      <span className="text-sm font-medium text-gray-700 pointer-events-none">{label}</span>
    </label>
  );
}

function RadioOptionWithCount({
  value,
  label,
  count,
  selected,
  onChange,
  logoSrc,
  showBrandAvatar,
}: {
  value: string;
  label: string;
  count?: number | null;
  selected: boolean;
  onChange: () => void;
  logoSrc?: string | null;
  /** When true, always show logo slot: image or first-letter fallback */
  showBrandAvatar?: boolean;
}) {
  const [logoError, setLogoError] = useState(false);
  useEffect(() => {
    if (logoSrc) setLogoError(false);
  }, [logoSrc]);
  const showLogo = logoSrc && !logoError;
  const showSlot = showBrandAvatar || logoSrc;
  return (
    <label
      className="flex items-center gap-2 sm:gap-3 cursor-pointer py-2 group w-full pointer-events-auto select-none"
      onClick={(e) => {
        e.preventDefault();
        onChange();
      }}
    >
      <input type="radio" checked={selected} onChange={onChange} className="sr-only" aria-label={label} />
      <div
        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 pointer-events-none ${
          selected ? 'border-primary-600 bg-primary-500' : 'border-gray-300 group-hover:border-primary-400'
        }`}
      >
        {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
      </div>
      {showSlot ? (
        <span className="w-5 h-5 min-w-[20px] min-h-[20px] flex-shrink-0 flex items-center justify-center pointer-events-none bg-gray-100 rounded overflow-hidden shrink-0">
          {showLogo ? (
            <img
              key={logoSrc ?? ''}
              src={logoSrc!}
              alt=""
              width={20}
              height={20}
              className="w-5 h-5 min-w-[20px] min-h-[20px] object-contain inline-block"
              loading="lazy"
              decoding="async"
              onError={() => setLogoError(true)}
            />
          ) : (
            <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-semibold text-gray-600 uppercase shrink-0">
              {label.charAt(0)}
            </span>
          )}
        </span>
      ) : null}
      <span className="text-sm font-medium text-gray-700 flex-1 min-w-0 truncate pointer-events-none">{label}</span>
      {count != null && (
        <span className="text-sm text-gray-900 font-medium tabular-nums flex-shrink-0 pointer-events-none">
          {count.toLocaleString()}
        </span>
      )}
    </label>
  );
}

/** Square checkbox option for Budget price ranges (with optional count) */
function BudgetRangeOption({
  label,
  selected,
  count,
  onChange,
}: {
  label: string;
  selected: boolean;
  count?: number | null;
  onChange: () => void;
}) {
  return (
    <label
      className="flex items-center gap-3 cursor-pointer py-2.5 group w-full pointer-events-auto select-none"
      onClick={(e) => {
        e.preventDefault();
        onChange();
      }}
    >
      <input type="radio" checked={selected} onChange={onChange} className="sr-only" aria-label={label} />
      <div
        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 pointer-events-none ${
          selected ? 'border-primary-600 bg-primary-500' : 'border-gray-300 group-hover:border-primary-400'
        }`}
      >
        {selected && <FiCheck className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
      </div>
      <span className="text-sm font-medium text-gray-700 flex-1 min-w-0 pointer-events-none">{label}</span>
      {count != null && (
        <span className="text-sm text-gray-900 font-medium tabular-nums flex-shrink-0 pointer-events-none">
          {count}
        </span>
      )}
    </label>
  );
}

export default function AdsFilterSidebar({ filters, onFilterChange, categorySlug, subcategorySlug, fallbackTotalCount }: AdsFilterSidebarProps) {
  const minPrice = Number(filters.minPrice || filters.priceMin) || PRICE_MIN;
  const maxPrice = Number(filters.maxPrice || filters.priceMax) || PRICE_MAX;

  // Main category only → common filters (Brand, Price, Condition, Posted Date, Distance, Sort). Subcategory → + full specs (Model, RAM, etc.)
  const hasCategory = Boolean(categorySlug);
  const hasSubcategory = Boolean(categorySlug && subcategorySlug);
  // 1) Filter options from actual products (includes priceBucketCounts + filterOptionCounts for Brand/Model/Spec labels)
  const { data: filterOptionsData } = useQuery({
    queryKey: ['ads', 'filter-options', categorySlug, subcategorySlug, filters.location, filters.brand],
    queryFn: async () => {
      const empty = {
        filterOptions: {} as Record<string, string[]>,
        brandModels: {} as Record<string, unknown>,
        priceBucketCounts: [] as number[],
        filterOptionCounts: {} as Record<string, Record<string, number>>,
        totalCount: 0,
      };
      try {
        const brandParam = filters?.brand != null
          ? (Array.isArray(filters.brand) ? filters.brand[0] : filters.brand)
          : undefined;
        const res = await api.get<{
          filterOptions?: Record<string, string[]>;
          brandModels?: Record<string, unknown>;
          priceBucketCounts?: number[];
          filterOptionCounts?: Record<string, Record<string, number>>;
          totalCount?: number;
        }>('/ads/filter-options', {
          params: {
            category: categorySlug,
            subcategory: subcategorySlug,
            ...(filters.location ? { location: String(filters.location) } : {}),
            ...(brandParam ? { brand: String(brandParam) } : {}),
          },
        });
        const data = res.data ?? {};
        return {
          filterOptions: data.filterOptions ?? empty.filterOptions,
          brandModels: data.brandModels ?? empty.brandModels,
          priceBucketCounts: Array.isArray(data.priceBucketCounts) ? data.priceBucketCounts : empty.priceBucketCounts,
          filterOptionCounts: data.filterOptionCounts && typeof data.filterOptionCounts === 'object' ? data.filterOptionCounts : empty.filterOptionCounts,
          totalCount: typeof data.totalCount === 'number' ? data.totalCount : empty.totalCount,
        };
      } catch (err) {
        return empty;
      }
    },
    enabled: hasCategory,
    staleTime: 60 * 1000, // 1 min so counts refresh when filters change
    retry: false,
    throwOnError: false,
  });

  // 2) Filter options from spec config — when category selected
  const { data: configFilterOptionsData, isLoading: isConfigLoading } = useQuery({
    queryKey: ['categories', 'filter-options-from-config', categorySlug, subcategorySlug],
    queryFn: async () => {
      const empty = { filterOptions: {} as Record<string, string[]>, brandModels: {} as Record<string, unknown>, fields: [] as unknown[] };
      try {
        const res = await api.get('/categories/filter-options-from-config', {
          params: { category: categorySlug, subcategory: subcategorySlug },
        });
        return {
          filterOptions: res.data?.filterOptions ?? empty.filterOptions,
          brandModels: res.data?.brandModels ?? empty.brandModels,
          fields: (res.data?.fields ?? empty.fields) as string[],
        };
      } catch {
        return empty;
      }
    },
    enabled: hasCategory,
    staleTime: 60 * 60 * 1000,
    retry: 1,
    throwOnError: false,
  });

  // 3) Fallback: master brands-models — when category selected
  const { data: brandsModelsData } = useQuery({
    queryKey: ['categories', 'brands-models', categorySlug, subcategorySlug],
    queryFn: async () => {
      try {
        const res = await api.get('/categories/brands-models', {
          params: { categorySlug, subcategorySlug },
        });
        const categories = res.data?.categories || [];
        const cat = categories[0];
        const subcats = cat?.subcategories || [];
        const sub = subcats[0];
        const rawBrands = sub?.brands || [];
        const brands = Array.isArray(rawBrands)
          ? rawBrands.map((b: any) => ({
              name: typeof b === 'object' && b != null ? (b.name ?? b) : String(b),
              models: Array.isArray((b as any)?.models) ? (b as any).models : [],
            }))
          : [];
        return { brands };
      } catch {
        return { brands: [] };
      }
    },
    enabled: hasCategory,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  // Merge: prefer product data, fallback to config so ALL specs show (e.g. from All Categories → Laptops)
  const fromProducts = filterOptionsData?.filterOptions ?? {};
  const fromConfig = configFilterOptionsData?.filterOptions ?? {};
  const brandModelsFromProducts = filterOptionsData?.brandModels ?? {};
  const brandModelsFromConfig = configFilterOptionsData?.brandModels ?? {};
  const fallbackBrands = brandsModelsData?.brands ?? [];

  // Aliases: fuel and fuel_type are the same - merge into fuel_type to avoid duplicate Fuel Type cards
  const FUEL_ALIASES = { fuel: 'fuel_type', fuel_type: 'fuel_type' } as const;
  const mergedFilterOptions = useMemo(() => {
    const allKeys = Array.from(new Set([...Object.keys(fromProducts), ...Object.keys(fromConfig)]));
    const merged: Record<string, string[]> = {};
    for (const k of allKeys) {
      const canonical = (FUEL_ALIASES as Record<string, string>)[k] ?? k;
      const productOpts = fromProducts[k];
      const configOpts = fromConfig[k];
      const list = (Array.isArray(productOpts) && productOpts.length > 0 ? productOpts : configOpts) ?? [];
      if (Array.isArray(list) && list.length > 0) {
        const existing = merged[canonical] ?? [];
        const combined = Array.from(new Set([...existing, ...list]));
        merged[canonical] = combined;
      }
    }
    return merged;
  }, [fromProducts, fromConfig]);

  const mergedBrandModels = useMemo(() => {
    const productKeys = Object.keys(brandModelsFromProducts);
    if (productKeys.length) return brandModelsFromProducts as Record<string, string[]>;
    const configKeys = Object.keys(brandModelsFromConfig);
    if (configKeys.length) return brandModelsFromConfig as Record<string, string[]>;
    return Object.fromEntries(
      (fallbackBrands as { name: string; models: string[] }[]).map((b) => [b.name, b.models ?? []])
    );
  }, [brandModelsFromProducts, brandModelsFromConfig, fallbackBrands]);

  const brandsFromMerged = (mergedFilterOptions.brand ?? []) as string[];
  const brandsList = brandsFromMerged.length
    ? brandsFromMerged.map((name: string) => ({ name, models: mergedBrandModels[name] ?? [] }))
    : (fallbackBrands as { name: string; models: string[] }[]);
  const selectedBrand = filters.brand || (Array.isArray(filters.brand) ? filters.brand[0] : undefined);
  const selectedBrandObj = selectedBrand && brandsList.length
    ? brandsList.find((b: any) => b.name === selectedBrand)
    : null;
  const modelsForBrand = selectedBrandObj?.models ?? [];
  const selectedModel = filters.model || (Array.isArray(filters.model) ? filters.model[0] : undefined);

  const [brandSearch, setBrandSearch] = useState('');
  const [brandVisibleCount, setBrandVisibleCount] = useState(BRAND_INITIAL_LIMIT);
  const [budgetExpanded, setBudgetExpanded] = useState(true);
  // Per spec-card: show 5 first, then search or expand (key -> { search, expanded })
  const [specCardState, setSpecCardState] = useState<Record<string, { search: string; expanded: boolean }>>({});
  const setSpecCard = (key: string, patch: { search?: string; expanded?: boolean }) => {
    setSpecCardState((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? { search: '', expanded: false }), ...patch },
    }));
  };
  const filteredBrands = useMemo(() => {
    if (!brandSearch.trim()) return brandsList;
    const q = brandSearch.trim().toLowerCase();
    return brandsList.filter((b: any) => b.name.toLowerCase().includes(q));
  }, [brandsList, brandSearch]);

  // Category-based price profile (vehicles, mobiles, properties, jobs, services, default)
  const priceProfile = useMemo(
    () => getCategoryPriceProfile(categorySlug, subcategorySlug),
    [categorySlug, subcategorySlug]
  );
  const profileMin = priceProfile.sliderMin;
  const profileMax = priceProfile.sliderMax;

  // Price bucket counts and per-option counts from filter-options response
  const priceBucketCounts: number[] = Array.isArray(filterOptionsData?.priceBucketCounts)
    ? filterOptionsData.priceBucketCounts
    : [];
  const filterOptionCounts: Record<string, Record<string, number>> = filterOptionsData?.filterOptionCounts && typeof filterOptionsData.filterOptionCounts === 'object'
    ? filterOptionsData.filterOptionCounts
    : {};
  const totalCountFromApi: number = typeof filterOptionsData?.totalCount === 'number' ? filterOptionsData.totalCount : 0;
  const totalCount: number = totalCountFromApi > 0 ? totalCountFromApi : (fallbackTotalCount ?? 0);

  // Hide options with count 0 (show when count is undefined or > 0)
  const brandsToShow = useMemo(() => {
    return filteredBrands.filter((b: any) => {
      const c = filterOptionCounts.brand?.[b.name];
      return c === undefined || c > 0;
    });
  }, [filteredBrands, filterOptionCounts]);

  // Limit visible brands on desktop filter sidebar: show 8 initially, allow expanding to full list.
  const visibleBrands = useMemo(() => {
    // When searching, always show the full filtered list (no limitation).
    if (brandSearch.trim()) return brandsToShow;
    return brandsToShow.slice(0, brandVisibleCount);
  }, [brandsToShow, brandSearch, brandVisibleCount]);

  const hasMoreBrands =
    !brandSearch.trim() && brandsToShow.length > brandVisibleCount;

  const canCollapseBrands =
    !brandSearch.trim() &&
    brandsToShow.length > BRAND_INITIAL_LIMIT &&
    brandVisibleCount >= brandsToShow.length;

  // Clamp displayed price to current profile range (when category changes, values may be out of range)
  const clampedMinPrice = useMemo(() => {
    const v = minPrice;
    const num = Number(v);
    if (v == null || String(v).trim() === '' || Number.isNaN(num) || num <= profileMin) return profileMin;
    return Math.min(num, profileMax);
  }, [minPrice, profileMin, profileMax]);
  const clampedMaxPrice = useMemo(() => {
    const v = maxPrice;
    const num = Number(v);
    if (v == null || String(v).trim() === '' || Number.isNaN(num) || num >= profileMax) return profileMax;
    return Math.max(num, profileMin);
  }, [maxPrice, profileMin, profileMax]);

  // When category changes, clear price filter if current values are outside the new profile range
  useEffect(() => {
    const currentMin = Number(filters.minPrice ?? filters.priceMin ?? '');
    const currentMax = Number(filters.maxPrice ?? filters.priceMax ?? '');
    if (!currentMin && !currentMax) return;
    const outOfRange =
      (currentMin && currentMin < profileMin) ||
      (currentMax && currentMax > profileMax) ||
      (currentMin && currentMin > profileMax) ||
      (currentMax && currentMax < profileMin);
    if (outOfRange) {
      onFilterChange({
        ...filters,
        minPrice: '',
        maxPrice: '',
        priceMin: '',
        priceMax: '',
        page: 1,
      });
    }
  }, [categorySlug, subcategorySlug]);

  const handlePriceChange = (value: [number, number] | { min: number; max: number }) => {
    const [a, b] = Array.isArray(value) ? value : [value.min, value.max];
    onFilterChange({
      ...filters,
      minPrice: a <= profileMin ? '' : a,
      maxPrice: b >= profileMax ? '' : b,
      priceMin: a <= profileMin ? '' : a,
      priceMax: b >= profileMax ? '' : b,
      page: 1,
    });
  };

  const handlePostedDateChange = (value: string) => {
    onFilterChange({
      ...filters,
      postedTime: value || undefined,
      page: 1,
    });
  };

  const currentRadius = filters.radius || '50';
  const handleRadiusChange = (value: string) => {
    onFilterChange({
      ...filters,
      radius: value,
      page: 1,
    });
  };

  const handleClearSelection = () => {
    const cleared: Record<string, unknown> = {
      ...filters,
      category: '',
      subcategory: '',
      search: '',
      minPrice: '',
      maxPrice: '',
      priceMin: '',
      priceMax: '',
      brand: '',
      model: '',
      condition: '',
      radius: '50',
      postedTime: '',
      sort: 'newest',
      page: 1,
    };
    specFilterKeys.forEach((k) => {
      cleared[k] = '';
    });
    onFilterChange(cleared as Record<string, any>);
  };

  const handleBrandChange = (brand: string) => {
    onFilterChange({
      ...filters,
      brand: brand || undefined,
      model: undefined,
      page: 1,
    });
  };

  const handleModelChange = (model: string) => {
    onFilterChange({
      ...filters,
      model: model || undefined,
      page: 1,
    });
  };

  const handleSpecChange = (key: string, value: string) => {
    const updates: Record<string, unknown> = { ...filters, [key]: value || undefined, page: 1 };
    if (key === 'fuel_type') (updates as Record<string, unknown>).fuel = value || undefined;
    onFilterChange(updates as Record<string, any>);
  };

  // ALL spec fields: from config first, then product data. For Vehicles hide mobile specs. For Phone show only RAM.
  // Deduplicate fuel/fuel_type → keep only fuel_type.
  const specFilterKeys = useMemo(() => {
    const reserved = new Set(['brand', 'model', 'condition']);
    const isVehicles = isVehiclesCategory(categorySlug, subcategorySlug);
    const isPhone = isPhoneCategory(categorySlug, subcategorySlug);
    const fromConfig = (configFilterOptionsData?.fields ?? []) as string[];
    const fromMerged = Object.keys(mergedFilterOptions).filter(
      (k) => !reserved.has(k) && Array.isArray(mergedFilterOptions[k]) && (mergedFilterOptions[k] as string[]).length > 0
    );
    let keys = new Set<string>([...fromConfig.filter((k) => !reserved.has(k)), ...fromMerged]);
    if (isPhone) {
      keys = new Set(Array.from(keys).filter((k) => PHONE_SPEC_KEYS.has(k)));
    } else if (isVehicles) {
      keys = new Set(Array.from(keys).filter((k) => !isMobileSpecKey(k) && !VEHICLE_HIDDEN_SPEC_KEYS.has(k)));
    }
    if (keys.has('fuel') && keys.has('fuel_type')) keys.delete('fuel');
    else if (keys.has('fuel')) {
      keys.delete('fuel');
      keys.add('fuel_type');
    }
    return Array.from(keys);
  }, [mergedFilterOptions, configFilterOptionsData?.fields, categorySlug, subcategorySlug]);

  // Show Brand/Model only when this category actually has brand data (e.g. hide for Services)
  const shouldShowBrand = hasCategory && (brandsList.length > 0 || (mergedFilterOptions.brand?.length ?? 0) > 0);

  return (
    <aside className="w-full lg:w-[280px] flex-shrink-0 space-y-4">
      {/* No category: prompt */}
      {!hasCategory && (
        <FilterSection>
          <p className="text-sm text-gray-500">
            Select a category from All Ads or search to see filters.
          </p>
        </FilterSection>
      )}
      {/* 1. Brand (and Model) – only when this category has brand data */}
      {shouldShowBrand && (
        <FilterSection>
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-2">
            <FiTag className="w-5 h-5 text-primary-600 flex-shrink-0" aria-hidden />
            Brand
          </h3>
          <div className="relative mb-3">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={brandSearch}
              onChange={(e) => setBrandSearch(e.target.value)}
              placeholder="Search brand"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-400"
            />
          </div>
          <div className="space-y-0">
            {totalCount !== 0 && (
              <RadioOptionWithCount
                value=""
                label="All brands"
                count={typeof totalCount === 'number' ? totalCount : undefined}
                selected={!selectedBrand}
                onChange={() => handleBrandChange('')}
              />
            )}
            {visibleBrands.map((b: any) => (
              <RadioOptionWithCount
                key={b.name}
                value={b.name}
                label={b.name}
                count={filterOptionCounts.brand?.[b.name]}
                selected={selectedBrand === b.name}
                onChange={() => handleBrandChange(b.name)}
                logoSrc={getBrandLogoUrl(b.name)}
                showBrandAvatar
              />
            ))}
            {/* View More / View Less for brands (desktop sidebar) */}
            {hasMoreBrands && (
              <button
                type="button"
                onClick={() => setBrandVisibleCount(brandsToShow.length)}
                className="mt-2 text-xs text-primary-600 hover:text-primary-700 font-semibold w-full text-left"
              >
                View More
              </button>
            )}
            {canCollapseBrands && (
              <button
                type="button"
                onClick={() => setBrandVisibleCount(BRAND_INITIAL_LIMIT)}
                className="mt-1 text-xs text-gray-600 hover:text-gray-800 font-semibold w-full text-left"
              >
                View Less
              </button>
            )}
          </div>

          {hasSubcategory && !isPhoneCategory(categorySlug, subcategorySlug) && (
            <>
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-2 mt-5">
                <FiGrid className="w-5 h-5 text-primary-600 flex-shrink-0" aria-hidden />
                Model
              </h3>
              <div className="space-y-0">
                {selectedBrand ? (
                  <>
                    {(() => {
                      const allModelsCount = modelsForBrand.length > 0 && filterOptionCounts.model
                        ? modelsForBrand.reduce((sum, m) => sum + (filterOptionCounts.model[m] ?? 0), 0)
                        : 0;
                      return allModelsCount > 0 ? (
                        <RadioOptionWithCount
                          value=""
                          label="All models"
                          count={allModelsCount}
                          selected={!selectedModel}
                          onChange={() => handleModelChange('')}
                        />
                      ) : null;
                    })()}
                    {modelsForBrand
                      .filter((m: string) => {
                        const c = filterOptionCounts.model?.[m];
                        return c === undefined || c > 0;
                      })
                      .map((m: string) => (
                        <RadioOptionWithCount
                          key={m}
                          value={m}
                          label={m}
                          count={filterOptionCounts.model?.[m]}
                          selected={selectedModel === m}
                          onChange={() => handleModelChange(m)}
                        />
                      ))}
                  </>
                ) : (
                  <p className="text-sm text-gray-400 py-2">Select a brand first</p>
                )}
              </div>
            </>
          )}
        </FilterSection>
      )}

      {/* All other product specs (RAM, Storage, Processor, etc.) – only when subcategory selected */}
      {hasSubcategory && isConfigLoading && specFilterKeys.length === 0 && (
        <FilterSection>
          <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
            <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin" />
            Loading specifications…
          </div>
        </FilterSection>
      )}
      {hasSubcategory &&
        specFilterKeys.map((key) => {
          const options = (mergedFilterOptions[key] ?? []) as string[];
          const label = specKeyToLabel(key);
          const selected = (key === 'fuel_type' ? (filters.fuel_type ?? filters.fuel) : filters[key]) ?? '';
          const card = specCardState[key] ?? { search: '', expanded: false };
          const searchLower = card.search.trim().toLowerCase();
          const filtered = searchLower
            ? options.filter((o) => o.toLowerCase().includes(searchLower))
            : options;
          const showLimit = options.length > INITIAL_OPTIONS_SHOW && !card.expanded && !searchLower;
          const visible = showLimit ? filtered.slice(0, INITIAL_OPTIONS_SHOW) : filtered;
          const moreCount = showLimit ? options.length - INITIAL_OPTIONS_SHOW : 0;
          const SectionIcon = getSpecSectionIcon(key);
          return (
            <FilterSection key={key}>
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-2">
                <SectionIcon className="w-5 h-5 text-primary-600 flex-shrink-0" aria-hidden />
                {label}
              </h3>
              <div className="space-y-0">
                {(() => {
                  const specTotal = options.length > 0 && filterOptionCounts[key]
                    ? Object.values(filterOptionCounts[key]).reduce((a, b) => a + b, 0)
                    : 0;
                  return specTotal > 0 ? (
                    <RadioOptionWithCount
                      value=""
                      label={`All ${label}`}
                      count={specTotal}
                      selected={selected === ''}
                      onChange={() => handleSpecChange(key, '')}
                    />
                  ) : null;
                })()}
                {options.length > INITIAL_OPTIONS_SHOW && (
                  <div className="relative mt-1 mb-1">
                    <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={card.search}
                      onChange={(e) => setSpecCard(key, { search: e.target.value })}
                      placeholder={`Search ${label}…`}
                      className="w-full pl-8 pr-2 py-1.5 border border-gray-200 rounded-md text-xs text-gray-900 bg-gray-50 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                )}
                {visible
                  .filter((opt) => {
                    const c = filterOptionCounts[key]?.[opt];
                    return c === undefined || c > 0;
                  })
                  .map((opt) => (
                    <RadioOptionWithCount
                      key={opt}
                      value={opt}
                      label={opt}
                      count={filterOptionCounts[key]?.[opt]}
                      selected={selected === opt}
                      onChange={() => handleSpecChange(key, opt)}
                    />
                  ))}
                {moreCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setSpecCard(key, { expanded: true })}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium py-2 w-full text-left"
                  >
                    Show more ({moreCount} more)
                  </button>
                )}
              </div>
            </FilterSection>
          );
        })}

      {/* 2. Budget / Price / Salary – category-based range slider + options */}
      <FilterSection>
          <button
            type="button"
            className="flex items-center justify-between w-full text-left mb-2 group"
            onClick={() => setBudgetExpanded((e) => !e)}
            aria-expanded={budgetExpanded}
          >
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <FiDollarSign className="w-5 h-5 text-primary-600 flex-shrink-0" aria-hidden />
              {priceProfile.sectionTitle}
            </h3>
            <span className="text-gray-400 group-hover:text-gray-600 transition-colors">
              {budgetExpanded ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
            </span>
          </button>
          {budgetExpanded && (
            <>
              <div className="mb-3 min-h-[52px]">
                <RangeSlider
                  min={profileMin}
                  max={profileMax}
                  value={[clampedMinPrice, clampedMaxPrice]}
                  onChange={handlePriceChange}
                  step={priceProfile.step}
                  formatValue={(v) => formatPriceForProfile(v, priceProfile.id)}
                />
              </div>
              <p className="text-sm text-gray-600 mb-3">{priceProfile.rangeLabel}</p>
              <div className="space-y-0">
                {priceProfile.brackets.map((bracket, index) => {
                  const count = priceBucketCounts[index];
                  if (count === 0) return null;
                  const selected = minPrice === bracket.min && maxPrice === bracket.max;
                  return (
                    <BudgetRangeOption
                      key={bracket.label}
                      label={bracket.label}
                      selected={selected}
                      count={count}
                      onChange={() => handlePriceChange([bracket.min, bracket.max])}
                    />
                  );
                })}
              </div>
            </>
          )}
        </FilterSection>

      {/* 4. Posted Date */}
      {hasCategory && (
        <FilterSection>
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-2">
            <FiCalendar className="w-5 h-5 text-primary-600 flex-shrink-0" aria-hidden />
            Posted Date
          </h3>
          <select
            value={filters.postedTime ?? ''}
            onChange={(e) => handlePostedDateChange(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {POSTED_DATE_OPTIONS.map((opt) => (
              <option key={opt.value || 'any'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FilterSection>
      )}

      {/* 5. Distance - hidden on phone and car/vehicles filter page */}
      {hasCategory && !isPhoneCategory(categorySlug, subcategorySlug) && !isVehiclesCategory(categorySlug, subcategorySlug) && (
        <FilterSection>
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-2">
            <FiMapPin className="w-5 h-5 text-primary-600 flex-shrink-0" aria-hidden />
            Distance
          </h3>
          <div className="space-y-0">
            {RADIUS_OPTIONS.map((opt) => (
              <OptionWithTick
                key={opt.value}
                value={opt.value}
                label={opt.label}
                selected={currentRadius === opt.value}
                onChange={() => handleRadiusChange(opt.value)}
              />
            ))}
          </div>
        </FilterSection>
      )}

      <button
        onClick={handleClearSelection}
        className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 hover:shadow-md active:scale-[0.98] mt-2"
      >
        CLEAR SELECTION
      </button>

      {/* Post Ad Free - under filter card */}
      <Link
        href="/post-ad"
        className="block rounded-xl overflow-hidden border border-primary-500/30 bg-gradient-to-br from-primary-600 via-primary-600 to-primary-700 text-white shadow-lg shadow-primary-900/20 hover:shadow-xl hover:shadow-primary-900/25 hover:border-primary-400/40 transition-all duration-300 group"
      >
        <div className="px-5 py-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/15 group-hover:bg-white/20 transition-colors">
              <FiPlus className="w-4 h-4 text-amber-300" strokeWidth={2.5} />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-white/90">Free</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight mb-1">Post Ad Free</h3>
            <p className="text-sm text-blue-100/95 leading-snug">Sell your items in minutes</p>
          </div>
          <span className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-white text-primary-700 font-semibold text-sm shadow-sm group-hover:bg-primary-50 group-hover:shadow transition-all duration-200">
            <FiPlus className="w-4 h-4" strokeWidth={2.5} /> Sell Now
          </span>
        </div>
      </Link>
    </aside>
  );
}
