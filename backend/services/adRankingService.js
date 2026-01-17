/**
 * Ad Ranking Service
 * Implements package-based visibility, new ads priority, and fair rotation logic
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Package Priority Mapping
const PACKAGE_PRIORITY = {
  ENTERPRISE: 4, // Business Enterprise
  PRO: 3,        // Business Pro
  BASIC: 2,      // Business Basic
  NORMAL: 1      // Normal User
};

// Map BusinessPackageType to priority
const PACKAGE_TYPE_MAP = {
  'NORMAL': PACKAGE_PRIORITY.NORMAL,
  'SELLER_PRIME': PACKAGE_PRIORITY.ENTERPRISE,
  'SELLER_PLUS': PACKAGE_PRIORITY.PRO,
  'MAX_VISIBILITY': PACKAGE_PRIORITY.BASIC
};

// New ad threshold (24 hours)
const NEW_AD_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/**
 * Check if ad is expired (package or ad expiry)
 * Note: Only check package expiry if ad was created using that package
 */
function isAdExpired(ad, userPackage = null) {
  const now = new Date();
  
  // Only check ad expiry - don't check package expiry here
  // Package expiry should be handled separately and only for ads created with that package
  if (ad.expiresAt) {
    const adExpiry = new Date(ad.expiresAt);
    if (adExpiry <= now) {
      return true;
    }
  }
  
  // Don't filter by package expiry in ranking - let ads show even if package expired
  // Package expiry is handled at ad creation time, not display time
  // This ensures ads are not hidden unnecessarily
  
  return false;
}

/**
 * Get package priority for an ad
 */
function getPackagePriority(ad) {
  // packageType can be enum string (NORMAL/SELLER_PLUS/...) or legacy number
  if (!ad || ad.packageType === null || ad.packageType === undefined) return PACKAGE_PRIORITY.NORMAL;
  if (typeof ad.packageType === 'number') return ad.packageType || PACKAGE_PRIORITY.NORMAL;
  if (typeof ad.packageType === 'string') return PACKAGE_TYPE_MAP[ad.packageType] || PACKAGE_PRIORITY.NORMAL;
  return PACKAGE_PRIORITY.NORMAL;
}

/**
 * Check if ad is new (created within 24 hours)
 */
function isNewAd(ad) {
  if (!ad.createdAt) return false;
  const now = new Date();
  const adDate = new Date(ad.createdAt);
  const diff = now - adDate;
  return diff <= NEW_AD_THRESHOLD_MS;
}

/**
 * Get user's active package priority
 */
async function getUserPackagePriority(userId) {
  try {
    const now = new Date();
    
    // Check UserBusinessPackage first (newer system)
    const userBusinessPackage = await prisma.userBusinessPackage.findFirst({
      where: {
        userId,
        status: 'active',
        expiresAt: { gt: now }
      },
      orderBy: { purchaseTime: 'desc' }
    });
    
    if (userBusinessPackage) {
      return PACKAGE_TYPE_MAP[userBusinessPackage.packageType] || PACKAGE_PRIORITY.NORMAL;
    }
    
    // Fallback to BusinessPackage (older system)
    const businessPackage = await prisma.businessPackage.findFirst({
      where: {
        userId,
        status: 'paid',
        expiresAt: { gt: now }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (businessPackage) {
      return PACKAGE_TYPE_MAP[businessPackage.packageType] || PACKAGE_PRIORITY.NORMAL;
    }
    
    return PACKAGE_PRIORITY.NORMAL;
  } catch (error) {
    console.error('Error getting user package priority:', error);
    return PACKAGE_PRIORITY.NORMAL;
  }
}

/**
 * Filter expired ads (REMOVED: package-based filtering)
 * Only filters by basic status and expiry - no package filtering
 */
async function filterAndEnrichAds(ads) {
  try {
    if (!ads || ads.length === 0) {
      return [];
    }

    const now = new Date();
    
    // Only filter by basic status and expiry - NO package filtering
    const validAds = ads.filter(ad => {
      if (!ad || !ad.id) return false;
      if (ad.status !== 'APPROVED') return false;
      // Only check ad expiry
      if (ad.expiresAt) {
        const adExpiry = new Date(ad.expiresAt);
        if (adExpiry <= now) return false;
      }
      return true;
    });
    
    return validAds;
  } catch (error) {
    console.error('Error in filterAndEnrichAds:', error);
    // Return ads as-is if filtering fails
    return ads || [];
  }
}

/**
 * Group ads by package priority
 */
function groupAdsByPackage(ads) {
  const groups = {
    [PACKAGE_PRIORITY.ENTERPRISE]: [],
    [PACKAGE_PRIORITY.PRO]: [],
    [PACKAGE_PRIORITY.BASIC]: [],
    [PACKAGE_PRIORITY.NORMAL]: []
  };
  
  ads.forEach(ad => {
    const priority = getPackagePriority(ad);
    if (groups[priority]) {
      groups[priority].push(ad);
    }
  });
  
  return groups;
}

/**
 * Rotate ads within a package group (fair exposure)
 */
function rotateAdsInGroup(ads) {
  if (ads.length === 0) return [];
  
  // Separate new ads and old ads
  const newAds = ads.filter(ad => isNewAd(ad));
  const oldAds = ads.filter(ad => !isNewAd(ad));
  
  // Sort new ads by creation date (newest first)
  newAds.sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return dateB - dateA;
  });
  
  // Sort old ads by lastShownAt (nulls first, then oldest shown first)
  oldAds.sort((a, b) => {
    if (!a.lastShownAt && !b.lastShownAt) {
      // Both never shown - sort by creation date
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    if (!a.lastShownAt) return -1;
    if (!b.lastShownAt) return 1;
    return new Date(a.lastShownAt) - new Date(b.lastShownAt);
  });
  
  // Apply fair rotation: avoid same seller back-to-back
  const rotated = [];
  const sellerLastIndex = new Map(); // Track last index where each seller appeared
  
  // First, add all new ads (they get priority)
  for (const ad of newAds) {
    rotated.push(ad);
    sellerLastIndex.set(ad.userId, rotated.length - 1);
  }
  
  // Then add old ads with spacing
  for (const ad of oldAds) {
    const lastIndex = sellerLastIndex.get(ad.userId);
    const currentIndex = rotated.length;
    
    // If same seller appeared recently (within last 2 positions), skip temporarily
    if (lastIndex !== undefined && (currentIndex - lastIndex) < 2) {
      // Move to end for later consideration
      continue;
    }
    
    rotated.push(ad);
    sellerLastIndex.set(ad.userId, rotated.length - 1);
  }
  
  // Add any remaining ads that were skipped
  const skipped = oldAds.filter(ad => !rotated.includes(ad));
  rotated.push(...skipped);
  
  return rotated;
}

/**
 * Rank ads - REMOVED: package-based filtering and separation
 * Simple ranking by creation date only - no filtering, no separation, no prioritization
 */
async function rankAds(ads, options = {}) {
  try {
    if (!ads || ads.length === 0) {
      return [];
    }

    const {
      updateLastShown = false // Whether to update lastShownAt in database
    } = options;
    
    // Only filter by basic status and expiry - NO package filtering, NO separation
    const now = new Date();
    const validAds = (ads || []).filter(ad => {
      if (!ad || !ad.id) return false;
      if (ad.status !== 'APPROVED') return false;
      // Only check ad expiry
      if (ad.expiresAt) {
        const adExpiry = new Date(ad.expiresAt);
        if (adExpiry <= now) return false;
      }
      return true;
    });
    
    if (validAds.length === 0) {
      return [];
    }
    
    // Simple sort by creation date (newest first) - NO package-based ranking, NO separation
    const rankedAds = [...validAds].sort((a, b) => {
      const aDate = new Date(a.createdAt || 0);
      const bDate = new Date(b.createdAt || 0);
      return bDate - aDate; // Newest first
    });
    
    // Update lastShownAt if requested
    if (updateLastShown && rankedAds.length > 0) {
      const now = new Date();
      const adIds = rankedAds.slice(0, 50)
        .map(ad => ad && ad.id)
        .filter(Boolean);
      
      if (adIds.length > 0) {
        try {
          await prisma.ad.updateMany({
            where: { id: { in: adIds } },
            data: { lastShownAt: now }
          });
        } catch (error) {
          console.error('Error updating lastShownAt:', error);
        }
      }
    }
    
    return rankedAds;
  } catch (error) {
    console.error('Error in rankAds:', error);
    return ads || [];
  }
}

/**
 * Calculate final score for an ad (for advanced sorting)
 */
function calculateAdScore(ad) {
  const packagePriority = getPackagePriority(ad) * 1000;
  const freshnessScore = isNewAd(ad) ? 100 : 0;
  const rotationBonus = ad.lastShownAt ? 0 : 50; // Bonus for never shown
  const relevanceScore = 0; // Can be enhanced with search relevance
  
  return packagePriority + freshnessScore + rotationBonus + relevanceScore;
}

module.exports = {
  PACKAGE_PRIORITY,
  PACKAGE_TYPE_MAP,
  isAdExpired,
  getPackagePriority,
  isNewAd,
  getUserPackagePriority,
  filterAndEnrichAds,
  groupAdsByPackage,
  rotateAdsInGroup,
  rankAds,
  calculateAdScore
};

