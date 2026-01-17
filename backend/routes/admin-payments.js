// Admin Payment Operations APIs
const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { 
  getFailedPayments, 
  retryActivation, 
  processManualRefund,
  PAYMENT_STATES 
} = require('../services/paymentProcessor');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('ADMIN'));

/**
 * @route   GET /api/admin/payments/failed
 * @desc    Get failed payments list
 * @access  Admin
 */
router.get(
  '/failed',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('userId').optional().isString().withMessage('User ID must be a string'),
    query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be valid ISO date')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        userId: req.query.userId || null,
        startDate: req.query.startDate || null,
        endDate: req.query.endDate || null
      };

      const result = await getFailedPayments(filters);

      res.json(result);
    } catch (error) {
      console.error('❌ Get failed payments error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch failed payments'
      });
    }
  }
);

/**
 * @route   GET /api/admin/payments/status/:orderId
 * @desc    Get payment status with full details
 * @access  Admin
 */
router.get('/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.paymentOrder.findUnique({
      where: { orderId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Get payment record if exists
    const paymentRecord = await prisma.paymentRecord.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' }
    });

    // Get activation status
    let activationStatus = null;
    if (paymentRecord) {
      const { checkServiceActivationStatus } = require('../services/paymentActivation');
      activationStatus = await checkServiceActivationStatus(
        paymentRecord.purpose,
        paymentRecord.referenceId,
        order.userId
      );
    }

    res.json({
      success: true,
      order: {
        ...order,
        state: order.status
      },
      paymentRecord,
      activationStatus
    });
  } catch (error) {
    console.error('❌ Get payment status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get payment status'
    });
  }
});

/**
 * @route   POST /api/admin/payments/retry-activation
 * @desc    Retry activation for failed/verified payments
 * @access  Admin
 */
router.post(
  '/retry-activation',
  [
    body('orderId').notEmpty().withMessage('Order ID is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { orderId } = req.body;

      const result = await retryActivation(orderId);

      res.json({
        success: true,
        message: 'Activation retry completed',
        ...result
      });
    } catch (error) {
      console.error('❌ Retry activation error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retry activation'
      });
    }
  }
);

/**
 * @route   POST /api/admin/payments/manual-refund
 * @desc    Process manual refund / rollback
 * @access  Admin
 */
router.post(
  '/manual-refund',
  [
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('refundAmount').optional().isFloat({ min: 0.01 }).withMessage('Refund amount must be positive'),
    body('reason').optional().isString().withMessage('Reason must be a string')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { orderId, refundAmount, reason } = req.body;

      const result = await processManualRefund(orderId, refundAmount, reason);

      res.json({
        success: true,
        message: 'Manual refund processed successfully',
        ...result
      });
    } catch (error) {
      console.error('❌ Manual refund error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to process manual refund'
      });
    }
  }
);

/**
 * @route   GET /api/admin/payments/stats
 * @desc    Get payment statistics
 * @access  Admin
 */
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [
      total,
      created,
      paid,
      verified,
      activated,
      refunded,
      failed,
      cancelled
    ] = await Promise.all([
      prisma.paymentOrder.count({ where }),
      prisma.paymentOrder.count({ where: { ...where, status: PAYMENT_STATES.CREATED } }),
      prisma.paymentOrder.count({ where: { ...where, status: PAYMENT_STATES.PAID } }),
      prisma.paymentOrder.count({ where: { ...where, status: PAYMENT_STATES.VERIFIED } }),
      prisma.paymentOrder.count({ where: { ...where, status: PAYMENT_STATES.ACTIVATED } }),
      prisma.paymentOrder.count({ where: { ...where, status: PAYMENT_STATES.REFUNDED } }),
      prisma.paymentOrder.count({ where: { ...where, status: PAYMENT_STATES.FAILED } }),
      prisma.paymentOrder.count({ where: { ...where, status: PAYMENT_STATES.CANCELLED } })
    ]);

    // Calculate revenue
    const revenueResult = await prisma.paymentOrder.aggregate({
      where: {
        ...where,
        status: {
          in: [PAYMENT_STATES.PAID, PAYMENT_STATES.VERIFIED, PAYMENT_STATES.ACTIVATED]
        }
      },
      _sum: {
        amount: true
      }
    });

    const revenue = (revenueResult._sum.amount || 0) / 100; // Convert from paise

    res.json({
      success: true,
      stats: {
        total,
        byState: {
          created,
          paid,
          verified,
          activated,
          refunded,
          failed,
          cancelled
        },
        revenue: {
          total: revenue,
          currency: 'INR'
        }
      }
    });
  } catch (error) {
    console.error('❌ Get payment stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get payment statistics'
    });
  }
});

/**
 * @route   GET /api/admin/payments/list
 * @desc    Get all payments with filters
 * @access  Admin
 */
router.get(
  '/list',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(Object.values(PAYMENT_STATES)),
    query('userId').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const where = {};
      if (req.query.status) where.status = req.query.status;
      if (req.query.userId) where.userId = req.query.userId;
      if (req.query.startDate || req.query.endDate) {
        where.createdAt = {};
        if (req.query.startDate) where.createdAt.gte = new Date(req.query.startDate);
        if (req.query.endDate) where.createdAt.lte = new Date(req.query.endDate);
      }

      const [payments, total] = await Promise.all([
        prisma.paymentOrder.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.paymentOrder.count({ where })
      ]);

      res.json({
        success: true,
        payments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('❌ Get payments list error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch payments'
      });
    }
  }
);

module.exports = router;

