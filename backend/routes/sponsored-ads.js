/**
 * Sponsored Ads API
 * Public: Fetch ads by location, category, size (for ad detail & listing pages)
 *
 * PROMPT 1 Fixes:
 * - Category slug exact match when page category provided
 * - Normalized location slugs (lowercase, hyphen)
 * - UTC date validation
 * - Ad size enum: small, medium, large
 * - Prioritize active + budget > 0
 * - Fallback: city → state → country → global
 * - Debug logs for filter mismatch detection
 * - Optimized query
 */

const express = require('express');
const sponsoredAdsService = require('../services/sponsoredAdsService');
const { normalizeLocationSlug } = require('../utils/locationSlug');
require('dotenv').config();

const router = express.Router();
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const DEBUG_SPONSORED_ADS = process.env.DEBUG_SPONSORED_ADS === 'true';

/**
 * Google Reverse Geocoding: convert GPS (lat, lng) to city/state slugs
 */
async function reverseGeocodeToSlugs(lat, lng) {
  if (!GOOGLE_MAPS_API_KEY || !lat || !lng) return null;
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latNum.toFixed(6)},${lngNum.toFixed(6)}&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.[0]?.address_components) return null;
    let city = '';
    let state = '';
    for (const c of data.results[0].address_components) {
      const t = c.types;
      if (t.includes('locality')) city = c.long_name;
      else if (!city && (t.includes('administrative_area_level_2') || t.includes('sublocality_level_1'))) city = c.long_name;
      if (t.includes('administrative_area_level_1')) state = c.long_name;
    }
    return {
      citySlug: normalizeLocationSlug(city),
      stateSlug: normalizeLocationSlug(state),
    };
  } catch (err) {
    if (DEBUG_SPONSORED_ADS) console.warn('[SponsoredAds] Reverse geocode error:', err?.message);
    return null;
  }
}

/** UTC today for date validation - use Date object for MongoDB BSON DateTime comparison */
function getUtcTodayDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function getDateConditions(utcTodayDate) {
  return [
    { $or: [{ startDate: null }, { startDate: { $lte: utcTodayDate } }] },
    { $or: [{ endDate: null }, { endDate: { $gte: utcTodayDate } }] },
  ];
}

/** Platform default = empty targetLocations or "all" (show to all) */
function isPlatformDefaultCondition() {
  return {
    $or: [
      { targetLocations: { $size: 0 } },
      { targetLocations: { $exists: false } },
      { targetLocations: [] },
      { targetLocations: 'all' },
    ],
  };
}

/** All-India / country level - case-insensitive via $in with regex */
function isAllIndiaCondition() {
  return {
    $or: [
      { targetLocations: 'india' },
      { targetLocations: 'all-india' },
      { targetLocations: { $in: [/^india$/i, /^all-india$/i] } },
    ],
  };
}

/** Location slug in targetLocations - exact match, city segment, or case-insensitive */
function locationMatchCondition(locSlug) {
  if (!locSlug) return null;
  const normalized = normalizeLocationSlug(locSlug);
  if (!normalized) return null;
  const exactMatch = { targetLocations: normalized };
  const caseInsensitiveMatch = { targetLocations: { $in: [new RegExp(`^${escapeRegex(normalized)}$`, 'i')] } };
  const segments = normalized.split('-').filter(Boolean);
  if (segments.length <= 1) {
    return { $or: [exactMatch, caseInsensitiveMatch] };
  }
  const citySegment = segments[segments.length - 1];
  return {
    $or: [
      exactMatch,
      caseInsensitiveMatch,
      { targetLocations: citySegment },
      { targetLocations: { $in: [new RegExp(`^${escapeRegex(citySegment)}$`, 'i')] } },
    ],
  };
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Standard ad sizes - "all" = full available space */
const AD_SIZES = ['small', 'medium', 'large', 'auto', 'all'];

/** Fixed dimensions (width x height) - OLX-style: Small 1:1, Medium/Large 16:9 */
const AD_DIMENSIONS = {
  small: { width: 300, height: 300 },   // 1:1 card
  medium: { width: 800, height: 450 }, // 16:9 banner
  large: { width: 1200, height: 675 },  // 16:9 hero
  auto: { width: 600, height: 400 },
  all: { width: 600, height: 500 },
};

function normalizeAdSize(size) {
  const s = size ? String(size).trim().toLowerCase() : 'medium';
  return AD_SIZES.includes(s) ? s : 'medium';
}

function toAdResponse(ad) {
  const size = (ad.adSize || 'medium').toLowerCase();
  const dims = AD_DIMENSIONS[size] || AD_DIMENSIONS.medium;
  return {
    id: ad.id,
    title: ad.title,
    bannerImage: ad.bannerImage,
    bannerVideo: ad.bannerVideo,
    description: ad.description,
    ctaType: ad.ctaType,
    ctaLabel: ad.ctaLabel,
    redirectUrl: ad.redirectUrl,
    adSize: ad.adSize || 'medium',
    width: dims.width,
    height: dims.height,
  };
}

/** Pick single ad (rotate by lastShownAt), update lastShownAt, respond with 1 ad */
function pickAndRespond(ads, res, debugContext) {
  if (!ads || ads.length === 0) return false;
  const now = new Date();
  const picked = ads.slice(0, 1);
  picked.forEach((ad) => {
    sponsoredAdsService.update(ad.id, { lastShownAt: now }).catch(() => {});
  });
  if (DEBUG_SPONSORED_ADS && debugContext) {
    console.log('[SponsoredAds]', {
      category: debugContext.category,
      city: debugContext.city ?? debugContext.locSlug,
      adsFound: picked.length,
      level: debugContext.level,
    });
  }
  res.json({
    success: true,
    ads: picked.map(toAdResponse),
    ad: toAdResponse(picked[0]),
  });
  return true;
}

/**
 * GET /api/sponsored-ads
 * Query: location, city, state, latitude, longitude, category, size
 */
router.get('/', async (req, res) => {
  try {
    const { location, city, state, district, latitude, longitude, category, size } = req.query;

    const utcTodayDate = getUtcTodayDate();
    const dateCond = getDateConditions(utcTodayDate);
    const requestedSize = (size && AD_SIZES.includes(String(size).toLowerCase())) ? String(size).toLowerCase() : null;
    const filterBySize = requestedSize && requestedSize !== 'auto';

    // Location: City → District → State → All India (OLX-style priority)
    let citySlug = null;
    let districtSlug = null;
    let stateSlug = null;
    if (location && String(location).trim()) {
      const locNorm = normalizeLocationSlug(location);
      citySlug = locNorm;
    }
    if (city && !citySlug) citySlug = normalizeLocationSlug(city);
    if (district) districtSlug = normalizeLocationSlug(district);
    if (state) stateSlug = normalizeLocationSlug(state);
    // Reverse geocode only when no city/state - skip if API key has referrer restrictions (server-side fails)
    if (!citySlug && !stateSlug && latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        try {
          const geocoded = await reverseGeocodeToSlugs(lat, lng);
          if (geocoded) {
            citySlug = geocoded.citySlug || null;
            stateSlug = geocoded.stateSlug || null;
          }
        } catch (e) {
          if (DEBUG_SPONSORED_ADS) console.warn('[SponsoredAds] Geocoding skipped:', e?.message);
        }
      }
    }

    // Category: match ads targeted to this category OR ads with no category (show to all)
    const catSlug = category && String(category).trim()
      ? normalizeLocationSlug(category)
      : null;

    const categoryCond = catSlug
      ? {
          $or: [
            { categorySlug: catSlug },
            { categorySlug: { $in: [null, ''] } },
            { categorySlug: { $exists: false } },
          ],
        }
      : null;

    // Active ads: budget > 0 OR budget 0/null/undefined (treat as unlimited - show ad)
    const budgetCond = {
      $or: [
        { budget: { $gte: 0 } },
        { budget: { $exists: false } },
        { budget: null },
      ],
    };
    const sortOpts = { priority: -1, budget: -1, lastShownAt: 1 };

    const baseAnd = [...dateCond, categoryCond, budgetCond];
    const addSize = (q) => {
      if (filterBySize && requestedSize) {
        // Match exact size OR 'auto' (auto ads can fill any slot)
        q.$and = q.$and || [];
        q.$and.push({ $or: [{ adSize: requestedSize }, { adSize: 'auto' }] });
      }
      // When size=auto: no filter - accept ads of any size
      return q;
    };

    const runQuery = async (locationCond, level, limit = 3) => {
      const q = {
        status: 'active',
        $and: [...baseAnd, locationCond].filter(Boolean),
      };
      addSize(q);
      const ads = await sponsoredAdsService.findManyRaw(q, sortOpts, limit);
      if (DEBUG_SPONSORED_ADS && ads.length === 0) {
        console.log('[SponsoredAds] No match at level:', level, '| locCond:', JSON.stringify(locationCond), '| cat:', catSlug);
      }
      return ads;
    };

    // --- LEVEL 1: City match (highest priority) ---
    if (citySlug) {
      const locCond = {
        $or: [
          locationMatchCondition(citySlug),
          isPlatformDefaultCondition(),
          isAllIndiaCondition(),
        ],
      };
      const ads1 = await runQuery(locCond, 'city', 3);
      if (pickAndRespond(ads1, res, { level: 'city', locSlug: citySlug, category: catSlug, city: citySlug })) return;
    }

    // --- LEVEL 2: District match ---
    if (districtSlug) {
      const locCond = {
        $or: [
          locationMatchCondition(districtSlug),
          isPlatformDefaultCondition(),
          isAllIndiaCondition(),
        ],
      };
      const ads2 = await runQuery(locCond, 'district', 3);
      if (pickAndRespond(ads2, res, { level: 'district', locSlug: districtSlug, category: catSlug, city: districtSlug })) return;
    }

    // --- LEVEL 3: State match ---
    if (stateSlug) {
      const locCond = {
        $or: [
          locationMatchCondition(stateSlug),
          isPlatformDefaultCondition(),
          isAllIndiaCondition(),
        ],
      };
      const ads3 = await runQuery(locCond, 'state', 3);
      if (pickAndRespond(ads3, res, { level: 'state', locSlug: stateSlug, category: catSlug, city: stateSlug })) return;
    }

    // --- LEVEL 4: Country (All-India) ---
    const allIndiaCond = {
      $or: [isPlatformDefaultCondition(), isAllIndiaCondition()],
    };
    const ads4 = await runQuery(allIndiaCond, 'country', 3);
    if (pickAndRespond(ads4, res, { level: 'country', locSlug: null, category: catSlug, city: null })) return;

    // --- LEVEL 5: Global (platform defaults only) ---
    const globalCond = {
      status: 'active',
      $and: [...dateCond, isPlatformDefaultCondition(), budgetCond, categoryCond].filter(Boolean),
    };
    addSize(globalCond);
    const ads5 = await sponsoredAdsService.findManyRaw(globalCond, sortOpts, 3);
    if (pickAndRespond(ads5, res, { level: 'global', locSlug: null, category: catSlug, city: null })) return;

    // --- LEVEL 6: Any active ad with category match ---
    const anyActiveCond = {
      status: 'active',
      $and: [...dateCond, budgetCond, categoryCond].filter(Boolean),
    };
    addSize(anyActiveCond);
    const ads6 = await sponsoredAdsService.findManyRaw(anyActiveCond, sortOpts, 3);
    if (pickAndRespond(ads6, res, { level: 'any', locSlug: null, category: catSlug, city: null })) return;

    // --- LEVEL 7: Final fallback - ignore category, show ANY active ad ---
    // Handles: strict category filter, geocoding failures, API key restrictions
    const anyActiveNoCatCond = {
      status: 'active',
      $and: [...dateCond, budgetCond].filter(Boolean),
    };
    addSize(anyActiveNoCatCond);
    const ads7 = await sponsoredAdsService.findManyRaw(anyActiveNoCatCond, sortOpts, 3);
    if (pickAndRespond(ads7, res, { level: 'any-no-cat', locSlug: null, category: null, city: null })) return;

    if (DEBUG_SPONSORED_ADS) {
      console.log('[SponsoredAds] No ad found | city:', citySlug, 'state:', stateSlug, 'cat:', catSlug);
    }
    res.json({ success: true, ads: [], ad: null });
  } catch (error) {
    console.error('[SponsoredAds] Fetch error:', error);
    res.status(200).json({ success: true, ad: null });
  }
});

router.post('/:id/impression', async (req, res) => {
  try {
    await sponsoredAdsService.increment(req.params.id, 'impressions');
    res.json({ success: true });
  } catch (error) {
    console.error('[SponsoredAds] Impression error:', error);
    res.status(500).json({ success: false, message: 'Failed to track impression' });
  }
});

router.post('/:id/click', async (req, res) => {
  try {
    await sponsoredAdsService.increment(req.params.id, 'clicks');
    res.json({ success: true });
  } catch (error) {
    console.error('[SponsoredAds] Click error:', error);
    res.status(500).json({ success: false, message: 'Failed to track click' });
  }
});

module.exports = router;
