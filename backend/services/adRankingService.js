/**
 * Ad Ranking Service
 * Priority order: TOP Ads > Featured Ad > Bump Up > Subscription (Enterprise > Pro > Basic) > Normal.
 * Fair rotation within each tier; location-aware.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getRankConfig, isFeaturedActive, isBumpActive } = require('./adRankConfigService');
const { getPlanPriority } = require('./promotionConfigService');

// Plan priority: 0 = Normal, 1 = Basic, 2 = Pro, 3 = Enterprise (for ordering: higher = first)
const PACKAGE_PRIORITY = {
  NORMAL: 0,
  BASIC: 1,
  PRO: 2,
  ENTERPRISE: 3
};

const PACKAGE_TYPE_MAP = {
  NORMAL: PACKAGE_PRIORITY.NORMAL,
  MAX_VISIBILITY: PACKAGE_PRIORITY.BASIC,
  SELLER_PLUS: PACKAGE_PRIORITY.PRO,
  SELLER_PRIME: PACKAGE_PRIORITY.ENTERPRISE
};

const NEW_AD_THRESHOLD_MS = 24 * 60 * 60 * 1000;

function isAdExpired(ad) {
  if (!ad || !ad.expiresAt) return false;
  return new Date(ad.expiresAt) <= new Date();
}

function getPackagePriority(ad) {
  if (!ad || ad.packageType == null) return PACKAGE_PRIORITY.NORMAL;
  return PACKAGE_TYPE_MAP[ad.packageType] ?? PACKAGE_PRIORITY.NORMAL;
}

/** Check if TOP promotion is still active (by premiumExpiresAt). */
function isTopActive(ad) {
  if (!ad?.isPremium || ad.premiumType !== 'TOP') return false;
  if (ad.premiumExpiresAt && new Date(ad.premiumExpiresAt) <= new Date()) return false;
  return true;
}

function isNewAd(ad) {
  if (!ad?.createdAt) return false;
  return (Date.now() - new Date(ad.createdAt).getTime()) <= NEW_AD_THRESHOLD_MS;
}

async function getUserPackagePriority(userId) {
  try {
    const now = new Date();
    const ubp = await prisma.userBusinessPackage.findFirst({
      where: { userId, status: 'active', expiresAt: { gt: now } },
      orderBy: { purchaseTime: 'desc' }
    });
    if (ubp) return PACKAGE_TYPE_MAP[ubp.packageType] || PACKAGE_PRIORITY.NORMAL;
    const bp = await prisma.businessPackage.findFirst({
      where: { userId, status: 'paid', expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' }
    });
    if (bp) return PACKAGE_TYPE_MAP[bp.packageType] || PACKAGE_PRIORITY.NORMAL;
    return PACKAGE_PRIORITY.NORMAL;
  } catch (e) {
    return PACKAGE_PRIORITY.NORMAL;
  }
}

function filterValidAds(ads) {
  const now = new Date();
  return (ads || []).filter(ad => {
    if (!ad?.id) return false;
    if (ad.status !== 'APPROVED') return false;
    if (ad.expiresAt && new Date(ad.expiresAt) <= now) return false;
    return true;
  });
}

/**
 * Location relevance: prefer same city/state if context provided
 */
function locationScore(ad, contextLocation) {
  if (!contextLocation) return 0;
  let score = 0;
  if (contextLocation.city && ad.city && ad.city.toLowerCase() === contextLocation.city.toLowerCase()) score += 2;
  if (contextLocation.state && ad.state && ad.state.toLowerCase() === contextLocation.state.toLowerCase()) score += 1;
  return score;
}

/**
 * Rotate within a group.
 * Ordering inside a tier is driven primarily by the combined ad score
 * (which includes premium tier, freshness, location, engagement, quality, price),
 * then by lastShownAt (oldest / never-shown first) and a tiny random factor.
 */
function rotateAdsInGroup(ads, contextLocation = null, priceRange = null) {
  if (!ads.length) return [];

  const withScore = ads.map(ad => ({
    ad,
    score: calculateAdScore(ad, contextLocation, priceRange),
    lastShown: ad.lastShownAt ? new Date(ad.lastShownAt).getTime() : 0,
    rand: Math.random()
  }));

  withScore.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.lastShown !== b.lastShown) return a.lastShown - b.lastShown;
    return a.rand - b.rand;
  });

  return withScore.map(x => x.ad);
}

function groupAdsByPackage(ads) {
  const groups = {
    [PACKAGE_PRIORITY.ENTERPRISE]: [],
    [PACKAGE_PRIORITY.PRO]: [],
    [PACKAGE_PRIORITY.BASIC]: [],
    [PACKAGE_PRIORITY.NORMAL]: []
  };
  ads.forEach(ad => {
    const p = getPackagePriority(ad);
    if (groups[p]) groups[p].push(ad);
  });
  return groups;
}

/**
 * Main ranking: TOP Ads > Featured Ad > Bump Up > Subscription (Enterprise > Pro > Basic) > Normal.
 * Rotation within each tier for fairness.
 */
async function rankAds(ads, options = {}) {
  const {
    updateLastShown = false,
    context = 'listing',
    contextId = null,
    locationContext = null,
    maxUpdateLastShown = 100
  } = options;

  if (!ads?.length) return [];

  const config = await getRankConfig();
  const valid = filterValidAds(ads);
  if (!valid.length) return [];

  // Lightweight price range computation for PriceScore (single pass over already-fetched ads)
  let priceRange = null;
  const prices = valid
    .map(a => (typeof a.price === 'number' ? a.price : null))
    .filter(p => p !== null && !Number.isNaN(p) && p > 0);

  if (prices.length) {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (max > min) {
      priceRange = { min, max };
    }
  }

  const topAds = [];
  const featured = [];
  const bumped = [];
  const rest = [];

  for (const ad of valid) {
    if (isTopActive(ad)) topAds.push(ad);
    else if (ad.premiumType === 'FEATURED' && isFeaturedActive(ad, config)) featured.push(ad);
    else if (ad.premiumType === 'BUMP_UP' && isBumpActive(ad, config)) bumped.push(ad);
    else rest.push(ad);
  }

  const order = [
    ...rotateAdsInGroup(topAds, locationContext, priceRange),
    ...rotateAdsInGroup(featured, locationContext, priceRange),
    ...rotateAdsInGroup(bumped, locationContext, priceRange)
  ];
  const byPlan = groupAdsByPackage(rest);
  const planOrder = [PACKAGE_PRIORITY.ENTERPRISE, PACKAGE_PRIORITY.PRO, PACKAGE_PRIORITY.BASIC, PACKAGE_PRIORITY.NORMAL];
  for (const p of planOrder) {
    const group = byPlan[p] || [];
    order.push(...rotateAdsInGroup(group, locationContext, priceRange));
  }

  // Development-only debug logging of score components for a few sample ads
  if (process && process.env && process.env.NODE_ENV === 'development') {
    const sample = order.slice(0, 5);
    const debugPayload = sample.map((ad, index) => ({
      index,
      id: ad.id,
      title: ad.title,
      premiumType: ad.premiumType,
      packagePriority: getPackagePriority(ad),
      score: getAdScoreComponents(ad, locationContext, priceRange)
    }));

    // eslint-disable-next-line no-console
    console.log('[AdRanking] Sample score breakdown:', JSON.stringify(debugPayload, null, 2));
  }

  if (updateLastShown && order.length > 0) {
    const ids = order.slice(0, maxUpdateLastShown).map(a => a.id).filter(Boolean);
    if (ids.length) {
      try {
        await prisma.ad.updateMany({
          where: { id: { in: ids } },
          data: { lastShownAt: new Date() }
        });
      } catch (e) {
        console.warn('rankAds updateLastShown:', e.message);
      }
    }
  }

  return order;
}

async function filterAndEnrichAds(ads) {
  return filterValidAds(ads);
}

function groupAdsByPackageExport(ads) {
  return groupAdsByPackage(ads);
}

function rotateAdsInGroupExport(ads, contextLocation, priceRange) {
  return rotateAdsInGroup(ads, contextLocation, priceRange);
}

function getAdScoreComponents(ad, contextLocation, priceRange = null) {
  // Premium / business package contribution
  const plan = getPackagePriority(ad) * 1000;
  const featured = ad.featuredAt ? 500 : 0;
  const bump = ad.bumpedAt ? 200 : 0;

  // Freshness & lightweight rotation bias
  const freshness = isNewAd(ad) ? 100 : 0;
  const rotation = ad.lastShownAt ? 0 : 50;

  // Location relevance
  const loc = locationScore(ad, contextLocation) * 10;

  // EngagementScore (clicks/messages/favourites/views) – use only cheap, already-loaded fields
  const views = typeof ad.views === 'number' ? ad.views : 0;
  const favourites = typeof ad.favouritesCount === 'number' ? ad.favouritesCount : 0;
  const messages = typeof ad.messagesCount === 'number' ? ad.messagesCount : 0;
  const clicks = typeof ad.clicksCount === 'number' ? ad.clicksCount : 0;

  // Simple capped normalization so the score stays lightweight and bounded
  const engagementRaw = views + favourites * 3 + messages * 4 + clicks * 2;
  const engagementScore = Math.min(engagementRaw / 50, 1) * 80; // 0–80

  // QualityScore – photos, description length, verified seller
  const imagesCount = Array.isArray(ad.images) ? ad.images.length : 0;
  const photosScore = Math.min(imagesCount, 8) * 5; // 0–40

  const descLength = typeof ad.description === 'string' ? ad.description.length : 0;
  const descScore = Math.min(descLength / 500, 1) * 40; // 0–40

  const verifiedScore = ad.user && ad.user.isVerified ? 40 : 0;

  const qualityScore = photosScore + descScore + verifiedScore; // max ~120

  // PriceScore – favour competitive (cheaper) ads within the same pool
  let priceScore = 0;
  if (
    priceRange &&
    typeof ad.price === 'number' &&
    !Number.isNaN(ad.price) &&
    ad.price > 0
  ) {
    const span = priceRange.max - priceRange.min;
    if (span > 0) {
      const normalized = Math.min(
        Math.max((priceRange.max - ad.price) / span, 0),
        1
      );
      priceScore = normalized * 40; // 0–40
    }
  }

  const total =
    plan +
    featured +
    bump +
    freshness +
    rotation +
    loc +
    engagementScore +
    qualityScore +
    priceScore;

  return {
    total,
    plan,
    featured,
    bump,
    freshness,
    rotation,
    location: loc,
    engagement: engagementScore,
    quality: qualityScore,
    price: priceScore
  };
}

function calculateAdScore(ad, contextLocation, priceRange = null) {
  const components = getAdScoreComponents(ad, contextLocation, priceRange);
  return components.total;
}

module.exports = {
  PACKAGE_PRIORITY,
  PACKAGE_TYPE_MAP,
  isAdExpired,
  getPackagePriority,
  isNewAd,
  isTopActive,
  getUserPackagePriority,
  filterAndEnrichAds,
  groupAdsByPackage: groupAdsByPackageExport,
  rotateAdsInGroup: rotateAdsInGroupExport,
  rankAds,
  calculateAdScore
};
