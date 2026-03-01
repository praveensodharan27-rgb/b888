/**
 * Credits API - Promotion credit config, balance, history.
 * GET /api/credits/config - Public, credit costs and durations.
 */

const express = require('express');
const { getPromotionConfig } = require('../services/promotionConfigService');

const router = express.Router();

/**
 * GET /api/credits/config
 * Public - Returns credit costs, durations, and plans (no auth required).
 */
router.get('/config', async (req, res) => {
  try {
    const config = await getPromotionConfig();
    res.json({
      success: true,
      config: {
        creditsPerPromotion: config.creditsPerPromotion || {},
        promotionDurationDays: config.promotionDurationDays || {},
        subscriptionPlans: config.subscriptionPlans || {},
        promotionsEnabled: config.promotionsEnabled || {},
      },
    });
  } catch (error) {
    console.error('Credits config error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch credits config',
    });
  }
});

module.exports = router;
