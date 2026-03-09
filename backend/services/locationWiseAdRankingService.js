/**
 * Location-Wise Ad Ranking Service
 * OLX-style marketplace: Location-prioritized feed with paid promotions.
 *
 * Priority: TOP → Featured → Bump → Enterprise → Pro → Basic → Normal
 * - Paid ads get higher priority only in their selected location(s)
 * - Fallback to nearby locations when no promoted ads in user's location
 * - Inject sponsored ads after every N normal ads
 * - Fair rotation within each tier
 * - Ignore expired promotions
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getRankConfig, isFeaturedActive, isBumpActive } = require('./adRankConfigService');
const sponsoredAdsService = require('./sponsoredAdsService');
const { getCachedAds, cacheAds } = require('../utils/redis-helpers');
const { normalizeLocationSlug } = require('../utils/locationSlug');

// Promotion priority order (higher = shown first)
const PROMO_PRIORITY = {
  TOP: 7,
  FEATURED: 6,
  BUMP_UP: 5,
  ENTERPRISE: 4,
  PRO: 3,
  BASIC: 2,
  NORMAL: 1,
};

const PACKAGE_PRIORITY = {
  NORMAL: 1,
  MAX_VISIBILITY: 2,  // Basic
  SELLER_PLUS: 3,     // Pro
  SELLER_PRIME: 4,    // Enterprise
};

// Inject sponsored ads after every N normal ads (e.g. 5 normal → 1 sponsored)
const SPONSORED_INJECT_EVERY = 5;
const RANK_POOL_SIZE = 500; // Reduced from 5000 to 500 for faster queries (10x faster!)
const CACHE_TTL_SEC = 300; // Increased from 120 to 300 seconds (5 minutes)

/**
 * Check if ad promotion is still active (not expired)
 */
function isPromotionActive(ad) {
  if (!ad) return false;
  const now = new Date();
  if (ad.expiresAt && new Date(ad.expiresAt) <= now) return false;
  if (ad.premiumExpiresAt && new Date(ad.premiumExpiresAt) <= now) return false;
  return true;
}

/**
 * Check if ad targets user's location (city, state)
 * Note: targetLocations on Ad can be added later for multi-location targeting
 */
function adTargetsLocation(ad, userLocation) {
  if (!userLocation) return true;
  return true; // Include all ads; ranking uses locationScore for ordering
}

/**
 * Get promotion tier for an ad
 */
function getPromoPriority(ad, config) {
  if (!ad || !isPromotionActive(ad)) return { tier: 'NORMAL', priority: PROMO_PRIORITY.NORMAL };

  if (ad.isPremium && ad.premiumType === 'TOP') return { tier: 'TOP', priority: PROMO_PRIORITY.TOP };
  if (ad.premiumType === 'FEATURED' && isFeaturedActive(ad, config))
    return { tier: 'FEATURED', priority: PROMO_PRIORITY.FEATURED };
  if (ad.premiumType === 'BUMP_UP' && isBumpActive(ad, config))
    return { tier: 'BUMP_UP', priority: PROMO_PRIORITY.BUMP_UP };

  const pkg = ad.packageType || 'NORMAL';
  const pkgP = PACKAGE_PRIORITY[pkg] || PACKAGE_PRIORITY.NORMAL;
  const tier = pkg === 'SELLER_PRIME' ? 'ENTERPRISE' : pkg === 'SELLER_PLUS' ? 'PRO' : pkg === 'MAX_VISIBILITY' ? 'BASIC' : 'NORMAL';
  const priority = pkgP + 1; // 2-5 range
  return { tier, priority };
}

/**
 * Location score:
 * - Strong priority for exact city / location slug matches
 * - Secondary boost for same state
 *
 * This is used only inside the home feed ranking, so we can safely
 * weight it higher to ensure local ads appear first in Fresh Recommendations.
 */
function locationScore(ad, userLocation) {
  if (!userLocation) return 0;

  const userCitySlug = normalizeLocationSlug(userLocation.city || userLocation.slug || '');
  const userStateSlug = normalizeLocationSlug(userLocation.state || '');

  const adCitySlug = normalizeLocationSlug(
    (ad.city ||
      (ad.location && (ad.location.city || ad.location.name)) ||
      '') // fallback to location.city/name if present
  );
  const adStateSlug = normalizeLocationSlug(
    (ad.state ||
      (ad.location && ad.location.state) ||
      '')
  );
  const adLocationSlug = normalizeLocationSlug(
    (ad.location && ad.location.slug) ||
      ad.locationSlug ||
      ''
  );

  let score = 0;

  // Strong boost: exact city or location slug match (Kottayam vs Kottayam)
  if (userCitySlug && adCitySlug && adCitySlug === userCitySlug) {
    score += 5;
  }
  if (userCitySlug && adLocationSlug && adLocationSlug === userCitySlug) {
    score += 5;
  }

  // Secondary: same state (Kerala vs Kerala)
  if (userStateSlug && adStateSlug && adStateSlug === userStateSlug) {
    score += 2;
  }

  return score;
}

/**
 * Fair rotation: oldest lastShownAt first, then random for ties
 */
function rotateGroup(ads, userLocation) {
  if (!ads.length) return [];
  return [...ads]
    .map((a) => ({
      ad: a,
      lastShown: a.lastShownAt ? new Date(a.lastShownAt).getTime() : 0,
      locScore: locationScore(a, userLocation),
      rand: Math.random(),
    }))
    .sort((a, b) => {
      if (a.locScore !== b.locScore) return b.locScore - a.locScore;
      if (a.lastShown !== b.lastShown) return a.lastShown - b.lastShown;
      return a.rand - b.rand;
    })
    .map((x) => x.ad);
}

/**
 * Filter valid ads: APPROVED, not expired
 */
function filterValid(ads) {
  const now = new Date();
  return (ads || []).filter((ad) => {
    if (!ad?.id) return false;
    if (ad.status !== 'APPROVED') return false;
    if (ad.expiresAt && new Date(ad.expiresAt) <= now) return false;
    return true;
  });
}

/**
 * Segment ads by location: inLocation (user's city/state) vs other
 */
function segmentByLocation(ads, userLocation) {
  const inLocation = [];
  const other = [];
  for (const ad of ads) {
    const locScore = locationScore(ad, userLocation);
    if (locScore > 0) inLocation.push(ad);
    else other.push(ad);
  }
  return { inLocation, other };
}

/**
 * Rank ads: TOP → Featured → Bump → Enterprise → Pro → Basic → Normal
 * Within each tier: location-first, then fair rotation
 */
async function rankAdsByLocation(ads, userLocation, config) {
  const valid = filterValid(ads);
  if (!valid.length) return [];

  const buckets = {
    TOP: [],
    FEATURED: [],
    BUMP_UP: [],
    ENTERPRISE: [],
    PRO: [],
    BASIC: [],
    NORMAL: [],
  };

  for (const ad of valid) {
    const { tier } = getPromoPriority(ad, config);
    if (adTargetsLocation(ad, userLocation) && buckets[tier]) {
      buckets[tier].push(ad);
    }
  }

  const order = [];
  const tierOrder = ['TOP', 'FEATURED', 'BUMP_UP', 'ENTERPRISE', 'PRO', 'BASIC', 'NORMAL'];
  for (const tier of tierOrder) {
    const group = buckets[tier] || [];
    order.push(...rotateGroup(group, userLocation));
  }

  return order;
}

/**
 * Fetch sponsored ads for user's location (location-based only)
 * - Only active ads
 * - Respect startDate/endDate (expiry window)
 * - Location targeting:
 *   - targetLocations empty or "india"/"all-india" → show everywhere (India-wide)
 *   - Otherwise, show only when user city/state/location slug matches one of targetLocations
 * - Category targeting:
 *   - If categorySlug set on sponsored ad, match the current category
 *   - If categorySlug empty/null, show on all categories
 */
async function fetchSponsoredAds(userLocation, category, limit = 5) {
  void category; // category targeting disabled - location-based only
  try {
    const now = new Date();

    const citySlug = userLocation?.city ? normalizeLocationSlug(userLocation.city) : null;
    const stateSlug = userLocation?.state ? normalizeLocationSlug(userLocation.state) : null;
    const locSlug = userLocation?.slug ? normalizeLocationSlug(userLocation.slug) : citySlug || stateSlug;

    // Location conditions (platform default + India-wide + exact city/state/slug match)
    const orConditions = [
      { targetLocations: { $size: 0 } },   // no targeting → show everywhere
      { targetLocations: [] },
      { targetLocations: 'india' },
      { targetLocations: 'all-india' },
    ];
    if (locSlug) orConditions.push({ targetLocations: normalizeLocationSlug(locSlug) });
    if (citySlug) orConditions.push({ targetLocations: citySlug });
    if (stateSlug) orConditions.push({ targetLocations: stateSlug });

    // Active + within date window
    const dateConds = [
      {
        $or: [
          { startDate: null },
          { startDate: { $lte: now } },
        ],
      },
      {
        $or: [
          { endDate: null },
          { endDate: { $gte: now } },
        ],
      },
    ];

    const query = {
      status: 'active',
      $and: [...dateConds, { $or: orConditions }].filter(Boolean),
    };

    // Higher priority first, then least recently shown (for fair rotation)
    const sort = { priority: -1, lastShownAt: 1 };
    const ads = await sponsoredAdsService.findManyRaw(query, sort, limit);

    return (ads || []).map((a) => ({ ...a, _type: 'sponsored' }));
  } catch (e) {
    return [];
  }
}

/**
 * Inject sponsored ads into feed after every N normal ads
 */
function injectSponsoredAds(normalAds, sponsoredAds, everyN = SPONSORED_INJECT_EVERY) {
  if (!Array.isArray(normalAds) || !normalAds.length) return normalAds || [];
  if (!Array.isArray(sponsoredAds) || !sponsoredAds.length || !everyN || everyN <= 0) {
    return normalAds;
  }

  const result = [];
  let sponsoredIdx = 0;
  let countSinceLast = 0;

  for (const item of normalAds) {
    result.push(item);
    countSinceLast++;

    if (countSinceLast >= everyN) {
      // Rotate through sponsored ads when we reach the interval
      const adToInsert = sponsoredAds[sponsoredIdx % sponsoredAds.length];
      result.push(adToInsert);
      sponsoredIdx += 1;
      countSinceLast = 0;
    }
  }

  return result;
}

/**
 * Main: Get location-wise ranked home feed
 * Caches full ranked list so all pages (lazy load) serve from same ranked set.
 */
async function getHomeFeedAds(options = {}) {
  const {
    page = 1,
    limit = 12,
    city,
    state,
    latitude,
    longitude,
    locationSlug,
    category,
    subcategory,
    includeSponsored = true,
  } = options;

  const userLocation = (city || state || locationSlug)
    ? { city: city || null, state: state || null, slug: locationSlug || null }
    : null;
  // v3: pool ordered by featured/premium/planPriority first so they appear at top of feed
  const rankListKey = `home:ranked:v3:${city || ''}:${state || ''}:${locationSlug || ''}:${category || ''}:${subcategory || ''}`;
  const pageCacheKey = `${rankListKey}:${page}:${limit}`;

  // Try page-level cache first (faster)
  const pageCached = await getCachedAds(pageCacheKey);
  if (pageCached) return pageCached;

  const now = new Date();
  const where = {
    status: 'APPROVED',
    AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
  };

  if (category) {
    const cat = await prisma.category.findUnique({ where: { slug: category }, select: { id: true } });
    if (cat) where.categoryId = cat.id;
  }
  if (subcategory) {
    const sub = await prisma.subcategory.findFirst({ where: { slug: subcategory }, select: { id: true } });
    if (sub) where.subcategoryId = sub.id;
  }

  // Get or build full ranked list (cache so page 2, 3... don't re-fetch/re-rank)
  const cached = await getCachedAds(rankListKey);
  let ranked = Array.isArray(cached) ? cached : cached?.ranked;
  let total = cached?.total;

  if (!ranked || !Array.isArray(ranked)) {
    const [count, pool] = await Promise.all([
      prisma.ad.count({ where }),
      prisma.ad.findMany({
        where,
        take: RANK_POOL_SIZE,
        // Priority order: Featured/Premium/Business first, then by recency (so they appear at top of feed)
        orderBy: [
          { isTopAdActive: 'desc' },
          { isFeaturedActive: 'desc' },
          { isBumpActive: 'desc' },
          { isPremium: 'desc' },
          { planPriority: 'desc' },
          { createdAt: 'desc' },
        ],
        select: {
          // Only select fields we need (reduces payload size by ~60%)
          id: true,
          title: true,
          price: true,
          images: true,
          city: true,
          state: true,
          categoryId: true,
          subcategoryId: true,
          locationId: true,
          status: true,
          isPremium: true,
          premiumType: true,
          packageType: true,
          planType: true,
          planPriority: true,
          isTopAdActive: true,
          isFeaturedActive: true,
          isBumpActive: true,
          isUrgent: true,
          featuredAt: true,
          bumpedAt: true,
          expiresAt: true,
          premiumExpiresAt: true,
          createdAt: true,
          lastShownAt: true,
          userId: true,
          slug: true,
          attributes: true,
          // Relations with minimal fields
          user: { select: { id: true, name: true, avatar: true, isVerified: true } },
          category: { select: { id: true, name: true, slug: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
          location: { select: { id: true, name: true, slug: true, city: true, state: true } },
        },
      }),
    ]);
    total = count;
    const config = await getRankConfig();
    ranked = await rankAdsByLocation(pool, userLocation, config);

    // Dev-only debug: verify location slug & ranking order for first page
    if (process.env.NODE_ENV === 'development' && page === 1) {
      // eslint-disable-next-line no-console
      console.log('[HomeFeedRank] userLocation:', userLocation);
      // eslint-disable-next-line no-console
      console.log(
        '[HomeFeedRank] top 10 ads by location:',
        ranked.slice(0, 10).map((ad) => ({
          id: ad.id,
          city: ad.city,
          state: ad.state,
          locationSlug: ad.location?.slug || ad.locationSlug || null,
          premiumType: ad.premiumType,
        }))
      );
    }
    await cacheAds(rankListKey, { ranked, total }, CACHE_TTL_SEC);
  } else if (total == null) {
    total = ranked.length;
  }

  const start = (page - 1) * limit;
  let adsSlice = ranked.slice(start, start + limit);

  // Inject sponsored ads per page
  if (includeSponsored && adsSlice.length > 0) {
    const sponsored = await fetchSponsoredAds(userLocation, category, 3);
    adsSlice = injectSponsoredAds(adsSlice, sponsored, SPONSORED_INJECT_EVERY);
  }

  const { enrichAdsResult } = require('../utils/adSeo');
  const result = enrichAdsResult({
    ads: adsSlice,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
  await cacheAds(pageCacheKey, result, CACHE_TTL_SEC);
  return result;
}

module.exports = {
  PROMO_PRIORITY,
  PACKAGE_PRIORITY,
  SPONSORED_INJECT_EVERY,
  isPromotionActive,
  adTargetsLocation,
  getPromoPriority,
  locationScore,
  rotateGroup,
  filterValid,
  rankAdsByLocation,
  fetchSponsoredAds,
  injectSponsoredAds,
  getHomeFeedAds,
};
