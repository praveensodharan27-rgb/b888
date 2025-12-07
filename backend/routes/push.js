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

module.exports = router;

