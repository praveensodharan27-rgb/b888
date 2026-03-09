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
    
    // Get ALL active business packages (not just one, accept both 'paid' and 'verified')
    const activePackages = await prisma.businessPackage.findMany({
      where: {
        userId: req.user.id,
        status: { in: ['paid', 'verified'] },
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
      // Default maxAds if not in settings (fallback to defaults)
      const defaultMaxAds = {
        MAX_VISIBILITY: 5,
        SELLER_PLUS: 7,
        SELLER_PRIME: 12
      };
      const maxAds = settings?.maxAds?.[packageType] || defaultMaxAds[packageType] || 0;

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

      // Validate maxAds is set (should not be 0)
      if (maxAds === 0) {
        console.error('❌ maxAds is 0 for package:', {
          packageType,
          maxAds,
          settingsMaxAds: settings?.maxAds
        });
        return res.status(400).json({ 
          success: false, 
          message: `Package configuration error: maxAds is 0. Please contact support.` 
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
              type: 'BUSINESS_PACKAGE',
              order_type: 'business_package',
              purpose: 'business_package',
              packageType: packageType,
              packageId: businessPackage.id
            }),
            isTestOrder: process.env.NODE_ENV !== 'production'
          }
        });
        console.log('✅ PaymentOrder record created for business package:', razorpayOrder.id);
      } catch (paymentOrderError) {
        console.error('❌ Error creating PaymentOrder record:', paymentOrderError);
        // Don't fail the request, but log the error
        // Payment processor can still work with BusinessPackage record
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

      // Use central payment processor
      const { processPaymentVerification } = require('../services/paymentProcessor');
      
      // Convert amount to paise (businessPackage.amount is in INR, but payment processor expects paise)
      const amountInPaise = Math.round((businessPackage.amount || businessPackage.price || 0) * 100);
      
      let result;
      try {
        result = await processPaymentVerification({
          orderId: cleanOrderId,
          paymentId: cleanPaymentId,
          signature: cleanSignature,
          userId: req.user.id,
          amount: amountInPaise,
          orderType: 'business_package'
        });
        console.log('✅ Payment verification result:', {
          success: result.success,
          serviceActivated: result.activation?.serviceActivated,
          state: result.state
        });
      } catch (paymentError) {
        console.error('❌ Payment verification error:', paymentError);
        console.error('Payment error details:', {
          message: paymentError.message,
          stack: paymentError.stack
        });
        return res.status(500).json({ 
          success: false, 
          message: paymentError.message || 'Payment verification failed. Please contact support.',
          error: process.env.NODE_ENV === 'development' ? paymentError.message : undefined
        });
      }

      // Ensure activation was successful
      const serviceActivated = result.activation?.serviceActivated || false;
      
      // Get updated package (activation service already updated it)
      let updatedPackage;
      try {
        updatedPackage = await prisma.businessPackage.findUnique({
          where: { id: businessPackage.id }
        });
        
        if (!updatedPackage) {
          console.error('❌ Business package not found after activation:', businessPackage.id);
          return res.status(404).json({ 
            success: false, 
            message: 'Business package not found. Please contact support.'
          });
        }
        
        console.log('✅ Business package activation confirmed:', {
          id: updatedPackage.id,
          status: updatedPackage.status,
          expiresAt: updatedPackage.expiresAt
        });
      } catch (fetchError) {
        console.error('❌ Database error fetching business package:', fetchError);
        console.error('Fetch error details:', {
          message: fetchError.message,
          code: fetchError.code,
          meta: fetchError.meta,
          businessPackageId: businessPackage.id
        });
        
        // If activation succeeded but we can't fetch the package, return success with warning
        if (serviceActivated) {
          console.warn('⚠️ Activation succeeded but package fetch failed - returning success');
          // Continue with response using original businessPackage data
          updatedPackage = businessPackage;
        } else {
          return res.status(500).json({ 
            success: false, 
            message: 'Payment verified but failed to activate package. Please contact support with order ID: ' + cleanOrderId,
            error: process.env.NODE_ENV === 'development' ? fetchError.message : undefined,
            paymentVerified: true,
            serviceActivated: false,
            orderId: cleanOrderId
          });
        }
      }

      // Save to UserBusinessPackage table for purchase history
      try {
        const now = new Date();
        const expiresAt = updatedPackage.expiresAt || (updatedPackage.startDate ? new Date(new Date(updatedPackage.startDate).getTime() + updatedPackage.duration * 24 * 60 * 60 * 1000) : null);
        
        // Determine status: active, exhausted, or expired
        let packageStatus = 'active';
        if (expiresAt && expiresAt < now) {
          packageStatus = 'expired';
        } else if (updatedPackage.adsUsed >= updatedPackage.totalAdsAllowed) {
          packageStatus = 'exhausted';
        }

        // Create UserBusinessPackage record (never overwrite - always create new)
        const userBusinessPackage = await prisma.userBusinessPackage.create({
          data: {
            userId: req.user.id,
            packageType: updatedPackage.packageType,
            amount: updatedPackage.amount,
            purchaseTime: updatedPackage.createdAt || now,
            expiresAt: expiresAt,
            totalAds: updatedPackage.totalAdsAllowed || 0,
            usedAds: updatedPackage.adsUsed || 0,
            allowedCategories: [], // Can be populated from package settings if needed
            razorpayOrderId: updatedPackage.razorpayOrderId,
            razorpayPaymentId: updatedPackage.razorpayPaymentId,
            status: packageStatus
          }
        });
        
        console.log('✅ Saved to UserBusinessPackage table:', {
          id: userBusinessPackage.id,
          packageType: userBusinessPackage.packageType,
          status: userBusinessPackage.status,
          totalAds: userBusinessPackage.totalAds,
          usedAds: userBusinessPackage.usedAds
        });
      } catch (userPkgError) {
        console.error('❌ Error saving to UserBusinessPackage table:', userPkgError);
        // Don't fail the request if this fails - it's for history tracking
        console.warn('⚠️ Continuing despite UserBusinessPackage save error');
      }

      // Get package name for notification
      const packageNames = {
        MAX_VISIBILITY: 'Max Visibility',
        SELLER_PLUS: 'Seller Plus',
        SELLER_PRIME: 'Seller Prime'
      };

      // Create notification
      const expiresAt = updatedPackage.expiresAt || result.activation?.activationDetails?.expiresAt;
      const notification = await prisma.notification.create({
        data: {
          userId: req.user.id,
          title: 'Business Package Activated',
          message: `Your ${packageNames[businessPackage.packageType] || 'Business'} Package has been activated for ${businessPackage.duration} days.${expiresAt ? ` It expires on ${new Date(expiresAt).toLocaleDateString()}.` : ''}`,
          type: 'business_package_activated',
          link: '/profile'
        }
      });

      // Emit real-time notification via Socket.IO
      const { emitNotification, emitAdQuotaUpdate } = require('../socket/socket');
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
        const { addNotificationToQueue } = require('../queues/notificationQueue');
        const user = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { id: true, name: true, email: true, phone: true }
        });
        if (user) {
          await addNotificationToQueue({
            type: 'business_package_activated',
            data: {
              user,
              businessPackage: updatedPackage,
              order: {
                id: updatedPackage.id,
                amount: updatedPackage.amount || updatedPackage.price || businessPackage.amount,
                paymentMethod: 'Razorpay',
                invoiceId: updatedPackage.id
              }
            }
          });
          console.log('📧 Business package notification queued for user', req.user.id);
        }
      } catch (notificationError) {
        console.error('⚠️ Failed to queue business package notification:', notificationError);
      }

      // Emit real-time quota update after package purchase
      try {
        const { checkAndResetUserQuota } = require('../services/monthlyQuotaReset');
        await checkAndResetUserQuota(req.user.id);
        
        // Get updated quota
        const updatedUser = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: {
            freeAdsRemaining: true,
            freeAdsUsedThisMonth: true,
            lastFreeAdsResetDate: true
          }
        });

        const now = new Date();
        // Get ALL purchased packages (active and exhausted) for complete display
        const allBusinessPackages = await prisma.businessPackage.findMany({
          where: {
            userId: req.user.id,
            status: { in: ['paid', 'verified'] }
          },
          select: {
            id: true,
            packageType: true,
            totalAdsAllowed: true,
            adsUsed: true,
            createdAt: true,
            expiresAt: true
          },
          orderBy: { createdAt: 'asc' }
        });
        
        // Separate active and exhausted packages
        const activeBusinessPackages = allBusinessPackages.filter(pkg => pkg.expiresAt > now);

        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        nextMonth.setHours(0, 0, 0, 0);

        const packageNames = {
          MAX_VISIBILITY: 'Max Visibility',
          SELLER_PLUS: 'Seller Plus',
          SELLER_PRIME: 'Seller Prime'
        };

        const quotaData = {
          monthlyFreeAds: {
            total: 2,
            used: updatedUser?.freeAdsUsedThisMonth || 0,
            remaining: updatedUser?.freeAdsRemaining || 0,
            resetAt: nextMonth.toISOString()
          },
          packages: allBusinessPackages.map(pkg => {
            const remaining = (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0);
            const isExpired = pkg.expiresAt <= now;
            const isExhausted = remaining === 0 && !isExpired;
            return {
              packageId: pkg.id,
              packageName: `${packageNames[pkg.packageType] || pkg.packageType} Package`,
              packageType: pkg.packageType,
              totalAds: pkg.totalAdsAllowed || 0,
              usedAds: pkg.adsUsed || 0,
              adsRemaining: remaining,
              isExhausted: isExhausted,
              isExpired: isExpired,
              status: isExpired ? 'EXPIRED' : (isExhausted ? 'EXHAUSTED' : 'ACTIVE'),
              purchasedAt: pkg.createdAt,
              expiresAt: pkg.expiresAt
            };
          })
        };

        // Emit quota update via socket
        console.log('📡 Attempting to emit quota update via socket...', {
          userId: req.user.id,
          socketFunctionAvailable: typeof emitAdQuotaUpdate === 'function'
        });
        
        if (typeof emitAdQuotaUpdate === 'function') {
          emitAdQuotaUpdate(req.user.id, quotaData);
          console.log('✅ Emitted real-time quota update after package purchase:', {
            userId: req.user.id,
            freeAds: quotaData.monthlyFreeAds?.remaining || 0,
            packagesCount: quotaData.packages?.length || 0,
            activePackages: quotaData.packages?.filter((p) => p.status === 'ACTIVE').length || 0,
            exhaustedPackages: quotaData.packages?.filter((p) => p.status === 'EXHAUSTED').length || 0,
            packages: quotaData.packages?.map((p) => ({
              name: p.packageName,
              remaining: p.adsRemaining,
              status: p.status
            }))
          });
        } else {
          console.error('❌ emitAdQuotaUpdate function not available!');
        }
      } catch (socketError) {
        console.error('⚠️ Error emitting quota update after purchase:', socketError);
        console.error('Socket error details:', {
          message: socketError.message,
          stack: socketError.stack
        });
        // Don't fail the request if socket emit fails, but log it
      }

      // ✅ Return comprehensive response with activation confirmation
      const activationConfirmed = result.activation?.serviceActivated || false;
      const paymentVerified = result.success !== false;
      
      res.json({ 
        success: true,
        paymentVerified: paymentVerified,
        activationConfirmed: activationConfirmed,
        message: activationConfirmed 
          ? 'Payment successful and package activated' 
          : paymentVerified 
            ? 'Payment successful but activation pending' 
            : 'Payment verified',
        isDuplicate: result.isDuplicate || false,
        serviceActivated: activationConfirmed,
        activationDetails: result.activation?.activationDetails || null,
        state: result.state || (activationConfirmed ? 'activated' : 'verified'),
        payment: {
          paymentId: cleanPaymentId,
          orderId: cleanOrderId,
          amount: businessPackage.price,
          status: 'paid'
        },
        package: {
          id: updatedPackage.id,
          packageType: updatedPackage.packageType,
          status: updatedPackage.status,
          isActive: updatedPackage.isActive,
          expiresAt: updatedPackage.expiresAt,
          activatedAt: updatedPackage.activatedAt
        }
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
