const Razorpay = require('razorpay');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Development mode flag - set to true for testing without real payments
const DEV_MODE = process.env.PAYMENT_GATEWAY_DEV_MODE === 'true' || process.env.NODE_ENV !== 'production';

// Test users for development (4 users)
const TEST_USERS = {
  user1: {
    id: 'test_user_1',
    email: 'testuser1@example.com',
    name: 'Test User 1',
    balance: 10000 // ₹100.00 in paise
  },
  user2: {
    id: 'test_user_2',
    email: 'testuser2@example.com',
    name: 'Test User 2',
    balance: 5000 // ₹50.00 in paise
  },
  user3: {
    id: 'test_user_3',
    email: 'testuser3@example.com',
    name: 'Test User 3',
    balance: 20000 // ₹200.00 in paise
  },
  user4: {
    id: 'test_user_4',
    email: 'testuser4@example.com',
    name: 'Test User 4',
    balance: 0 // ₹0.00
  }
};

// Initialize Razorpay (can be initialized even in dev mode if keys are provided)
let razorpay = null;
let razorpayInitialized = false;

const initializeRazorpay = () => {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    try {
      razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });
      razorpayInitialized = true;
      console.log('✅ Razorpay initialized for payment gateway');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Razorpay:', error);
      razorpay = null;
      razorpayInitialized = false;
      return false;
    }
  } else {
    razorpayInitialized = false;
    if (DEV_MODE) {
      console.log('🔧 Payment Gateway running in DEV MODE - using mock payments');
    } else {
      console.warn('⚠️ Razorpay keys not configured - payment gateway will use mock mode');
    }
    return false;
  }
};

// Initialize on module load
initializeRazorpay();

/**
 * Generate a unique order ID
 */
const generateOrderId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `order_${timestamp}_${random}`;
};

/**
 * Generate a unique payment ID (for mock payments)
 */
const generatePaymentId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `pay_${timestamp}_${random}`;
};

/**
 * Generate Razorpay signature
 */
const generateSignature = (orderId, paymentId, secret) => {
  const signatureString = `${orderId}|${paymentId}`;
  return crypto.createHmac('sha256', secret).update(signatureString).digest('hex');
};

/**
 * Verify Razorpay signature
 */
const verifySignature = (orderId, paymentId, signature, secret) => {
  const generatedSignature = generateSignature(orderId, paymentId, secret);
  return generatedSignature === signature;
};

/**
 * Create a payment order
 */
const createOrder = async (userId, amount, currency = 'INR', notes = {}) => {
  try {
    const amountInPaise = Math.round(amount * 100); // Convert to paise

    if (DEV_MODE) {
      // Mock order creation for development
      const orderId = generateOrderId();
      
      // Store order in database
      const order = await prisma.paymentOrder.create({
        data: {
          userId,
          orderId,
          amount: amountInPaise,
          currency,
          status: 'created',
          notes: JSON.stringify(notes),
          isTestOrder: true
        }
      });

      console.log(`🔧 [DEV MODE] Created mock order: ${orderId} for user ${userId}, amount: ₹${amount}`);
      
      // Get Razorpay key ID (even in dev mode, mobile apps need it for checkout)
      const razorpayKeyId = process.env.RAZORPAY_KEY_ID || null;
      
      return {
        success: true,
        order: {
          id: order.id,
          orderId,
          amount: amountInPaise,
          currency,
          status: 'created',
          notes,
          isTestOrder: true
        },
        razorpayOrder: {
          id: orderId,
          amount: amountInPaise,
          currency,
          status: 'created',
          key: razorpayKeyId  // Include Razorpay key ID for mobile apps
        },
        razorpayKeyId: razorpayKeyId  // Also include at top level for easy access
      };
    } else {
      // Real Razorpay order creation
      if (!razorpay || !razorpayInitialized) {
        throw new Error('Razorpay payment gateway not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
      }

      // Ensure amount meets Razorpay minimum (₹1 = 100 paise)
      if (amountInPaise < 100) {
        throw new Error('Amount must be at least ₹1.00 (100 paise)');
      }

      const receipt = `receipt_${Date.now()}_${userId.substring(0, 8)}`;
      
      const razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency,
        receipt: receipt.substring(0, 40), // Razorpay receipt max 40 chars
        notes: {
          userId,
          ...notes
        }
      });

      // Store order in database
      const order = await prisma.paymentOrder.create({
        data: {
          userId,
          orderId: razorpayOrder.id,
          amount: amountInPaise,
          currency,
          status: 'created',
          notes: JSON.stringify(notes),
          isTestOrder: false
        }
      });

      console.log(`✅ Created Razorpay order: ${razorpayOrder.id} for user ${userId}, amount: ₹${amount}`);

      // Get Razorpay key ID for mobile apps
      const razorpayKeyId = process.env.RAZORPAY_KEY_ID || null;

      return {
        success: true,
        order: {
          id: order.id,
          orderId: razorpayOrder.id,
          amount: amountInPaise,
          currency,
          status: 'created',
          notes
        },
        razorpayOrder: {
          ...razorpayOrder,
          key: razorpayKeyId  // Ensure key is included in razorpayOrder
        },
        razorpayKeyId: razorpayKeyId  // Also include at top level for easy access
      };
    }
  } catch (error) {
    console.error('❌ Create order error:', error);
    throw error;
  }
};

/**
 * Verify payment
 */
const verifyPayment = async (orderId, paymentId, signature) => {
  try {
    // Find order in database
    const order = await prisma.paymentOrder.findUnique({
      where: { orderId }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === 'paid') {
      return {
        success: true,
        message: 'Payment already verified',
        order,
        paymentId: order.paymentId
      };
    }

    if (DEV_MODE) {
      // Mock payment verification for development
      const mockPaymentId = paymentId || generatePaymentId();
      const mockSignature = generateSignature(orderId, mockPaymentId, 'dev_secret_key');

      // Update order status
      const updatedOrder = await prisma.paymentOrder.update({
        where: { orderId },
        data: {
          status: 'paid',
          paymentId: mockPaymentId,
          signature: mockSignature,
          paidAt: new Date()
        }
      });

      console.log(`🔧 [DEV MODE] Verified mock payment: ${mockPaymentId} for order: ${orderId}`);

      return {
        success: true,
        message: 'Payment verified successfully (DEV MODE)',
        order: updatedOrder,
        paymentId: mockPaymentId,
        signature: mockSignature
      };
    } else {
      // Real Razorpay payment verification
      if (!razorpay || !razorpayInitialized) {
        throw new Error('Razorpay payment gateway not configured');
      }

      // Verify signature
      const secret = process.env.RAZORPAY_KEY_SECRET;
      if (!secret) {
        throw new Error('Razorpay secret key not configured');
      }

      if (!verifySignature(orderId, paymentId, signature, secret)) {
        throw new Error('Invalid payment signature. Payment verification failed.');
      }

      // Fetch payment from Razorpay
      let payment;
      try {
        payment = await razorpay.payments.fetch(paymentId);
      } catch (error) {
        console.error('❌ Error fetching payment from Razorpay:', error);
        throw new Error(`Failed to fetch payment details: ${error.message}`);
      }

      // Verify payment belongs to the order
      if (payment.order_id !== orderId) {
        throw new Error('Payment does not belong to this order');
      }

      // Check payment status
      if (payment.status !== 'captured' && payment.status !== 'authorized') {
        throw new Error(`Payment not successful. Status: ${payment.status}`);
      }

      // If payment is authorized but not captured, capture it
      if (payment.status === 'authorized') {
        try {
          await razorpay.payments.capture(paymentId, order.amount);
          console.log(`✅ Captured authorized payment: ${paymentId}`);
        } catch (captureError) {
          console.error('❌ Error capturing payment:', captureError);
          // Continue anyway as payment is authorized
        }
      }

      // Update order status
      const updatedOrder = await prisma.paymentOrder.update({
        where: { orderId },
        data: {
          status: 'paid',
          paymentId,
          signature,
          paidAt: new Date()
        }
      });

      console.log(`✅ Verified Razorpay payment: ${paymentId} for order: ${orderId}`);

      return {
        success: true,
        message: 'Payment verified successfully',
        order: updatedOrder,
        paymentId,
        payment
      };
    }
  } catch (error) {
    console.error('❌ Verify payment error:', error);
    throw error;
  }
};

/**
 * Process refund
 */
const processRefund = async (orderId, amount = null, reason = 'Refund requested') => {
  try {
    // Find order
    const order = await prisma.paymentOrder.findUnique({
      where: { orderId }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'paid') {
      throw new Error('Order is not paid, cannot process refund');
    }

    const refundAmount = amount ? Math.round(amount * 100) : order.amount; // Convert to paise if needed

    if (DEV_MODE) {
      // Mock refund for development
      const refundId = `refund_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Update order status
      const updatedOrder = await prisma.paymentOrder.update({
        where: { orderId },
        data: {
          status: 'refunded',
          refundId,
          refundAmount,
          refundedAt: new Date()
        }
      });

      console.log(`🔧 [DEV MODE] Processed mock refund: ${refundId} for order: ${orderId}, amount: ₹${refundAmount / 100}`);

      return {
        success: true,
        message: 'Refund processed successfully (DEV MODE)',
        order: updatedOrder,
        refundId,
        refundAmount
      };
    } else {
      // Real Razorpay refund
      if (!razorpay) {
        throw new Error('Payment gateway not configured');
      }

      if (!order.paymentId) {
        throw new Error('Payment ID not found');
      }

      const refund = await razorpay.payments.refund(order.paymentId, {
        amount: refundAmount,
        notes: {
          reason
        }
      });

      // Update order status
      const updatedOrder = await prisma.paymentOrder.update({
        where: { orderId },
        data: {
          status: 'refunded',
          refundId: refund.id,
          refundAmount,
          refundedAt: new Date()
        }
      });

      console.log(`✅ Processed Razorpay refund: ${refund.id} for order: ${orderId}`);

      return {
        success: true,
        message: 'Refund processed successfully',
        order: updatedOrder,
        refund,
        refundId: refund.id,
        refundAmount
      };
    }
  } catch (error) {
    console.error('❌ Process refund error:', error);
    throw error;
  }
};

/**
 * Get order status
 */
const getOrderStatus = async (orderId) => {
  try {
    const order = await prisma.paymentOrder.findUnique({
      where: { orderId }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    return {
      success: true,
      order
    };
  } catch (error) {
    console.error('❌ Get order status error:', error);
    throw error;
  }
};

/**
 * Get user payment history
 */
const getUserPayments = async (userId, page = 1, limit = 20) => {
  try {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.paymentOrder.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.paymentOrder.count({ where: { userId } })
    ]);

    return {
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('❌ Get user payments error:', error);
    throw error;
  }
};

/**
 * Get test user info (for development)
 */
const getTestUserInfo = (userId) => {
  if (!DEV_MODE) {
    return null;
  }

  const testUser = Object.values(TEST_USERS).find(user => user.id === userId);
  return testUser || null;
};

/**
 * Get all test users (for development)
 */
const getAllTestUsers = () => {
  if (!DEV_MODE) {
    return [];
  }
  return Object.values(TEST_USERS);
};

/**
 * Capture authorized payment
 */
const capturePayment = async (paymentId, amount = null) => {
  try {
    if (!razorpay || !razorpayInitialized) {
      throw new Error('Razorpay payment gateway not configured');
    }

    const payment = await razorpay.payments.fetch(paymentId);
    
    if (payment.status !== 'authorized') {
      throw new Error(`Payment is not authorized. Current status: ${payment.status}`);
    }

    const captureAmount = amount ? Math.round(amount * 100) : payment.amount;
    const capturedPayment = await razorpay.payments.capture(paymentId, captureAmount);

    console.log(`✅ Captured payment: ${paymentId}, amount: ₹${captureAmount / 100}`);

    return {
      success: true,
      payment: capturedPayment,
      message: 'Payment captured successfully'
    };
  } catch (error) {
    console.error('❌ Capture payment error:', error);
    throw error;
  }
};

/**
 * Get Razorpay payment details
 */
const getPaymentDetails = async (paymentId) => {
  try {
    if (!razorpay || !razorpayInitialized) {
      throw new Error('Razorpay payment gateway not configured');
    }

    const payment = await razorpay.payments.fetch(paymentId);

    return {
      success: true,
      payment
    };
  } catch (error) {
    console.error('❌ Get payment details error:', error);
    throw error;
  }
};

/**
 * Get Razorpay order details
 */
const getRazorpayOrderDetails = async (orderId) => {
  try {
    if (!razorpay || !razorpayInitialized) {
      throw new Error('Razorpay payment gateway not configured');
    }

    const order = await razorpay.orders.fetch(orderId);

    return {
      success: true,
      order
    };
  } catch (error) {
    console.error('❌ Get Razorpay order details error:', error);
    throw error;
  }
};

/**
 * Verify Razorpay webhook signature
 */
const verifyWebhookSignature = (webhookBody, signature, secret) => {
  try {
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(webhookBody)
      .digest('hex');
    
    return generatedSignature === signature;
  } catch (error) {
    console.error('❌ Webhook signature verification error:', error);
    return false;
  }
};

/**
 * Reinitialize Razorpay (useful for updating keys)
 */
const reinitializeRazorpay = () => {
  return initializeRazorpay();
};

module.exports = {
  createOrder,
  verifyPayment,
  processRefund,
  getOrderStatus,
  getUserPayments,
  getTestUserInfo,
  getAllTestUsers,
  capturePayment,
  getPaymentDetails,
  getRazorpayOrderDetails,
  verifyWebhookSignature,
  reinitializeRazorpay,
  DEV_MODE,
  TEST_USERS,
  generateSignature,
  verifySignature,
  razorpayInitialized: () => razorpayInitialized,
  razorpayInstance: () => razorpay
};

