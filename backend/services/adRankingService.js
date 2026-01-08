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
 * Filter expired ads and enrich with package info
 */
async function filterAndEnrichAds(ads) {
  try {
    if (!ads || ads.length === 0) {
      return [];
    }

    const now = new Date();
    const userIds = [...new Set(ads.map(ad => ad.userId).filter(Boolean))];
    
    // Only fetch packages if we have userIds
    let userPackages = [];
    let businessPackages = [];
    
    if (userIds.length > 0) {
      try {
        // Fetch all user packages in one query
        userPackages = await prisma.userBusinessPackage.findMany({
          where: {
            userId: { in: userIds },
            status: 'active',
            expiresAt: { gt: now }
          }
        });
        
        // Also check BusinessPackage table
        businessPackages = await prisma.businessPackage.findMany({
          where: {
            userId: { in: userIds },
            status: 'paid',
            expiresAt: { gt: now }
          }
        });
      } catch (error) {
        console.error('Error fetching packages in filterAndEnrichAds:', error);
        // Continue without packages - ads will default to NORMAL
      }
    }
    
    // Create map of userId -> package
    const packageMap = new Map();
    
    userPackages.forEach(pkg => {
      if (pkg.userId && !packageMap.has(pkg.userId)) {
        packageMap.set(pkg.userId, pkg);
      }
    });
    
    businessPackages.forEach(pkg => {
      if (pkg.userId && !packageMap.has(pkg.userId)) {
        packageMap.set(pkg.userId, pkg);
      }
    });
    
    // Filter and enrich ads
    const validAds = [];
    let expiredCount = 0;
    let invalidCount = 0;
    
    for (const ad of ads) {
      if (!ad || !ad.id) {
        invalidCount++;
        continue; // Skip invalid ads
      }

      try {
        const userPackage = ad.userId ? packageMap.get(ad.userId) : null;
        
        // Set package type FIRST
        // Free ads (no package) should have packageType = 'NORMAL'
        if (!ad.packageType || ad.packageType === null || ad.packageType === undefined) {
          if (userPackage && userPackage.packageType) {
            // Ad created with business package
            ad.packageType = PACKAGE_TYPE_MAP[userPackage.packageType] || PACKAGE_PRIORITY.NORMAL;
          } else {
            // Free ad (no package) - set to NORMAL
            ad.packageType = PACKAGE_PRIORITY.NORMAL;
          }
        }
        
        // Ensure packageType is always set (default to NORMAL for free ads)
        if (!ad.packageType || ad.packageType === null || ad.packageType === undefined) {
          ad.packageType = PACKAGE_PRIORITY.NORMAL;
        }
        
        // Only skip if ad itself is expired (not package expiry)
        // This is less strict - we show ads even if user's package expired
        if (isAdExpired(ad, userPackage)) {
          expiredCount++;
          continue;
        }
        
        validAds.push(ad);
      } catch (error) {
        console.error(`Error processing ad ${ad.id}:`, error);
        // Don't skip on error - include the ad anyway
        // Just set default packageType
        if (!ad.packageType) {
          ad.packageType = PACKAGE_PRIORITY.NORMAL;
        }
        // Only skip if truly invalid (no id or status)
        if (ad.id && ad.status === 'APPROVED') {
          validAds.push(ad);
        } else {
          invalidCount++;
        }
      }
    }
    
    // Debug logging
    if (validAds.length === 0 && ads.length > 0) {
      console.warn(`⚠️ filterAndEnrichAds: All ${ads.length} ads filtered out! Expired: ${expiredCount}, Invalid: ${invalidCount}`);
      // Last resort: return ads that passed basic checks
      const basicValid = ads.filter(ad => ad && ad.id && ad.status === 'APPROVED');
      if (basicValid.length > 0) {
        console.log(`✅ Returning ${basicValid.length} basic valid ads as fallback`);
        basicValid.forEach(ad => {
          if (!ad.packageType) {
            ad.packageType = PACKAGE_PRIORITY.NORMAL;
          }
        });
        return basicValid;
      }
    } else if (validAds.length < ads.length) {
      console.log(`📊 filterAndEnrichAds: ${validAds.length}/${ads.length} ads valid (${expiredCount} expired, ${invalidCount} invalid)`);
    }
    
    return validAds;
  } catch (error) {
    console.error('Error in filterAndEnrichAds:', error);
    // Return ads as-is if filtering fails (better than returning empty)
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
 * Rank ads according to package priority system
 * Priority: Premium ads first (by premium type), then package-based ranking
 */
async function rankAds(ads, options = {}) {
  try {
    if (!ads || ads.length === 0) {
      return [];
    }

    const {
      updateLastShown = false // Whether to update lastShownAt in database
    } = options;
    
    // First, do a basic filter (only status and ad expiry, no package expiry check)
    const now = new Date();
    const basicValidAds = (ads || []).filter(ad => {
      if (!ad || !ad.id) return false;
      if (ad.status !== 'APPROVED') return false;
      // Only check ad expiry, not package expiry
      if (ad.expiresAt) {
        const adExpiry = new Date(ad.expiresAt);
        if (adExpiry <= now) return false;
      }
      return true;
    });
    
    if (basicValidAds.length === 0) {
      console.warn(`⚠️ rankAds: No basic valid ads (input: ${ads.length} ads)`);
      return [];
    }
    
    // Filter expired ads and enrich with package info
    const validAds = await filterAndEnrichAds(basicValidAds);
    
    if (!validAds || validAds.length === 0) {
      console.warn(`⚠️ rankAds: No valid ads after filtering (input: ${ads.length} ads). Returning basic valid ads.`);
      // Return basic valid ads if package filtering removed everything
      basicValidAds.forEach(ad => {
        if (!ad.packageType) {
          ad.packageType = PACKAGE_PRIORITY.NORMAL;
        }
      });
      return basicValidAds;
    }
    
    // Separate premium ads from normal ads
    const premiumAds = validAds.filter(ad => ad && ad.isPremium === true);
    const normalAds = validAds.filter(ad => !ad || !ad.isPremium || ad.isPremium === false);
    
    // Sort premium ads by premium type: TOP > FEATURED > BUMP_UP, then by creation date
    premiumAds.sort((a, b) => {
      const premiumPriority = { 'TOP': 1, 'FEATURED': 2, 'BUMP_UP': 3 };
      const aPriority = premiumPriority[a.premiumType] || 4;
      const bPriority = premiumPriority[b.premiumType] || 4;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Same premium type - sort by creation date (newest first)
      const aDate = new Date(a.createdAt || 0);
      const bDate = new Date(b.createdAt || 0);
      return bDate - aDate;
    });
    
    // Group normal ads by package priority
    const groups = groupAdsByPackage(normalAds);
    
    // Rotate ads within each group
    const rotatedGroups = {};
    for (const [priority, groupAds] of Object.entries(groups)) {
      if (groupAds && groupAds.length > 0) {
        rotatedGroups[priority] = rotateAdsInGroup(groupAds);
      } else {
        rotatedGroups[priority] = [];
      }
    }
    
    // Combine: Premium ads first, then package-based groups
    const rankedAds = [
      ...premiumAds, // Premium ads always first
      ...(rotatedGroups[PACKAGE_PRIORITY.ENTERPRISE] || []),
      ...(rotatedGroups[PACKAGE_PRIORITY.PRO] || []),
      ...(rotatedGroups[PACKAGE_PRIORITY.BASIC] || []),
      ...(rotatedGroups[PACKAGE_PRIORITY.NORMAL] || [])
    ];
    
    // Update lastShownAt if requested
    if (updateLastShown && rankedAds.length > 0) {
      const now = new Date();
      const adIds = rankedAds.slice(0, 50)
        .map(ad => ad && ad.id)
        .filter(Boolean); // Filter out null/undefined
      
      if (adIds.length > 0) {
        try {
          await prisma.ad.updateMany({
            where: { id: { in: adIds } },
            data: { lastShownAt: now }
          });
        } catch (error) {
          console.error('Error updating lastShownAt:', error);
          // Don't fail ranking if update fails
        }
      }
    }
    
    return rankedAds;
  } catch (error) {
    console.error('Error in rankAds:', error);
    // Return original ads if ranking fails (better than empty)
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

