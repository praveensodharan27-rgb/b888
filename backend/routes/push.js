const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
  savePushSubscription,
  removePushSubscription,
  getVapidPublicKey
} = require('../utils/pushNotifications');

const router = express.Router();

// Get VAPID public key (public endpoint)
router.get('/vapid-key', (req, res) => {
  try {
    // Set CORS headers explicitly
    res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    const publicKey = getVapidPublicKey();
    if (!publicKey) {
      return res.status(503).json({
        success: false,
        message: 'Push notifications not configured'
      });
    }
    res.json({ success: true, publicKey });
  } catch (error) {
    console.error('Error getting VAPID key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get VAPID key'
    });
  }
});

// Handle OPTIONS preflight for vapid-key
router.options('/vapid-key', (req, res) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

// Subscribe to push notifications (requires authentication)
router.post('/subscribe',
  authenticate,
  [
    body('subscription.endpoint').isURL().withMessage('Valid endpoint URL required'),
    body('subscription.keys.p256dh').notEmpty().withMessage('p256dh key required'),
    body('subscription.keys.auth').notEmpty().withMessage('auth key required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { subscription, userAgent } = req.body;
      const result = await savePushSubscription(req.user.id, {
        ...subscription,
        userAgent: userAgent || req.headers['user-agent']
      });

      if (result.success) {
        res.json({ success: true, message: result.message });
      } else {
        res.status(500).json({ success: false, message: result.error });
      }
    } catch (error) {
      console.error('Subscribe error:', error);
      res.status(500).json({ success: false, message: 'Failed to subscribe' });
    }
  }
);

// Unsubscribe from push notifications
router.post('/unsubscribe',
  authenticate,
  [
    body('endpoint').isURL().withMessage('Valid endpoint URL required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { endpoint } = req.body;
      const result = await removePushSubscription(endpoint);

      if (result.success) {
        res.json({ success: true, message: result.message });
      } else {
        res.status(500).json({ success: false, message: result.error });
      }
    } catch (error) {
      console.error('Unsubscribe error:', error);
      res.status(500).json({ success: false, message: 'Failed to unsubscribe' });
    }
  }
);

// Mobile: Subscribe with device info
router.post('/mobile/subscribe',
  authenticate,
  [
    // Make subscription optional if fcmToken or apnsToken is provided
    body('subscription.endpoint').optional().isURL().withMessage('Valid endpoint URL required'),
    body('subscription.keys.p256dh').optional().notEmpty().withMessage('p256dh key required'),
    body('subscription.keys.auth').optional().notEmpty().withMessage('auth key required'),
    body('deviceId').optional().trim(),
    body('deviceType').optional().isIn(['ios', 'android', 'web']),
    body('fcmToken').optional().trim(),
    body('apnsToken').optional().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { subscription, deviceId, deviceType, fcmToken, apnsToken, userAgent } = req.body;
      
      // Validate: either subscription OR fcmToken/apnsToken must be provided
      if (!subscription && !fcmToken && !apnsToken) {
        return res.status(400).json({ 
          success: false, 
          message: 'Either subscription object or fcmToken/apnsToken is required' 
        });
      }
      
      // Save push subscription (for web push)
      if (subscription) {
        const result = await savePushSubscription(req.user.id, {
          ...subscription,
          userAgent: userAgent || req.headers['user-agent']
        });

        if (!result.success) {
          return res.status(500).json({ success: false, message: result.error });
        }
      }

      // Save/update mobile device record (for FCM/APNS)
      if (deviceId || fcmToken || apnsToken) {
        try {
          const { PrismaClient } = require('@prisma/client');
          const prisma = new PrismaClient();
          
          // Use fcmToken as deviceId if deviceId not provided
          const finalDeviceId = deviceId || fcmToken || apnsToken || `device-${req.user.id}-${Date.now()}`;
          
          await prisma.mobileDevice.upsert({
            where: { deviceId: finalDeviceId },
            update: {
              fcmToken: fcmToken || undefined,
              apnsToken: apnsToken || undefined,
              lastActiveAt: new Date(),
              isActive: true
            },
            create: {
              deviceId: finalDeviceId,
              userId: req.user.id,
              deviceType: deviceType || (fcmToken ? 'android' : 'ios'),
              fcmToken,
              apnsToken,
              lastActiveAt: new Date(),
              isActive: true
            }
          });
        } catch (deviceError) {
          console.warn('Failed to update device record:', deviceError.message);
          // Don't fail the subscription if device update fails
        }
      }

      res.json({
        success: true,
        message: 'Subscribed successfully',
        subscription: subscription ? {
          endpoint: subscription.endpoint
        } : null,
        deviceId: deviceId || fcmToken || apnsToken
      });
    } catch (error) {
      console.error('Mobile subscribe error:', error);
      res.status(500).json({ success: false, message: 'Failed to subscribe' });
    }
  }
);

// Mobile: Get notification settings
router.get('/mobile/settings', authenticate, async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        endpoint: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      settings: {
        enabled: subscriptions.length > 0,
        subscriptionsCount: subscriptions.length,
        subscriptions: subscriptions
      }
    });
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
});

// Mobile: Test push notification
router.post('/mobile/test',
  authenticate,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('message').notEmpty().withMessage('Message is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { title, message, data } = req.body;
      const { sendPushNotificationToUser } = require('../utils/pushNotifications');

      const result = await sendPushNotificationToUser(req.user.id, {
        title,
        message,
        data: data || {},
        link: '/notifications'
      });

      if (result.success) {
        res.json({
          success: true,
          message: 'Test notification sent',
          sent: result.successCount || 0,
          total: result.total || 0
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.error || 'Failed to send notification'
        });
      }
    } catch (error) {
      console.error('Test notification error:', error);
      res.status(500).json({ success: false, message: 'Failed to send test notification' });
    }
  }
);

module.exports = router;

