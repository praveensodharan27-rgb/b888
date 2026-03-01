const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const paymentGatewayService = require('../services/paymentGateway');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route   POST /api/payment-gateway/order
 * @desc    Create a payment order (common contract for web and app)
 * @access  Private
 * 
 * Request Body (either amount OR purpose+plan):
 * - Option 1 (Web - backward compatible): { amount, currency?, notes? }
 * - Option 2 (App - plan-based): { purpose, plan, currency?, notes?, metadata? }
 * 
 * Purpose types:
 * - 'ad_promotion' + plan: 'TOP' | 'FEATURED' | 'BUMP_UP' | 'URGENT'
 * - 'business_package' + plan: 'MAX_VISIBILITY' | 'SELLER_PLUS' | 'SELLER_PRIME'
 * - 'membership' + plan: 'PREMIUM' | 'GOLD' | 'PLATINUM'
 * - 'ad_posting' + plan (optional): Premium type if any
 */
router.post(
  '/order',
  authenticate,
  [
    // Amount is optional if purpose+plan is provided
    body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be at least ₹0.01'),
    body('purpose').optional().isString().isIn(['ad_promotion', 'business_package', 'membership', 'ad_posting']).withMessage('Invalid purpose'),
    body('plan').optional().isString().withMessage('Plan must be a string'),
    body('currency').optional().isString().withMessage('Currency must be a string'),
    body('notes').optional().isObject().withMessage('Notes must be an object'),
    body('metadata').optional().isObject().withMessage('Metadata must be an object')
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

      const { amount, purpose, plan, currency = 'INR', notes = {}, metadata = {} } = req.body;
      const userId = req.user.id;

      let finalAmount = amount;
      let calculatedAmount = null;

      // If amount is not provided, calculate based on purpose and plan
      if (!finalAmount && purpose && plan) {
        const { calculatePaymentAmount } = require('../services/paymentAmountCalculator');
        const calculationResult = await calculatePaymentAmount(purpose, plan, userId, metadata);
        
        if (!calculationResult.requiresPayment) {
          return res.json({
            success: true,
            message: calculationResult.message || 'No payment required',
            requiresPayment: false,
            calculatedAmount: calculationResult
          });
        }
        
        finalAmount = calculationResult.amount;
        calculatedAmount = calculationResult;
      } else if (!finalAmount) {
        return res.status(400).json({
          success: false,
          message: 'Either amount or (purpose + plan) must be provided'
        });
      }

      // Prepare notes with purpose and plan info
      const orderNotes = {
        ...notes,
        purpose: purpose || notes.purpose,
        plan: plan || notes.plan,
        ...(calculatedAmount && { calculatedAmount: calculatedAmount.details })
      };

      const result = await paymentGatewayService.createOrder(userId, finalAmount, currency, orderNotes);

      res.status(201).json({
        success: true,
        message: 'Payment order created successfully',
        ...result,
        ...(calculatedAmount && { 
          calculatedAmount: {
            purpose,
            plan,
            amount: finalAmount,
            details: calculatedAmount.details
          }
        })
      });
    } catch (error) {
      console.error('❌ Create payment order error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create payment order'
      });
    }
  }
);

/**
 * @route   POST /api/payment-gateway/verify
 * @desc    Verify payment
 * @access  Private
 */
router.post(
  '/verify',
  authenticate,
  [
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('paymentId').notEmpty().withMessage('Payment ID is required'),
    body('signature').notEmpty().withMessage('Signature is required')
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

      const { orderId, paymentId, signature } = req.body;
      const userId = req.user.id;

      // Use central payment processor
      // IMPORTANT: Verify only - activation will happen via webhook
      const { processPaymentVerification } = require('../services/paymentProcessor');
      const result = await processPaymentVerification({
        orderId,
        paymentId,
        signature,
        userId,
        skipActivation: true // Skip activation - webhook will handle it
      });

      res.json({
        success: true,
        message: 'Payment verified. Service will be activated via webhook.',
        ...result
      });
    } catch (error) {
      console.error('❌ Verify payment error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Payment verification failed'
      });
    }
  }
);

/**
 * @route   POST /api/payment-gateway/refund
 * @desc    Process refund
 * @access  Private
 */
router.post(
  '/refund',
  authenticate,
  [
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be at least ₹0.01'),
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

      const { orderId, amount, reason = 'Refund requested' } = req.body;
      const userId = req.user.id;

      // Verify that the order belongs to the user
      const order = await prisma.paymentOrder.findUnique({
        where: { orderId }
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      if (order.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. This order does not belong to you.'
        });
      }

      // Only admin can process refunds (or implement your own logic)
      // For now, allow users to request refunds for their own orders
      const result = await paymentGatewayService.processRefund(orderId, amount, reason);

      res.json({
        success: true,
        message: result.message,
        ...result
      });
    } catch (error) {
      console.error('❌ Process refund error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Refund processing failed'
      });
    }
  }
);

/**
 * @route   POST /api/payment-gateway/cancel
 * @desc    Cancel a payment order
 * @access  Private
 */
router.post(
  '/cancel',
  authenticate,
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
      const userId = req.user.id;

      const order = await prisma.paymentOrder.findUnique({
        where: { orderId }
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      if (order.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      if (order.status === 'paid') {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel a paid order. Please request a refund instead.'
        });
      }

      await prisma.paymentOrder.update({
        where: { orderId },
        data: { status: 'cancelled' }
      });

      res.json({
        success: true,
        message: 'Order cancelled successfully'
      });
    } catch (error) {
      console.error('❌ Cancel order error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to cancel order'
      });
    }
  }
);

/**
 * @route   GET /api/payment-gateway/order/:orderId
 * @desc    Get comprehensive order status with activation details
 * @access  Private
 */
router.get('/order/:orderId', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const result = await paymentGatewayService.getOrderStatus(orderId);

    // Verify that the order belongs to the user
    if (result.order.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This order does not belong to you.'
      });
    }

    // Get payment record if exists
    const paymentRecord = await prisma.paymentRecord.findFirst({
      where: { orderId: orderId }
    });

    // Get activation status if payment record exists
    let activationStatus = null;
    if (paymentRecord) {
      const paymentActivationService = require('../services/paymentActivation');
      activationStatus = await paymentActivationService.checkServiceActivationStatus(
        paymentRecord.purpose,
        paymentRecord.referenceId,
        paymentRecord.userId
      );
    }

    // Enhanced response with activation details
    res.json({
      ...result,
      paymentRecord: paymentRecord || null,
      activationStatus: activationStatus || null,
      serviceActivated: activationStatus?.activated || false
    });
  } catch (error) {
    console.error('❌ Get order status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get order status'
    });
  }
});

/**
 * @route   GET /api/payment-gateway/payments
 * @desc    Get user payment history
 * @access  Private
 */
router.get(
  '/payments',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
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

      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const result = await paymentGatewayService.getUserPayments(userId, page, limit);

      res.json(result);
    } catch (error) {
      console.error('❌ Get user payments error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch payment history'
      });
    }
  }
);

/**
 * @route   GET /api/payment-gateway/test-users
 * @desc    Get test users (development only)
 * @access  Private (Admin or Dev mode)
 */
router.get('/test-users', authenticate, async (req, res) => {
  try {
    // Only available in dev mode or for admins
    if (!paymentGatewayService.DEV_MODE && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Test users endpoint is only available in development mode'
      });
    }

    const testUsers = paymentGatewayService.getAllTestUsers();

    res.json({
      success: true,
      devMode: paymentGatewayService.DEV_MODE,
      testUsers
    });
  } catch (error) {
    console.error('❌ Get test users error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch test users'
    });
  }
});

/**
 * @route   GET /api/payment-gateway/test-user/:userId
 * @desc    Get test user info (development only)
 * @access  Private (Admin or Dev mode)
 */
router.get('/test-user/:userId', authenticate, async (req, res) => {
  try {
    // Only available in dev mode or for admins
    if (!paymentGatewayService.DEV_MODE && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Test user endpoint is only available in development mode'
      });
    }

    const { userId } = req.params;
    const testUser = paymentGatewayService.getTestUserInfo(userId);

    if (!testUser) {
      return res.status(404).json({
        success: false,
        message: 'Test user not found'
      });
    }

    res.json({
      success: true,
      devMode: paymentGatewayService.DEV_MODE,
      testUser
    });
  } catch (error) {
    console.error('❌ Get test user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch test user'
    });
  }
});

/**
 * @route   GET /api/payment-gateway/status
 * @desc    Get payment gateway status
 * @access  Public
 */
router.get('/status', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.json({
    success: true,
    ...(!isProd && { devMode: paymentGatewayService.DEV_MODE }),
    razorpayConfigured: paymentGatewayService.razorpayInitialized(),
    ...(!isProd && process.env.RAZORPAY_KEY_ID && { razorpayKeyId: process.env.RAZORPAY_KEY_ID.substring(0, 10) + '...' }),
    message: paymentGatewayService.razorpayInitialized()
      ? 'Payment gateway configured'
      : 'Payment gateway not configured'
  });
});

/**
 * @route   POST /api/payment-gateway/capture
 * @desc    Capture authorized payment
 * @access  Private
 */
router.post(
  '/capture',
  authenticate,
  [
    body('paymentId').notEmpty().withMessage('Payment ID is required'),
    body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be at least ₹0.01')
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

      const { paymentId, amount } = req.body;

      const result = await paymentGatewayService.capturePayment(paymentId, amount);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('❌ Capture payment error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to capture payment'
      });
    }
  }
);

/**
 * @route   GET /api/payment-gateway/payment/:paymentId
 * @desc    Get Razorpay payment details
 * @access  Private
 */
router.get('/payment/:paymentId', authenticate, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const result = await paymentGatewayService.getPaymentDetails(paymentId);

    res.json(result);
  } catch (error) {
    console.error('❌ Get payment details error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get payment details'
    });
  }
});

/**
 * @route   GET /api/payment-gateway/razorpay-order/:orderId
 * @desc    Get Razorpay order details
 * @access  Private
 */
router.get('/razorpay-order/:orderId', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await paymentGatewayService.getRazorpayOrderDetails(orderId);

    res.json(result);
  } catch (error) {
    console.error('❌ Get Razorpay order details error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get Razorpay order details'
    });
  }
});

/**
 * @route   POST /api/payment-gateway/webhook
 * @desc    Razorpay webhook handler
 * @access  Public (but signature verified)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn('⚠️ Razorpay webhook secret not configured');
      return res.status(500).json({
        success: false,
        message: 'Webhook secret not configured'
      });
    }

    if (!signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing webhook signature'
      });
    }

    // Verify webhook signature
    const isValid = paymentGatewayService.verifyWebhookSignature(
      req.body.toString(),
      signature,
      webhookSecret
    );

    if (!isValid) {
      console.error('❌ Invalid webhook signature');
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }

    const webhookData = JSON.parse(req.body.toString());
    const { event, payload } = webhookData;

    console.log(`📥 Razorpay webhook received: ${event}`);

    // Handle different webhook events
    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(payload.payment.entity);
        break;
      case 'payment.failed':
        await handlePaymentFailed(payload.payment.entity);
        break;
      case 'order.paid':
        await handleOrderPaid(payload.order.entity);
        break;
      case 'refund.created':
        await handleRefundCreated(payload.refund.entity);
        break;
      default:
        console.log(`ℹ️ Unhandled webhook event: ${event}`);
    }

    res.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
});

/**
 * Handle payment captured webhook
 * Triggers service activation automatically
 */
async function handlePaymentCaptured(payment) {
  try {
    const { processPaymentVerification } = require('../services/paymentProcessor');
    
    // Process payment verification and activation via webhook
    // Skip signature verification (already verified by webhook signature)
    const result = await processPaymentVerification({
      orderId: payment.order_id,
      paymentId: payment.id,
      signature: '', // Not needed for webhook
      userId: null, // Will be fetched from order
      amount: payment.amount / 100, // Convert from paise to rupees
      skipSignatureVerification: true
    });

    console.log(`✅ Payment processed via webhook: ${payment.order_id}`, {
      state: result.state,
      serviceActivated: result.activation?.serviceActivated
    });
  } catch (error) {
    console.error('❌ Error handling payment captured webhook:', error);
    // Don't throw - webhook should still return success to Razorpay
  }
}

/**
 * Handle payment failed webhook
 */
async function handlePaymentFailed(payment) {
  try {
    const order = await prisma.paymentOrder.findUnique({
      where: { orderId: payment.order_id }
    });

    if (order) {
      await prisma.paymentOrder.update({
        where: { orderId: payment.order_id },
        data: {
          status: 'failed'
        }
      });

      console.log(`⚠️ Updated order ${payment.order_id} to failed via webhook`);
    }
  } catch (error) {
    console.error('❌ Error handling payment failed webhook:', error);
  }
}

/**
 * Handle order paid webhook
 * Triggers service activation automatically
 */
async function handleOrderPaid(order) {
  try {
    // Find payment for this order
    const dbOrder = await prisma.paymentOrder.findUnique({
      where: { orderId: order.id }
    });

    if (!dbOrder) {
      console.warn(`⚠️ Order not found: ${order.id}`);
      return;
    }

    // If payment ID exists, process activation
    if (dbOrder.paymentId) {
      const { processPaymentVerification } = require('../services/paymentProcessor');
      
      await processPaymentVerification({
        orderId: order.id,
        paymentId: dbOrder.paymentId,
        signature: '',
        userId: null,
        amount: order.amount_paid / 100,
        skipSignatureVerification: true
      });

      console.log(`✅ Order paid processed via webhook: ${order.id}`);
    } else {
      // Just update status if no payment ID yet
      await prisma.paymentOrder.update({
        where: { orderId: order.id },
        data: {
          status: 'paid',
          paidAt: new Date()
        }
      });
    }
  } catch (error) {
    console.error('❌ Error handling order paid webhook:', error);
  }
}

/**
 * Handle refund created webhook
 */
async function handleRefundCreated(refund) {
  try {
    // Find order by payment ID
    const order = await prisma.paymentOrder.findFirst({
      where: { paymentId: refund.payment_id }
    });

    if (order) {
      await prisma.paymentOrder.update({
        where: { orderId: order.orderId },
        data: {
          status: 'refunded',
          refundId: refund.id,
          refundAmount: refund.amount,
          refundedAt: new Date()
        }
      });

      console.log(`✅ Updated order ${order.orderId} to refunded via webhook`);
    }
  } catch (error) {
    console.error('❌ Error handling refund created webhook:', error);
  }
}

/**
 * @route   POST /api/payment-gateway/reinitialize
 * @desc    Reinitialize Razorpay (admin only)
 * @access  Private (Admin)
 */
router.post('/reinitialize', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const reinitialized = paymentGatewayService.reinitializeRazorpay();

    res.json({
      success: reinitialized,
      message: reinitialized
        ? 'Razorpay reinitialized successfully'
        : 'Failed to reinitialize Razorpay. Check your environment variables.',
      razorpayConfigured: paymentGatewayService.razorpayInitialized()
    });
  } catch (error) {
    console.error('❌ Reinitialize Razorpay error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reinitialize Razorpay'
    });
  }
});

/**
 * Mobile: Create payment order (simplified for mobile)
 * @route   POST /api/payment-gateway/mobile/order
 * @desc    Create payment order for mobile app
 * @access  Private
 */
router.post(
  '/mobile/order',
  authenticate,
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be at least ₹0.01'),
    body('currency').optional().isString().withMessage('Currency must be a string'),
    body('description').optional().trim(),
    body('orderType').optional().isString() // 'premium', 'ad_posting', 'business_package', etc.
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

      const { amount, currency = 'INR', description, orderType } = req.body;
      const userId = req.user.id;

      const notes = {
        order_type: orderType || 'general',
        description: description || '',
        platform: 'mobile'
      };

      const result = await paymentGatewayService.createOrder(userId, amount, currency, notes);

      res.json({
        success: true,
        message: 'Payment order created successfully',
        orderId: result.order.orderId,
        amount: result.order.amount,
        currency: result.order.currency,
        razorpayOrderId: result.razorpayOrder.id,
        razorpayKeyId: result.razorpayKeyId,
        // Mobile-specific: return minimal data
        mobile: {
          orderId: result.order.orderId,
          amount: result.order.amount,
          currency: result.order.currency,
          razorpayOrderId: result.razorpayOrder.id,
          razorpayKeyId: result.razorpayKeyId
        }
      });
    } catch (error) {
      console.error('❌ Mobile create order error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create payment order'
      });
    }
  }
);

/**
 * Mobile: Verify payment (simplified response)
 * @route   POST /api/payment-gateway/mobile/verify
 * @desc    Verify payment for mobile app
 * @access  Private
 */
router.post(
  '/mobile/verify',
  authenticate,
  [
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('paymentId').notEmpty().withMessage('Payment ID is required'),
    body('signature').notEmpty().withMessage('Signature is required')
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

      const { orderId, paymentId, signature } = req.body;
      const userId = req.user.id;

      // Verify that the order belongs to the user
      const order = await prisma.paymentOrder.findUnique({
        where: { orderId }
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      if (order.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const result = await paymentGatewayService.verifyPayment(orderId, paymentId, signature);

      res.json({
        success: result.success,
        message: result.message,
        order: {
          orderId: result.order.orderId,
          status: result.order.status,
          amount: result.order.amount,
          currency: result.order.currency,
          paymentId: result.order.paymentId,
          paidAt: result.order.paidAt
        }
      });
    } catch (error) {
      console.error('❌ Mobile verify payment error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to verify payment'
      });
    }
  }
);

/**
 * Mobile: Get payment history (optimized for mobile)
 * @route   GET /api/payment-gateway/mobile/history
 * @desc    Get user's payment history for mobile
 * @access  Private
 */
router.get('/mobile/history', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      prisma.paymentOrder.findMany({
        where: { userId: req.user.id },
        select: {
          orderId: true,
          amount: true,
          currency: true,
          status: true,
          createdAt: true,
          paidAt: true,
          paymentId: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.paymentOrder.count({
        where: { userId: req.user.id }
      })
    ]);

    res.json({
      success: true,
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Mobile get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history'
    });
  }
});

module.exports = router;

