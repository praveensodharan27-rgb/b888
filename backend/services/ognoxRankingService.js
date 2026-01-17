/**
 * OGNOX-Style Ad Ranking Service
 * 
 * Priority System (FIXED - NEVER CHANGE):
 * 1. Premium (isPremium = true) - TOP, FEATURED, BUMP_UP
 * 2. Business (packageType in [SELLER_PRIME, SELLER_PLUS, MAX_VISIBILITY] AND isPremium = false)
 * 3. Free (packageType = NORMAL AND isPremium = false)
 * 
 * Rotation: Least recently shown first (using lastShownAt)
 * Tiers never mix - rotation only within same tier
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Business package types
const BUSINESS_PACKAGE_TYPES = ['SELLER_PRIME', 'SELLER_PLUS', 'MAX_VISIBILITY'];

/**
 * Categorize ad into Premium, Business, or Free
 * @param {Object} ad - Ad object
 * @returns {'PREMIUM' | 'BUSINESS' | 'FREE'}
 */
function categorizeAd(ad) {
  if (!ad) return 'FREE';
  
  // Premium: isPremium = true (TOP, FEATURED, BUMP_UP)
  if (ad.isPremium === true) {
    return 'PREMIUM';
  }
  
  // Business: packageType in [SELLER_PRIME, SELLER_PLUS, MAX_VISIBILITY] AND isPremium = false
  if (ad.packageType && BUSINESS_PACKAGE_TYPES.includes(ad.packageType)) {
    return 'BUSINESS';
  }
  
  // Free: packageType = NORMAL AND isPremium = false
  return 'FREE';
}

/**
 * OGNOX-style rotation: Least recently shown first
 * @param {Array} ads - Array of ads to rotate
 * @returns {Array} Rotated ads
 */
function rotateAdsOGNOX(ads) {
  if (!ads || ads.length === 0) return [];
  
  // Sort by lastShownAt (nulls first, then oldest first)
  return [...ads].sort((a, b) => {
    // Never shown (null) comes first
    if (!a.lastShownAt && !b.lastShownAt) {
      // Both never shown - sort by createdAt (newest first)
      const aDate = new Date(a.createdAt || 0);
      const bDate = new Date(b.createdAt || 0);
      return bDate - aDate;
    }
    if (!a.lastShownAt) return -1; // a never shown, comes first
    if (!b.lastShownAt) return 1;  // b never shown, comes first
    
    // Both shown - oldest lastShownAt comes first (least recently shown)
    const aDate = new Date(a.lastShownAt);
    const bDate = new Date(b.lastShownAt);
    return aDate - bDate; // Ascending order (oldest first)
  });
}

/**
 * OGNOX-style ranking with 3-tier system and 1-hour rotation
 * Priority: Business → Premium → Free
 * Rotation: Time-based (1 hour) for Premium and Business ads
 * @param {Array} ads - Array of ads to rank
 * @param {Object} options - Options
 * @param {string} options.locationKey - Location key for rotation seed
 * @returns {Array} Ranked ads
 */
async function rankAdsOGNOX(ads, options = {}) {
  try {
    if (!ads || ads.length === 0) {
      return [];
    }

    const {
      updateLastShown = false,
      locationKey = 'all' // For rotation seed
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
    
    // Use the new rotation service for 1-hour rotation
    const { rankAdsWithRotation } = require('./ognoxAdsRotationService');
    const rankedAds = await rankAdsWithRotation(validAds, {
      locationKey,
      updateLastShown
    });
    
    return rankedAds;
  } catch (error) {
    console.error('Error in rankAdsOGNOX:', error);
    return ads || [];
  }
}

module.exports = {
  categorizeAd,
  rotateAdsOGNOX,
  rankAdsOGNOX,
  BUSINESS_PACKAGE_TYPES
};

