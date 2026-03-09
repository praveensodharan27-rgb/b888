/**
 * Category-based price range config for the Budget filter.
 * Resolves category/subcategory to the right brackets and labels.
 */

export type PriceProfileId = 'vehicles' | 'mobiles' | 'properties' | 'jobs' | 'services' | 'default';

export interface PriceBracket {
  label: string;
  min: number;
  max: number;
}

export interface CategoryPriceProfile {
  id: PriceProfileId;
  /** Slider min (₹) */
  sliderMin: number;
  /** Slider max (₹) */
  sliderMax: number;
  /** Step for slider */
  step: number;
  /** Question text above the options */
  rangeLabel: string;
  /** Section title (e.g. "Budget", "Salary range") */
  sectionTitle: string;
  brackets: PriceBracket[];
}

const CATEGORY_TO_PROFILE: Record<string, PriceProfileId> = {
  vehicles: 'vehicles',
  mobiles: 'mobiles',
  electronics: 'mobiles',
  smartphone: 'mobiles',
  'mobile-phones': 'mobiles',
  'electronics-appliances': 'mobiles',
  properties: 'properties',
  realestate: 'properties',
  'real-estate': 'properties',
  jobs: 'jobs',
  career: 'jobs',
  services: 'services',
  'professional-services': 'services',
  'home-services': 'services',
  'event-services': 'services',
  'pet-services': 'services',
};

const PROFILES: Record<PriceProfileId, CategoryPriceProfile> = {
  vehicles: {
    id: 'vehicles',
    sliderMin: 0,
    sliderMax: 5000000, // 50 Lakh
    step: 25000,
    sectionTitle: 'Budget',
    rangeLabel: 'What is your price range?',
    brackets: [
      { label: '₹50,000 – ₹1 Lakh', min: 50000, max: 100000 },
      { label: '₹1 Lakh – ₹5 Lakh', min: 100000, max: 500000 },
      { label: '₹5 Lakh – ₹10 Lakh', min: 500000, max: 1000000 },
      { label: '₹10 Lakh – ₹50 Lakh', min: 1000000, max: 5000000 },
      { label: 'Above ₹50 Lakh', min: 5000000, max: 100000000 },
    ],
  },
  mobiles: {
    id: 'mobiles',
    sliderMin: 0,
    sliderMax: 50000,
    step: 500,
    sectionTitle: 'Budget',
    rangeLabel: 'What is your price range?',
    brackets: [
      { label: '₹1,000 – ₹5,000', min: 1000, max: 5000 },
      { label: '₹5,000 – ₹10,000', min: 5000, max: 10000 },
      { label: '₹10,000 – ₹20,000', min: 10000, max: 20000 },
      { label: '₹20,000 – ₹50,000', min: 20000, max: 50000 },
      { label: 'Above ₹50,000', min: 50000, max: 10000000 },
    ],
  },
  properties: {
    id: 'properties',
    sliderMin: 0,
    sliderMax: 100000000, // 1 Crore
    step: 100000,
    sectionTitle: 'Budget',
    rangeLabel: 'What is your price range?',
    brackets: [
      { label: '₹5 Lakh – ₹20 Lakh', min: 500000, max: 2000000 },
      { label: '₹20 Lakh – ₹50 Lakh', min: 2000000, max: 5000000 },
      { label: '₹50 Lakh – ₹1 Crore', min: 5000000, max: 10000000 },
      { label: 'Above ₹1 Crore', min: 10000000, max: 100000000 },
    ],
  },
  jobs: {
    id: 'jobs',
    sliderMin: 0,
    sliderMax: 200000,
    step: 1000,
    sectionTitle: 'Salary range',
    rangeLabel: 'What salary range are you looking for?',
    brackets: [
      { label: '₹10k – ₹20k', min: 10000, max: 20000 },
      { label: '₹20k – ₹40k', min: 20000, max: 40000 },
      { label: '₹40k – ₹80k', min: 40000, max: 80000 },
      { label: '₹80k – ₹1.5 Lakh', min: 80000, max: 150000 },
      { label: 'Above ₹1.5 Lakh', min: 150000, max: 10000000 },
    ],
  },
  services: {
    id: 'services',
    sliderMin: 0,
    sliderMax: 50000,
    step: 500,
    sectionTitle: 'Budget',
    rangeLabel: 'What is your budget range?',
    brackets: [
      { label: '₹500 – ₹2,000', min: 500, max: 2000 },
      { label: '₹2,000 – ₹10,000', min: 2000, max: 10000 },
      { label: '₹10,000 – ₹25,000', min: 10000, max: 25000 },
      { label: 'Above ₹25,000', min: 25000, max: 10000000 },
    ],
  },
  default: {
    id: 'default',
    sliderMin: 0,
    sliderMax: 10000000, // 1 Crore
    step: 50000,
    sectionTitle: 'Budget',
    rangeLabel: 'What is your price range?',
    brackets: [
      { label: 'Under ₹25,000', min: 0, max: 25000 },
      { label: '₹25,000 – ₹1 Lakh', min: 25000, max: 100000 },
      { label: '₹1 Lakh – ₹5 Lakh', min: 100000, max: 500000 },
      { label: '₹5 Lakh – ₹10 Lakh', min: 500000, max: 1000000 },
      { label: 'Above ₹10 Lakh', min: 1000000, max: 10000000 },
    ],
  },
};

/**
 * Resolve category + subcategory to a price profile.
 */
export function getPriceProfileForCategory(
  categorySlug?: string,
  subcategorySlug?: string
): PriceProfileId {
  if (!categorySlug) return 'default';
  const cat = categorySlug.toLowerCase().trim().replace(/\s+/g, '-');
  const sub = subcategorySlug?.toLowerCase().trim().replace(/\s+/g, '-') ?? '';
  if (CATEGORY_TO_PROFILE[sub]) return CATEGORY_TO_PROFILE[sub];
  if (CATEGORY_TO_PROFILE[cat]) return CATEGORY_TO_PROFILE[cat];
  return 'default';
}

/**
 * Get the full price profile (brackets, slider range, labels) for a category.
 */
export function getCategoryPriceProfile(
  categorySlug?: string,
  subcategorySlug?: string
): CategoryPriceProfile {
  const id = getPriceProfileForCategory(categorySlug, subcategorySlug);
  return PROFILES[id];
}

/**
 * Format a value for slider display based on profile (e.g. ₹1L for vehicles, ₹10k for jobs).
 */
export function formatPriceForProfile(value: number, profileId: PriceProfileId): string {
  if (value === 0) return '₹0';
  if (profileId === 'jobs') {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    return `₹${(value / 1000).toFixed(0)}k`;
  }
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return `₹${value}`;
}
