/**
 * Priority-Based Ad Ranking Service
 * 
 * Implements package-first logic with priority ordering:
 * 1. Premium / Business Package Ads first (by package price rank)
 *    Package Rank: ₹6999 (SELLER_PRIME) → ₹3999 (SELLER_PLUS) → ₹2999 (MAX_VISIBILITY) → ₹399 → ₹299 → ₹199 (NORMAL)
 *    Then by recency (newest first)
 * 2. Normal ads based on recency and relevance
 * 
 * Also implements 5-hour ad rotation system with weighted randomization
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Package price mapping (for priority calculation)
// These can be loaded from database settings
const PACKAGE_PRICE_MAP = {
  'SELLER_PRIME': 6999,
  'SELLER_PLUS': 3999,
  'MAX_VISIBILITY': 2999,
  'PREMIUM_399': 399,
  'PREMIUM_299': 299,
  'NORMAL': 199,
};

// Rotation interval (5 hours in milliseconds)
const ROTATION_INTERVAL_MS = 5 * 60 * 60 * 1000;

/**
 * Get package price from database settings or fallback to defaults
 */
async function getPackagePrice(packageType) {
  try {
    const settingsRecord = await prisma.premiumSettings.findUnique({
      where: { key: 'business_package_settings' }
    });
    
    if (settingsRecord && settingsRecord.value) {
      const parsed = JSON.parse(settingsRecord.value);
      if (parsed.prices && parsed.prices[packageType]) {
        return parsed.prices[packageType];
      }
    }
  } catch (error) {
    console.error('Error loading package price:', error);
  }
  
  // Fallback to default mapping
  return PACKAGE_PRICE_MAP[packageType] || PACKAGE_PRICE_MAP.NORMAL;
}

/**
 * Calculate priority score for an ad based on package price
 * Higher price = higher priority
 */
async function calculatePriorityScore(ad) {
  // Premium ads get highest priority (price equivalent to highest package)
  if (ad.isPremium === true) {
    const premiumPriceMap = {
      'TOP': 7999,
      'FEATURED': 5999,
      'BUMP_UP': 3999
    };
    return premiumPriceMap[ad.premiumType] || 5000;
  }
  
  // Business package ads
  if (ad.packageType && ['SELLER_PRIME', 'SELLER_PLUS', 'MAX_VISIBILITY'].includes(ad.packageType)) {
    const price = await getPackagePrice(ad.packageType);
    return price;
  }
  
  // Normal ads
  return PACKAGE_PRICE_MAP.NORMAL;
}

/**
 * Get current rotation period index (5-hour intervals)
 */
function getCurrentRotationPeriod() {
  const now = Date.now();
  return Math.floor(now / ROTATION_INTERVAL_MS);
}

/**
 * Generate rotation seed based on location and rotation period
 */
function generateRotationSeed(locationKey, rotationPeriod) {
  const crypto = require('crypto');
  const seedString = `${locationKey}_${rotationPeriod}`;
  const hash = crypto.createHash('md5').update(seedString).digest('hex');
  return parseInt(hash.substring(0, 8), 16);
}

/**
 * Seeded random number generator for consistent rotation
 */
function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

/**
 * Calculate weight for an ad based on priority score
 * Higher priority = higher weight, but ensure fair exposure
 */
function calculateAdWeight(priorityScore, baseWeight = 1.0) {
  // Normalize priority score to weight (0.5 to 2.0 range)
  // Highest priority (7000+) gets 2.0x weight
  // Lowest priority (199) gets 0.5x weight
  const normalizedScore = Math.min(Math.max((priorityScore - 199) / 6800, 0), 1);
  return baseWeight * (0.5 + 1.5 * normalizedScore);
}

/**
 * Weighted shuffle for fair ad rotation
 */
function weightedShuffle(ads, weights, seed) {
  if (ads.length === 0) return [];
  
  const random = seededRandom(seed);
  const shuffled = [...ads];
  const adWeights = [...weights];
  
  // Weighted Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Calculate cumulative weights for selection
    let totalWeight = 0;
    for (let j = 0; j <= i; j++) {
      totalWeight += adWeights[j];
    }
    
    // Select index based on weighted probability
    let r = random() * totalWeight;
    let selectedIndex = i;
    
    for (let j = 0; j <= i; j++) {
      r -= adWeights[j];
      if (r <= 0) {
        selectedIndex = j;
        break;
      }
    }
    
    // Swap
    [shuffled[i], shuffled[selectedIndex]] = [shuffled[selectedIndex], shuffled[i]];
    [adWeights[i], adWeights[selectedIndex]] = [adWeights[selectedIndex], adWeights[i]];
  }
  
  return shuffled;
}

/**
 * Rank ads with package-first priority and 5-hour rotation
 */
async function rankAdsWithPriority(ads, options = {}) {
  try {
    if (!ads || ads.length === 0) {
      return [];
    }
    
    const {
      locationKey = 'all',
      updateLastShown = false,
      userLastCategory = null, // For personalization
    } = options;
    
    const now = new Date();
    
    // Filter valid ads
    const validAds = ads.filter(ad => {
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
    
    // Calculate priority scores for all ads
    const adsWithPriority = await Promise.all(
      validAds.map(async (ad) => {
        const priorityScore = await calculatePriorityScore(ad);
        return { ad, priorityScore };
      })
    );
    
    // Separate ads by priority tier
    const premiumBusinessAds = adsWithPriority.filter(({ priorityScore }) => priorityScore >= 1000);
    const normalAds = adsWithPriority.filter(({ priorityScore }) => priorityScore < 1000);
    
    // Apply personalization: boost ads matching user's last searched category
    if (userLastCategory && userLastCategory.trim()) {
      premiumBusinessAds.forEach(({ ad }) => {
        if (ad.category?.slug === userLastCategory || ad.category?.name?.toLowerCase().includes(userLastCategory.toLowerCase())) {
          // Boost priority by 10% for matching category
          const index = premiumBusinessAds.findIndex(item => item.ad.id === ad.id);
          if (index !== -1) {
            premiumBusinessAds[index].priorityScore *= 1.1;
          }
        }
      });
    }
    
    // Sort premium/business ads by priority score (descending), then by recency
    premiumBusinessAds.sort((a, b) => {
      // First by priority score
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      // Then by recency (newest first)
      const dateA = new Date(a.ad.createdAt || 0);
      const dateB = new Date(b.ad.createdAt || 0);
      return dateB - dateA;
    });
    
    // Sort normal ads by recency
    normalAds.sort((a, b) => {
      const dateA = new Date(a.ad.createdAt || 0);
      const dateB = new Date(b.ad.createdAt || 0);
      return dateB - dateA;
    });
    
    // Get current rotation period (5-hour intervals)
    const rotationPeriod = getCurrentRotationPeriod();
    const rotationSeed = generateRotationSeed(locationKey, rotationPeriod);
    
    // Apply weighted shuffle for rotation (ensuring fair exposure)
    const premiumBusinessAdsList = premiumBusinessAds.map(({ ad }) => ad);
    const premiumBusinessWeights = premiumBusinessAds.map(({ priorityScore }) => 
      calculateAdWeight(priorityScore)
    );
    
    // Shuffle premium/business ads with weighted randomization
    const shuffledPremiumBusiness = weightedShuffle(
      premiumBusinessAdsList,
      premiumBusinessWeights,
      rotationSeed
    );
    
    // Shuffle normal ads (equal weight for fairness)
    const normalAdsList = normalAds.map(({ ad }) => ad);
    const normalWeights = new Array(normalAdsList.length).fill(1.0);
    const shuffledNormal = weightedShuffle(
      normalAdsList,
      normalWeights,
      rotationSeed + 10000 // Different seed for normal ads
    );
    
    // Combine: Premium/Business first, then Normal
    const rankedAds = [...shuffledPremiumBusiness, ...shuffledNormal];
    
    // Update lastShownAt if requested
    if (updateLastShown && rankedAds.length > 0) {
      const adIds = rankedAds.slice(0, 100) // Update up to 100 ads
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
    console.error('Error in rankAdsWithPriority:', error);
    // Fallback to simple date-based sorting
    return (ads || []).sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA;
    });
  }
}

module.exports = {
  rankAdsWithPriority,
  calculatePriorityScore,
  getCurrentRotationPeriod,
  getPackagePrice,
  PACKAGE_PRICE_MAP,
  ROTATION_INTERVAL_MS
};
