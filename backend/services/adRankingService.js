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
 * Rotate within a group: oldest lastShownAt first (never shown = top), then weighted random for ties
 */
function rotateAdsInGroup(ads, contextLocation = null) {
  if (!ads.length) return [];
  const withScore = ads.map(ad => ({
    ad,
    lastShown: ad.lastShownAt ? new Date(ad.lastShownAt).getTime() : 0,
    locScore: locationScore(ad, contextLocation),
    rand: Math.random()
  }));
  withScore.sort((a, b) => {
    if (a.locScore !== b.locScore) return b.locScore - a.locScore;
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
    ...rotateAdsInGroup(topAds, locationContext),
    ...rotateAdsInGroup(featured, locationContext),
    ...rotateAdsInGroup(bumped, locationContext)
  ];
  const byPlan = groupAdsByPackage(rest);
  const planOrder = [PACKAGE_PRIORITY.ENTERPRISE, PACKAGE_PRIORITY.PRO, PACKAGE_PRIORITY.BASIC, PACKAGE_PRIORITY.NORMAL];
  for (const p of planOrder) {
    const group = byPlan[p] || [];
    order.push(...rotateAdsInGroup(group, locationContext));
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

function rotateAdsInGroupExport(ads, contextLocation) {
  return rotateAdsInGroup(ads, contextLocation);
}

function calculateAdScore(ad, contextLocation) {
  const plan = getPackagePriority(ad) * 1000;
  const featured = ad.featuredAt ? 500 : 0;
  const bump = ad.bumpedAt ? 200 : 0;
  const freshness = isNewAd(ad) ? 100 : 0;
  const rotation = ad.lastShownAt ? 0 : 50;
  const loc = locationScore(ad, contextLocation) * 10;
  return plan + featured + bump + freshness + rotation + loc;
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
