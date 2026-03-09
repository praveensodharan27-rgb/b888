const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { moderateAd } = require('../services/contentModeration');
const { addNotificationToQueue } = require('../queues/notificationQueue');

const router = express.Router();
const prisma = new PrismaClient();

// All moderation routes require admin auth
router.use(authenticate);
router.use(authorize('ADMIN'));

/**
 * Get moderation statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const [
      totalAds,
      autoApproved,
      autoRejected,
      manualPending,
      flaggedAds
    ] = await Promise.all([
      prisma.ad.count(),
      prisma.ad.count({
        where: {
          status: 'APPROVED',
          autoRejected: false,
          moderationStatus: { in: ['approved', 'approved_after_review', 'manually_approved'] }
        }
      }),
      prisma.ad.count({ where: { autoRejected: true } }),
      prisma.ad.count({ where: { status: 'PENDING' } }),
      prisma.ad.count({
        where: {
          status: 'REJECTED',
          OR: [
            { moderationStatus: 'flagged' },
            { moderationStatus: 'rejected' },
            { moderationStatus: 'rejected_after_review' }
          ]
        }
      })
    ]);

    // Get recent auto-rejections with reasons
    const recentRejections = await prisma.ad.findMany({
      where: {
        autoRejected: true
      },
      select: {
        id: true,
        title: true,
        rejectionReason: true,
        moderationFlags: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Count by rejection categories
    const rejectionCategories = {};
    recentRejections.forEach(ad => {
      if (ad.moderationFlags && ad.moderationFlags.flaggedCategories) {
        ad.moderationFlags.flaggedCategories.forEach(category => {
          rejectionCategories[category] = (rejectionCategories[category] || 0) + 1;
        });
      }
    });

    res.json({
      success: true,
      statistics: {
        totalAds,
        autoApproved,
        autoRejected,
        manualPending,
        flaggedAds,
        autoApprovalRate: totalAds > 0 ? ((autoApproved / totalAds) * 100).toFixed(2) + '%' : '0%',
        rejectionRate: totalAds > 0 ? ((autoRejected / totalAds) * 100).toFixed(2) + '%' : '0%',
        rejectionCategories,
        recentRejections
      }
    });
  } catch (error) {
    console.error('Error fetching moderation statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

/**
 * Get flagged/rejected ads
 */
router.get('/flagged-ads', async (req, res) => {
  try {
    const { page = 1, limit = 20, type = 'all' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let where = {};
    
    if (type === 'auto-rejected') {
      where.autoRejected = true;
    } else if (type === 'flagged') {
      where.moderationStatus = 'flagged';
    } else if (type === 'all') {
      where.OR = [
        { autoRejected: true },
        { moderationStatus: 'flagged' },
        { moderationStatus: 'rejected' }
      ];
    }

    const [ads, total] = await Promise.all([
      prisma.ad.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
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
    console.error('Error fetching flagged ads:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch flagged ads'
    });
  }
});

/**
 * Re-moderate an ad manually
 */
router.post('/ads/:id/remoderate', async (req, res) => {
  try {
    const ad = await prisma.ad.findUnique({
      where: { id: req.params.id }
    });

    if (!ad) {
      return res.status(404).json({ success: false, message: 'Ad not found' });
    }

    // Run moderation again
    const moderationResult = await moderateAd(ad.title, ad.description, ad.images || []);
    const flags = moderationResult.moderationFlags || {};
    const imageDetails = flags.imageDetails || [];
    const moderationFlags = {
      textModeration: { flagged: !!flags.hasAdultText },
      imageModeration: imageDetails.map((d) => ({ safe: d.isSafe !== false }))
    };

    const newStatus = moderationResult.shouldReject ? 'REJECTED' : 'APPROVED';
    const updateData = {
      status: newStatus,
      moderationStatus: moderationResult.shouldReject ? 'rejected' : 'approved_after_review',
      autoRejected: !!moderationResult.shouldReject,
      moderationFlags,
      rejectionReason: moderationResult.rejectionReason || null
    };
    if (newStatus === 'APPROVED') {
      updateData.postedAt = new Date();
    }

    const updatedAd = await prisma.ad.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        category: {
          select: {
            name: true
          }
        }
      }
    });

    await prisma.notification.create({
      data: {
        userId: ad.userId,
        title: newStatus === 'APPROVED' ? 'Ad Approved' : 'Ad Rejected',
        message: newStatus === 'APPROVED'
          ? `Your ad "${ad.title}" has been approved and is now live!`
          : `Your ad "${ad.title}" has been rejected. Reason: ${moderationResult.rejectionReason || 'Content policy violation'}`,
        type: newStatus === 'APPROVED' ? 'ad_approved' : 'ad_rejected',
        link: `/ads/${ad.id}`
      }
    });

    // Queue email/SMS notification when ad is approved
    if (newStatus === 'APPROVED') {
      try {
        await addNotificationToQueue({
          type: 'ad_approved',
          data: {
            user: updatedAd.user,
            ad: updatedAd,
          },
        });
      } catch (notificationError) {
        console.error('⚠️ Failed to queue ad_approved notification (moderation):', notificationError.message);
      }
    }

    res.json({
      success: true,
      ad: updatedAd,
      moderationResult: { shouldReject: moderationResult.shouldReject, rejectionReason: moderationResult.rejectionReason }
    });
  } catch (error) {
    console.error('Error re-moderating ad:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to re-moderate ad'
    });
  }
});

/**
 * Get moderation settings/configuration
 */
router.get('/settings', async (req, res) => {
  try {
    // Get count of ads by moderation status
    const stats = await Promise.all([
      prisma.ad.count({ where: { moderationStatus: 'approved' } }),
      prisma.ad.count({ where: { autoRejected: true } }),
      prisma.ad.count({ where: { moderationStatus: 'pending' } })
    ]);

    res.json({
      success: true,
      settings: {
        autoModerationEnabled: !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY),
        apiConfigured: !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY),
        apiType: process.env.GEMINI_API_KEY ? 'Gemini' : process.env.OPENAI_API_KEY ? 'OpenAI' : 'None',
        stats: {
          approved: stats[0],
          rejected: stats[1],
          pending: stats[2]
        }
      }
    });
  } catch (error) {
    console.error('Error fetching moderation settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
});

module.exports = router;

