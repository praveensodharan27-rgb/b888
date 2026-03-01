/**
 * Bump Ad Utility
 * 
 * Provides functionality to bump ads to the top by updating createdAt
 * and re-indexing in Meilisearch
 */

const { PrismaClient } = require('@prisma/client');
const { syncAdToMeilisearch } = require('../services/meilisearch');
const { logger } = require('../src/config/logger');

const prisma = new PrismaClient();

/**
 * Bump an ad to the top
 * @param {string} adId - The ad ID to bump
 * @param {string} userId - The user ID (for authorization)
 * @returns {Promise<{success: boolean, message: string, ad?: object}>}
 */
async function bumpAd(adId, userId) {
  try {
    // Check if ad exists and belongs to user
    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      select: {
        id: true,
        userId: true,
        status: true,
        title: true,
      },
    });

    if (!ad) {
      return {
        success: false,
        message: 'Ad not found',
      };
    }

    if (ad.userId !== userId) {
      return {
        success: false,
        message: 'Unauthorized: You do not own this ad',
      };
    }

    if (ad.status !== 'APPROVED') {
      return {
        success: false,
        message: 'Only approved ads can be bumped',
      };
    }

    // Update ad with new createdAt and bump flags
    const updatedAd = await prisma.ad.update({
      where: { id: adId },
      data: {
        createdAt: new Date(),
        isBumpActive: true,
        bumpedAt: new Date(),
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
        location: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Re-index in Meilisearch
    await syncAdToMeilisearch(updatedAd);

    logger.info({ adId, userId, title: ad.title }, 'Ad bumped successfully');

    return {
      success: true,
      message: 'Ad bumped successfully',
      ad: updatedAd,
    };
  } catch (error) {
    logger.error({ err: error.message, adId, userId }, 'Error bumping ad');
    return {
      success: false,
      message: 'Failed to bump ad',
      error: error.message,
    };
  }
}

/**
 * Check if user can bump ad (rate limiting, credits, etc.)
 * @param {string} userId - The user ID
 * @param {string} adId - The ad ID
 * @returns {Promise<{canBump: boolean, reason?: string}>}
 */
async function canUserBumpAd(userId, adId) {
  try {
    // Check if ad was recently bumped (e.g., within last 24 hours)
    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      select: {
        userId: true,
        bumpedAt: true,
        planType: true,
      },
    });

    if (!ad) {
      return { canBump: false, reason: 'Ad not found' };
    }

    if (ad.userId !== userId) {
      return { canBump: false, reason: 'Unauthorized' };
    }

    // Check bump cooldown (24 hours for normal, 12 hours for basic, 6 hours for pro/enterprise)
    if (ad.bumpedAt) {
      const hoursSinceBump = (Date.now() - new Date(ad.bumpedAt).getTime()) / (1000 * 60 * 60);
      let cooldownHours = 24;

      switch (ad.planType) {
        case 'enterprise':
        case 'pro':
          cooldownHours = 6;
          break;
        case 'basic':
          cooldownHours = 12;
          break;
        default:
          cooldownHours = 24;
      }

      if (hoursSinceBump < cooldownHours) {
        return {
          canBump: false,
          reason: `Please wait ${Math.ceil(cooldownHours - hoursSinceBump)} more hours before bumping again`,
        };
      }
    }

    return { canBump: true };
  } catch (error) {
    logger.error({ err: error.message, userId, adId }, 'Error checking bump eligibility');
    return { canBump: false, reason: 'Failed to check eligibility' };
  }
}

/**
 * Get bump statistics for user
 * @param {string} userId - The user ID
 * @returns {Promise<{totalBumps: number, availableBumps: number, lastBumpDate?: Date}>}
 */
async function getUserBumpStats(userId) {
  try {
    const ads = await prisma.ad.findMany({
      where: { userId },
      select: {
        bumpedAt: true,
        isBumpActive: true,
      },
    });

    const totalBumps = ads.filter(ad => ad.isBumpActive).length;
    const lastBumpDate = ads
      .map(ad => ad.bumpedAt)
      .filter(Boolean)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return {
      totalBumps,
      lastBumpDate,
    };
  } catch (error) {
    logger.error({ err: error.message, userId }, 'Error getting bump stats');
    return {
      totalBumps: 0,
    };
  }
}

module.exports = {
  bumpAd,
  canUserBumpAd,
  getUserBumpStats,
};
