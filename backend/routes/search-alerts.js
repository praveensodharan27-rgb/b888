const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { getSettings } = require('../services/searchAlerts');

const router = express.Router();
const prisma = new PrismaClient();

// Admin middleware
const isAdmin = authorize('ADMIN');

/**
 * Get search alert settings (Admin only)
 */
router.get('/settings', authenticate, isAdmin, async (req, res) => {
  try {
    const settings = await prisma.searchAlertSettings.findFirst();
    
    if (!settings) {
      // Return default settings if none exist
      return res.json({
        success: true,
        settings: {
          enabled: true,
          maxEmailsPerUser: 5,
          checkIntervalHours: 24,
          emailSubject: 'New products matching your search!',
          emailBody: '<p>Hi there!</p><p>We found some products matching your recent search: <strong>{{query}}</strong></p>{{products}}<p>Happy shopping!</p>',
        },
        message: 'Using default settings. Update to save custom settings.'
      });
    }
    
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error fetching search alert settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
});

/**
 * Update search alert settings (Admin only)
 */
router.put('/settings',
  authenticate,
  isAdmin,
  [
    body('enabled').optional().isBoolean(),
    body('maxEmailsPerUser').optional().isInt({ min: 1, max: 100 }),
    body('checkIntervalHours').optional().isInt({ min: 1, max: 168 }),
    body('emailSubject').optional().isString().isLength({ min: 1, max: 200 }),
    body('emailBody').optional().isString().isLength({ min: 10 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const {
        enabled,
        maxEmailsPerUser,
        checkIntervalHours,
        emailSubject,
        emailBody
      } = req.body;

      const updateData = {};
      if (enabled !== undefined) updateData.enabled = enabled;
      if (maxEmailsPerUser !== undefined) updateData.maxEmailsPerUser = maxEmailsPerUser;
      if (checkIntervalHours !== undefined) updateData.checkIntervalHours = checkIntervalHours;
      if (emailSubject !== undefined) updateData.emailSubject = emailSubject;
      if (emailBody !== undefined) updateData.emailBody = emailBody;

      // Check if settings exist
      const existingSettings = await prisma.searchAlertSettings.findFirst();

      let settings;
      if (existingSettings) {
        // Update existing settings
        settings = await prisma.searchAlertSettings.update({
          where: { id: existingSettings.id },
          data: updateData
        });
      } else {
        // Create new settings with defaults for missing fields
        settings = await prisma.searchAlertSettings.create({
          data: {
            enabled: enabled !== undefined ? enabled : true,
            maxEmailsPerUser: maxEmailsPerUser || 5,
            checkIntervalHours: checkIntervalHours || 24,
            emailSubject: emailSubject || 'New products matching your search!',
            emailBody: emailBody || '<p>Hi there!</p><p>We found some products matching your recent search: <strong>{{query}}</strong></p>{{products}}<p>Happy shopping!</p>',
          }
        });
      }

      res.json({
        success: true,
        settings,
        message: 'Settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating search alert settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update settings'
      });
    }
  }
);

/**
 * Get search alert statistics (Admin only)
 */
router.get('/statistics', authenticate, isAdmin, async (req, res) => {
  try {
    const [totalQueries, processedQueries, pendingQueries, uniqueUsers] = await Promise.all([
      prisma.searchQuery.count(),
      prisma.searchQuery.count({ where: { processed: true } }),
      prisma.searchQuery.count({ where: { processed: false } }),
      prisma.searchQuery.findMany({
        where: { userEmail: { not: null } },
        distinct: ['userEmail'],
        select: { userEmail: true }
      })
    ]);

    // Get queries from last 7 days
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentQueries = await prisma.searchQuery.count({
      where: { createdAt: { gte: last7Days } }
    });

    // Get top searched queries
    const topQueries = await prisma.searchQuery.groupBy({
      by: ['query'],
      _count: {
        query: true
      },
      orderBy: {
        _count: {
          query: 'desc'
        }
      },
      take: 10
    });

    res.json({
      success: true,
      statistics: {
        totalQueries,
        processedQueries,
        pendingQueries,
        uniqueUsers: uniqueUsers.length,
        queriesLast7Days: recentQueries,
        topQueries: topQueries.map(q => ({
          query: q.query,
          count: q._count.query
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching search alert statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

/**
 * Get recent search queries (Admin only)
 */
router.get('/queries', authenticate, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, processed } = req.query;

    const where = {};
    if (processed !== undefined) {
      where.processed = processed === 'true';
    }

    const [queries, total] = await Promise.all([
      prisma.searchQuery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.searchQuery.count({ where })
    ]);

    res.json({
      success: true,
      queries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching search queries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch queries'
    });
  }
});

/**
 * Clear old search queries (Admin only)
 */
router.delete('/queries/cleanup', authenticate, isAdmin, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const cutoffDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
    
    const result = await prisma.searchQuery.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        processed: true
      }
    });

    res.json({
      success: true,
      message: `Deleted ${result.count} old search queries`,
      deletedCount: result.count
    });
  } catch (error) {
    console.error('Error cleaning up search queries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup queries'
    });
  }
});

/**
 * Test email template (Admin only)
 */
router.post('/test-email',
  authenticate,
  isAdmin,
  [
    body('email').isEmail(),
    body('testQuery').optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { email, testQuery = 'iPhone 13' } = req.body;
      
      // Get settings
      const settings = await getSettings();
      
      // Find some sample products for testing
      const { findMatchingProducts, sendAlertEmail } = require('../services/searchAlerts');
      const products = await findMatchingProducts(testQuery, {});
      
      if (products.length === 0) {
        // Use dummy products if no matches found
        const dummyProducts = await prisma.ad.findMany({
          where: { status: 'APPROVED' },
          include: {
            location: {
              select: { name: true }
            }
          },
          take: 3
        });
        
        if (dummyProducts.length > 0) {
          await sendAlertEmail(email, testQuery, dummyProducts, settings);
        } else {
          return res.status(400).json({
            success: false,
            message: 'No products available for test email'
          });
        }
      } else {
        await sendAlertEmail(email, testQuery, products, settings);
      }

      res.json({
        success: true,
        message: 'Test email sent successfully'
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send test email'
      });
    }
  }
);

module.exports = router;

