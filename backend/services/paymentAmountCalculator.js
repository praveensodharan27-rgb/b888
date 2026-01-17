// Payment Amount Calculator Service
// Calculates payment amount based on purpose and plan
// Used by: /payment-gateway/order API (common contract for web and app)

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get premium settings
 */
const getPremiumSettings = async () => {
  try {
    const settingsRecord = await prisma.premiumSettings.findUnique({
      where: { key: 'premium_settings' }
    });
    
    if (settingsRecord && settingsRecord.value) {
      const parsed = JSON.parse(settingsRecord.value);
      return parsed;
    }
  } catch (error) {
    console.error('Error loading premium settings:', error);
  }
  
  // Fallback to environment variables
  return {
    prices: {
      TOP: parseFloat(process.env.PREMIUM_PRICE_TOP || '299'),
      FEATURED: parseFloat(process.env.PREMIUM_PRICE_FEATURED || '199'),
      BUMP_UP: parseFloat(process.env.PREMIUM_PRICE_BUMP_UP || '99'),
      URGENT: parseFloat(process.env.PREMIUM_PRICE_URGENT || '49'),
    },
    offerPrices: {
      TOP: null,
      FEATURED: null,
      BUMP_UP: null,
      URGENT: null,
    },
    durations: {
      TOP: parseInt(process.env.PREMIUM_DURATION_TOP || '7'),
      FEATURED: parseInt(process.env.PREMIUM_DURATION_FEATURED || '14'),
      BUMP_UP: parseInt(process.env.PREMIUM_DURATION_BUMP_UP || '1'),
      URGENT: parseInt(process.env.PREMIUM_DURATION_URGENT || '7'),
    },
  };
};

/**
 * Get business package settings
 */
const getBusinessPackageSettings = async () => {
  try {
    const settingsRecord = await prisma.premiumSettings.findUnique({
      where: { key: 'business_package_settings' }
    });
    
    if (settingsRecord && settingsRecord.value) {
      const parsed = JSON.parse(settingsRecord.value);
      return parsed;
    }
  } catch (error) {
    console.error('Error loading business package settings:', error);
  }
  
  // Fallback to defaults
  return {
    prices: {
      MAX_VISIBILITY: 299,
      SELLER_PLUS: 399,
      SELLER_PRIME: 499
    },
    durations: {
      MAX_VISIBILITY: 30,
      SELLER_PLUS: 30,
      SELLER_PRIME: 30
    }
  };
};

/**
 * Calculate payment amount based on purpose and plan
 * @param {string} purpose - Payment purpose: 'ad_promotion', 'business_package', 'membership', 'ad_posting'
 * @param {string} plan - Plan type (e.g., 'TOP', 'FEATURED', 'MAX_VISIBILITY', 'SELLER_PLUS', etc.)
 * @param {string} userId - User ID (for checking free ads, business packages, etc.)
 * @param {Object} metadata - Additional metadata (e.g., { adId, isUrgent, premiumType })
 * @returns {Promise<Object>} - { amount, currency, calculated, details }
 */
const calculatePaymentAmount = async (purpose, plan, userId = null, metadata = {}) => {
  try {
    let amount = 0;
    let currency = 'INR';
    const details = {};

    switch (purpose) {
      case 'ad_promotion': {
        // Premium ad promotion
        if (!plan || !['TOP', 'FEATURED', 'BUMP_UP', 'URGENT'].includes(plan)) {
          throw new Error(`Invalid plan for ad_promotion. Must be one of: TOP, FEATURED, BUMP_UP, URGENT`);
        }

        const settings = await getPremiumSettings();
        const originalPrice = settings.prices[plan] || 0;
        const offerPrice = settings.offerPrices?.[plan];
        
        // Use offer price if available and lower
        amount = (offerPrice && offerPrice < originalPrice) ? offerPrice : originalPrice;
        
        details.premiumType = plan;
        details.originalPrice = originalPrice;
        if (offerPrice) {
          details.offerPrice = offerPrice;
          details.discount = originalPrice - offerPrice;
        }
        details.duration = settings.durations[plan] || 7;
        
        break;
      }

      case 'business_package': {
        // Business package
        if (!plan || !['MAX_VISIBILITY', 'SELLER_PLUS', 'SELLER_PRIME'].includes(plan)) {
          throw new Error(`Invalid plan for business_package. Must be one of: MAX_VISIBILITY, SELLER_PLUS, SELLER_PRIME`);
        }

        const settings = await getBusinessPackageSettings();
        amount = settings.prices[plan] || 0;
        
        details.packageType = plan;
        details.duration = settings.durations[plan] || 30;
        
        break;
      }

      case 'membership': {
        // Membership (default pricing - can be extended)
        const membershipPrices = {
          PREMIUM: 999,
          GOLD: 1999,
          PLATINUM: 2999
        };
        
        const planType = plan || 'PREMIUM';
        amount = membershipPrices[planType] || membershipPrices.PREMIUM;
        
        details.membershipType = planType;
        details.duration = 30; // Default 30 days
        
        break;
      }

      case 'ad_posting': {
        // CORE BUSINESS RULES:
        // 1. Premium ads (TOP/FEATURED/BUMP_UP) ALWAYS require payment (ignore quota)
        // 2. Normal ads: Business package quota first, then free ads quota
        // 3. Payment required only if no quota available

        const AD_POSTING_PRICE = parseFloat(process.env.AD_POSTING_PRICE || '49');
        const FREE_ADS_LIMIT = 2;
        
        // Check if this is a premium ad
        const premiumType = metadata.premiumType || plan;
        const isUrgent = metadata.isUrgent || false;
        const isPremiumAd = !!(premiumType && ['TOP', 'FEATURED', 'BUMP_UP'].includes(premiumType));
        
        let postingPrice = 0;
        let premiumCost = 0;

        // RULE 1: Premium ads ALWAYS require payment (ignore quota)
        if (isPremiumAd) {
          // Premium ads always paid - no quota check
          console.log('⭐ Premium ad - ALWAYS requires payment (ignoring quota)');
        } else {
          // RULE 2 & 3: Normal ads - check quota
          if (userId) {
            // Check business package quota
            const now = new Date();
            const activeBusinessPackages = await prisma.businessPackage.findMany({
              where: {
                userId: userId,
                status: 'paid',
                expiresAt: { gt: now }
              }
            });
            
            const businessAdsRemaining = activeBusinessPackages.reduce((sum, pkg) => {
              const remaining = (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0);
              return sum + remaining;
            }, 0);
            
            // Check free ads quota
            const user = await prisma.user.findUnique({
              where: { id: userId },
              select: { freeAdsRemaining: true }
            });
            
            const freeAdsRemaining = user?.freeAdsRemaining ?? FREE_ADS_LIMIT;
            
            // Payment required only if no quota available
            if (businessAdsRemaining <= 0 && freeAdsRemaining <= 0) {
              postingPrice = AD_POSTING_PRICE;
            }
          } else {
            // If no userId provided, assume payment required
            postingPrice = AD_POSTING_PRICE;
          }
        }

        // Add premium costs if specified (ALWAYS paid)
        if (premiumType && ['TOP', 'FEATURED', 'BUMP_UP'].includes(premiumType)) {
          const settings = await getPremiumSettings();
          const originalPrice = settings.prices[premiumType] || 0;
          const offerPrice = settings.offerPrices?.[premiumType];
          const finalPrice = (offerPrice && offerPrice < originalPrice) ? offerPrice : originalPrice;
          premiumCost += finalPrice;
          details.premiumType = premiumType;
          details.premiumPrice = finalPrice;
        }

        if (isUrgent) {
          const settings = await getPremiumSettings();
          const originalUrgentPrice = settings.prices.URGENT || 49;
          const offerUrgentPrice = settings.offerPrices?.URGENT;
          const urgentPrice = (offerUrgentPrice && offerUrgentPrice < originalUrgentPrice) ? offerUrgentPrice : originalUrgentPrice;
          premiumCost += urgentPrice;
          details.urgentPrice = urgentPrice;
        }

        amount = postingPrice + premiumCost;
        details.postingPrice = postingPrice;
        details.premiumCost = premiumCost;
        details.isPremiumAd = isPremiumAd;
        
        break;
      }

      default:
        throw new Error(`Unknown payment purpose: ${purpose}. Must be one of: ad_promotion, business_package, membership, ad_posting`);
    }

    // Validate amount
    if (amount <= 0) {
      return {
        amount: 0,
        currency,
        calculated: true,
        requiresPayment: false,
        details,
        message: 'No payment required'
      };
    }

    return {
      amount,
      currency,
      calculated: true,
      requiresPayment: true,
      details
    };

  } catch (error) {
    console.error('❌ Error calculating payment amount:', error);
    throw error;
  }
};

module.exports = {
  calculatePaymentAmount,
  getPremiumSettings,
  getBusinessPackageSettings
};

