const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const Razorpay = require('razorpay');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Initialize Razorpay (only if keys are provided)
require('dotenv').config();

let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  try {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    console.log('✅ Razorpay initialized successfully for business packages');
  } catch (error) {
    console.error('❌ Failed to initialize Razorpay:', error);
    razorpay = null;
  }
} else {
  console.warn('⚠️ Razorpay not initialized - keys missing');
  console.warn('   RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? 'Set' : 'Missing');
  console.warn('   RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'Set' : 'Missing');
}

// Helper function to get business package settings from database with fallback
const getBusinessPackageSettings = async () => {
  try {
    const settingsRecord = await prisma.premiumSettings.findUnique({
      where: { key: 'business_package_settings' }
    });
    
    if (settingsRecord && settingsRecord.value) {
      const parsed = JSON.parse(settingsRecord.value);
      console.log('✅ Loaded business package settings from database');
      // Ensure maxAds exists in parsed settings (backward compatibility)
      if (!parsed.maxAds) {
        parsed.maxAds = {
          MAX_VISIBILITY: 5,
          SELLER_PLUS: 7,
          SELLER_PRIME: 12
        };
        console.log('⚠️ maxAds missing in database settings, using defaults');
      }
      return parsed;
    }
    console.log('ℹ️ No business package settings in database, using defaults');
  } catch (error) {
    console.error('❌ Error loading business package settings from database:', error);
    console.error('Error details:', error.message);
  }
  
  // Fallback to defaults
  console.log('📋 Using default business package settings');
  return {
    prices: {
      MAX_VISIBILITY: 299,
      SELLER_PLUS: 399,
      SELLER_PRIME: 499
    },
    durations: {
      MAX_VISIBILITY: 30,
      SELLER_PLUS: 30,
      SELLER_PRIME: 30
    },
    maxAds: {
      MAX_VISIBILITY: 5,
      SELLER_PLUS: 7,
      SELLER_PRIME: 12
    },
    descriptions: {
      MAX_VISIBILITY: 'Maximum visibility for your ads',
      SELLER_PLUS: 'Enhanced features for serious sellers',
      SELLER_PRIME: 'Premium package with all features'
    }
  };
};

// Get all business package info
router.get('/info', async (req, res) => {
  console.log('📦 Business package /info endpoint hit');
  try {
    console.log('📦 Fetching business package info...');
    const settings = await getBusinessPackageSettings();
    console.log('✅ Settings loaded:', settings);
    
    const packages = [
      {
        type: 'MAX_VISIBILITY',
        name: 'Max Visibility',
        price: settings.prices?.MAX_VISIBILITY || 299,
        duration: settings.durations?.MAX_VISIBILITY || 30,
        maxAds: settings.maxAds?.MAX_VISIBILITY || 5, // Deprecated - for backward compatibility
        premiumSlotsTotal: settings.maxAds?.MAX_VISIBILITY || 5, // Premium ad slots included
        description: settings.descriptions?.MAX_VISIBILITY || 'Maximum visibility for your ads'
      },
      {
        type: 'SELLER_PLUS',
        name: 'Seller Plus',
        price: settings.prices?.SELLER_PLUS || 399,
        duration: settings.durations?.SELLER_PLUS || 30,
        maxAds: settings.maxAds?.SELLER_PLUS || 7, // Deprecated - for backward compatibility
        premiumSlotsTotal: settings.maxAds?.SELLER_PLUS || 7, // Premium ad slots included
        description: settings.descriptions?.SELLER_PLUS || 'Enhanced features for serious sellers'
      },
      {
        type: 'SELLER_PRIME',
        name: 'Seller Prime',
        price: settings.prices?.SELLER_PRIME || 499,
        duration: settings.durations?.SELLER_PRIME || 30,
        maxAds: settings.maxAds?.SELLER_PRIME || 12, // Deprecated - for backward compatibility
        premiumSlotsTotal: settings.maxAds?.SELLER_PRIME || 12, // Premium ad slots included
        description: settings.descriptions?.SELLER_PRIME || 'Premium package with all features'
      }
    ];

    console.log('✅ Packages prepared:', packages);
    res.json({
      success: true,
      packages
    });
  } catch (error) {
    console.error('❌ Get business package info error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch package info',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Check if user has active business packages (supports multiple stacked packages)
router.get('/status', authenticate, async (req, res) => {
  try {
    const now = new Date();
    
    // Get ALL active business packages (not just one)
    const activePackages = await prisma.businessPackage.findMany({
      where: {
        userId: req.user.id,
        status: 'paid',
        expiresAt: {
          gt: now
        }
      },
      orderBy: {
        expiresAt: 'desc'
      }
    });

    // Sum up all maxAds from active packages (deprecated - for backward compatibility)
    const totalMaxAds = activePackages.reduce((sum, pkg) => sum + (pkg.maxAds || 0), 0);
    
    // Calculate premium slots: total available - used (deprecated - for backward compatibility)
    const totalPremiumSlots = activePackages.reduce((sum, pkg) => sum + (pkg.premiumSlotsTotal || 0), 0);
    const usedPremiumSlots = activePackages.reduce((sum, pkg) => sum + (pkg.premiumSlotsUsed || 0), 0);
    const availablePremiumSlots = totalPremiumSlots - usedPremiumSlots;
    
    // Calculate ads allowed: total ads allowed - ads used (NEW SYSTEM)
    const totalAdsAllowed = activePackages.reduce((sum, pkg) => sum + (pkg.totalAdsAllowed || 0), 0);
    const adsUsed = activePackages.reduce((sum, pkg) => sum + (pkg.adsUsed || 0), 0);
    const adsRemaining = totalAdsAllowed - adsUsed;

    // Count extra ad slots purchased (active and not expired)
    const extraAdSlots = await prisma.extraAdSlot.findMany({
      where: {
        userId: req.user.id,
        status: 'paid',
        OR: [
          { expiresAt: null }, // Permanent extra slots
          { expiresAt: { gt: now } } // Extra slots that haven't expired
        ]
      }
    });
    const totalExtraSlots = extraAdSlots.reduce((sum, slot) => sum + slot.quantity, 0);

    // Count user's active ads (APPROVED status and not expired) - DEPRECATED: Now using adsUsed from business packages
    // This is kept for backward compatibility with legacy maxAds system
    const userActiveAdsCount = await prisma.ad.count({
      where: {
        userId: req.user.id,
        status: 'APPROVED',
        OR: [
          { expiresAt: null }, // Ads without expiration (legacy)
          { expiresAt: { gt: now } } // Ads that haven't expired yet
        ]
      }
    });

    const totalAllowedAds = totalMaxAds + totalExtraSlots;

    res.json({
      success: true,
      hasActivePackage: activePackages.length > 0,
      packages: activePackages,
      totalMaxAds: totalMaxAds, // Deprecated - for backward compatibility
      extraAdSlots: totalExtraSlots,
      totalAllowedAds: totalAllowedAds, // Deprecated - for backward compatibility
      adsUsed: userActiveAdsCount, // Deprecated - for backward compatibility (legacy system)
      remainingAds: Math.max(0, totalAllowedAds - userActiveAdsCount), // Deprecated - for backward compatibility
      // Premium slots information (deprecated - for backward compatibility)
      premiumSlotsTotal: totalPremiumSlots,
      premiumSlotsUsed: usedPremiumSlots,
      premiumSlotsAvailable: availablePremiumSlots,
      // Ads allowed information (NEW SYSTEM)
      totalAdsAllowed: totalAdsAllowed,
      adsUsed: adsUsed,
      adsRemaining: adsRemaining,
      // For backward compatibility, include the first package as 'package'
      package: activePackages.length > 0 ? {
        ...activePackages[0],
        adsUsed: adsUsed
      } : null
    });
  } catch (error) {
    console.error('Get business package status error:', error);
    res.status(500).json({ success: false, message: 'Failed to check package status' });
  }
});

// Create business package order
router.post('/order',
  authenticate,
  [
    body('packageType').isIn(['MAX_VISIBILITY', 'SELLER_PLUS', 'SELLER_PRIME']).withMessage('Invalid package type')
  ],
  async (req, res) => {
    try {
      console.log('📦 Business package order endpoint hit:', {
        method: req.method,
        url: req.url,
        userId: req.user?.id,
        body: req.body
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('❌ Validation errors:', errors.array());
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      if (!razorpay) {
        console.error('❌ Razorpay not initialized - cannot create order');
        return res.status(503).json({ 
          success: false, 
          message: 'Payment service not configured. Please contact administrator.' 
        });
      }

      const { packageType } = req.body;
      
      console.log('📦 Business package order request:', {
        packageType,
        userId: req.user.id,
        userEmail: req.user.email || 'N/A'
      });

      // Allow users to purchase multiple packages - they will stack/queue
      // No restriction on purchasing new packages when one is active

      // Get package settings
      let settings;
      try {
        settings = await getBusinessPackageSettings();
        console.log('📋 Business package settings loaded:', {
          hasPrices: !!settings.prices,
          hasDurations: !!settings.durations,
          hasMaxAds: !!settings.maxAds,
          packageType
        });
      } catch (settingsError) {
        console.error('❌ Error getting business package settings:', settingsError);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to load package settings. Please try again.',
          error: process.env.NODE_ENV === 'development' ? settingsError.message : undefined
        });
      }

      const price = settings?.prices?.[packageType];
      const duration = settings?.durations?.[packageType];
      const maxAds = settings?.maxAds?.[packageType] || 0;

      if (!price || !duration) {
        console.error('❌ Invalid package configuration:', {
          packageType,
          price,
          duration,
          settings: {
            prices: settings?.prices,
            durations: settings?.durations
          }
        });
        return res.status(400).json({ 
          success: false, 
          message: `Invalid package type "${packageType}" or package not configured. Price: ${price}, Duration: ${duration}` 
        });
      }

      const amount = Math.round(price * 100); // Convert to paise
      const MIN_RAZORPAY_AMOUNT = 100; // Minimum 1 INR in paise

      // Validate amount
      if (amount < MIN_RAZORPAY_AMOUNT) {
        console.error(`❌ Amount too small: ${amount} paise (minimum: ${MIN_RAZORPAY_AMOUNT} paise)`);
        return res.status(400).json({ 
          success: false, 
          message: `Amount too small. Minimum amount is ₹${MIN_RAZORPAY_AMOUNT / 100}` 
        });
      }

      // Generate short receipt (max 40 chars for Razorpay)
      const receipt = `BUS${packageType.slice(0, 3)}${req.user.id.slice(-8)}${Date.now().toString().slice(-8)}`.slice(0, 40);
      
      console.log('📦 Creating Razorpay order:', {
        amount,
        currency: 'INR',
        receipt,
        packageType,
        userId: req.user.id
      });

      // Create Razorpay order
      let razorpayOrder;
      try {
        razorpayOrder = await razorpay.orders.create({
          amount: amount,
          currency: 'INR',
          receipt: receipt,
          notes: {
            userId: req.user.id,
            type: 'BUSINESS_PACKAGE',
            packageType: packageType
          }
        });
        console.log('✅ Razorpay order created:', razorpayOrder.id);
      } catch (razorpayError) {
        console.error('❌ Razorpay order creation failed:', razorpayError);
        console.error('Razorpay error details:', {
          message: razorpayError.message,
          statusCode: razorpayError.statusCode,
          error: razorpayError.error
        });
        return res.status(500).json({ 
          success: false, 
          message: razorpayError.error?.description || razorpayError.message || 'Failed to create payment order. Please try again.',
          error: process.env.NODE_ENV === 'development' ? razorpayError.message : undefined
        });
      }

      // Create business package order in database
      let businessPackage;
      try {
        businessPackage = await prisma.businessPackage.create({
          data: {
            userId: req.user.id,
            packageType: packageType,
            amount: price,
            duration: duration,
            maxAds: maxAds, // Deprecated - for backward compatibility
            premiumSlotsTotal: maxAds, // Deprecated - for backward compatibility
            premiumSlotsUsed: 0, // Deprecated - for backward compatibility
            totalAdsAllowed: maxAds, // Total ads allowed with this package
            adsUsed: 0, // Start with 0 ads used
            razorpayOrderId: razorpayOrder.id,
            status: 'pending'
          }
        });
        console.log('✅ Business package order created in database:', businessPackage.id);
      } catch (dbError) {
        console.error('❌ Database error creating business package:', dbError);
        console.error('Database error details:', {
          message: dbError.message,
          code: dbError.code,
          meta: dbError.meta
        });
        
        // Try to cancel Razorpay order if database creation fails
        try {
          await razorpay.orders.cancel(razorpayOrder.id);
          console.log('✅ Cancelled Razorpay order due to database error');
        } catch (cancelError) {
          console.error('⚠️ Failed to cancel Razorpay order:', cancelError);
        }
        
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to create order in database. Please try again.',
          error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        });
      }

      // Ensure RAZORPAY_KEY_ID is available
      if (!process.env.RAZORPAY_KEY_ID) {
        console.error('❌ RAZORPAY_KEY_ID not found in environment variables');
        return res.status(500).json({ 
          success: false, 
          message: 'Payment configuration error. Please contact administrator.' 
        });
      }

      const response = {
        success: true,
        order: businessPackage,
        razorpayOrder: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          key: process.env.RAZORPAY_KEY_ID
        }
      };

      console.log('✅ Business package order created successfully:', {
        orderId: businessPackage.id,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount
      });

      res.json(response);
    } catch (error) {
      console.error('❌ Create business package order error:', error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        code: error.code
      });
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to create order. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Verify payment and activate business package
router.post('/verify',
  authenticate,
  [
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('paymentId').notEmpty().withMessage('Payment ID is required'),
    body('signature').notEmpty().withMessage('Signature is required')
  ],
  async (req, res) => {
    try {
      console.log('🔍 Business package payment verification request:', {
        userId: req.user?.id,
        orderId: req.body.orderId,
        paymentId: req.body.paymentId,
        hasSignature: !!req.body.signature
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('❌ Validation errors:', errors.array());
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      if (!process.env.RAZORPAY_KEY_SECRET) {
        console.error('❌ RAZORPAY_KEY_SECRET not configured');
        return res.status(500).json({ success: false, message: 'Payment service not configured' });
      }

      const { orderId, paymentId, signature } = req.body;

      // Clean and validate inputs
      const cleanOrderId = String(orderId).trim();
      const cleanPaymentId = String(paymentId).trim();
      const cleanSignature = String(signature).trim();

      // Verify payment signature
      const crypto = require('crypto');
      const signatureString = `${cleanOrderId}|${cleanPaymentId}`;
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(signatureString)
        .digest('hex');

      console.log('🔐 Signature verification:', {
        orderId: cleanOrderId,
        paymentId: cleanPaymentId,
        signatureString,
        receivedLength: cleanSignature.length,
        generatedLength: generatedSignature.length,
        match: generatedSignature === cleanSignature
      });

      if (generatedSignature !== cleanSignature) {
        console.error('❌ Invalid payment signature');
        console.error('   Expected:', generatedSignature.substring(0, 20) + '...');
        console.error('   Received:', cleanSignature.substring(0, 20) + '...');
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

      // Get business package order (use cleaned orderId)
      console.log('📋 Fetching business package order:', cleanOrderId);
      let businessPackage;
      try {
        businessPackage = await prisma.businessPackage.findFirst({
          where: { razorpayOrderId: cleanOrderId }
        });
      } catch (dbError) {
        console.error('❌ Database error fetching business package:', dbError);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to verify order. Please try again.',
          error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        });
      }

      if (!businessPackage) {
        console.error('❌ Business package order not found:', cleanOrderId);
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      if (businessPackage.userId !== req.user.id) {
        console.error('❌ Unauthorized access attempt:', {
          orderUserId: businessPackage.userId,
          requestUserId: req.user.id
        });
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      if (businessPackage.status === 'paid') {
        console.log('ℹ️ Payment already verified for order:', cleanOrderId);
        return res.json({ success: true, message: 'Payment already verified', package: businessPackage });
      }

      // Calculate expiration date
      const startDate = new Date();
      const expiresAt = new Date(startDate);
      expiresAt.setDate(expiresAt.getDate() + businessPackage.duration);

      // Update business package
      console.log('💳 Updating business package:', {
        packageId: businessPackage.id,
        paymentId: cleanPaymentId,
        startDate,
        expiresAt
      });

      let updatedPackage;
      try {
        updatedPackage = await prisma.businessPackage.update({
          where: { id: businessPackage.id },
          data: {
            razorpayPaymentId: cleanPaymentId,
            status: 'paid',
            startDate,
            expiresAt
          }
        });
        console.log('✅ Business package updated successfully:', updatedPackage.id);
      } catch (updateError) {
        console.error('❌ Database error updating business package:', updateError);
        console.error('Update error details:', {
          message: updateError.message,
          code: updateError.code,
          meta: updateError.meta
        });
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to activate package. Please contact support.',
          error: process.env.NODE_ENV === 'development' ? updateError.message : undefined
        });
      }

      // Get package name for notification
      const packageNames = {
        MAX_VISIBILITY: 'Max Visibility',
        SELLER_PLUS: 'Seller Plus',
        SELLER_PRIME: 'Seller Prime'
      };

      // Create notification
      const notification = await prisma.notification.create({
        data: {
          userId: req.user.id,
          title: 'Business Package Activated',
          message: `Your ${packageNames[businessPackage.packageType] || 'Business'} Package has been activated for ${businessPackage.duration} days. It expires on ${expiresAt.toLocaleDateString()}.`,
          type: 'business_package_activated',
          link: '/profile'
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

      res.json({ 
        success: true, 
        message: 'Business package activated successfully',
        package: updatedPackage
      });
    } catch (error) {
      console.error('❌ Verify business package payment error:', error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        code: error.code
      });
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Payment verification failed. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get user's business package orders
router.get('/orders', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      prisma.businessPackage.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.businessPackage.count({ where: { userId: req.user.id } })
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
    console.error('Get business package orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

// Purchase extra ad slots
router.post('/extra-slots/order',
  authenticate,
  [
    body('quantity').isInt({ min: 1, max: 50 }).withMessage('Quantity must be between 1 and 50')
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

      const { quantity } = req.body;
      const pricePerSlot = 99; // ₹99 per extra ad slot (can be made configurable)
      const totalAmount = pricePerSlot * quantity;

      // Create Razorpay order
      const receipt = `EXTR${req.user.id.slice(-8)}${Date.now().toString().slice(-8)}`.slice(0, 40);
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100), // Convert to paise
        currency: 'INR',
        receipt: receipt,
        notes: {
          userId: req.user.id,
          type: 'EXTRA_AD_SLOTS',
          quantity: quantity.toString()
        }
      });

      // Create extra ad slot order in database
      const extraAdSlot = await prisma.extraAdSlot.create({
        data: {
          userId: req.user.id,
          quantity: quantity,
          amount: pricePerSlot,
          totalAmount: totalAmount,
          razorpayOrderId: razorpayOrder.id,
          status: 'pending'
        }
      });

      res.json({
        success: true,
        order: extraAdSlot,
        razorpayOrder: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          key: process.env.RAZORPAY_KEY_ID
        }
      });
    } catch (error) {
      console.error('Create extra ad slots order error:', error);
      res.status(500).json({ success: false, message: 'Failed to create order' });
    }
  }
);

// Verify extra ad slots payment
router.post('/extra-slots/verify',
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

      // Get extra ad slot order
      const extraAdSlot = await prisma.extraAdSlot.findFirst({
        where: { razorpayOrderId: orderId }
      });

      if (!extraAdSlot) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      if (extraAdSlot.userId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      if (extraAdSlot.status === 'paid') {
        return res.json({ 
          success: true, 
          message: 'Payment already verified',
          order: extraAdSlot
        });
      }

      // Update order status
      const updatedOrder = await prisma.extraAdSlot.update({
        where: { id: extraAdSlot.id },
        data: {
          status: 'paid',
          razorpayPaymentId: paymentId
        }
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: req.user.id,
          title: 'Extra Ad Slots Purchased',
          message: `You have successfully purchased ${extraAdSlot.quantity} extra ad slot${extraAdSlot.quantity > 1 ? 's' : ''}.`,
          type: 'extra_slots_purchased',
          link: '/my-ads'
        }
      });

      res.json({ 
        success: true, 
        message: 'Extra ad slots purchased successfully',
        order: updatedOrder
      });
    } catch (error) {
      console.error('Verify extra ad slots payment error:', error);
      res.status(500).json({ success: false, message: 'Payment verification failed' });
    }
  }
);

module.exports = router;
