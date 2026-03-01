/**
 * Promotion Service
 * Expire ad promotions (TOP, Featured, Bump Up). Activation is handled elsewhere (e.g. premium purchase).
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getPromotionConfig } = require('./promotionConfigService');

/**
 * Activate a promotion for an ad (no credits; used only if re-enabled via another flow).
 * @param {string} userId - Owner of the ad
 * @param {string} adId - Ad to promote
 * @param {'TOP'|'FEATURED'|'BUMP_UP'} promotionType
 * @returns { ad }
 */
async function activatePromotion(userId, adId, promotionType) {
  const config = await getPromotionConfig();
  if (!config.promotionsEnabled?.[promotionType]) {
    throw new Error(`Promotion type ${promotionType} is currently disabled`);
  }

  const ad = await prisma.ad.findFirst({
    where: { id: adId, userId }
  });
  if (!ad) throw new Error('Ad not found or you do not own it');
  if (ad.status !== 'APPROVED') throw new Error('Only approved ads can be promoted');

  const now = new Date();
  const durationDays = config.promotionDurationDays?.[promotionType] ?? (promotionType === 'FEATURED' ? 7 : promotionType === 'TOP' ? 7 : 1);
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  const updateData = {
    isPremium: true,
    premiumType: promotionType,
    promotionType,
    promotionStartAt: now,
    premiumExpiresAt: expiresAt,
    lastShownAt: null
  };

  if (promotionType === 'FEATURED') {
    updateData.featuredAt = now;
  }
  if (promotionType === 'BUMP_UP') {
    updateData.bumpedAt = now;
    updateData.lastBumpedAt = now;
    updateData.boostCount = (ad.boostCount ?? 0) + 1;
  }
  if (promotionType === 'TOP') {
    updateData.featuredAt = now; // TOP also uses a "featured" style slot
  }

  const updatedAd = await prisma.ad.update({
    where: { id: adId },
    data: updateData,
    include: {
      category: { select: { name: true, slug: true } },
      subcategory: { select: { name: true, slug: true } },
      user: { select: { id: true, name: true } }
    }
  });

  return { ad: updatedAd };
}

/**
 * Expire featured ads that have passed their 7-day window.
 */
async function expireFeaturedAds() {
  const config = await getPromotionConfig();
  const days = config.promotionDurationDays?.FEATURED ?? 7;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const result = await prisma.ad.updateMany({
    where: {
      status: 'APPROVED',
      isPremium: true,
      premiumType: 'FEATURED',
      featuredAt: { lt: cutoff }
    },
    data: {
      isPremium: false,
      premiumType: null,
      promotionType: null,
      promotionStartAt: null,
      premiumExpiresAt: null,
      featuredAt: null
    }
  });
  return result.count;
}

/**
 * Expire bump ads that are older than 24h (so they revert to normal until next bump).
 */
async function expireBumpAds() {
  const config = await getPromotionConfig();
  const days = config.promotionDurationDays?.BUMP_UP ?? 1;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const result = await prisma.ad.updateMany({
    where: {
      status: 'APPROVED',
      isPremium: true,
      premiumType: 'BUMP_UP',
      lastBumpedAt: { lt: cutoff }
    },
    data: {
      isPremium: false,
      premiumType: null,
      promotionType: null,
      promotionStartAt: null,
      premiumExpiresAt: null,
      bumpedAt: null,
      lastBumpedAt: null
    }
  });
  return result.count;
}

/**
 * Expire TOP ads past their validity (e.g. 7 days).
 */
async function expireTopAds() {
  const now = new Date();
  const result = await prisma.ad.updateMany({
    where: {
      status: 'APPROVED',
      isPremium: true,
      premiumType: 'TOP',
      premiumExpiresAt: { lt: now }
    },
    data: {
      isPremium: false,
      premiumType: null,
      promotionType: null,
      promotionStartAt: null,
      premiumExpiresAt: null,
      featuredAt: null
    }
  });
  return result.count;
}

module.exports = {
  activatePromotion,
  expireFeaturedAds,
  expireBumpAds,
  expireTopAds
};
