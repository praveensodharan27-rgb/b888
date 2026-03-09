const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logger } = require('../src/config/logger');
const { 
  queueAdCreatedNotification,
  queueAdApprovedNotification,
  queueAdRejectedNotification,
  queuePackagePurchasedNotification,
  queuePaymentSuccessNotification,
  queueInvoiceGeneratedNotification,
  queueOfferReceivedNotification,
  queueOfferResponseNotification,
  getQueueStats,
  clearFailedJobs,
  retryFailedJobs
} = require('../queues/notificationQueue');
const { manualTriggerExpiryCheck } = require('../cron/adExpiryCron');

/**
 * Notification Management API Routes
 */

// ============================================
// GET NOTIFICATION HISTORY
// ============================================

/**
 * Get notification history for current user
 * GET /api/notifications/history
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, eventType } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      userId: req.user.id
    };

    if (eventType) {
      where.eventType = eventType;
    }

    const [notifications, total] = await Promise.all([
      prisma.notificationHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.notificationHistory.count({ where })
    ]);

    res.json({
      success: true,
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching notification history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification history',
      error: error.message
    });
  }
});

// ============================================
// MANUAL NOTIFICATION TRIGGERS (Admin/Testing)
// ============================================

/**
 * Manually trigger ad created notification
 * POST /api/notifications/trigger/ad-created
 */
router.post('/trigger/ad-created', authenticateToken, async (req, res) => {
  try {
    const { adId } = req.body;

    if (!adId) {
      return res.status(400).json({
        success: false,
        message: 'Ad ID is required'
      });
    }

    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      include: { user: true }
    });

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }

    // Check authorization (user must own the ad or be admin)
    if (ad.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const job = await queueAdCreatedNotification(ad.userId, adId);

    res.json({
      success: true,
      message: 'Notification queued successfully',
      jobId: job.id
    });
  } catch (error) {
    logger.error('Error triggering ad created notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger notification',
      error: error.message
    });
  }
});

/**
 * Manually trigger ad approved notification
 * POST /api/notifications/trigger/ad-approved
 */
router.post('/trigger/ad-approved', authenticateToken, async (req, res) => {
  try {
    const { adId } = req.body;

    if (!adId) {
      return res.status(400).json({
        success: false,
        message: 'Ad ID is required'
      });
    }

    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      include: { user: true }
    });

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }

    const job = await queueAdApprovedNotification(ad.userId, adId);

    res.json({
      success: true,
      message: 'Notification queued successfully',
      jobId: job.id
    });
  } catch (error) {
    logger.error('Error triggering ad approved notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger notification',
      error: error.message
    });
  }
});

/**
 * Manually trigger payment success notification
 * POST /api/notifications/trigger/payment-success
 */
router.post('/trigger/payment-success', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check authorization
    if (order.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const job = await queuePaymentSuccessNotification(order.userId, orderId);

    res.json({
      success: true,
      message: 'Notification queued successfully',
      jobId: job.id
    });
  } catch (error) {
    logger.error('Error triggering payment success notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger notification',
      error: error.message
    });
  }
});

// ============================================
// QUEUE MANAGEMENT (Admin Only)
// ============================================

/**
 * Get queue statistics
 * GET /api/notifications/queue/stats
 */
router.get('/queue/stats', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const stats = await getQueueStats();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Error fetching queue stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch queue stats',
      error: error.message
    });
  }
});

/**
 * Clear failed jobs
 * POST /api/notifications/queue/clear-failed
 */
router.post('/queue/clear-failed', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const count = await clearFailedJobs();

    res.json({
      success: true,
      message: `Cleared ${count} failed jobs`,
      count
    });
  } catch (error) {
    logger.error('Error clearing failed jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear failed jobs',
      error: error.message
    });
  }
});

/**
 * Retry failed jobs
 * POST /api/notifications/queue/retry-failed
 */
router.post('/queue/retry-failed', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const count = await retryFailedJobs();

    res.json({
      success: true,
      message: `Retrying ${count} failed jobs`,
      count
    });
  } catch (error) {
    logger.error('Error retrying failed jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry failed jobs',
      error: error.message
    });
  }
});

// ============================================
// CRON JOB MANAGEMENT (Admin Only)
// ============================================

/**
 * Manually trigger ad expiry check
 * POST /api/notifications/cron/check-expiry
 */
router.post('/cron/check-expiry', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const result = await manualTriggerExpiryCheck();

    res.json({
      success: true,
      message: 'Ad expiry check completed',
      result
    });
  } catch (error) {
    logger.error('Error triggering expiry check:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger expiry check',
      error: error.message
    });
  }
});

// ============================================
// NOTIFICATION PREFERENCES
// ============================================

/**
 * Get user notification preferences
 * GET /api/notifications/preferences
 */
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true
      }
    });

    res.json({
      success: true,
      preferences: user || {
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true
      }
    });
  } catch (error) {
    logger.error('Error fetching notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch preferences',
      error: error.message
    });
  }
});

/**
 * Update user notification preferences
 * PUT /api/notifications/preferences
 */
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const { emailNotifications, smsNotifications, pushNotifications } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        emailNotifications: emailNotifications !== undefined ? emailNotifications : undefined,
        smsNotifications: smsNotifications !== undefined ? smsNotifications : undefined,
        pushNotifications: pushNotifications !== undefined ? pushNotifications : undefined
      },
      select: {
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true
      }
    });

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: user
    });
  } catch (error) {
    logger.error('Error updating notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update preferences',
      error: error.message
    });
  }
});

module.exports = router;
