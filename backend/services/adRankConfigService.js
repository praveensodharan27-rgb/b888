/**
 * Ad Rank Config Service
 * Reads/writes ad ranking and rotation config from PremiumSettings (key: ad_rank_config).
 * Plans: Business Basic ₹299 (MAX_VISIBILITY), Pro ₹399 (SELLER_PLUS), Enterprise ₹499 (SELLER_PRIME).
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CONFIG_KEY = 'ad_rank_config';

const DEFAULT_CONFIG = {
  // Featured/bump: after this many days, ad returns to normal ranking
  featuredDurationDays: 7,
  bumpDurationDays: 1,
  // Rotation: reorder within same plan every N hours
  rotationIntervalHours: 2.5,
  // Pro ads: target % of first page (e.g. first 20–30% in search)
  proSearchPercent: 25,
  enterpriseSearchPercent: 10,
  basicSearchPercent: 15,
  // Boost limits per plan (-1 = unlimited)
  boostLimits: {
    NORMAL: 0,
    MAX_VISIBILITY: 2,   // Basic: limited boosts
    SELLER_PLUS: 5,      // Pro: limited
    SELLER_PRIME: -1     // Enterprise: unlimited
  },
  // Admin overrides
  manualPriorityOverrides: {}, // adId -> rank position (optional)
  disableRotation: false,
  updatedAt: null,
  updatedBy: null
};

/**
 * Get ad rank config (cached in memory for 1 min to avoid DB hit every request)
 */
let configCache = null;
let configCacheTime = 0;
const CONFIG_CACHE_TTL_MS = 60 * 1000;

async function getRankConfig() {
  const now = Date.now();
  if (configCache && (now - configCacheTime) < CONFIG_CACHE_TTL_MS) {
    return configCache;
  }
  try {
    const row = await prisma.premiumSettings.findUnique({
      where: { key: CONFIG_KEY }
    });
    if (row && row.value) {
      const parsed = JSON.parse(row.value);
      configCache = { ...DEFAULT_CONFIG, ...parsed, updatedAt: row.updatedAt };
    } else {
      configCache = { ...DEFAULT_CONFIG, updatedAt: null };
    }
    configCacheTime = now;
    return configCache;
  } catch (e) {
    console.warn('adRankConfigService getRankConfig:', e.message);
    configCache = { ...DEFAULT_CONFIG, updatedAt: null };
    configCacheTime = now;
    return configCache;
  }
}

/**
 * Update ad rank config (admin only)
 */
async function updateRankConfig(updates, updatedBy = null) {
  const current = await getRankConfig();
  const next = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
    updatedBy: updatedBy || current.updatedBy
  };
  delete next.updatedAt;
  const value = JSON.stringify(next);
  await prisma.premiumSettings.upsert({
    where: { key: CONFIG_KEY },
    create: { key: CONFIG_KEY, value, updatedBy: updatedBy || null },
    update: { value, updatedBy: updatedBy || null }
  });
  configCache = null;
  return getRankConfig();
}

/**
 * Invalidate in-memory cache (e.g. after admin update)
 */
function invalidateRankConfigCache() {
  configCache = null;
}

/**
 * Check if featured/bump is still active for an ad
 * Uses featuredAt/bumpedAt when present; falls back to stored isFeaturedActive/isBumpActive when dates are missing
 */
function isFeaturedActive(ad, config) {
  if (ad.isFeaturedActive === true && (ad.featuredAt == null || ad.featuredAt === undefined)) return true;
  if (!ad.featuredAt) return false;
  const days = config.featuredDurationDays ?? 7;
  const expiry = new Date(ad.featuredAt);
  expiry.setDate(expiry.getDate() + days);
  return expiry > new Date();
}

function isBumpActive(ad, config) {
  if (ad.isBumpActive === true && (ad.bumpedAt == null || ad.bumpedAt === undefined)) return true;
  if (!ad.bumpedAt) return false;
  const days = config.bumpDurationDays ?? 1;
  const expiry = new Date(ad.bumpedAt);
  expiry.setDate(expiry.getDate() + days);
  return expiry > new Date();
}

module.exports = {
  CONFIG_KEY,
  DEFAULT_CONFIG,
  getRankConfig,
  updateRankConfig,
  invalidateRankConfigCache,
  isFeaturedActive,
  isBumpActive
};
