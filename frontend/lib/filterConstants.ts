/**
 * Filter-related constants (no hardcoding in components).
 * Update here when spec keys or category rules change.
 */

/** Category slug for vehicles (cars, motorcycles, etc.) */
export const VEHICLE_CATEGORY_SLUG = 'vehicles';

/** Subcategory slugs under vehicles – used to hide mobile specs in vehicle filters */
export const VEHICLE_SUBCATEGORY_SLUGS = new Set<string>([
  'motorcycles',
  'cars',
  'bikes',
  'scooters',
  'bicycles',
]);

/**
 * Spec keys that belong to mobile/electronics only.
 * Hidden in vehicle category filters (e.g. Motorcycles) to avoid wrong filters.
 */
export const MOBILE_SPEC_KEYS = new Set<string>([
  'ram',
  'storage',
  'camera',
  'battery',
  'os',
  'color',
  'screen_size',
  'processor',
  'graphics',
  'resolution',
  'connectivity',
  'megapixel',
  'lens_type',
  'display',
  'compatible_with',
  'smart_tv',
]);

export function isMobileSpecKey(key: string): boolean {
  const lower = key.toLowerCase().trim();
  return MOBILE_SPEC_KEYS.has(lower);
}

export function isVehiclesCategory(categorySlug?: string, subcategorySlug?: string): boolean {
  if (!categorySlug) return false;
  if (categorySlug === VEHICLE_CATEGORY_SLUG) return true;
  return !!(subcategorySlug && VEHICLE_SUBCATEGORY_SLUGS.has(subcategorySlug));
}

/** Phone/mobile-phones category – show only Brand, RAM, Price, Posted Date */
export const PHONE_CATEGORY_SLUGS = new Set<string>(['mobiles', 'electronics', 'smartphone']);
export const PHONE_SUBCATEGORY_SLUGS = new Set<string>(['mobile-phones', 'mobiles']);

export function isPhoneCategory(categorySlug?: string, subcategorySlug?: string): boolean {
  if (!categorySlug) return false;
  const catMatch = PHONE_CATEGORY_SLUGS.has(categorySlug);
  if (!subcategorySlug) return catMatch;
  return catMatch && PHONE_SUBCATEGORY_SLUGS.has(subcategorySlug);
}

/** Spec keys allowed on phone filter page (only RAM) */
export const PHONE_SPEC_KEYS = new Set<string>(['ram']);

/** Spec keys hidden on car/vehicles filter page (KM Driven, Owners) */
export const VEHICLE_HIDDEN_SPEC_KEYS = new Set<string>(['km_driven', 'owners']);
