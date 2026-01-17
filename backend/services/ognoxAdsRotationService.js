/**
 * OGNOX-Style Ads Rotation Service
 * 
 * Implements 1-hour time-based rotation for Premium and Business ads
 * Uses time-seeded rotation to ensure same ads within same hour
 * 
 * Priority System (FIXED - NEVER CHANGE):
 * 1. Premium (isPremium = true)
 * 2. Business (packageType in [SELLER_PRIME, SELLER_PLUS, MAX_VISIBILITY])
 * 3. Free (packageType = NORMAL)
 * 
 * Rotation Weight:
 * - Business: 50%
 * - Premium: 30%
 * - Free: 20%
 */

const crypto = require('crypto');

// Business package types
const BUSINESS_PACKAGE_TYPES = ['SELLER_PRIME', 'SELLER_PLUS', 'MAX_VISIBILITY'];

// Rotation weights
const ROTATION_WEIGHTS = {
  BUSINESS: 0.5,  // 50%
  PREMIUM: 0.3,   // 30%
  FREE: 0.2        // 20%
};

/**
 * Categorize ad into Premium, Business, or Free
 */
function categorizeAd(ad) {
  if (!ad) return 'FREE';
  
  // Premium: isPremium = true
  if (ad.isPremium === true) {
    return 'PREMIUM';
  }
  
  // Business: packageType in BUSINESS_PACKAGE_TYPES AND isPremium = false
  if (ad.packageType && BUSINESS_PACKAGE_TYPES.includes(ad.packageType)) {
    return 'BUSINESS';
  }
  
  // Free: packageType = NORMAL AND isPremium = false
  return 'FREE';
}

/**
 * Get current hour index (0-23) for rotation seed
 */
function getCurrentHourIndex() {
  const now = new Date();
  return Math.floor(now.getTime() / (60 * 60 * 1000)); // Hours since epoch
}

/**
 * Generate rotation seed based on location and current hour
 * Same location + same hour = same seed = same ads
 */
function generateRotationSeed(locationKey, hourIndex) {
  const seedString = `${locationKey}_${hourIndex}`;
  const hash = crypto.createHash('md5').update(seedString).digest('hex');
  // Convert first 8 chars to number for seeding
  return parseInt(hash.substring(0, 8), 16);
}

/**
 * Simple seeded random number generator
 * Same seed = same sequence
 */
function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

/**
 * Rotate ads within a tier using time-based seed
 */
function rotateAdsWithSeed(ads, seed) {
  if (!ads || ads.length === 0) return [];
  
  const random = seededRandom(seed);
  const shuffled = [...ads];
  
  // Fisher-Yates shuffle with seeded random
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Select ads based on rotation weight
 * Returns array of ad indices to show
 */
function selectAdsByWeight(ads, weight, seed) {
  const count = Math.max(1, Math.floor(ads.length * weight));
  const rotated = rotateAdsWithSeed(ads, seed);
  return rotated.slice(0, count);
}

/**
 * OGNOX-style ranking with 1-hour rotation
 * @param {Array} ads - Array of ads to rank
 * @param {Object} options - Options
 * @param {string} options.locationKey - Location key for rotation seed (city or 'all')
 * @param {boolean} options.updateLastShown - Whether to update lastShownAt
 * @returns {Array} Ranked ads
 */
async function rankAdsWithRotation(ads, options = {}) {
  try {
    if (!ads || ads.length === 0) {
      return [];
    }

    const {
      locationKey = 'all', // City name or 'all' for rotation seed
      updateLastShown = false
    } = options;

    // Filter valid ads
    const now = new Date();
    const validAds = (ads || []).filter(ad => {
      if (!ad || !ad.id) return false;
      if (ad.status !== 'APPROVED') return false;
      if (ad.expiresAt) {
        const adExpiry = new Date(ad.expiresAt);
        if (adExpiry <= now) return false;
      }
      return true;
    });

    if (validAds.length === 0) {
      return [];
    }

    // Get current hour index for rotation
    const hourIndex = getCurrentHourIndex();
    const rotationSeed = generateRotationSeed(locationKey, hourIndex);

    // Separate ads by type
    const businessAds = [];
    const premiumAds = [];
    const freeAds = [];

    validAds.forEach(ad => {
      const category = categorizeAd(ad);
      if (category === 'BUSINESS') {
        businessAds.push(ad);
      } else if (category === 'PREMIUM') {
        premiumAds.push(ad);
      } else {
        freeAds.push(ad);
      }
    });

    // Sort Premium ads by premium type: TOP > FEATURED > BUMP_UP
    premiumAds.sort((a, b) => {
      const premiumPriority = { 'TOP': 1, 'FEATURED': 2, 'BUMP_UP': 3 };
      const aPriority = premiumPriority[a.premiumType] || 4;
      const bPriority = premiumPriority[b.premiumType] || 4;
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      // Same type - use rotation seed
      return 0; // Will be shuffled by rotation
    });

    // Rotate and select ads based on weight
    // Use different seed offsets for each tier to ensure different rotation
    const businessSeed = rotationSeed;
    const premiumSeed = rotationSeed + 1000;
    const freeSeed = rotationSeed + 2000;

    const selectedBusiness = selectAdsByWeight(businessAds, ROTATION_WEIGHTS.BUSINESS, businessSeed);
    const selectedPremium = selectAdsByWeight(premiumAds, ROTATION_WEIGHTS.PREMIUM, premiumSeed);
    const selectedFree = selectAdsByWeight(freeAds, ROTATION_WEIGHTS.FREE, freeSeed);

    // Combine in STRICT priority order: Premium → Business → Free (NEVER CHANGE)
    const rankedAds = [
      ...selectedPremium,  // Premium first
      ...selectedBusiness, // Business second
      ...selectedFree      // Free last
    ];

    // Update lastShownAt if requested
    if (updateLastShown && rankedAds.length > 0) {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
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
    console.error('Error in rankAdsWithRotation:', error);
    return ads || [];
  }
}

/**
 * Insert ads into feed after every N items (OGNOX style)
 * @param {Array} items - Regular items (products/ads)
 * @param {Array} ads - Ads to insert
 * @param {number} interval - Insert after every N items (default: 10)
 * @returns {Array} Combined feed with ads inserted
 */
function insertAdsIntoFeed(items, ads, interval = 10) {
  if (!ads || ads.length === 0) return items;
  if (!items || items.length === 0) return ads;

  const result = [];
  let adIndex = 0;
  let businessAdIndex = 0;
  let premiumAdIndex = 0;
  let freeAdIndex = 0;

  // Separate ads by type
  const businessAds = ads.filter(ad => categorizeAd(ad) === 'BUSINESS');
  const premiumAds = ads.filter(ad => categorizeAd(ad) === 'PREMIUM');
  const freeAds = ads.filter(ad => categorizeAd(ad) === 'FREE');

  for (let i = 0; i < items.length; i++) {
    result.push(items[i]);

    // Insert ad block after every N items
    if ((i + 1) % interval === 0) {
      const adBlock = [];

      // Insert 1 Business ad
      if (businessAds.length > 0) {
        adBlock.push(businessAds[businessAdIndex % businessAds.length]);
        businessAdIndex++;
      }

      // Insert 1 Premium ad
      if (premiumAds.length > 0) {
        adBlock.push(premiumAds[premiumAdIndex % premiumAds.length]);
        premiumAdIndex++;
      }

      // Insert 1 Free ad (if available)
      if (freeAds.length > 0) {
        adBlock.push(freeAds[freeAdIndex % freeAds.length]);
        freeAdIndex++;
      }

      result.push(...adBlock);
    }
  }

  return result;
}

module.exports = {
  categorizeAd,
  getCurrentHourIndex,
  generateRotationSeed,
  rankAdsWithRotation,
  insertAdsIntoFeed,
  ROTATION_WEIGHTS,
  BUSINESS_PACKAGE_TYPES
};
