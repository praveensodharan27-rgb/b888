/**
 * Promotion & Credit Config Service
 * Subscription plans: Basic ₹299 (priority 1), Pro ₹399 (2), Enterprise ₹499 (3), Normal (0).
 * Credit packages: TOP Ad 1000 credits, Featured 2121 credits, Bump Up per use.
 * Priority order: TOP Ads > Featured > Bump Up > Subscription > Normal.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CONFIG_KEY = 'promotion_credit_config';

/** Plan priority: 0 = Normal, 1 = Basic, 2 = Pro, 3 = Enterprise */
const PLAN_PRIORITY = {
  NORMAL: 0,
  MAX_VISIBILITY: 1,   // Business Basic ₹299
  SELLER_PLUS: 2,      // Business Pro ₹399
  SELLER_PRIME: 3      // Business Enterprise ₹499
};

const DEFAULT_CONFIG = {
  // Credits required per promotion type
  creditsPerPromotion: {
    TOP: 1000,       // TOP Ad - exclusive top section
    FEATURED: 2121,  // Pin to top of category for 7 days
    BUMP_UP: 50      // Move to top every 24h (per bump)
  },
  // Duration (days) for each promotion type
  promotionDurationDays: {
    TOP: 7,
    FEATURED: 7,
    BUMP_UP: 1       // 24h = 1 day
  },
  // Subscription plan names and priority (for display)
  subscriptionPlans: {
    MAX_VISIBILITY: { name: 'Business Basic', price: 299, priority: 1 },
    SELLER_PLUS: { name: 'Business Pro', price: 399, priority: 2 },
    SELLER_PRIME: { name: 'Business Enterprise', price: 499, priority: 3 }
  },
  // Admin: enable/disable promotion types
  promotionsEnabled: {
    TOP: true,
    FEATURED: true,
    BUMP_UP: true
  },
  updatedAt: null
};

let configCache = null;
let configCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000;

async function getPromotionConfig() {
  const now = Date.now();
  if (configCache && (now - configCacheTime) < CACHE_TTL_MS) {
    return configCache;
  }
  try {
    const row = await prisma.premiumSettings.findUnique({
      where: { key: CONFIG_KEY }
    });
    if (row?.value) {
      const parsed = JSON.parse(row.value);
      configCache = { ...DEFAULT_CONFIG, ...parsed, updatedAt: row.updatedAt };
    } else {
      configCache = { ...DEFAULT_CONFIG, updatedAt: null };
    }
    configCacheTime = now;
    return configCache;
  } catch (e) {
    configCache = { ...DEFAULT_CONFIG, updatedAt: null };
    configCacheTime = now;
    return configCache;
  }
}

function getPlanPriority(packageType) {
  if (!packageType) return PLAN_PRIORITY.NORMAL;
  return PLAN_PRIORITY[packageType] ?? PLAN_PRIORITY.NORMAL;
}

function invalidateCache() {
  configCache = null;
}

module.exports = {
  PLAN_PRIORITY,
  CONFIG_KEY,
  DEFAULT_CONFIG,
  getPromotionConfig,
  getPlanPriority,
  invalidateCache
};
