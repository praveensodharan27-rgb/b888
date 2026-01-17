// Payment Activation Service
// Handles service activation after payment verification
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Save payment record to database
 */
const savePaymentRecord = async (paymentData) => {
  try {
    const {
      paymentId,
      orderId,
      amount,
      purpose, // 'ad_promotion', 'membership', 'business_package', 'ad_posting'
      referenceId, // adId, packageId, etc.
      userId,
      currency = 'INR',
      status = 'paid',
      metadata = {}
    } = paymentData;

    // Check for duplicate payment (idempotency) - Check both paymentId and orderId+paymentId combination
    const existingPayment = await prisma.paymentRecord.findFirst({
      where: {
        OR: [
          { paymentId: paymentId },
          { 
            AND: [
              { orderId: orderId },
              { paymentId: paymentId }
            ]
          }
        ]
      }
    });

    if (existingPayment) {
      console.log(`⚠️  Duplicate payment detected: ${paymentId} for order ${orderId}`);
      return {
        success: true,
        isDuplicate: true,
        payment: existingPayment,
        message: 'Payment already processed'
      };
    }

    // Create payment record
    const payment = await prisma.paymentRecord.create({
      data: {
        paymentId,
        orderId,
        amount,
        purpose,
        referenceId,
        userId,
        currency,
        status,
        metadata: JSON.stringify(metadata),
        paidAt: new Date()
      }
    });

    console.log(`✅ Payment record saved: ${paymentId} (${purpose})`);
    return {
      success: true,
      isDuplicate: false,
      payment
    };
  } catch (error) {
    console.error('❌ Error saving payment record:', error);
    throw error;
  }
};

/**
 * Validate adId exists and belongs to user
 */
const validateAdId = async (adId, userId) => {
  if (!adId) {
    return { valid: true }; // adId is optional for some payment types
  }

  try {
    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      select: { id: true, userId: true, status: true }
    });

    if (!ad) {
      return {
        valid: false,
        error: 'Ad not found'
      };
    }

    if (ad.userId !== userId) {
      return {
        valid: false,
        error: 'Ad does not belong to user'
      };
    }

    return { valid: true, ad };
  } catch (error) {
    console.error('❌ Error validating adId:', error);
    return {
      valid: false,
      error: 'Error validating ad'
    };
  }
};

/**
 * Activate ad promotion (premium features)
 */
const activateAdPromotion = async (adId, premiumType, paymentId) => {
  try {
    // Get premium settings
    const settingsRecord = await prisma.premiumSettings.findUnique({
      where: { key: 'premium_settings' }
    });

    let PREMIUM_DURATIONS = {
      TOP: 7, // days
      FEATURED: 7,
      BUMP_UP: 7
    };

    if (settingsRecord && settingsRecord.value) {
      try {
        const parsed = JSON.parse(settingsRecord.value);
        PREMIUM_DURATIONS = parsed.durations || PREMIUM_DURATIONS;
      } catch (e) {
        console.error('Error parsing premium durations:', e);
      }
    }

    const duration = PREMIUM_DURATIONS[premiumType] || 7;
    const expiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);

    // Update ad with premium features
    const updateData = {
      isPremium: true,
      premiumType: premiumType,
      premiumExpiresAt: expiresAt
    };

    if (premiumType === 'FEATURED') {
      updateData.featuredAt = new Date();
    } else if (premiumType === 'BUMP_UP') {
      updateData.bumpedAt = new Date();
    } else if (premiumType === 'TOP') {
      updateData.topAt = new Date();
    }

    const updatedAd = await prisma.ad.update({
      where: { id: adId },
      data: updateData
    });

    console.log(`✅ Ad promotion activated: ${adId} (${premiumType}) until ${expiresAt}`);
    
    return {
      success: true,
      ad: updatedAd,
      expiresAt
    };
  } catch (error) {
    console.error('❌ Error activating ad promotion:', error);
    throw error;
  }
};

/**
 * Activate membership
 */
const activateMembership = async (userId, membershipType, paymentId) => {
  try {
    // Get membership duration (default 30 days)
    const duration = 30; // days
    const expiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);

    // Update user membership
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        membershipActive: true,
        membershipType: membershipType || 'PREMIUM',
        membershipExpiresAt: expiresAt
      }
    });

    console.log(`✅ Membership activated: ${userId} until ${expiresAt}`);
    
    return {
      success: true,
      user: updatedUser,
      expiresAt
    };
  } catch (error) {
    console.error('❌ Error activating membership:', error);
    throw error;
  }
};

/**
 * Activate business package
 */
const activateBusinessPackage = async (packageId, userId, paymentId) => {
  try {
    // Get package details
    const package = await prisma.businessPackage.findUnique({
      where: { id: packageId }
    });

    if (!package) {
      throw new Error('Business package not found');
    }

    // Calculate expiry (default 30 days)
    const duration = package.duration || 30; // days
    const expiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);

    // Update package - set all activation fields including status and payment ID
    const updateData = {
      status: 'paid',
      isActive: true,
      activatedAt: new Date(),
      expiresAt: expiresAt,
      startDate: new Date()
    };

    // Set payment ID if provided
    if (paymentId) {
      updateData.razorpayPaymentId = paymentId;
    }

    // Only set userId if it's not already set (should already be set during creation)
    if (!package.userId) {
      updateData.userId = userId;
    }

    const updatedPackage = await prisma.businessPackage.update({
      where: { id: packageId },
      data: updateData
    });

    console.log(`✅ Business package activated: ${packageId} until ${expiresAt}`);
    
    return {
      success: true,
      package: updatedPackage,
      expiresAt
    };
  } catch (error) {
    console.error('❌ Error activating business package:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      packageId,
      userId
    });
    throw error;
  }
};

/**
 * Main activation function - routes to appropriate activation based on purpose
 */
const activateService = async (paymentData) => {
  try {
    const {
      purpose,
      referenceId, // adId, packageId, etc.
      userId,
      paymentId,
      orderId,
      metadata = {}
    } = paymentData;

    let activationResult = {
      success: false,
      serviceActivated: false,
      activationDetails: null
    };

    // Validate adId if provided
    if (purpose === 'ad_promotion' && referenceId) {
      const adValidation = await validateAdId(referenceId, userId);
      if (!adValidation.valid) {
        throw new Error(adValidation.error || 'Invalid ad');
      }
    }

    // Activate service based on purpose
    switch (purpose) {
      case 'ad_promotion':
        if (!referenceId) {
          throw new Error('adId is required for ad promotion');
        }
        const premiumType = metadata.premiumType || 'FEATURED';
        activationResult = await activateAdPromotion(referenceId, premiumType, paymentId);
        activationResult.serviceActivated = true;
        activationResult.activationDetails = {
          type: 'ad_promotion',
          adId: referenceId,
          premiumType: premiumType,
          expiresAt: activationResult.expiresAt
        };
        break;

      case 'membership':
        const membershipType = metadata.membershipType || 'PREMIUM';
        activationResult = await activateMembership(userId, membershipType, paymentId);
        activationResult.serviceActivated = true;
        activationResult.activationDetails = {
          type: 'membership',
          membershipType: membershipType,
          expiresAt: activationResult.expiresAt
        };
        break;

      case 'business_package':
        if (!referenceId) {
          throw new Error('packageId is required for business package');
        }
        console.log('🔄 Activating business package:', { packageId: referenceId, userId, paymentId });
        try {
          activationResult = await activateBusinessPackage(referenceId, userId, paymentId);
          activationResult.serviceActivated = true;
          activationResult.activationDetails = {
            type: 'business_package',
            packageId: referenceId,
            expiresAt: activationResult.expiresAt
          };
          console.log('✅ Business package activation successful:', {
            packageId: referenceId,
            expiresAt: activationResult.expiresAt
          });
        } catch (bpError) {
          console.error('❌ Business package activation error:', bpError);
          throw new Error(`Failed to activate business package: ${bpError.message}`);
        }
        break;

      case 'ad_posting':
        // Ad posting doesn't need activation - ad is created after payment
        activationResult = {
          success: true,
          serviceActivated: true,
          activationDetails: {
            type: 'ad_posting',
            message: 'Ad can now be created'
          }
        };
        break;

      default:
        console.warn(`⚠️  Unknown payment purpose: ${purpose}`);
        activationResult = {
          success: true,
          serviceActivated: false,
          activationDetails: {
            type: 'unknown',
            message: 'No activation required for this purpose'
          }
        };
    }

    return activationResult;
  } catch (error) {
    console.error('❌ Error activating service:', error);
    throw error;
  }
};

/**
 * Complete payment processing: Save record + Activate service
 */
const processPayment = async (paymentData) => {
  try {
    const { skipActivation = false } = paymentData;
    
    // 1. Save payment record (with duplicate check)
    const paymentRecord = await savePaymentRecord(paymentData);

    // If duplicate, return existing activation status
    if (paymentRecord.isDuplicate) {
      // Check if service was already activated
      const existingActivation = await checkServiceActivationStatus(
        paymentData.purpose,
        paymentData.referenceId,
        paymentData.userId
      );

      return {
        success: true,
        isDuplicate: true,
        payment: paymentRecord.payment,
        activation: {
          serviceActivated: existingActivation.activated || false,
          activationDetails: {
            type: paymentData.purpose,
            ...existingActivation
          }
        }
      };
    }

    // 2. Activate service (only if not skipping activation)
    let activation;
    if (skipActivation) {
      // Skip activation - will be done via webhook
      console.log('⏸️  Skipping activation - will be processed via webhook');
      activation = {
        success: true,
        serviceActivated: false,
        message: 'Activation will be processed via webhook',
        pendingActivation: true
      };
    } else {
      // Activate service now (webhook flow)
      try {
        activation = await activateService(paymentData);
        console.log('✅ Service activation result:', {
          success: activation.success,
          serviceActivated: activation.serviceActivated,
          purpose: paymentData.purpose,
          referenceId: paymentData.referenceId
        });
      } catch (activationError) {
        console.error('❌ Service activation failed:', activationError);
        console.error('Activation error details:', {
          message: activationError.message,
          stack: activationError.stack,
          purpose: paymentData.purpose,
          referenceId: paymentData.referenceId,
          userId: paymentData.userId
        });
        
        // Return partial success - payment saved but activation failed
        return {
          success: true,
          isDuplicate: false,
          payment: paymentRecord.payment,
          activation: {
            success: false,
            serviceActivated: false,
            activationDetails: {
              type: paymentData.purpose,
              error: activationError.message
            }
          },
          activationError: activationError.message
        };
      }
    }

    return {
      success: true,
      isDuplicate: false,
      payment: paymentRecord.payment,
      activation
    };
  } catch (error) {
    console.error('❌ Error processing payment:', error);
    throw error;
  }
};

/**
 * Check service activation status
 */
const checkServiceActivationStatus = async (purpose, referenceId, userId) => {
  try {
    switch (purpose) {
      case 'ad_promotion':
        if (!referenceId) return { activated: false };
        const ad = await prisma.ad.findUnique({
          where: { id: referenceId },
          select: { isPremium: true, premiumType: true, premiumExpiresAt: true }
        });
        return {
          activated: ad?.isPremium === true,
          expiresAt: ad?.premiumExpiresAt,
          premiumType: ad?.premiumType
        };

      case 'membership':
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { membershipActive: true, membershipExpiresAt: true, membershipType: true }
        });
        return {
          activated: user?.membershipActive === true,
          expiresAt: user?.membershipExpiresAt,
          membershipType: user?.membershipType
        };

      case 'business_package':
        if (!referenceId) return { activated: false };
        const package = await prisma.businessPackage.findUnique({
          where: { id: referenceId },
          select: { isActive: true, expiresAt: true }
        });
        return {
          activated: package?.isActive === true,
          expiresAt: package?.expiresAt
        };

      default:
        return { activated: false };
    }
  } catch (error) {
    console.error('❌ Error checking activation status:', error);
    return { activated: false, error: error.message };
  }
};

module.exports = {
  savePaymentRecord,
  validateAdId,
  activateAdPromotion,
  activateMembership,
  activateBusinessPackage,
  activateService,
  processPayment,
  checkServiceActivationStatus
};

