const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('ADMIN'));

// Premium settings stored in environment or can be stored in a settings table
// For now, we'll use a simple in-memory object that can be updated
let premiumSettings = {
  prices: {
    TOP: 299,
    FEATURED: 199,
    BUMP_UP: 99
  },
  durations: {
    TOP: 7, // days
    FEATURED: 14, // days
    BUMP_UP: 1 // day
  }
};

// Get premium settings
router.get('/settings', async (req, res) => {
  try {
    res.json({
      success: true,
      settings: premiumSettings
    });
  } catch (error) {
    console.error('Get premium settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
});

// Update premium settings
router.put('/settings',
  [
    body('prices.TOP').optional().isFloat({ min: 0 }),
    body('prices.FEATURED').optional().isFloat({ min: 0 }),
    body('prices.BUMP_UP').optional().isFloat({ min: 0 }),
    body('durations.TOP').optional().isInt({ min: 1 }),
    body('durations.FEATURED').optional().isInt({ min: 1 }),
    body('durations.BUMP_UP').optional().isInt({ min: 1 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { prices, durations } = req.body;

      if (prices) {
        if (prices.TOP !== undefined) premiumSettings.prices.TOP = prices.TOP;
        if (prices.FEATURED !== undefined) premiumSettings.prices.FEATURED = prices.FEATURED;
        if (prices.BUMP_UP !== undefined) premiumSettings.prices.BUMP_UP = prices.BUMP_UP;
      }

      if (durations) {
        if (durations.TOP !== undefined) premiumSettings.durations.TOP = durations.TOP;
        if (durations.FEATURED !== undefined) premiumSettings.durations.FEATURED = durations.FEATURED;
        if (durations.BUMP_UP !== undefined) premiumSettings.durations.BUMP_UP = durations.BUMP_UP;
      }

      res.json({
        success: true,
        message: 'Premium settings updated successfully',
        settings: premiumSettings
      });
    } catch (error) {
      console.error('Update premium settings error:', error);
      res.status(500).json({ success: false, message: 'Failed to update settings' });
    }
  }
);

// Get premium ads by type
router.get('/ads', async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      status: 'APPROVED',
      isPremium: true
    };

    if (type && ['TOP', 'FEATURED', 'BUMP_UP'].includes(type)) {
      where.premiumType = type;
    }

    const [ads, total] = await Promise.all([
      prisma.ad.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          category: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } }
        },
        orderBy: [
          { premiumType: 'asc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: parseInt(limit)
      }),
      prisma.ad.count({ where })
    ]);

    res.json({
      success: true,
      ads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get premium ads error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch premium ads' });
  }
});

// Assign premium type to ad
router.post('/ads/:id/assign',
  [
    body('type').isIn(['TOP', 'FEATURED', 'BUMP_UP']).withMessage('Invalid premium type'),
    body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be at least 1 day')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { type, duration } = req.body;
      const adId = req.params.id;

      const ad = await prisma.ad.findUnique({
        where: { id: adId },
        include: { user: true }
      });

      if (!ad) {
        return res.status(404).json({ success: false, message: 'Ad not found' });
      }

      if (ad.status !== 'APPROVED') {
        return res.status(400).json({ success: false, message: 'Ad must be approved' });
      }

      // Calculate expiry date
      const days = duration || premiumSettings.durations[type];
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      const updateData = {
        isPremium: true,
        premiumType: type,
        premiumExpiresAt: expiresAt
      };

      if (type === 'FEATURED') {
        updateData.featuredAt = new Date();
      } else if (type === 'BUMP_UP') {
        updateData.bumpedAt = new Date();
      }

      const updatedAd = await prisma.ad.update({
        where: { id: adId },
        data: updateData
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: ad.userId,
          title: 'Premium Activated',
          message: `Your ad "${ad.title}" has been upgraded to ${type} premium by admin.`,
          type: 'premium_activated',
          link: `/ads/${ad.id}`
        }
      });

      res.json({
        success: true,
        message: `Ad upgraded to ${type} premium`,
        ad: updatedAd
      });
    } catch (error) {
      console.error('Assign premium error:', error);
      res.status(500).json({ success: false, message: 'Failed to assign premium' });
    }
  }
);

// Remove premium from ad
router.post('/ads/:id/remove-premium', async (req, res) => {
  try {
    const ad = await prisma.ad.findUnique({
      where: { id: req.params.id }
    });

    if (!ad) {
      return res.status(404).json({ success: false, message: 'Ad not found' });
    }

    await prisma.ad.update({
      where: { id: req.params.id },
      data: {
        isPremium: false,
        premiumType: null,
        premiumExpiresAt: null
      }
    });

    res.json({
      success: true,
      message: 'Premium removed from ad'
    });
  } catch (error) {
    console.error('Remove premium error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove premium' });
  }
});

// Toggle urgent badge
router.post('/ads/:id/toggle-urgent', async (req, res) => {
  try {
    const ad = await prisma.ad.findUnique({
      where: { id: req.params.id }
    });

    if (!ad) {
      return res.status(404).json({ success: false, message: 'Ad not found' });
    }

    const updatedAd = await prisma.ad.update({
      where: { id: req.params.id },
      data: {
        isUrgent: !ad.isUrgent
      }
    });

    res.json({
      success: true,
      message: `Urgent badge ${updatedAd.isUrgent ? 'enabled' : 'disabled'}`,
      ad: updatedAd
    });
  } catch (error) {
    console.error('Toggle urgent error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle urgent badge' });
  }
});

// Bump/Refresh ad
router.post('/ads/:id/bump', async (req, res) => {
  try {
    const ad = await prisma.ad.findUnique({
      where: { id: req.params.id }
    });

    if (!ad) {
      return res.status(404).json({ success: false, message: 'Ad not found' });
    }

    const updatedAd = await prisma.ad.update({
      where: { id: req.params.id },
      data: {
        bumpedAt: new Date(),
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Ad bumped successfully',
      ad: updatedAd
    });
  } catch (error) {
    console.error('Bump ad error:', error);
    res.status(500).json({ success: false, message: 'Failed to bump ad' });
  }
});

module.exports = router;

