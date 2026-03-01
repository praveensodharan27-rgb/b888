/**
 * Ad Posting Logic Service
 * Single source of truth for: user status, posting mode (BUSINESS vs SINGLE),
 * canPost, costs. All values from backend (DB + promotion config).
 * See AD_POSTING_LOGIC.md.
 */

const { PrismaClient } = require('@prisma/client');
const { getPromotionConfig } = require('./promotionConfigService');
const { checkAndResetUserQuota } = require('./monthlyQuotaReset');

const prisma = new PrismaClient();

const FREE_ADS_LIMIT = parseInt(process.env.FREE_ADS_LIMIT || '2', 10);

/**
 * Get posting status for a user (all from backend).
 * Ensures every user has monthly free ads: runs checkAndResetUserQuota so quota is reset at start of each month.
 * @param {string} userId
 * @returns {Promise<{
 *   active_package: boolean,
 *   remaining_ads: number,
 *   credits_balance: number,
 *   mode: 'BUSINESS'|'SINGLE',
 *   canPost: boolean,
 *   blockReason?: string,
 *   featured_cost: number,
 *   bump_cost: number,
 *   freeAdsRemaining: number,
 *   businessAdsRemaining: number,
 *   packages?: Array<{ id: string, packageType: string, adsRemaining: number }>
 * }>}
 */
async function getPostingStatus(userId) {
  // Ensure all users have monthly free ads: check and reset quota if new month
  await checkAndResetUserQuota(userId);

  const config = await getPromotionConfig();
  const featured_cost = config.creditsPerPromotion?.FEATURED ?? 2121;
  const bump_cost = config.creditsPerPromotion?.BUMP_UP ?? 50;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  const credits_balance = user?.creditsBalance ?? 0;

  const now = new Date();
  const activePackages = await prisma.businessPackage.findMany({
    where: {
      userId,
      status: { in: ['paid', 'verified'] },
      expiresAt: { gt: now },
    },
    orderBy: [{ expiresAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      packageType: true,
      totalAdsAllowed: true,
      adsUsed: true,
    },
  });

  const active_package = activePackages.length > 0;
  let remaining_ads = 0;
  let businessAdsUsed = 0;
  let businessAdsLimit = 0;
  const packages = activePackages.map((pkg) => {
    const total = pkg.totalAdsAllowed || 0;
    const used = pkg.adsUsed || 0;
    const adsRemaining = Math.max(0, total - used);
    remaining_ads += adsRemaining;
    businessAdsUsed += used;
    businessAdsLimit += total;
    return {
      id: pkg.id,
      packageType: pkg.packageType,
      adsRemaining,
      totalAdsAllowed: total,
      adsUsed: used,
    };
  });

  const rawFreeRemaining = Math.max(0, (user?.freeAdsRemaining ?? FREE_ADS_LIMIT) - (user?.freeAdsUsedThisMonth ?? 0));
  const businessAdsRemaining = remaining_ads;
  const freeAdsRemaining = businessAdsRemaining > 0 ? 0 : rawFreeRemaining;
  // Plan expiry is valid when we have active packages (we only fetch where expiresAt > now)
  const planExpiryValid = active_package;
  // Allow direct post: business plan active + valid expiry + ads remaining → show post button, hide premium popup
  const allowDirectPost = active_package && planExpiryValid && remaining_ads > 0;

  let mode = 'SINGLE';
  let canPost = true;
  let blockReason = null;

  if (active_package && remaining_ads > 0) {
    mode = 'BUSINESS';
    canPost = true;
  } else if (active_package && remaining_ads === 0) {
    mode = 'BUSINESS';
    canPost = false;
    blockReason = 'Package exhausted. Upgrade or post with single buy.';
  } else {
    if (freeAdsRemaining <= 0) {
      canPost = false;
      blockReason = 'Free ad limit reached. Purchase a package or single ad.';
    }
  }

  // Premium UI visibility: based on total remaining (free + business)
  const totalRemaining = freeAdsRemaining + businessAdsRemaining;
  const hasBusinessQuotaLeft = active_package && remaining_ads > 0;
  const hidePremiumSection = totalRemaining > 0;  // undel (have ads) → kanikaruthu (don't show)
  const hideSingleBuy = totalRemaining > 0;
  const showOnlyBusinessPosting = hasBusinessQuotaLeft;
  const businessPackageExpired = !active_package;
  // 0 ayal kanikkanam: Show premium options only when total remaining === 0 (no free, no business ads left)
  const showBusinessPackageStatusSection = totalRemaining === 0;

  return {
    active_package,
    remaining_ads,
    credits_balance,
    mode,
    canPost,
    blockReason: canPost ? undefined : blockReason,
    featured_cost,
    bump_cost,
    freeAdsRemaining,
    businessAdsRemaining,
    totalRemaining,
    packages,
    promotionsEnabled: config.promotionsEnabled || { TOP: true, FEATURED: true, BUMP_UP: true },
    // API contract for frontend: no independent logic; follow these flags only
    activeBusinessPackage: active_package,
    hidePremiumSection,
    hideSingleBuy,
    showOnlyBusinessPosting,
    businessPackageExpired,
    showBusinessPackageStatusSection,
    // Explicit rule: businessPlanActive + planExpiryValid + businessAdsUsed < businessAdsLimit → show post, hide popup, allow direct post
    businessPlanActive: active_package,
    planExpiryValid,
    businessAdsUsed,
    businessAdsLimit,
    allowDirectPost,
  };
}

/**
 * Consume one ad from the first active package that has remaining ads.
 * Call this when posting in BUSINESS mode.
 * @param {string} userId
 * @returns {Promise<{ packageId: string, packageType: string }|null>} Package used, or null if none available
 */
async function consumeBusinessAd(userId) {
  const now = new Date();
  const packages = await prisma.businessPackage.findMany({
    where: {
      userId,
      status: { in: ['paid', 'verified'] },
      expiresAt: { gt: now },
    },
    orderBy: [{ expiresAt: 'desc' }, { createdAt: 'asc' }],
    select: { id: true, packageType: true, totalAdsAllowed: true, adsUsed: true },
  });

  for (const pkg of packages) {
    const remaining = (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0);
    if (remaining <= 0) continue;

    await prisma.businessPackage.update({
      where: { id: pkg.id },
      data: { adsUsed: (pkg.adsUsed || 0) + 1 },
    });

    return { packageId: pkg.id, packageType: pkg.packageType || 'NORMAL' };
  }

  return null;
}

module.exports = {
  getPostingStatus,
  consumeBusinessAd,
};
