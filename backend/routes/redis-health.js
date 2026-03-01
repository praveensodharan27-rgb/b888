const express = require('express');
const { isAvailable, getCacheStats, getRedis } = require('../config/redis');

const router = express.Router();

/**
 * Redis health check endpoint
 * GET /api/redis/health
 */
router.get('/health', async (req, res) => {
  try {
    const available = isAvailable();
    const stats = await getCacheStats();
    
    res.json({
      success: true,
      redis: {
        available,
        status: available ? 'connected' : 'disconnected',
        ...stats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check Redis health',
      error: error.message
    });
  }
});

/**
 * Redis stats endpoint (admin only)
 * GET /api/redis/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getCacheStats();
    const redis = getRedis();
    
    if (!redis || !isAvailable()) {
      return res.json({
        success: false,
        message: 'Redis is not available',
        stats: { available: false }
      });
    }
    
    // Get additional stats
    const info = await redis.info('all');
    const dbSize = await redis.dbsize();
    
    res.json({
      success: true,
      stats: {
        ...stats,
        dbSize,
        info: info.split('\r\n').filter(line => line && !line.startsWith('#')).reduce((acc, line) => {
          const [key, value] = line.split(':');
          if (key && value) {
            acc[key] = value;
          }
          return acc;
        }, {})
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get Redis stats',
      error: error.message
    });
  }
});

module.exports = router;
