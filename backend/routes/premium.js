const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const Razorpay = require('razorpay');
const { authenticate } = require('../middleware/auth');

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
    console.error('Error loading premium settings from database:', error);
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
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
  console.log('✅ Razorpay initialized successfully');
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
      const amount = settings.prices[type] * 100; // Convert to paise
      const duration = settings.durations[type];

      // Generate short receipt (max 40 chars for Razorpay)
      const receipt = `PRM${adId.slice(-8)}${Date.now().toString().slice(-8)}`.slice(0, 40);
      
      // Create Razorpay order
      const razorpayOrder = await razorpay.orders.create({
        amount: amount,
        currency: 'INR',
        receipt: receipt,
        notes: {
          adId,
          type,
          userId: req.user.id
        }
      });

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

      res.json({
        success: true,
        order: premiumOrder,
        razorpayOrder: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          key: process.env.RAZORPAY_KEY_ID
        }
      });
    } catch (error) {
      console.error('Create premium order error:', error);
      res.status(500).json({ success: false, message: 'Failed to create order' });
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

      // Verify payment signature
      const crypto = require('crypto');
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      if (generatedSignature !== signature) {
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

      // Get current settings
      const settings = await getPremiumSettings();
      const duration = settings.durations[premiumOrder.type];
      const expiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);

      await prisma.premiumOrder.update({
        where: { id: premiumOrder.id },
        data: {
          razorpayPaymentId: paymentId,
          status: 'paid',
          expiresAt
        }
      });

      // Update ad with premium features
      const updateData = {
        isPremium: true,
        premiumType: premiumOrder.type,
        premiumExpiresAt: expiresAt
      };

      if (premiumOrder.type === 'FEATURED') {
        updateData.featuredAt = new Date();
      } else if (premiumOrder.type === 'BUMP_UP') {
        updateData.bumpedAt = new Date();
      }

      await prisma.ad.update({
        where: { id: premiumOrder.adId },
        data: updateData
      });

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

      res.json({ success: true, message: 'Premium activated successfully' });
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
      
      // Check if user has exhausted free ads
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { freeAdsUsed: true }
      });
      const freeAdsUsed = user?.freeAdsUsed || 0;
      const FREE_ADS_LIMIT = 2;
      const AD_POSTING_PRICE = parseFloat(process.env.AD_POSTING_PRICE || '49');
      const hasFreeAdsRemaining = freeAdsUsed < FREE_ADS_LIMIT;
      
      // Check if user has active business packages
      const now = new Date();
      const activeBusinessPackages = await prisma.businessPackage.findMany({
        where: {
          userId: req.user.id,
          status: 'paid',
          expiresAt: { gt: now }
        }
      });
      
      // Ad posting is free if user has free ads remaining OR has active business package
      // Otherwise, charge base ad posting price
      let postingPrice = 0;
      if (!hasFreeAdsRemaining && activeBusinessPackages.length === 0) {
        postingPrice = AD_POSTING_PRICE;
        console.log(`💰 User has exhausted free ads. Charging base ad posting price: ₹${postingPrice}`);
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
      console.error('Error stack:', error.stack);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create order',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
        // First, verify database connection
        await prisma.$queryRaw`SELECT 1`;
        console.log('   ✅ Database connection verified');
        
        // Use findUnique (now works because razorpayOrderId is @unique)
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

      if (adPostingOrder.status === 'paid') {
        console.log('ℹ️ Payment already verified');
        return res.json({ success: true, message: 'Payment already verified', adId: adPostingOrder.adId });
      }

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
      res.json({ 
        success: true, 
        message: 'Payment verified successfully. You can now create your ad.',
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
      
      res.status(500).json({ 
        success: false, 
        message: 'Payment verification failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        errorType: process.env.NODE_ENV === 'development' ? error.constructor.name : undefined,
        code: process.env.NODE_ENV === 'development' ? error.code : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

module.exports = router;

