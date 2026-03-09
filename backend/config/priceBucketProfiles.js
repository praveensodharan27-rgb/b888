/**
 * Price bucket boundaries per profile (must match frontend categoryPriceRanges.ts).
 * Used by GET /ads/price-bucket-counts for aggregation.
 */
const CATEGORY_TO_PROFILE = {
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

/** Buckets: array of { min, max } in order (same as frontend brackets) */
const PROFILE_BUCKETS = {
  vehicles: [
    { min: 50000, max: 100000 },
    { min: 100000, max: 500000 },
    { min: 500000, max: 1000000 },
    { min: 1000000, max: 5000000 },
    { min: 5000000, max: 100000000 },
  ],
  mobiles: [
    { min: 1000, max: 5000 },
    { min: 5000, max: 10000 },
    { min: 10000, max: 20000 },
    { min: 20000, max: 50000 },
    { min: 50000, max: 10000000 },
  ],
  properties: [
    { min: 500000, max: 2000000 },
    { min: 2000000, max: 5000000 },
    { min: 5000000, max: 10000000 },
    { min: 10000000, max: 100000000 },
  ],
  jobs: [
    { min: 10000, max: 20000 },
    { min: 20000, max: 40000 },
    { min: 40000, max: 80000 },
    { min: 80000, max: 150000 },
    { min: 150000, max: 10000000 },
  ],
  services: [
    { min: 500, max: 2000 },
    { min: 2000, max: 10000 },
    { min: 10000, max: 25000 },
    { min: 25000, max: 10000000 },
  ],
  default: [
    { min: 0, max: 25000 },
    { min: 25000, max: 100000 },
    { min: 100000, max: 500000 },
    { min: 500000, max: 1000000 },
    { min: 1000000, max: 10000000 },
  ],
};

function getProfileId(categorySlug, subcategorySlug) {
  if (!categorySlug) return 'default';
  const cat = String(categorySlug).toLowerCase().trim().replace(/\s+/g, '-');
  const sub = subcategorySlug ? String(subcategorySlug).toLowerCase().trim().replace(/\s+/g, '-') : '';
  if (CATEGORY_TO_PROFILE[sub]) return CATEGORY_TO_PROFILE[sub];
  if (CATEGORY_TO_PROFILE[cat]) return CATEGORY_TO_PROFILE[cat];
  return 'default';
}

function getBucketsForCategory(categorySlug, subcategorySlug) {
  const profile = getProfileId(categorySlug, subcategorySlug);
  return PROFILE_BUCKETS[profile] || PROFILE_BUCKETS.default;
}

module.exports = { getProfileId, getBucketsForCategory, PROFILE_BUCKETS };
