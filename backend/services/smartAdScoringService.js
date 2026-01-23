/**
 * Smart Ad Scoring Service
 * Implements professional ranking algorithm with:
 * - Keyword relevance scoring
 * - Location relevance scoring
 * - Package priority scoring
 * - Freshness scoring
 * - Expiry-based demotion
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Scoring weights (as per requirements)
const SCORING_WEIGHTS = {
  KEYWORD_EXACT_TITLE: 40,
  KEYWORD_DESCRIPTION_TAGS: 25,
  LOCATION_SAME_CITY: 30,
  LOCATION_SAME_NEIGHBOURHOOD: 20,
  LOCATION_SAME_STATE: 10,
  PACKAGE_PREMIUM: 50,
  PACKAGE_BUSINESS: 30,
  PACKAGE_FREE: 0,
  FRESHNESS_24H: 15,
  EXPIRY_NEAR_48H: -20,
  EXPIRY_EXPIRED: -100, // Hidden
};

// Location boost for search (higher boost to prioritize city ads)
const SEARCH_LOCATION_BOOST = {
  SAME_CITY: 100,        // Very high boost for same city in search
  SAME_NEIGHBOURHOOD: 30, // Additional boost for same neighbourhood
  SAME_STATE: 20,        // Lower boost for same state (fallback)
};

// Package priority mapping
const PACKAGE_PRIORITY = {
  PREMIUM: 'PREMIUM',      // isPremium = true
  SELLER_PRIME: 'BUSINESS', // SELLER_PRIME
  SELLER_PLUS: 'BUSINESS',  // SELLER_PLUS
  MAX_VISIBILITY: 'BUSINESS', // MAX_VISIBILITY
  NORMAL: 'FREE'           // NORMAL
};

/**
 * Get package type for scoring
 */
function getPackageType(ad) {
  if (!ad) return 'FREE';
  
  // Premium: isPremium = true
  if (ad.isPremium === true) {
    return 'PREMIUM';
  }
  
  // Business packages
  if (ad.packageType === 'SELLER_PRIME' || 
      ad.packageType === 'SELLER_PLUS' || 
      ad.packageType === 'MAX_VISIBILITY') {
    return 'BUSINESS';
  }
  
  // Free
  return 'FREE';
}

/**
 * Calculate keyword relevance score
 * @param {Object} ad - Ad object
 * @param {string} query - Search query (keywords)
 * @returns {number} Keyword score
 */
function calculateKeywordScore(ad, query = '') {
  if (!query || !query.trim()) return 0;
  
  const keywords = query.toLowerCase().trim().split(/\s+/).filter(k => k.length > 0);
  if (keywords.length === 0) return 0;
  
  let score = 0;
  const title = (ad.title || '').toLowerCase();
  const description = (ad.description || '').toLowerCase();
  const tags = Array.isArray(ad.tags) ? ad.tags.join(' ').toLowerCase() : '';
  const category = (ad.category?.name || '').toLowerCase();
  
  // Check for exact matches in title
  for (const keyword of keywords) {
    if (title.includes(keyword)) {
      score += SCORING_WEIGHTS.KEYWORD_EXACT_TITLE;
    }
    
    // Check for matches in description, tags, or category
    if (description.includes(keyword) || tags.includes(keyword) || category.includes(keyword)) {
      score += SCORING_WEIGHTS.KEYWORD_DESCRIPTION_TAGS;
    }
  }
  
  return score;
}

/**
 * Calculate location relevance score
 * @param {Object} ad - Ad object
 * @param {Object} currentLocation - Current location { city, state, neighbourhood }
 * @param {boolean} isSearch - Whether this is for search (higher location boost)
 * @returns {number} Location score
 */
function calculateLocationScore(ad, currentLocation = {}, isSearch = false) {
  if (!currentLocation || !currentLocation.city) return 0;
  
  const adCity = (ad.city || ad.location?.city || '').toLowerCase();
  const adState = (ad.state || ad.location?.state || '').toLowerCase();
  const adNeighbourhood = (ad.neighbourhood || ad.location?.neighbourhood || '').toLowerCase();
  
  const currentCity = (currentLocation.city || '').toLowerCase();
  const currentState = (currentLocation.state || '').toLowerCase();
  const currentNeighbourhood = (currentLocation.neighbourhood || '').toLowerCase();
  
  let score = 0;
  
  // Use higher boost for search results
  if (isSearch) {
    // Same city - very high boost for search
    if (adCity && currentCity && adCity === currentCity) {
      score += SEARCH_LOCATION_BOOST.SAME_CITY;
      
      // Same neighbourhood (additional bonus)
      if (adNeighbourhood && currentNeighbourhood && adNeighbourhood === currentNeighbourhood) {
        score += SEARCH_LOCATION_BOOST.SAME_NEIGHBOURHOOD;
      }
    } else if (adState && currentState && adState === currentState) {
      // Same state (lower boost, for fallback)
      score += SEARCH_LOCATION_BOOST.SAME_STATE;
    }
  } else {
    // Regular location scoring (for home feed)
    // Same city
    if (adCity && currentCity && adCity === currentCity) {
      score += SCORING_WEIGHTS.LOCATION_SAME_CITY;
      
      // Same neighbourhood (bonus)
      if (adNeighbourhood && currentNeighbourhood && adNeighbourhood === currentNeighbourhood) {
        score += SCORING_WEIGHTS.LOCATION_SAME_NEIGHBOURHOOD;
      }
    }
    
    // Same state (if not same city)
    if (score === 0 && adState && currentState && adState === currentState) {
      score += SCORING_WEIGHTS.LOCATION_SAME_STATE;
    }
  }
  
  return score;
}

/**
 * Calculate package priority score
 * @param {Object} ad - Ad object
 * @returns {number} Package score
 */
function calculatePackageScore(ad) {
  const packageType = getPackageType(ad);
  
  switch (packageType) {
    case 'PREMIUM':
      return SCORING_WEIGHTS.PACKAGE_PREMIUM;
    case 'BUSINESS':
      return SCORING_WEIGHTS.PACKAGE_BUSINESS;
    case 'FREE':
    default:
      return SCORING_WEIGHTS.PACKAGE_FREE;
  }
}

/**
 * Calculate freshness score
 * @param {Object} ad - Ad object
 * @returns {number} Freshness score
 */
function calculateFreshnessScore(ad) {
  if (!ad.createdAt) return 0;
  
  const now = new Date();
  const adDate = new Date(ad.createdAt);
  const diffMs = now - adDate;
  const diffHours = diffMs / (1000 * 60 * 60);
  
  // Posted in last 24 hours
  if (diffHours <= 24) {
    return SCORING_WEIGHTS.FRESHNESS_24H;
  }
  
  return 0;
}

/**
 * Calculate expiry penalty
 * @param {Object} ad - Ad object
 * @returns {number} Expiry penalty (negative value)
 */
function calculateExpiryPenalty(ad) {
  if (!ad.expiresAt) return 0;
  
  const now = new Date();
  const expiryDate = new Date(ad.expiresAt);
  
  // Expired - hide completely
  if (expiryDate <= now) {
    return SCORING_WEIGHTS.EXPIRY_EXPIRED;
  }
  
  // Near expiry (within 48 hours)
  const diffMs = expiryDate - now;
  const diffHours = diffMs / (1000 * 60 * 60);
  
  if (diffHours <= 48) {
    return SCORING_WEIGHTS.EXPIRY_NEAR_48H;
  }
  
  return 0;
}

/**
 * Calculate final score for an ad
 * @param {Object} ad - Ad object
 * @param {Object} options - Scoring options
 * @param {string} options.query - Search query (for keyword scoring)
 * @param {Object} options.currentLocation - Current location { city, state, neighbourhood }
 * @param {boolean} options.isSearch - Whether this is for search (higher location boost)
 * @returns {number} Final score
 */
function calculateAdScore(ad, options = {}) {
  const { query = '', currentLocation = {}, isSearch = false } = options;
  
  // Filter out expired ads completely
  const expiryPenalty = calculateExpiryPenalty(ad);
  if (expiryPenalty <= SCORING_WEIGHTS.EXPIRY_EXPIRED) {
    return -1000; // Very low score to hide expired ads
  }
  
  const keywordScore = calculateKeywordScore(ad, query);
  const locationScore = calculateLocationScore(ad, currentLocation, isSearch);
  const packageScore = calculatePackageScore(ad);
  const freshnessScore = calculateFreshnessScore(ad);
  
  const finalScore = 
    keywordScore +
    locationScore +
    packageScore +
    freshnessScore +
    expiryPenalty;
  
  return finalScore;
}

/**
 * Rank ads using smart scoring algorithm
 * @param {Array} ads - Array of ads to rank
 * @param {Object} options - Ranking options
 * @param {string} options.query - Search query
 * @param {Object} options.currentLocation - Current location { city, state, neighbourhood }
 * @param {boolean} options.isSearch - Whether this is for search (higher location boost)
 * @returns {Array} Ranked ads
 */
function rankAdsWithSmartScoring(ads, options = {}) {
  if (!ads || ads.length === 0) {
    return [];
  }
  
  const { query = '', currentLocation = {}, isSearch = false } = options;
  
  // Calculate scores for all ads
  const adsWithScores = ads.map(ad => ({
    ad,
    score: calculateAdScore(ad, { query, currentLocation, isSearch })
  }));
  
  // Filter out expired ads (score <= -100)
  const validAds = adsWithScores.filter(item => item.score > -100);
  
  // Sort by score (descending), then by createdAt (newest first) as tiebreaker
  validAds.sort((a, b) => {
    // First sort by score
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    
    // Tiebreaker: newest first
    const aDate = new Date(a.ad.createdAt || 0);
    const bDate = new Date(b.ad.createdAt || 0);
    return bDate - aDate;
  });
  
  // Return ranked ads
  return validAds.map(item => item.ad);
}

/**
 * Get location from navbar (helper function)
 * This should be called from the route handler to get current location
 */
async function getCurrentLocationFromRequest(req) {
  // Try to get location from query params first
  const city = req.query.city || req.query.locationCity;
  const state = req.query.state || req.query.locationState;
  const neighbourhood = req.query.neighbourhood || req.query.locationNeighbourhood;
  
  if (city || state) {
    return { city, state, neighbourhood };
  }
  
  // Try to get from location slug
  const locationSlug = req.query.location || req.query.locationSlug;
  if (locationSlug) {
    try {
      const location = await prisma.location.findFirst({
        where: {
          slug: locationSlug
        },
        select: {
          city: true,
          state: true,
          neighbourhood: true
        }
      });
      
      if (location) {
        return {
          city: location.city,
          state: location.state,
          neighbourhood: location.neighbourhood
        };
      }
    } catch (error) {
      console.error('Error fetching location:', error);
    }
  }
  
  return null;
}

module.exports = {
  calculateAdScore,
  calculateKeywordScore,
  calculateLocationScore,
  calculatePackageScore,
  calculateFreshnessScore,
  calculateExpiryPenalty,
  rankAdsWithSmartScoring,
  getCurrentLocationFromRequest,
  getPackageType,
  SCORING_WEIGHTS,
  PACKAGE_PRIORITY,
  SEARCH_LOCATION_BOOST
};
