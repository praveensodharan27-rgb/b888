// Central Payment Processor
// Handles: Verify → Save Payment → Activate Service
// Used by: All payment verification endpoints + Webhooks

const { PrismaClient } = require('@prisma/client');
const { processPayment, checkServiceActivationStatus } = require('./paymentActivation');
const crypto = require('crypto');

const prisma = new PrismaClient();

/**
 * Payment States
 */
const PAYMENT_STATES = {
  CREATED: 'created',
  PAID: 'paid',
  VERIFIED: 'verified',
  ACTIVATED: 'activated',
  REFUNDED: 'refunded',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * Verify payment signature
 */
const verifySignature = (orderId, paymentId, signature, secret) => {
  try {
    const signatureString = `${orderId}|${paymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(signatureString)
      .digest('hex');
    return generatedSignature === signature;
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
};

/**
 * Get payment purpose from order notes/metadata
 */
const getPaymentPurpose = async (orderId, orderType = null) => {
  // Try to find order in different tables
  try {
    // Check PaymentOrder
    const paymentOrder = await prisma.paymentOrder.findUnique({
      where: { orderId },
      select: { notes: true }
    });

    if (paymentOrder?.notes) {
      try {
        const notes = JSON.parse(paymentOrder.notes);
        if (notes.purpose) return notes.purpose;
        if (notes.order_type) {
          const typeMap = {
            'premium': 'ad_promotion',
            'ad_posting': 'ad_posting',
            'business_package': 'business_package',
            'membership': 'membership'
          };
          return typeMap[notes.order_type] || 'general';
        }
      } catch (e) {
        // Ignore parse error
      }
    }

    // Check PremiumOrder
    const premiumOrder = await prisma.premiumOrder.findFirst({
      where: { razorpayOrderId: orderId },
      select: { adId: true, type: true }
    });
    if (premiumOrder) {
      return 'ad_promotion';
    }

    // Check AdPostingOrder
    const adPostingOrder = await prisma.adPostingOrder.findFirst({
      where: { razorpayOrderId: orderId },
      select: { adId: true }
    });
    if (adPostingOrder) {
      return 'ad_posting';
    }

    // Check BusinessPackage
    const businessPackage = await prisma.businessPackage.findFirst({
      where: { razorpayOrderId: orderId },
      select: { id: true }
    });
    if (businessPackage) {
      return 'business_package';
    }

    // Use provided orderType
    if (orderType) {
      const typeMap = {
        'premium': 'ad_promotion',
        'ad_posting': 'ad_posting',
        'business_package': 'business_package',
        'membership': 'membership'
      };
      return typeMap[orderType] || 'general';
    }

    return 'general';
  } catch (error) {
    console.error('❌ Error getting payment purpose:', error);
    return 'general';
  }
};

/**
 * Get reference ID (adId, packageId, etc.) from order
 */
const getReferenceId = async (orderId, purpose) => {
  try {
    switch (purpose) {
      case 'ad_promotion':
        const premiumOrder = await prisma.premiumOrder.findFirst({
          where: { razorpayOrderId: orderId },
          select: { adId: true }
        });
        return premiumOrder?.adId || null;

      case 'ad_posting':
        const adPostingOrder = await prisma.adPostingOrder.findFirst({
          where: { razorpayOrderId: orderId },
          select: { adId: true }
        });
        return adPostingOrder?.adId || null;

      case 'business_package':
        const businessPackage = await prisma.businessPackage.findFirst({
          where: { razorpayOrderId: orderId },
          select: { id: true }
        });
        return businessPackage?.id || null;

      default:
        return null;
    }
  } catch (error) {
    console.error('❌ Error getting reference ID:', error);
    return null;
  }
};

/**
 * Get payment metadata from order
 */
const getPaymentMetadata = async (orderId, purpose) => {
  try {
    const metadata = {};

    switch (purpose) {
      case 'ad_promotion':
        const premiumOrder = await prisma.premiumOrder.findFirst({
          where: { razorpayOrderId: orderId },
          select: { type: true, id: true }
        });
        if (premiumOrder) {
          metadata.premiumType = premiumOrder.type;
          metadata.orderId = premiumOrder.id;
        }
        break;

      case 'business_package':
        const businessPackage = await prisma.businessPackage.findFirst({
          where: { razorpayOrderId: orderId },
          select: { packageType: true, duration: true }
        });
        if (businessPackage) {
          metadata.packageType = businessPackage.packageType;
          metadata.duration = businessPackage.duration;
        }
        break;

      case 'ad_posting':
        const adPostingOrder = await prisma.adPostingOrder.findFirst({
          where: { razorpayOrderId: orderId },
          select: { id: true, adData: true }
        });
        if (adPostingOrder) {
          metadata.orderId = adPostingOrder.id;
          metadata.hasAdData = !!adPostingOrder.adData;
        }
        break;
    }

    return metadata;
  } catch (error) {
    console.error('❌ Error getting payment metadata:', error);
    return {};
  }
};

/**
 * Update order status in database
 */
const updateOrderStatus = async (orderId, status, paymentId = null, purpose = null) => {
  try {
    // Update PaymentOrder
    const paymentOrder = await prisma.paymentOrder.findUnique({
      where: { orderId }
    });

    if (paymentOrder) {
      await prisma.paymentOrder.update({
        where: { orderId },
        data: {
          status: status,
          paymentId: paymentId || paymentOrder.paymentId,
          paidAt: status === PAYMENT_STATES.PAID || status === PAYMENT_STATES.VERIFIED || status === PAYMENT_STATES.ACTIVATED
            ? new Date()
            : paymentOrder.paidAt
        }
      });
    }

    // Update specific order tables based on purpose
    if (purpose === 'ad_promotion') {
      const premiumOrder = await prisma.premiumOrder.findFirst({
        where: { razorpayOrderId: orderId }
      });
      if (premiumOrder) {
        await prisma.premiumOrder.update({
          where: { id: premiumOrder.id },
          data: {
            status: status === PAYMENT_STATES.ACTIVATED ? 'paid' : status,
            razorpayPaymentId: paymentId || premiumOrder.razorpayPaymentId
          }
        });
      }
    } else if (purpose === 'ad_posting') {
      const adPostingOrder = await prisma.adPostingOrder.findFirst({
        where: { razorpayOrderId: orderId }
      });
      if (adPostingOrder) {
        // Map payment states to adPostingOrder status
        let adPostingStatus = status;
        if (status === PAYMENT_STATES.ACTIVATED || status === PAYMENT_STATES.VERIFIED || status === PAYMENT_STATES.PAID) {
          adPostingStatus = 'paid'; // AdPostingOrder uses 'paid' for all success states
        } else if (status === PAYMENT_STATES.FAILED) {
          adPostingStatus = 'failed';
        }
        
        await prisma.adPostingOrder.update({
          where: { id: adPostingOrder.id },
          data: {
            status: adPostingStatus,
            razorpayPaymentId: paymentId || adPostingOrder.razorpayPaymentId
          }
        });
        console.log(`✅ Updated AdPostingOrder ${adPostingOrder.id} status to: ${adPostingStatus}`);
      } else {
        console.warn(`⚠️ AdPostingOrder not found for orderId: ${orderId}`);
      }
    } else if (purpose === 'business_package') {
      const businessPackage = await prisma.businessPackage.findFirst({
        where: { razorpayOrderId: orderId }
      });
      if (businessPackage) {
        await prisma.businessPackage.update({
          where: { id: businessPackage.id },
          data: {
            status: status === PAYMENT_STATES.ACTIVATED ? 'paid' : status,
            razorpayPaymentId: paymentId || businessPackage.razorpayPaymentId
          }
        });
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    return false;
  }
};

/**
 * Central Payment Processor
 * Main function: Verify → Save Payment → (Optionally) Activate Service
 * 
 * @param {boolean} skipActivation - If true, only verify and save payment, don't activate service
 */
const processPaymentVerification = async ({
  orderId,
  paymentId,
  signature,
  userId,
  amount = null,
  orderType = null,
  skipSignatureVerification = false,
  skipActivation = false // NEW: Skip activation (for verify endpoint)
}) => {
  try {
    console.log('🔄 Processing payment verification:', { orderId, paymentId, userId });

    // 1. Verify signature (unless skipped for webhooks)
    if (!skipSignatureVerification) {
      const secret = process.env.RAZORPAY_KEY_SECRET;
      if (!secret) {
        throw new Error('Razorpay secret key not configured');
      }

      if (!verifySignature(orderId, paymentId, signature, secret)) {
        throw new Error('Invalid payment signature');
      }
    }

    // 2. Get order details
    const paymentOrder = await prisma.paymentOrder.findUnique({
      where: { orderId }
    });

    if (!paymentOrder) {
      throw new Error('Order not found');
    }

    // Verify user ownership (unless webhook)
    if (!skipSignatureVerification && paymentOrder.userId !== userId) {
      throw new Error('Order does not belong to user');
    }

    // 3. Check if already processed
    if (paymentOrder.status === PAYMENT_STATES.ACTIVATED || paymentOrder.status === PAYMENT_STATES.VERIFIED) {
      console.log('ℹ️ Payment already processed');
      const purpose = await getPaymentPurpose(orderId, orderType);
      const referenceId = await getReferenceId(orderId, purpose);
      const activationStatus = await checkServiceActivationStatus(purpose, referenceId, paymentOrder.userId);

      return {
        success: true,
        isDuplicate: true,
        state: paymentOrder.status,
        activation: {
          serviceActivated: activationStatus.activated || false,
          activationDetails: {
            type: purpose,
            ...activationStatus
          }
        }
      };
    }

    // 4. Update order status to PAID
    await updateOrderStatus(orderId, PAYMENT_STATES.PAID, paymentId);

    // 5. Get payment details
    const purpose = await getPaymentPurpose(orderId, orderType);
    const referenceId = await getReferenceId(orderId, purpose);
    const metadata = await getPaymentMetadata(orderId, purpose);
    const paymentAmount = amount || paymentOrder.amount;

    console.log('📋 Payment details:', { purpose, referenceId, amount: paymentAmount });

    // 6. Process payment: Save record
    const paymentResult = await processPayment({
      paymentId,
      orderId,
      amount: paymentAmount,
      purpose,
      referenceId,
      userId: paymentOrder.userId,
      metadata,
      skipActivation: skipActivation // Pass flag to skip activation
    });

    // 7. Update order status
    // If activation is skipped, only mark as VERIFIED (activation will happen via webhook)
    if (skipActivation) {
      await updateOrderStatus(orderId, PAYMENT_STATES.VERIFIED, paymentId, purpose);
      
      return {
        success: true,
        isDuplicate: paymentResult.isDuplicate || false,
        state: PAYMENT_STATES.VERIFIED,
        message: 'Payment verified. Service will be activated via webhook.',
        payment: paymentResult.payment,
        activation: {
          serviceActivated: false,
          message: 'Activation will be processed via webhook',
          pendingActivation: true
        },
        order: {
          orderId,
          status: PAYMENT_STATES.VERIFIED
        }
      };
    }

    // 8. If not skipping activation, activate service (webhook flow)
    if (paymentResult.activation?.serviceActivated) {
      await updateOrderStatus(orderId, PAYMENT_STATES.ACTIVATED, paymentId, purpose);
    } else {
      await updateOrderStatus(orderId, PAYMENT_STATES.VERIFIED, paymentId, purpose);
    }

    // 9. Return comprehensive result
    return {
      success: true,
      isDuplicate: paymentResult.isDuplicate || false,
      state: paymentResult.activation?.serviceActivated ? PAYMENT_STATES.ACTIVATED : PAYMENT_STATES.VERIFIED,
      payment: paymentResult.payment,
      activation: paymentResult.activation,
      order: {
        orderId,
        status: paymentResult.activation?.serviceActivated ? PAYMENT_STATES.ACTIVATED : PAYMENT_STATES.VERIFIED
      }
    };
  } catch (error) {
    console.error('❌ Payment verification error:', error);

    // Update order status to FAILED
    try {
      await updateOrderStatus(orderId, PAYMENT_STATES.FAILED);
    } catch (updateError) {
      console.error('❌ Failed to update order status to FAILED:', updateError);
    }

    throw error;
  }
};

/**
 * Retry activation for failed payments
 */
const retryActivation = async (orderId, userId = null) => {
  try {
    const paymentOrder = await prisma.paymentOrder.findUnique({
      where: { orderId }
    });

    if (!paymentOrder) {
      throw new Error('Order not found');
    }

    if (paymentOrder.status !== PAYMENT_STATES.PAID && paymentOrder.status !== PAYMENT_STATES.VERIFIED) {
      throw new Error(`Cannot retry activation. Order status: ${paymentOrder.status}`);
    }

    if (!paymentOrder.paymentId) {
      throw new Error('Payment ID not found');
    }

    // Get payment details
    const purpose = await getPaymentPurpose(orderId);
    const referenceId = await getReferenceId(orderId, purpose);
    const metadata = await getPaymentMetadata(orderId, purpose);

    // Activate service
    const activation = await require('./paymentActivation').activateService({
      paymentId: paymentOrder.paymentId,
      orderId,
      amount: paymentOrder.amount,
      purpose,
      referenceId,
      userId: paymentOrder.userId,
      metadata
    });

    // Update order status
    if (activation.serviceActivated) {
      await updateOrderStatus(orderId, PAYMENT_STATES.ACTIVATED, paymentOrder.paymentId, purpose);
    }

    return {
      success: true,
      activation
    };
  } catch (error) {
    console.error('❌ Retry activation error:', error);
    throw error;
  }
};

/**
 * Get failed payments
 */
const getFailedPayments = async (filters = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      userId = null,
      startDate = null,
      endDate = null
    } = filters;

    const skip = (page - 1) * limit;

    const where = {
      status: PAYMENT_STATES.FAILED
    };

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
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

    return {
      success: true,
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('❌ Get failed payments error:', error);
    throw error;
  }
};

/**
 * Manual refund / rollback
 */
const processManualRefund = async (orderId, refundAmount = null, reason = 'Manual refund') => {
  try {
    const paymentOrder = await prisma.paymentOrder.findUnique({
      where: { orderId }
    });

    if (!paymentOrder) {
      throw new Error('Order not found');
    }

    if (paymentOrder.status === PAYMENT_STATES.REFUNDED) {
      throw new Error('Order already refunded');
    }

    // TODO: Integrate with Razorpay refund API
    // For now, just update status

    await prisma.paymentOrder.update({
      where: { orderId },
      data: {
        status: PAYMENT_STATES.REFUNDED,
        refundAmount: refundAmount || paymentOrder.amount,
        refundedAt: new Date()
      }
    });

    // TODO: Rollback service activation
    // - Deactivate premium ad
    // - Deactivate membership
    // - Deactivate business package

    return {
      success: true,
      message: 'Refund processed successfully',
      order: {
        orderId,
        status: PAYMENT_STATES.REFUNDED,
        refundAmount: refundAmount || paymentOrder.amount
      }
    };
  } catch (error) {
    console.error('❌ Manual refund error:', error);
    throw error;
  }
};

module.exports = {
  PAYMENT_STATES,
  processPaymentVerification,
  retryActivation,
  getFailedPayments,
  processManualRefund,
  verifySignature,
  getPaymentPurpose,
  getReferenceId,
  updateOrderStatus
};

