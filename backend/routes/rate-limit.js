const express = require('express');
const router = express.Router();

// Rate limit status endpoint
router.get('/status', (req, res) => {
  try {
    // Get rate limit information
    // You can integrate with express-rate-limit or your rate limiting middleware
    res.json({
      success: true,
      rateLimit: {
        enabled: true,
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Max requests per window
        message: 'Too many requests, please try again later'
      },
      current: {
        remaining: 100, // Mock value - integrate with actual rate limiter
        reset: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      }
    });
  } catch (error) {
    console.error('Rate limit status error:', error);
    res.status(500).json({ success: false, message: 'Failed to get rate limit status' });
  }
});

module.exports = router;

