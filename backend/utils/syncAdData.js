/**
 * Sync Ad Data to Meilisearch
 * 
 * Utility functions to sync ad data to Meilisearch on various events:
 * - Ad create
 * - Ad update
 * - Plan purchase
 * - Promotion activation
 * - Ad expiry
 * - Status change
 */

const { syncAdToMeilisearch, deleteAd } = require('../services/meilisearch');
const { logger } = require('../src/config/logger');

/**
 * Sync ad on create
 * @param {object} ad - The created ad
 */
async function syncOnCreate(ad) {
  try {
    if (ad.status === 'APPROVED') {
      await syncAdToMeilisearch(ad);
      logger.info({ adId: ad.id }, 'Ad synced on create');
    }
  } catch (error) {
    logger.error({ err: error.message, adId: ad.id }, 'Failed to sync ad on create');
  }
}

/**
 * Sync ad on update
 * @param {object} ad - The updated ad
 */
async function syncOnUpdate(ad) {
  try {
    if (ad.status === 'APPROVED') {
      await syncAdToMeilisearch(ad);
      logger.info({ adId: ad.id }, 'Ad synced on update');
    } else {
      // If ad is no longer approved, remove from index
      await deleteAd(ad.id);
      logger.info({ adId: ad.id }, 'Ad removed from index on update');
    }
  } catch (error) {
    logger.error({ err: error.message, adId: ad.id }, 'Failed to sync ad on update');
  }
}

/**
 * Sync ad on status change
 * @param {object} ad - The ad with new status
 * @param {string} oldStatus - The previous status
 */
async function syncOnStatusChange(ad, oldStatus) {
  try {
    if (ad.status === 'APPROVED' && oldStatus !== 'APPROVED') {
      // Ad was approved, add to index
      await syncAdToMeilisearch(ad);
      logger.info({ adId: ad.id, oldStatus, newStatus: ad.status }, 'Ad added to index on approval');
    } else if (ad.status !== 'APPROVED' && oldStatus === 'APPROVED') {
      // Ad was rejected/disabled, remove from index
      await deleteAd(ad.id);
      logger.info({ adId: ad.id, oldStatus, newStatus: ad.status }, 'Ad removed from index on rejection');
    }
  } catch (error) {
    logger.error({ err: error.message, adId: ad.id }, 'Failed to sync ad on status change');
  }
}

/**
 * Sync ad on plan purchase
 * @param {object} ad - The ad with new plan
 * @param {string} planType - The new plan type
 */
async function syncOnPlanPurchase(ad, planType) {
  try {
    // Update ad with new plan
    const updatedAd = {
      ...ad,
      planType,
      planPriority: getPlanPriority(planType),
    };
    
    await syncAdToMeilisearch(updatedAd);
    logger.info({ adId: ad.id, planType }, 'Ad synced on plan purchase');
  } catch (error) {
    logger.error({ err: error.message, adId: ad.id }, 'Failed to sync ad on plan purchase');
  }
}

/**
 * Sync ad on promotion activation
 * @param {object} ad - The ad
 * @param {string} promotionType - The promotion type (top, featured, bump)
 */
async function syncOnPromotionActivation(ad, promotionType) {
  try {
    const updatedAd = { ...ad };
    
    switch (promotionType) {
      case 'top':
        updatedAd.isTopAdActive = true;
        break;
      case 'featured':
        updatedAd.isFeaturedActive = true;
        break;
      case 'bump':
        updatedAd.isBumpActive = true;
        updatedAd.bumpedAt = new Date();
        break;
    }
    
    await syncAdToMeilisearch(updatedAd);
    logger.info({ adId: ad.id, promotionType }, 'Ad synced on promotion activation');
  } catch (error) {
    logger.error({ err: error.message, adId: ad.id }, 'Failed to sync ad on promotion activation');
  }
}

/**
 * Sync ad on expiry
 * @param {string} adId - The ad ID
 */
async function syncOnExpiry(adId) {
  try {
    // Remove expired ad from index
    await deleteAd(adId);
    logger.info({ adId }, 'Expired ad removed from index');
  } catch (error) {
    logger.error({ err: error.message, adId }, 'Failed to remove expired ad from index');
  }
}

/**
 * Sync ad on delete
 * @param {string} adId - The ad ID
 */
async function syncOnDelete(adId) {
  try {
    await deleteAd(adId);
    logger.info({ adId }, 'Ad removed from index on delete');
  } catch (error) {
    logger.error({ err: error.message, adId }, 'Failed to remove ad from index on delete');
  }
}

/**
 * Get plan priority
 * @param {string} planType - The plan type
 * @returns {number} - The plan priority
 */
function getPlanPriority(planType) {
  const priorities = {
    enterprise: 4,
    pro: 3,
    basic: 2,
    normal: 1,
  };
  return priorities[planType?.toLowerCase()] || 1;
}

/**
 * Batch sync multiple ads
 * @param {array} ads - Array of ads to sync
 */
async function batchSync(ads) {
  try {
    const { indexAds } = require('../services/meilisearch');
    await indexAds(ads);
    logger.info({ count: ads.length }, 'Batch synced ads');
  } catch (error) {
    logger.error({ err: error.message, count: ads.length }, 'Failed to batch sync ads');
  }
}

module.exports = {
  syncOnCreate,
  syncOnUpdate,
  syncOnStatusChange,
  syncOnPlanPurchase,
  syncOnPromotionActivation,
  syncOnExpiry,
  syncOnDelete,
  batchSync,
};
