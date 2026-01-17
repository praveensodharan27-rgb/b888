const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route   GET /api/offers
 * @desc    Get all active offers
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { categoryId, type } = req.query;

    const where = {
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (type) {
      where.type = type;
    }

    const offers = await prisma.offer.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({
      success: true,
      offers
    });
  } catch (error) {
    console.error('Get offers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch offers'
    });
  }
});

/**
 * @route   GET /api/offers/:id
 * @desc    Get single offer details
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const offer = await prisma.offer.findUnique({
      where: { id: req.params.id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true
          }
        }
      }
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    if (!offer.isActive || (offer.expiresAt && offer.expiresAt < new Date())) {
      return res.status(404).json({
        success: false,
        message: 'Offer has expired'
      });
    }

    res.json({
      success: true,
      offer
    });
  } catch (error) {
    console.error('Get offer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch offer'
    });
  }
});

/**
 * @route   GET /api/offers/user/my-offers
 * @desc    Get user's claimed offers
 * @access  Private
 */
router.get('/user/my-offers', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [claimedOffers, total] = await Promise.all([
      prisma.claimedOffer.findMany({
        where: {
          userId: req.user.id
        },
        include: {
          offer: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              }
            }
          }
        },
        orderBy: { claimedAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.claimedOffer.count({
        where: { userId: req.user.id }
      })
    ]);

    res.json({
      success: true,
      claimedOffers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get user offers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user offers'
    });
  }
});

/**
 * @route   POST /api/offers/:id/claim
 * @desc    Claim an offer
 * @access  Private
 */
router.post('/:id/claim',
  authenticate,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check if offer exists and is active
      const offer = await prisma.offer.findUnique({
        where: { id }
      });

      if (!offer) {
        return res.status(404).json({
          success: false,
          message: 'Offer not found'
        });
      }

      if (!offer.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Offer is not active'
        });
      }

      if (offer.expiresAt && offer.expiresAt < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Offer has expired'
        });
      }

      // Check if user already claimed this offer
      const existingClaim = await prisma.claimedOffer.findUnique({
        where: {
          userId_offerId: {
            userId,
            offerId: id
          }
        }
      });

      if (existingClaim) {
        return res.status(400).json({
          success: false,
          message: 'Offer already claimed',
          claimedOffer: existingClaim
        });
      }

      // Check claim limit
      if (offer.maxClaimsPerUser) {
        const userClaimCount = await prisma.claimedOffer.count({
          where: {
            userId,
            offerId: id
          }
        });

        if (userClaimCount >= offer.maxClaimsPerUser) {
          return res.status(400).json({
            success: false,
            message: 'Maximum claim limit reached for this offer'
          });
        }
      }

      // Create claimed offer
      const claimedOffer = await prisma.claimedOffer.create({
        data: {
          userId,
          offerId: id
        },
        include: {
          offer: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              }
            }
          }
        }
      });

      res.json({
        success: true,
        message: 'Offer claimed successfully',
        claimedOffer
      });
    } catch (error) {
      console.error('Claim offer error:', error);
      if (error.code === 'P2002') {
        return res.status(400).json({
          success: false,
          message: 'Offer already claimed'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Failed to claim offer',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/offers/:id/check-claim
 * @desc    Check if user has claimed an offer
 * @access  Private
 */
router.get('/:id/check-claim', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const claimedOffer = await prisma.claimedOffer.findUnique({
      where: {
        userId_offerId: {
          userId,
          offerId: id
        }
      }
    });

    res.json({
      success: true,
      isClaimed: !!claimedOffer,
      claimedOffer: claimedOffer || null
    });
  } catch (error) {
    console.error('Check claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check claim status'
    });
  }
});

module.exports = router;

