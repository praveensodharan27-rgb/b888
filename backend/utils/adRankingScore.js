/**
 * Ad Ranking Score Calculator
 * 
 * Calculates a precomputed ranking score for optimal Meilisearch performance
 * 
 * Formula:
 * rankingScore = planPriority + featureBoosts + freshnessBonus
 * 
 * Plan Priority (Base Score):
 * - ENTERPRISE: 100
 * - PROFESSIONAL: 80
 * - STARTER: 60
 * - FREE: 10
 * 
 * Feature Boosts:
 * - Top Ad: +40
 * - Featured: +30
 * - Urgent: +20
 * - Bump: +15
 * 
 * Freshness Bonus:
 * - < 1 hour: +10
 * - < 24 hours: +5
 * - < 7 days: +2
 */

// Plan priority mapping
const PLAN_PRIORITY = {
  ENTERPRISE: 100,
  PROFESSIONAL: 80,
  STARTER: 60,
  FREE: 10,
};

// Feature boost values
const FEATURE_BOOST = {
  TOP_AD: 40,
  FEATURED: 30,
  URGENT: 20,
  BUMP: 15,
};

/**
 * Calculate ranking score for an ad
 * @param {object} ad - Ad object
 * @returns {number} - Ranking score
 */
function calculateRankingScore(ad) {
  let score = 0;

  // 1. Base plan priority
  const planType = (ad.planType || 'FREE').toUpperCase();
  score += PLAN_PRIORITY[planType] || PLAN_PRIORITY.FREE;

  // 2. Feature boosts
  if (ad.isTopAdActive) {
    score += FEATURE_BOOST.TOP_AD;
  }
  if (ad.isFeaturedActive) {
    score += FEATURE_BOOST.FEATURED;
  }
  if (ad.isUrgent) {
    score += FEATURE_BOOST.URGENT;
  }
  if (ad.isBumpActive) {
    score += FEATURE_BOOST.BUMP;
  }

  // 3. Freshness bonus (optional - helps with tie-breaking)
  const ageInHours = (Date.now() - new Date(ad.createdAt).getTime()) / (1000 * 60 * 60);
  if (ageInHours < 1) {
    score += 10; // Very fresh
  } else if (ageInHours < 24) {
    score += 5; // Fresh
  } else if (ageInHours < 168) { // 7 days
    score += 2; // Recent
  }

  return score;
}

/**
 * Get plan priority value
 * @param {string} planType - Plan type
 * @returns {number} - Priority value
 */
function getPlanPriority(planType) {
  const type = (planType || 'FREE').toUpperCase();
  return PLAN_PRIORITY[type] || PLAN_PRIORITY.FREE;
}

/**
 * Calculate ranking breakdown (for debugging)
 * @param {object} ad - Ad object
 * @returns {object} - Score breakdown
 */
function calculateRankingBreakdown(ad) {
  const planType = (ad.planType || 'FREE').toUpperCase();
  const planScore = PLAN_PRIORITY[planType] || PLAN_PRIORITY.FREE;
  
  const breakdown = {
    planScore,
    topAdBoost: ad.isTopAdActive ? FEATURE_BOOST.TOP_AD : 0,
    featuredBoost: ad.isFeaturedActive ? FEATURE_BOOST.FEATURED : 0,
    urgentBoost: ad.isUrgent ? FEATURE_BOOST.URGENT : 0,
    bumpBoost: ad.isBumpActive ? FEATURE_BOOST.BUMP : 0,
    freshnessBonus: 0,
  };

  // Calculate freshness
  const ageInHours = (Date.now() - new Date(ad.createdAt).getTime()) / (1000 * 60 * 60);
  if (ageInHours < 1) {
    breakdown.freshnessBonus = 10;
  } else if (ageInHours < 24) {
    breakdown.freshnessBonus = 5;
  } else if (ageInHours < 168) {
    breakdown.freshnessBonus = 2;
  }

  breakdown.totalScore = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  return breakdown;
}

/**
 * Get badge labels for an ad
 * @param {object} ad - Ad object
 * @returns {array} - Array of badge objects
 */
function getAdBadges(ad) {
  const badges = [];

  if (ad.isTopAdActive) {
    badges.push({
      label: 'TOP AD',
      color: 'red',
      priority: 1,
    });
  }

  if (ad.isFeaturedActive) {
    badges.push({
      label: 'FEATURED',
      color: 'yellow',
      priority: 2,
    });
  }

  if (ad.isUrgent) {
    badges.push({
      label: 'URGENT',
      color: 'orange',
      priority: 3,
    });
  }

  if (ad.isBumpActive) {
    badges.push({
      label: 'BOOSTED',
      color: 'green',
      priority: 4,
    });
  }

  const planType = (ad.planType || 'FREE').toUpperCase();
  if (planType === 'ENTERPRISE') {
    badges.push({
      label: 'ENTERPRISE VERIFIED',
      color: 'purple',
      priority: 0,
    });
  }

  // Sort by priority
  return badges.sort((a, b) => a.priority - b.priority);
}

/**
 * Example ranking scenarios
 */
const RANKING_EXAMPLES = [
  {
    description: 'Enterprise Top Ad',
    ad: {
      planType: 'ENTERPRISE',
      isTopAdActive: true,
      isFeaturedActive: false,
      isUrgent: false,
      isBumpActive: false,
      createdAt: new Date(),
    },
    expectedScore: 100 + 40 + 10, // 150
  },
  {
    description: 'Professional Top Ad + Featured',
    ad: {
      planType: 'PROFESSIONAL',
      isTopAdActive: true,
      isFeaturedActive: true,
      isUrgent: false,
      isBumpActive: false,
      createdAt: new Date(),
    },
    expectedScore: 80 + 40 + 30 + 10, // 160
  },
  {
    description: 'Starter Featured + Urgent',
    ad: {
      planType: 'STARTER',
      isTopAdActive: false,
      isFeaturedActive: true,
      isUrgent: true,
      isBumpActive: false,
      createdAt: new Date(),
    },
    expectedScore: 60 + 30 + 20 + 10, // 120
  },
  {
    description: 'Free Top Ad',
    ad: {
      planType: 'FREE',
      isTopAdActive: true,
      isFeaturedActive: false,
      isUrgent: false,
      isBumpActive: false,
      createdAt: new Date(),
    },
    expectedScore: 10 + 40 + 10, // 60
  },
  {
    description: 'Free Normal (24 hours old)',
    ad: {
      planType: 'FREE',
      isTopAdActive: false,
      isFeaturedActive: false,
      isUrgent: false,
      isBumpActive: false,
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    },
    expectedScore: 10 + 5, // 15
  },
];

module.exports = {
  calculateRankingScore,
  getPlanPriority,
  calculateRankingBreakdown,
  getAdBadges,
  PLAN_PRIORITY,
  FEATURE_BOOST,
  RANKING_EXAMPLES,
};
