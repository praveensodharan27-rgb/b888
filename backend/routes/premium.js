const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const Razorpay = require('razorpay');
const { authenticate } = require('../middleware/auth');
const { sendAdPackagePurchasedNotification, sendPaymentSuccessNotification } = require('../services/notificationService');
const { addNotificationToQueue } = require('../queues/notificationQueue');

const router = express.Router();
const prisma = new PrismaClient();

// Helper function to get premium settings from database with fallback
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
    // Only log if it's not a connection error (connection errors are expected when MongoDB is unavailable)
    if (error.code !== 'P2010' && !error.message?.includes('Server selection timeout')) {
      console.error('Error loading premium settings from database:', error);
    }
    // Connection errors are silently handled - fallback to environment variables
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
    offerImage: null,
    durations: {
      TOP: parseInt(process.env.PREMIUM_DURATION_TOP || '7'),
      FEATURED: parseInt(process.env.PREMIUM_DURATION_FEATURED || '14'),
      BUMP_UP: parseInt(process.env.PREMIUM_DURATION_BUMP_UP || '1'),
      URGENT: parseInt(process.env.PREMIUM_DURATION_URGENT || '7'),
    },
  };
};

// Public endpoint to get premium offers (for users)
router.get('/offers', async (req, res) => {
  try {
    const settings = await getPremiumSettings();
    res.json({ 
      success: true, 
      offers: {
        prices: settings.prices,
        offerPrices: settings.offerPrices || { TOP: null, FEATURED: null, BUMP_UP: null, URGENT: null },
        durations: settings.durations,
        offerImage: settings.offerImage || null
      }
    });
  } catch (error) {
    console.error('Get premium offers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch premium offers' });
  }
});

// Initialize Razorpay (only if keys are provided)
// Ensure dotenv is loaded
require('dotenv').config();

let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  // Ensure TEST key is used (rzp_test_xxx)
  const keyId = process.env.RAZORPAY_KEY_ID;
  const isTestKey = keyId.startsWith('rzp_test_');
  
  if (!isTestKey && process.env.NODE_ENV !== 'production') {
    console.warn('⚠️ WARNING: Non-test Razorpay key detected in non-production environment:', keyId.substring(0, 10) + '...');
    console.warn('⚠️ Expected TEST key format: rzp_test_xxx');
  }
  
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
  console.log('✅ Razorpay initialized successfully', {
    keyType: isTestKey ? 'TEST' : 'LIVE',
    keyPrefix: keyId.substring(0, 10) + '...'
  });
} else {
  console.warn('⚠️ Razorpay not initialized - keys missing:', {
    hasKeyId: !!process.env.RAZORPAY_KEY_ID,
    hasKeySecret: !!process.env.RAZORPAY_KEY_SECRET
  });
}

// Premium pricing (in INR) - will be loaded from database
// These are defaults, actual values loaded via getPremiumSettings()
let PREMIUM_PRICES = {
  TOP: 299,
  FEATURED: 199,
  BUMP_UP: 99
};

// Ad posting price (in INR) - configurable via environment variable
// Note: Razorpay minimum amount is ₹1 (100 paise)
// Clamp AD_POSTING_PRICE to reasonable values (₹1 - ₹1000) to prevent misconfiguration
const AD_POSTING_PRICE = Math.max(1, Math.min(1000, parseFloat(process.env.AD_POSTING_PRICE || '49'))); // Default ₹49, clamped between ₹1-₹1000
const MIN_RAZORPAY_AMOUNT = 100; // Minimum 1 INR in paise

// Log the configured price on startup
console.log('💰 Ad Posting Price configured:', AD_POSTING_PRICE, 'INR');

// Premium durations (in days) - will be loaded from database
// These are defaults, actual values loaded via getPremiumSettings()
let PREMIUM_DURATIONS = {
  TOP: 7,
  FEATURED: 14,
  BUMP_UP: 1
};

// Load settings on startup and periodically refresh
(async () => {
  const settings = await getPremiumSettings();
  PREMIUM_PRICES = settings.prices;
  PREMIUM_DURATIONS = settings.durations;
  console.log('✅ Premium settings loaded:', { prices: PREMIUM_PRICES, durations: PREMIUM_DURATIONS });
})();

// Refresh settings every 5 minutes
setInterval(async () => {
  const settings = await getPremiumSettings();
  PREMIUM_PRICES = settings.prices;
  PREMIUM_DURATIONS = settings.durations;
}, 5 * 60 * 1000);

// Create premium order
router.post('/order',
  authenticate,
  [
    body('adId').notEmpty().withMessage('Ad ID is required'),
    body('type').isIn(['TOP', 'FEATURED', 'BUMP_UP']).withMessage('Invalid premium type')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { adId, type } = req.body;

      // Verify ad belongs to user
      const ad = await prisma.ad.findUnique({
        where: { id: adId }
      });

      if (!ad) {
        return res.status(404).json({ success: false, message: 'Ad not found' });
      }

      if (ad.userId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      if (ad.status !== 'APPROVED') {
        return res.status(400).json({ success: false, message: 'Ad must be approved' });
      }

      if (!razorpay) {
        return res.status(503).json({ 
          success: false, 
          message: 'Payment service not configured. Please contact administrator.' 
        });
      }

      // Get current settings
      const settings = await getPremiumSettings();
      // Convert to paise: ₹2121 → 212100
      const amount = Math.round(settings.prices[type] * 100);
      const duration = settings.durations[type];

      // Validate amount (minimum 100 paise = ₹1)
      if (amount < 100) {
        return res.status(400).json({ 
          success: false, 
          message: `Amount too low. Minimum ₹1 required. Got: ₹${(amount / 100).toFixed(2)}` 
        });
      }

      // Generate short receipt (max 40 chars for Razorpay)
      const receipt = `PRM${adId.slice(-8)}${Date.now().toString().slice(-8)}`.slice(0, 40);
      
      // Create Razorpay order (backend only - order must be created here)
      let razorpayOrder;
      try {
        razorpayOrder = await razorpay.orders.create({
          amount: amount, // Amount in paise
          currency: 'INR',
          receipt: receipt,
          notes: {
            adId,
            type,
            userId: req.user.id
          }
        });
        console.log('✅ Razorpay order created:', {
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          amountInINR: `₹${(razorpayOrder.amount / 100).toFixed(2)}`
        });
      } catch (razorpayError) {
        console.error('❌ Razorpay order creation failed:');
        console.error('   Error:', razorpayError.message);
        console.error('   Status Code:', razorpayError.statusCode);
        console.error('   Error Description:', razorpayError.error?.description);
        
        return res.status(500).json({ 
          success: false, 
          message: razorpayError.error?.description || razorpayError.message || 'Failed to create Razorpay order',
          error: process.env.NODE_ENV === 'development' ? razorpayError.message : undefined
        });
      }

      // Create premium order in database
      const premiumOrder = await prisma.premiumOrder.create({
        data: {
          type,
          amount: settings.prices[type],
          razorpayOrderId: razorpayOrder.id,
          userId: req.user.id,
          adId,
          status: 'pending'
        }
      });

      // Also create PaymentOrder record for payment processor
      try {
        await prisma.paymentOrder.create({
          data: {
            userId: req.user.id,
            orderId: razorpayOrder.id,
            amount: amount, // Amount in paise
            currency: 'INR',
            status: 'created',
            notes: JSON.stringify({
              userId: req.user.id,
              type: 'PREMIUM',
              order_type: 'premium',
              purpose: 'ad_promotion',
              premiumType: type,
              adId: adId,
              premiumOrderId: premiumOrder.id
            }),
            isTestOrder: process.env.NODE_ENV !== 'production'
          }
        });
        console.log('✅ PaymentOrder record created for premium order:', razorpayOrder.id);
      } catch (paymentOrderError) {
        console.error('❌ Error creating PaymentOrder record:', paymentOrderError);
        // Don't fail the request, but log the error
        // Payment processor can still work with PremiumOrder record
      }

      // Return order details with proper Order ID
      res.json({
        success: true,
        order: premiumOrder,
        razorpayOrder: {
          id: razorpayOrder.id, // Order ID must be passed correctly to frontend
          amount: razorpayOrder.amount, // Amount in paise (₹2121 → 212100)
          currency: razorpayOrder.currency || 'INR',
          key: process.env.RAZORPAY_KEY_ID // Key ID for frontend checkout
        }
      });
    } catch (error) {
      console.error('❌ Create premium order error:', error);
      const { getSafeErrorPayload } = require('../utils/safeErrorResponse');
      res.status(500).json(getSafeErrorPayload(error, 'Failed to create order'));
    }
  }
);

// Verify payment and activate premium
router.post('/verify',
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
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { orderId, paymentId, signature } = req.body;

      // Validate inputs
      if (!orderId || !paymentId || !signature) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required fields: orderId, paymentId, and signature are required' 
        });
      }

      // Verify payment signature with proper error handling
      let generatedSignature;
      try {
        const crypto = require('crypto');
        if (!process.env.RAZORPAY_KEY_SECRET) {
          return res.status(500).json({ 
            success: false, 
            message: 'Payment verification service not configured' 
          });
        }
        
        generatedSignature = crypto
          .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
          .update(`${orderId}|${paymentId}`)
          .digest('hex');
      } catch (cryptoError) {
        console.error('❌ Error generating signature:', cryptoError);
        return res.status(500).json({ 
          success: false, 
          message: 'Payment verification failed' 
        });
      }

      if (generatedSignature !== signature) {
        console.error('❌ Invalid payment signature:', {
          orderId,
          paymentId,
          expectedSignature: generatedSignature.substring(0, 20) + '...',
          receivedSignature: signature.substring(0, 20) + '...'
        });
        return res.status(400).json({ success: false, message: 'Invalid payment signature' });
      }

      // Get premium order
      const premiumOrder = await prisma.premiumOrder.findUnique({
        where: { razorpayOrderId: orderId },
        include: { ad: true }
      });

      if (!premiumOrder) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      if (premiumOrder.userId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      // Use central payment processor with error handling
      const { processPaymentVerification } = require('../services/paymentProcessor');
      
      let result;
      try {
        result = await processPaymentVerification({
          orderId,
          paymentId,
          signature,
          userId: req.user.id,
          orderType: 'premium'
        });
      } catch (verificationError) {
        console.error('❌ Payment verification error:', verificationError);
        return res.status(500).json({ 
          success: false, 
          message: verificationError.message || 'Payment verification failed' 
        });
      }

      // Update premium order with activation details
      if (result.activation?.activationDetails?.expiresAt) {
        await prisma.premiumOrder.update({
          where: { id: premiumOrder.id },
          data: {
            razorpayPaymentId: paymentId,
            status: 'paid',
            expiresAt: result.activation.activationDetails.expiresAt
          }
        });
      }

      // Create notification
      const notification = await prisma.notification.create({
        data: {
          userId: req.user.id,
          title: 'Premium Activated',
          message: `Your ${premiumOrder.type} premium has been activated for your ad "${premiumOrder.ad.title}".`,
          type: 'premium_activated',
          link: `/ads/${premiumOrder.adId}`
        }
      });

      // Emit real-time notification via Socket.IO
      const { emitNotification } = require('../socket/socket');
      emitNotification(req.user.id, {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        link: notification.link,
        isRead: false,
        createdAt: notification.createdAt
      });

      // Send email and SMS notifications
      try {
        const user = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { id: true, name: true, email: true, phone: true }
        });

        if (user) {
          // Common order payload used by multiple notification types
          const orderPayload = {
            id: premiumOrder.id,
            amount: premiumOrder.amount,
            paymentMethod: 'Razorpay',
            invoiceId: premiumOrder.id, // Use premium order ID as invoice reference
          };

          // 1) Package purchase notification (email + SMS)
          await addNotificationToQueue({
            type: 'package_purchased',
            data: {
              user,
              ad: premiumOrder.ad,
              packageType: premiumOrder.type,
              order: orderPayload,
            },
          });

          // 2) Payment success notification (email + SMS)
          await addNotificationToQueue({
            type: 'payment_success',
            data: {
              user,
              order: orderPayload,
            },
          });

          // 3) Invoice generated notification (email + SMS)
          await addNotificationToQueue({
            type: 'invoice_generated',
            data: {
              user,
              invoice: {
                id: premiumOrder.id,
                invoiceNumber: String(premiumOrder.id).padStart(6, '0'),
                totalAmount: premiumOrder.amount,
                createdAt: premiumOrder.createdAt || new Date(),
              },
            },
          });

          console.log(`📧 Premium notifications queued for user ${user.id}`);
        }
      } catch (notificationError) {
        console.error('⚠️  Failed to queue notification:', notificationError);
        // Don't fail the payment verification if notification fails
      }

      // ✅ Return comprehensive response with activation confirmation
      const activationConfirmed = result.activation?.serviceActivated || false;
      const paymentVerified = result.success !== false;
      
      res.json({
        success: true,
        paymentVerified: paymentVerified,
        activationConfirmed: activationConfirmed,
        message: activationConfirmed 
          ? 'Payment successful and premium activated' 
          : paymentVerified 
            ? 'Payment successful but activation pending' 
            : 'Payment verified',
        isDuplicate: result.isDuplicate || false,
        serviceActivated: activationConfirmed,
        activationDetails: result.activation?.activationDetails || null,
        state: result.state || (activationConfirmed ? 'activated' : 'verified'),
        payment: {
          paymentId,
          orderId,
          amount: premiumOrder.amount,
          status: 'paid'
        }
      });
    } catch (error) {
      console.error('Verify payment error:', error);
      res.status(500).json({ success: false, message: 'Payment verification failed' });
    }
  }
);

// Test Razorpay configuration (for debugging)
router.get('/test-razorpay', async (req, res) => {
  const config = {
    success: true,
    razorpayConfigured: !!razorpay,
    hasKeyId: !!process.env.RAZORPAY_KEY_ID,
    hasKeySecret: !!process.env.RAZORPAY_KEY_SECRET,
    keyIdPrefix: process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.substring(0, 10) + '...' : 'NOT SET'
  };

  // Try to create a test order to verify API connection
  if (razorpay) {
    try {
      // Generate short receipt (max 40 chars for Razorpay)
      const testReceipt = `TEST${Date.now().toString().slice(-8)}`.slice(0, 40);
      const testOrder = await razorpay.orders.create({
        amount: 100, // Minimum ₹1
        currency: 'INR',
        receipt: testReceipt
      });
      config.testOrderCreated = true;
      config.testOrderId = testOrder.id;
    } catch (error) {
      config.testOrderCreated = false;
      config.testOrderError = error.message;
      config.testOrderStatusCode = error.statusCode;
      config.testOrderDescription = error.error?.description;
    }
  }

  res.json(config);
});

// Get user's premium orders
router.get('/orders', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      prisma.premiumOrder.findMany({
        where: { userId: req.user.id },
        include: {
          ad: {
            select: {
              id: true,
              title: true,
              images: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.premiumOrder.count({ where: { userId: req.user.id } })
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
    console.error('Get premium orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

// Create ad posting payment order
router.post('/ad-posting/order',
  authenticate,
  [
    body('adData').custom((value) => {
      if (!value || (typeof value === 'object' && Object.keys(value).length === 0)) {
        throw new Error('Ad data is required');
      }
      return true;
    })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      if (!razorpay) {
        return res.status(503).json({ 
          success: false, 
          message: 'Payment service not configured. Please contact administrator.' 
        });
      }

      const { adData } = req.body;
      const premiumType = adData?.premiumType || null;
      const isUrgent = adData?.isUrgent || false;
      
      console.log('📝 Creating payment order for ad data:', { 
        userId: req.user.id, 
        hasAdData: !!adData,
        premiumType,
        isUrgent
      });
      
      // CORE BUSINESS RULES:
      // 1. Premium ads (TOP/FEATURED/BUMP_UP) ALWAYS require payment (ignore free/business quota)
      // 2. Normal ads: Business package quota first, then free ads quota
      // 3. Payment required only if no quota available

      const isPremiumAd = !!(premiumType && ['TOP', 'FEATURED', 'BUMP_UP'].includes(premiumType));
      const AD_POSTING_PRICE = parseFloat(process.env.AD_POSTING_PRICE || '49');
      const FREE_ADS_LIMIT = 2;

      // RULE 1: Premium ads ALWAYS require payment (ignore quota)
      if (isPremiumAd) {
        console.log('⭐ Premium ad - ALWAYS requires payment (ignoring quota)');
        // Premium cost will be calculated below, postingPrice stays 0
      } else {
        // RULE 2 & 3: Normal ads - check quota
        const now = new Date();
        const activeBusinessPackages = await prisma.businessPackage.findMany({
          where: {
            userId: req.user.id,
            status: 'paid',
            expiresAt: { gt: now }
          }
        });
        
        // Calculate business ads remaining
        const businessAdsRemaining = activeBusinessPackages.reduce((sum, pkg) => {
          const remaining = (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0);
          return sum + remaining;
        }, 0);
        
        // Get user free ads quota
        const user = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { freeAdsRemaining: true }
        });
        
        const freeAdsRemaining = user?.freeAdsRemaining ?? FREE_ADS_LIMIT;
        
        // Check if user has quota for normal ads
        const hasQuota = businessAdsRemaining > 0 || freeAdsRemaining > 0;
        
        if (!hasQuota) {
          // No quota - require payment
          console.log(`💰 No quota available - charging base ad posting price: ₹${AD_POSTING_PRICE}`);
        } else {
          console.log(`✅ Ad posting free - quota available (business: ${businessAdsRemaining}, free: ${freeAdsRemaining})`);
        }
      }
      
      // Base posting price (only for normal ads without quota)
      let postingPrice = 0;
      if (!isPremiumAd) {
        const now = new Date();
        const activeBusinessPackages = await prisma.businessPackage.findMany({
          where: {
            userId: req.user.id,
            status: 'paid',
            expiresAt: { gt: now }
          }
        });
        
        const businessAdsRemaining = activeBusinessPackages.reduce((sum, pkg) => {
          const remaining = (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0);
          return sum + remaining;
        }, 0);
        
        const user = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { freeAdsRemaining: true }
        });
        
        const freeAdsRemaining = user?.freeAdsRemaining ?? FREE_ADS_LIMIT;
        
        if (businessAdsRemaining <= 0 && freeAdsRemaining <= 0) {
          postingPrice = AD_POSTING_PRICE;
        }
      }
      
      // Get premium settings to use offer prices if available
      const settings = await getPremiumSettings();
      
      // Calculate premium costs only (use offer price if available)
      let premiumCost = 0;
      if (premiumType && settings.prices[premiumType]) {
        const originalPrice = settings.prices[premiumType];
        const offerPrice = settings.offerPrices?.[premiumType];
        const finalPrice = (offerPrice && offerPrice < originalPrice) ? offerPrice : originalPrice;
        premiumCost += finalPrice;
        console.log(`⭐ Premium ${premiumType} cost: ₹${finalPrice}${offerPrice ? ` (Offer: ₹${offerPrice}, Original: ₹${originalPrice})` : ''}`);
      }
      
      // Urgent badge cost (use offer price if available)
      const originalUrgentPrice = settings.prices.URGENT || parseFloat(process.env.PREMIUM_PRICE_URGENT || '49');
      const offerUrgentPrice = settings.offerPrices?.URGENT;
      const urgentPrice = (offerUrgentPrice && offerUrgentPrice < originalUrgentPrice) ? offerUrgentPrice : originalUrgentPrice;
      if (isUrgent) {
        premiumCost += urgentPrice;
        console.log(`🚨 Urgent badge cost: ₹${urgentPrice}${offerUrgentPrice ? ` (Offer: ₹${offerUrgentPrice}, Original: ₹${originalUrgentPrice})` : ''}`);
      }
      
      // Total amount = posting price (if free ads exhausted) + premium costs
      const totalAmount = postingPrice + premiumCost;
      
      // If no payment needed (has free ads or business package, and no premium features)
      if (totalAmount === 0) {
        return res.json({
          success: true,
          message: 'No payment required. Ad posting is free.',
          requiresPayment: false,
          order: null,
          razorpayOrder: null
        });
      }
      
      // Ensure amount meets Razorpay minimum (₹1 = 100 paise)
      const amount = Math.max(Math.round(totalAmount * 100), 100);
      console.log('💰 Final payment amount:', amount, 'paise (₹' + (amount / 100) + ')', {
        premiumCost,
        totalAmount
      });

      // Create Razorpay order
      let razorpayOrder;
      try {
        // Generate short receipt (max 40 chars for Razorpay)
        const receipt = `AD${req.user.id.slice(-8)}${Date.now().toString().slice(-8)}`.slice(0, 40);
        
        const orderData = {
          amount: amount,
          currency: 'INR',
          receipt: receipt,
          notes: {
            userId: req.user.id,
            type: 'AD_POSTING',
            premiumType: premiumType || '',
            isUrgent: isUrgent ? 'true' : 'false'
          }
        };
        console.log('📤 Sending Razorpay order request:', { ...orderData, notes: orderData.notes });
        
        razorpayOrder = await razorpay.orders.create(orderData);
        console.log('✅ Razorpay order created:', razorpayOrder.id);
      } catch (razorpayError) {
        console.error('❌ Razorpay order creation failed:');
        console.error('   Error:', razorpayError.message);
        console.error('   Status Code:', razorpayError.statusCode);
        console.error('   Error Description:', razorpayError.error?.description);
        console.error('   Full Error:', JSON.stringify(razorpayError, null, 2));
        
        // Provide user-friendly error message
        let errorMessage = 'Failed to create Razorpay order';
        if (razorpayError.error?.description) {
          errorMessage = razorpayError.error.description;
        } else if (razorpayError.message) {
          errorMessage = razorpayError.message;
        }
        
        return res.status(500).json({ 
          success: false, 
          message: errorMessage,
          error: razorpayError.message,
          details: process.env.NODE_ENV === 'development' ? {
            statusCode: razorpayError.statusCode,
            description: razorpayError.error?.description
          } : undefined
        });
      }

      // Create ad posting order in database
      let adPostingOrder;
      try {
        console.log('💾 Creating ad posting order in database:', {
          razorpayOrderId: razorpayOrder.id,
          userId: req.user.id,
          amount: AD_POSTING_PRICE
        });
        
        adPostingOrder = await prisma.adPostingOrder.create({
          data: {
            amount: totalAmount, // Store total amount in INR (posting + premium)
            razorpayOrderId: razorpayOrder.id,
            userId: req.user.id,
            adData: JSON.stringify({
              ...adData,
              premiumType: premiumType,
              isUrgent: isUrgent,
              premiumCost: premiumCost
            }),
            status: 'pending'
          }
        });
        
        console.log('✅ Ad posting order created in database:', {
          id: adPostingOrder.id,
          razorpayOrderId: adPostingOrder.razorpayOrderId,
          userId: adPostingOrder.userId,
          status: adPostingOrder.status
        });
        
        // Verify the order was created correctly
        const verifyOrder = await prisma.adPostingOrder.findUnique({
          where: { id: adPostingOrder.id },
          select: { id: true, razorpayOrderId: true }
        });
        console.log('✅ Verified order in database:', verifyOrder);
      } catch (dbError) {
        console.error('❌ Database error creating ad posting order:');
        console.error('   Error type:', dbError.constructor.name);
        console.error('   Error message:', dbError.message);
        console.error('   Error code:', dbError.code);
        if (dbError.meta) {
          console.error('   Prisma meta:', JSON.stringify(dbError.meta, null, 2));
        }
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to save order to database',
          error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        });
      }

      // Also create PaymentOrder record for payment processor
      try {
        await prisma.paymentOrder.create({
          data: {
            userId: req.user.id,
            orderId: razorpayOrder.id,
            amount: amount, // Amount in paise
            currency: 'INR',
            status: 'created',
            notes: JSON.stringify({
              userId: req.user.id,
              type: 'AD_POSTING',
              order_type: 'ad_posting',
              purpose: 'ad_posting',
              premiumType: premiumType || '',
              isUrgent: isUrgent,
              adPostingOrderId: adPostingOrder.id
            }),
            isTestOrder: process.env.NODE_ENV !== 'production'
          }
        });
        console.log('✅ PaymentOrder record created for ad posting order:', razorpayOrder.id);
      } catch (paymentOrderError) {
        console.error('❌ Error creating PaymentOrder record:', paymentOrderError);
        // Don't fail the request, but log the error
        // Payment processor can still work with AdPostingOrder record
      }

      res.json({
        success: true,
        requiresPayment: true, // Always true when order is created (payment required)
        order: {
          ...adPostingOrder,
          amount: totalAmount // Total amount in INR (posting + premium)
        },
        razorpayOrder: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount, // Amount in paise
          currency: razorpayOrder.currency,
          key: process.env.RAZORPAY_KEY_ID
        },
        amount: totalAmount // Total amount in INR for easy access (posting + premium)
      });
    } catch (error) {
      console.error('❌ Create ad posting order error:', error);
      const { getSafeErrorPayload } = require('../utils/safeErrorResponse');
      res.status(500).json(getSafeErrorPayload(error, 'Failed to create order'));
    }
  }
);

// Generate QR code for payment order (optional UPI payment method)
router.post('/qr-code',
  authenticate,
  [
    body('orderId').notEmpty().withMessage('Order ID is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { orderId } = req.body;

      if (!razorpay) {
        return res.status(503).json({ 
          success: false, 
          message: 'Payment service not configured' 
        });
      }

      // Fetch order details from Razorpay
      let razorpayOrder;
      try {
        razorpayOrder = await razorpay.orders.fetch(orderId);
        console.log('✅ Fetched Razorpay order for QR:', orderId);
      } catch (error) {
        console.error('❌ Error fetching Razorpay order:', error);
        return res.status(404).json({ 
          success: false, 
          message: 'Order not found' 
        });
      }

      // Verify order belongs to user (optional security check)
      // Note: Razorpay orders don't have userId, so we check via PaymentOrder table
      try {
        const paymentOrder = await prisma.paymentOrder.findFirst({
          where: {
            orderId: orderId,
            userId: req.user.id
          }
        });

        if (!paymentOrder) {
          // Also check AdPostingOrder
          const adPostingOrder = await prisma.adPostingOrder.findFirst({
            where: {
              razorpayOrderId: orderId,
              userId: req.user.id
            }
          });

          if (!adPostingOrder) {
            return res.status(403).json({ 
              success: false, 
              message: 'Order does not belong to user' 
            });
          }
        }
      } catch (dbError) {
        console.warn('⚠️ Could not verify order ownership:', dbError);
        // Continue anyway - orderId verification is sufficient
      }

      // Generate UPI payment string
      // Format: upi://pay?pa=merchant@upi&pn=MerchantName&am=amount&cu=INR&tn=description
      const amount = (razorpayOrder.amount / 100).toFixed(2); // Convert paise to INR
      
      // Get merchant VPA from environment or use Razorpay default
      // For Razorpay, you typically use their payment link or generate QR through their API
      // Since we're using orders, we'll create a UPI string that can be scanned
      const merchantVpa = process.env.RAZORPAY_MERCHANT_VPA || process.env.RAZORPAY_UPI_ID || 'sellit@razorpay';
      const merchantName = process.env.RAZORPAY_MERCHANT_NAME || 'SellIt';
      const description = `Payment for Order ${orderId.substring(0, 12)}`;
      
      // Create UPI payment string
      const upiString = `upi://pay?pa=${encodeURIComponent(merchantVpa)}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(description)}&tr=${orderId.substring(0, 20)}`;
      
      // Generate QR code using qrcode library
      const QRCode = require('qrcode');
      
      // Generate QR code as data URL (base64 image)
      const qrCodeDataUrl = await QRCode.toDataURL(upiString, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      console.log('✅ Generated QR code for order:', orderId);

      res.json({
        success: true,
        qrCode: qrCodeDataUrl,
        upiString: upiString,
        amount: amount,
        orderId: orderId,
        merchantName: merchantName,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() // QR valid for 15 minutes
      });
    } catch (error) {
      console.error('❌ Generate QR code error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to generate QR code',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Verify ad posting payment and create ad
router.post('/ad-posting/verify',
  authenticate,
  [
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('paymentId').notEmpty().withMessage('Payment ID is required'),
    body('signature').notEmpty().withMessage('Signature is required')
  ],
  async (req, res) => {
    try {
      console.log('🔍 Payment verification request:', { 
        orderId: req.body.orderId, 
        paymentId: req.body.paymentId,
        userId: req.user.id 
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('❌ Validation errors:', errors.array());
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { orderId, paymentId, signature } = req.body;

      // Verify payment signature
      if (!process.env.RAZORPAY_KEY_SECRET) {
        console.error('❌ RAZORPAY_KEY_SECRET not configured');
        return res.status(500).json({ success: false, message: 'Payment service not configured' });
      }

      const crypto = require('crypto');
      
      // Ensure orderId and paymentId are strings and trim whitespace
      const cleanOrderId = String(orderId).trim();
      const cleanPaymentId = String(paymentId).trim();
      const cleanSignature = String(signature).trim();
      
      // Generate signature: orderId|paymentId
      const signatureString = `${cleanOrderId}|${cleanPaymentId}`;
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(signatureString)
        .digest('hex');

      console.log('🔐 Signature verification:', {
        orderId: cleanOrderId,
        paymentId: cleanPaymentId,
        signatureString,
        received: cleanSignature.substring(0, 20) + '...',
        generated: generatedSignature.substring(0, 20) + '...',
        receivedLength: cleanSignature.length,
        generatedLength: generatedSignature.length,
        match: generatedSignature === cleanSignature
      });

      if (generatedSignature !== cleanSignature) {
        console.error('❌ Invalid payment signature');
        console.error('   Expected:', generatedSignature);
        console.error('   Received:', cleanSignature);
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid payment signature. Please contact support if payment was successful.',
          debug: process.env.NODE_ENV === 'development' ? {
            orderId: cleanOrderId,
            paymentId: cleanPaymentId,
            signatureString,
            expectedSignature: generatedSignature.substring(0, 20) + '...',
            receivedSignature: cleanSignature.substring(0, 20) + '...'
          } : undefined
        });
      }

      // Get ad posting order (use cleaned orderId for consistency)
      console.log('📋 Fetching ad posting order:', cleanOrderId);
      console.log('   OrderId type:', typeof cleanOrderId);
      console.log('   OrderId length:', cleanOrderId.length);
      console.log('   User ID:', req.user?.id);
      
      // Validate user is authenticated
      if (!req.user || !req.user.id) {
        console.error('❌ User not authenticated');
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
      }
      
      let adPostingOrder;
      try {
        // Use findUnique (razorpayOrderId is @unique)
        console.log('   🔍 Querying ad posting order with findUnique...');
        adPostingOrder = await prisma.adPostingOrder.findUnique({
          where: { razorpayOrderId: cleanOrderId }
        });
        console.log('   ✅ Query result:', adPostingOrder ? 'Found' : 'Not found');
        
        // If still not found, try to find by partial match (for debugging)
        if (!adPostingOrder) {
          console.log('   🔍 Order not found, checking if any orders exist...');
          try {
            const allOrders = await prisma.adPostingOrder.findMany({
              where: { userId: req.user.id },
              select: {
                id: true,
                razorpayOrderId: true,
                status: true,
                createdAt: true
              },
              orderBy: { createdAt: 'desc' },
              take: 5
            });
            console.log('   Recent orders for user:', JSON.stringify(allOrders, null, 2));
            
            // Also check if order exists with different userId (for debugging)
            const anyOrder = await prisma.adPostingOrder.findFirst({
              where: { razorpayOrderId: cleanOrderId },
              select: {
                id: true,
                razorpayOrderId: true,
                userId: true,
                status: true
              }
            });
            if (anyOrder) {
              console.log('   ⚠️ Order found but belongs to different user:', anyOrder);
            }
          } catch (debugError) {
            console.error('   ❌ Error during debug query:', debugError.message);
          }
        }
      } catch (dbError) {
        console.error('❌ Database error fetching order:');
        console.error('   Error type:', dbError.constructor.name);
        console.error('   Error name:', dbError.name);
        console.error('   Error message:', dbError.message);
        console.error('   Error code:', dbError.code);
        if (dbError.meta) {
          console.error('   Prisma meta:', JSON.stringify(dbError.meta, null, 2));
        }
        if (dbError.cause) {
          console.error('   Error cause:', dbError.cause);
        }
        if (dbError.stack) {
          console.error('   Stack trace:', dbError.stack);
        }
        
        // Check if it's a connection error
        if (dbError.code === 'P1001' || dbError.message?.includes('connect') || dbError.message?.includes('Connection')) {
          return res.status(503).json({ 
            success: false, 
            message: 'Database connection error. Please try again.',
            error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
          });
        }
        
        // Check if it's a query error
        if (dbError.code === 'P2002' || dbError.code?.startsWith('P2')) {
          return res.status(500).json({ 
            success: false, 
            message: 'Database query error. Please contact support.',
            error: process.env.NODE_ENV === 'development' ? dbError.message : undefined,
            code: dbError.code
          });
        }
        
        return res.status(500).json({ 
          success: false, 
          message: 'Database error while fetching order',
          error: process.env.NODE_ENV === 'development' ? dbError.message : undefined,
          code: process.env.NODE_ENV === 'development' ? dbError.code : undefined,
          type: process.env.NODE_ENV === 'development' ? dbError.constructor.name : undefined
        });
      }

      if (!adPostingOrder) {
        console.error('❌ Ad posting order not found:', cleanOrderId);
        console.error('   Searched with cleaned orderId:', cleanOrderId);
        console.error('   Original orderId:', orderId);
        // Try to find any orders with similar orderId (for debugging)
        try {
          const similarOrders = await prisma.adPostingOrder.findMany({
            where: {
              razorpayOrderId: {
                contains: cleanOrderId.substring(0, 10)
              }
            },
            select: {
              id: true,
              razorpayOrderId: true,
              status: true
            },
            take: 5
          });
          console.error('   Similar orders found:', similarOrders);
        } catch (e) {
          // Ignore this error
        }
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      console.log('✅ Ad posting order found:', {
        id: adPostingOrder.id,
        userId: adPostingOrder.userId,
        status: adPostingOrder.status,
        hasAdData: !!adPostingOrder.adData
      });

      if (adPostingOrder.userId !== req.user.id) {
        console.error('❌ Unauthorized access:', { orderUserId: adPostingOrder.userId, requestUserId: req.user.id });
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      // ✅ Duplicate payment protection
      if (adPostingOrder.status === 'paid' && adPostingOrder.razorpayPaymentId === cleanPaymentId) {
        console.log('ℹ️ Payment already verified');
        return res.json({
          success: true,
          message: 'Payment already verified',
          isDuplicate: true,
          serviceActivated: true,
          activationDetails: {
            type: 'ad_posting',
            message: 'Ad can now be created',
            adId: adPostingOrder.adId
          },
          adId: adPostingOrder.adId
        });
      }

      // ✅ Validate adId if provided in adData
      let adIdFromData = null;
      if (adPostingOrder.adData) {
        try {
          const parsedAdData = JSON.parse(adPostingOrder.adData);
          adIdFromData = parsedAdData.adId;
          
          // If adId exists, validate it
          if (adIdFromData) {
            const adValidation = await prisma.ad.findUnique({
              where: { id: adIdFromData },
              select: { id: true, userId: true }
            });

            if (!adValidation) {
              return res.status(404).json({ success: false, message: 'Ad not found' });
            }

            if (adValidation.userId !== req.user.id) {
              return res.status(403).json({ success: false, message: 'Ad does not belong to user' });
            }
          }
        } catch (e) {
          console.warn('⚠️ Error parsing adData:', e);
        }
      }

      // Use payment activation service
      const { processPayment } = require('../services/paymentActivation');

      // Process payment: Save record + Activate service
      const paymentResult = await processPayment({
        paymentId: cleanPaymentId,
        orderId: cleanOrderId,
        amount: Math.round(adPostingOrder.amount * 100), // Convert to paise
        purpose: 'ad_posting',
        referenceId: adIdFromData || adPostingOrder.adId || null,
        userId: req.user.id,
        metadata: {
          orderId: adPostingOrder.id,
          hasAdData: !!adPostingOrder.adData
        }
      });

      // Update order status
      console.log('💾 Updating order status to paid...');
      console.log('   Order ID:', adPostingOrder.id);
      console.log('   Payment ID:', cleanPaymentId);
      console.log('   Current status:', adPostingOrder.status);
      
      try {
        const updatedOrder = await prisma.adPostingOrder.update({
          where: { id: adPostingOrder.id },
          data: {
            razorpayPaymentId: cleanPaymentId,
            status: 'paid'
          },
          select: {
            id: true,
            status: true,
            razorpayPaymentId: true,
            razorpayOrderId: true
          }
        });
        console.log('✅ Order status updated to paid:', updatedOrder);
      } catch (updateError) {
        console.error('❌ Failed to update order status:');
        console.error('   Error type:', updateError.constructor.name);
        console.error('   Error message:', updateError.message);
        console.error('   Error code:', updateError.code);
        if (updateError.meta) {
          console.error('   Prisma meta:', JSON.stringify(updateError.meta, null, 2));
        }
        if (updateError.stack) {
          console.error('   Stack trace:', updateError.stack);
        }
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to update order status',
          error: process.env.NODE_ENV === 'development' ? updateError.message : undefined,
          code: process.env.NODE_ENV === 'development' ? updateError.code : undefined,
          details: process.env.NODE_ENV === 'development' ? {
            type: updateError.constructor.name,
            meta: updateError.meta
          } : undefined
        });
      }

      // Create payment success notification
      const notification = await prisma.notification.create({
        data: {
          userId: req.user.id,
          title: 'Payment Successful',
          message: `Your payment of ₹${adPostingOrder.amount} for ad posting has been verified successfully. You can now create your ad.`,
          type: 'payment_success',
          link: '/post-ad'
        }
      });

      // Emit real-time notification via Socket.IO
      const { emitNotification } = require('../socket/socket');
      emitNotification(req.user.id, {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        link: notification.link,
        isRead: false,
        createdAt: notification.createdAt
      });

      console.log('✅ Payment verified successfully');
      
      // ✅ Return comprehensive response with activation confirmation
      const activationConfirmed = paymentResult.activation?.serviceActivated !== false;
      const paymentVerified = paymentResult.success !== false;
      
      res.json({ 
        success: true,
        paymentVerified: paymentVerified,
        activationConfirmed: activationConfirmed,
        message: activationConfirmed 
          ? 'Payment successful and ad posting activated' 
          : paymentVerified 
            ? 'Payment successful but activation pending' 
            : 'Payment verified successfully. You can now create your ad.',
        isDuplicate: paymentResult.isDuplicate || false,
        serviceActivated: activationConfirmed,
        activationDetails: paymentResult.activation?.activationDetails || {
          type: 'ad_posting',
          message: 'Ad can now be created'
        },
        payment: {
          paymentId: cleanPaymentId,
          orderId: cleanOrderId,
          amount: adPostingOrder.amount,
          status: 'paid'
        },
        orderId: adPostingOrder.id,
        razorpayOrderId: cleanOrderId,
        razorpayPaymentId: cleanPaymentId
      });
    } catch (error) {
      console.error('❌ Verify ad posting payment error (outer catch):');
      console.error('   Error type:', error.constructor.name);
      console.error('   Error name:', error.name);
      console.error('   Error message:', error.message);
      if (error.code) {
        console.error('   Error code:', error.code);
      }
      if (error.meta) {
        console.error('   Prisma error meta:', JSON.stringify(error.meta, null, 2));
      }
      if (error.stack) {
        console.error('   Error stack:', error.stack);
      }
      console.error('   Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      
      const { getSafeErrorPayload } = require('../utils/safeErrorResponse');
      res.status(500).json(getSafeErrorPayload(error, 'Payment verification failed'));
    }
  }
);

// Get user's premium status/info
router.get('/status', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // Get user's active premium ads
    const activePremiumAds = await prisma.ad.findMany({
      where: {
        userId: userId,
        isPremium: true,
        OR: [
          { premiumExpiresAt: null },
          { premiumExpiresAt: { gt: now } }
        ]
      },
      select: {
        id: true,
        title: true,
        isPremium: true,
        premiumType: true,
        premiumExpiresAt: true,
        featuredAt: true,
        bumpedAt: true
      },
      orderBy: { premiumExpiresAt: 'desc' }
    });

    // Get user's membership status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        membershipActive: true,
        membershipType: true,
        membershipExpiresAt: true
      }
    });

    // Get recent premium orders
    const recentOrders = await prisma.premiumOrder.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        adId: true,
        type: true,
        amount: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        ad: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    // Count premium ads by type
    const premiumCounts = {
      TOP: activePremiumAds.filter(ad => ad.premiumType === 'TOP').length,
      FEATURED: activePremiumAds.filter(ad => ad.premiumType === 'FEATURED').length,
      BUMP_UP: activePremiumAds.filter(ad => ad.premiumType === 'BUMP_UP').length,
      URGENT: activePremiumAds.filter(ad => ad.premiumType === 'URGENT').length
    };

    res.json({
      success: true,
      premium: {
        hasActivePremium: activePremiumAds.length > 0,
        activePremiumAdsCount: activePremiumAds.length,
        activePremiumAds: activePremiumAds,
        premiumCounts: premiumCounts
      },
      membership: {
        active: user?.membershipActive || false,
        type: user?.membershipType || null,
        expiresAt: user?.membershipExpiresAt || null,
        isExpired: user?.membershipExpiresAt ? user.membershipExpiresAt < now : true
      },
      recentOrders: recentOrders,
      summary: {
        totalActivePremium: activePremiumAds.length,
        hasActiveMembership: user?.membershipActive || false,
        totalOrders: recentOrders.length
      }
    });
  } catch (error) {
    console.error('Get premium status error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch premium status' });
  }
});

module.exports = router;

