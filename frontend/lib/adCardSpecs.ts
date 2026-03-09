/**
 * Universal ad card: category-specific key specs (max 3–4) with icon keys.
 * Used by AdCardOGNOX to render only relevant, non-empty fields.
 */

export type SpecIconKey =
  | 'calendar'
  | 'droplet'
  | 'activity'
  | 'smartphone'
  | 'cpu'
  | 'hardDrive'
  | 'layers'
  | 'package'
  | 'home'
  | 'maximize2'
  | 'user'
  | 'settings';

export interface SpecKeyConfig {
  /** Primary attribute key in ad.attributes */
  attr: string;
  /** Alternate keys (e.g. fuel_type, fuel) */
  alt?: string[];
  icon: SpecIconKey;
}

/** Category or "category--subcategory" -> max 4 spec keys to show */
const CATEGORY_SPEC_KEYS: Record<string, SpecKeyConfig[]> = {
  // Vehicles
  vehicles: [
    { attr: 'year', alt: ['release_year', 'year_of_manufacture'], icon: 'calendar' },
    { attr: 'fuel_type', alt: ['fuel'], icon: 'droplet' },
    { attr: 'km_driven', alt: ['kms_driven'], icon: 'activity' },
    { attr: 'transmission', icon: 'settings' },
  ],
  'vehicles--cars': [
    { attr: 'year', alt: ['release_year', 'year_of_manufacture'], icon: 'calendar' },
    { attr: 'fuel_type', alt: ['fuel'], icon: 'droplet' },
    { attr: 'km_driven', alt: ['kms_driven'], icon: 'activity' },
    { attr: 'transmission', icon: 'settings' },
  ],
  'vehicles--motorcycles': [
    { attr: 'year', alt: ['release_year'], icon: 'calendar' },
    { attr: 'engine_cc', icon: 'activity' },
    { attr: 'km_driven', alt: ['kms_driven'], icon: 'activity' },
    { attr: 'fuel_type', alt: ['fuel'], icon: 'droplet' },
  ],
  'vehicles--scooters': [
    { attr: 'year', icon: 'calendar' },
    { attr: 'km_driven', alt: ['kms_driven'], icon: 'activity' },
    { attr: 'fuel_type', alt: ['fuel'], icon: 'droplet' },
  ],
  'vehicles--bicycles': [
    { attr: 'brand', icon: 'package' },
    { attr: 'type', icon: 'layers' },
    { attr: 'condition', icon: 'package' },
  ],
  'vehicles--commercial-vehicles': [
    { attr: 'year', icon: 'calendar' },
    { attr: 'km_driven', alt: ['kms_driven'], icon: 'activity' },
    { attr: 'fuel_type', alt: ['fuel'], icon: 'droplet' },
  ],

  // Mobiles
  mobiles: [
    { attr: 'brand', icon: 'smartphone' },
    { attr: 'ram', icon: 'cpu' },
    { attr: 'storage', icon: 'hardDrive' },
    { attr: 'condition', icon: 'package' },
  ],
  'mobiles--mobile-phones': [
    { attr: 'brand', icon: 'smartphone' },
    { attr: 'ram', icon: 'cpu' },
    { attr: 'storage', icon: 'hardDrive' },
    { attr: 'condition', icon: 'package' },
  ],
  'mobiles--tablets': [
    { attr: 'brand', icon: 'smartphone' },
    { attr: 'storage', icon: 'hardDrive' },
    { attr: 'screen_size', icon: 'maximize2' },
    { attr: 'condition', icon: 'package' },
  ],
  'mobiles--smart-watches': [
    { attr: 'brand', icon: 'smartphone' },
    { attr: 'model', icon: 'layers' },
    { attr: 'condition', icon: 'package' },
  ],
  'mobiles--accessories': [
    { attr: 'type', icon: 'layers' },
    { attr: 'brand', icon: 'smartphone' },
    { attr: 'condition', icon: 'package' },
  ],

  // Electronics
  'electronics-appliances': [
    { attr: 'brand', icon: 'package' },
    { attr: 'ram', alt: ['processor'], icon: 'cpu' },
    { attr: 'storage', icon: 'hardDrive' },
    { attr: 'condition', icon: 'package' },
  ],
  'electronics-appliances--laptops': [
    { attr: 'brand', icon: 'package' },
    { attr: 'processor', icon: 'cpu' },
    { attr: 'ram', icon: 'layers' },
    { attr: 'storage', icon: 'hardDrive' },
  ],
  'electronics-appliances--tvs': [
    { attr: 'brand', icon: 'package' },
    { attr: 'screen_size', icon: 'maximize2' },
    { attr: 'condition', icon: 'package' },
  ],
  'electronics-appliances--cameras': [
    { attr: 'brand', icon: 'package' },
    { attr: 'model', icon: 'layers' },
    { attr: 'condition', icon: 'package' },
  ],
  'electronics-appliances--gaming-consoles': [
    { attr: 'brand', icon: 'package' },
    { attr: 'model', icon: 'layers' },
    { attr: 'storage', icon: 'hardDrive' },
    { attr: 'condition', icon: 'package' },
  ],

  // Properties
  properties: [
    { attr: 'bedrooms', icon: 'home' },
    { attr: 'bathrooms', icon: 'home' },
    { attr: 'area_sqft', icon: 'maximize2' },
    { attr: 'furnishing', icon: 'layers' },
  ],
  'properties--apartments': [
    { attr: 'bedrooms', icon: 'home' },
    { attr: 'bathrooms', icon: 'home' },
    { attr: 'area_sqft', icon: 'maximize2' },
    { attr: 'furnishing', icon: 'layers' },
  ],
  'properties--houses': [
    { attr: 'bedrooms', icon: 'home' },
    { attr: 'bathrooms', icon: 'home' },
    { attr: 'area_sqft', icon: 'maximize2' },
    { attr: 'furnishing', icon: 'layers' },
  ],
  'properties--plots': [
    { attr: 'area_sqft', icon: 'maximize2' },
    { attr: 'facing', icon: 'layers' },
  ],
  'properties--commercial-space': [
    { attr: 'type', icon: 'layers' },
    { attr: 'area_sqft', icon: 'maximize2' },
    { attr: 'parking', icon: 'activity' },
  ],

  // Home & Furniture
  'home-furniture': [
    { attr: 'brand', icon: 'package' },
    { attr: 'material', icon: 'layers' },
    { attr: 'condition', icon: 'package' },
  ],
  'home-furniture--sofa': [
    { attr: 'seater', icon: 'home' },
    { attr: 'material', icon: 'layers' },
    { attr: 'condition', icon: 'package' },
  ],
  'home-furniture--beds': [
    { attr: 'size', icon: 'maximize2' },
    { attr: 'material', icon: 'layers' },
    { attr: 'condition', icon: 'package' },
  ],
  'home-furniture--wardrobe': [
    { attr: 'doors', icon: 'home' },
    { attr: 'material', icon: 'layers' },
    { attr: 'condition', icon: 'package' },
  ],
  'home-furniture--tables': [
    { attr: 'type', icon: 'layers' },
    { attr: 'material', icon: 'layers' },
    { attr: 'condition', icon: 'package' },
  ],

  // Fashion
  fashion: [
    { attr: 'brand', icon: 'package' },
    { attr: 'size', icon: 'layers' },
    { attr: 'type', icon: 'layers' },
    { attr: 'condition', icon: 'package' },
  ],
  'fashion--men': [
    { attr: 'brand', icon: 'package' },
    { attr: 'size', icon: 'layers' },
    { attr: 'type', icon: 'layers' },
    { attr: 'condition', icon: 'package' },
  ],
  'fashion--women': [
    { attr: 'brand', icon: 'package' },
    { attr: 'size', icon: 'layers' },
    { attr: 'type', icon: 'layers' },
    { attr: 'condition', icon: 'package' },
  ],
  'fashion--footwear': [
    { attr: 'brand', icon: 'package' },
    { attr: 'size', icon: 'layers' },
    { attr: 'condition', icon: 'package' },
  ],
  'fashion--watches': [
    { attr: 'brand', icon: 'package' },
    { attr: 'model', icon: 'layers' },
    { attr: 'condition', icon: 'package' },
  ],
  'fashion--jewellery': [
    { attr: 'material', icon: 'layers' },
    { attr: 'type', icon: 'layers' },
    { attr: 'condition', icon: 'package' },
  ],

  // Books & Sports
  'books-sports': [
    { attr: 'brand', icon: 'package' },
    { attr: 'condition', icon: 'package' },
  ],
  'books-sports--books': [
    { attr: 'author_maker', icon: 'user' },
    { attr: 'language', icon: 'layers' },
    { attr: 'condition', icon: 'package' },
  ],
  'books-sports--sports-equipment': [
    { attr: 'brand', icon: 'package' },
    { attr: 'condition', icon: 'package' },
  ],

  // Pets
  pets: [
    { attr: 'breed', icon: 'package' },
    { attr: 'age', icon: 'calendar' },
    { attr: 'gender', icon: 'user' },
    { attr: 'condition', icon: 'package' },
  ],

  // Jobs & Services
  jobs: [
    { attr: 'job_role', icon: 'user' },
    { attr: 'experience_level', icon: 'layers' },
    { attr: 'job_type', icon: 'settings' },
  ],
  services: [
    { attr: 'service_type', icon: 'layers' },
    { attr: 'experience_level', icon: 'layers' },
    { attr: 'availability', icon: 'calendar' },
  ],
};

const MAX_SPECS = 4;

function getAttrValue(attrs: Record<string, string | number | null | undefined>, config: SpecKeyConfig): string | number | null | undefined {
  let v = attrs[config.attr];
  if (v != null && v !== '') return v;
  if (config.alt) {
    for (const k of config.alt) {
      v = attrs[k];
      if (v != null && v !== '') return v;
    }
  }
  return null;
}

function formatSpecValue(attr: string, value: string | number | null | undefined): string {
  if (value == null || value === '') return '';
  const v = String(value).trim();
  if (!v) return '';

  const num = Number(value);
  switch (attr) {
    case 'km_driven':
    case 'kms_driven':
      return !Number.isNaN(num) ? `${Math.round(num).toLocaleString('en-IN')} km` : v;
    case 'area_sqft':
      return !Number.isNaN(num) ? `${num.toLocaleString('en-IN')} sq.ft` : v;
    case 'engine_cc':
      return !Number.isNaN(num) ? `${num} cc` : v;
    case 'ram':
      return /^\d+$/.test(v) ? `${v} GB` : v;
    case 'storage':
      return v;
    case 'year':
    case 'release_year':
    case 'year_of_manufacture':
      return v;
    default:
      return v.replace(/[_-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  }
}

export interface SpecItem {
  icon: SpecIconKey;
  label: string;
}

/** Generic fallback attr keys for when category is unknown (e.g. home feed). Order by display priority. */
const FALLBACK_SPEC_ATTRS: SpecKeyConfig[] = [
  { attr: 'year', alt: ['release_year', 'year_of_manufacture'], icon: 'calendar' },
  { attr: 'brand', icon: 'package' },
  { attr: 'km_driven', alt: ['kms_driven'], icon: 'activity' },
  { attr: 'fuel_type', alt: ['fuel'], icon: 'droplet' },
  { attr: 'transmission', icon: 'settings' },
  { attr: 'ram', icon: 'cpu' },
  { attr: 'storage', icon: 'hardDrive' },
  { attr: 'model', icon: 'layers' },
];

/**
 * Returns up to 4 spec items for the ad card based on category/subcategory.
 * Only includes non-empty, relevant attributes.
 * When category is missing (e.g. home feed), uses a generic fallback list so specs still show.
 */
export function getAdCardSpecs(
  categorySlug: string | undefined | null,
  subcategorySlug: string | undefined | null,
  attributes: Record<string, string | number | null | undefined> | undefined
): SpecItem[] {
  const attrs = attributes || {};
  const cat = (categorySlug || '').toLowerCase().trim();
  const sub = (subcategorySlug || '').toLowerCase().trim();
  const key = sub ? `${cat}--${sub}` : cat;

  let configs = CATEGORY_SPEC_KEYS[key] || CATEGORY_SPEC_KEYS[cat] || [];
  if (configs.length === 0) configs = FALLBACK_SPEC_ATTRS;
  if (configs.length > MAX_SPECS) configs = configs.slice(0, MAX_SPECS);

  const out: SpecItem[] = [];
  for (const config of configs) {
    if (config.attr === 'condition') continue; // condition shown as image overlay, not in specs
    const raw = getAttrValue(attrs, config);
    const label = formatSpecValue(config.attr, raw);
    if (label) out.push({ icon: config.icon, label });
    if (out.length >= MAX_SPECS) break;
  }
  return out;
}

export interface DetailSpecItem {
  label: string;
  value: string;
  icon: SpecIconKey;
}

/** For product detail page: label (field name), value (formatted), icon */
export function getDetailPageSpecs(
  categorySlug: string | undefined | null,
  subcategorySlug: string | undefined | null,
  attributes: Record<string, string | number | null | undefined> | undefined
): DetailSpecItem[] {
  const attrs = attributes || {};
  const cat = (categorySlug || '').toLowerCase().trim();
  const sub = (subcategorySlug || '').toLowerCase().trim();
  const key = sub ? `${cat}--${sub}` : cat;

  let configs = CATEGORY_SPEC_KEYS[key] || CATEGORY_SPEC_KEYS[cat] || [];
  const formatAttrLabel = (attr: string) =>
    attr.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const out: DetailSpecItem[] = [];
  for (const config of configs) {
    const raw = getAttrValue(attrs, config);
    const value = formatSpecValue(config.attr, raw);
    if (value) {
      out.push({
        label: formatAttrLabel(config.attr),
        value,
        icon: config.icon,
      });
    }
  }
  return out;
}
