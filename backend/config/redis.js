const Redis = require('ioredis');

// Max reconnect attempts per connection attempt; then we rely on background retry
const MAX_RECONNECT_ATTEMPTS = 5;
let redisGaveUp = false;
const REDIS_BACKGROUND_RETRY_MS = 2 * 60 * 1000; // retry connection every 2 min when gave up
let backgroundRetryTimer = null;

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  retryStrategy: (times) => {
    if (times > MAX_RECONNECT_ATTEMPTS) {
      redisGaveUp = true;
      return null;
    }
    return Math.min(times * 100, 3000);
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: false,
  connectTimeout: 10000,
  lazyConnect: true,
};

let redis = null;
let isRedisAvailable = false;

// Rate-limited logging (avoid spam when Redis is down)
let lastLogAt = 0;
const LOG_THROTTLE_MS = 60000;
function shouldLog() {
  const now = Date.now();
  if (now - lastLogAt >= LOG_THROTTLE_MS) {
    lastLogAt = now;
    return true;
  }
  return false;
}

/**
 * Initialize Redis connection (with auto-retry; app works without Redis)
 */
async function initRedis() {
  try {
    if (!redis) {
      try {
        const { logger } = require('../src/config/logger');
        logger.info('Redis: connecting...');
      } catch (_) {}
      redis = new Redis(redisConfig);

      redis.on('connect', () => {
        if (shouldLog()) {
          try {
            const { logger } = require('../src/config/logger');
            logger.info('Redis: connecting');
          } catch (_) {}
        }
      });

      redis.on('ready', () => {
        isRedisAvailable = true;
        redisGaveUp = false;
        if (backgroundRetryTimer) {
          clearInterval(backgroundRetryTimer);
          backgroundRetryTimer = null;
        }
        try {
          const { logger } = require('../src/config/logger');
          logger.info('Redis: connected and ready (caching enabled)');
        } catch (_) {}
      });

      redis.on('error', (error) => {
        isRedisAvailable = false;
        if (redisGaveUp) return;
        if (shouldLog()) {
          try {
            const { logger } = require('../src/config/logger');
            logger.warn({ err: error.message }, 'Redis unavailable; cache disabled. App continues without cache.');
          } catch (_) {}
        }
      });

      redis.on('close', () => {
        isRedisAvailable = false;
        if (redisGaveUp) return;
        if (shouldLog()) {
          try {
            const { logger } = require('../src/config/logger');
            logger.warn('Redis: connection closed; cache disabled');
          } catch (_) {}
        }
      });

      redis.on('reconnecting', (delay) => {
        isRedisAvailable = false;
        if (redisGaveUp) return;
        if (shouldLog()) {
          try {
            const { logger } = require('../src/config/logger');
            logger.info({ delay }, 'Redis: reconnecting');
          } catch (_) {}
        }
      });

      await redis.connect();
    }
    return redis;
  } catch (error) {
    isRedisAvailable = false;
    redisGaveUp = true;
    if (shouldLog()) {
      try {
        const { logger } = require('../src/config/logger');
        logger.warn({ err: error.message }, 'Redis unavailable; app runs without cache.');
      } catch (_) {}
    }
    return null;
  }
}

/** Start background retry when Redis gave up (re-enable caching when Redis comes back) */
function startBackgroundRetry() {
  if (backgroundRetryTimer) return;
  backgroundRetryTimer = setInterval(() => {
    if (!redisGaveUp) return;
    redisGaveUp = false;
    initRedis().catch(() => {});
  }, REDIS_BACKGROUND_RETRY_MS);
}

/**
 * Get Redis client (lazy initialization)
 */
function getRedis() {
  if (!redis) {
    initRedis().catch(() => {
      if (shouldLog()) {
        try {
          const { logger } = require('../src/config/logger');
          logger.warn('Redis: lazy init failed');
        } catch (_) {}
      }
    });
  }
  return redis;
}

/**
 * Check if Redis is available
 */
function isAvailable() {
  return isRedisAvailable && redis && redis.status === 'ready';
}

/**
 * Generate cache key with prefix
 * @param {string} prefix - Key prefix (e.g., 'ads:', 'search:')
 * @param {string} key - Cache key
 * @returns {string} Prefixed key
 */
function getCacheKey(prefix, key) {
  return `${prefix}${key}`;
}

/**
 * Set cache value with TTL
 * @param {string} prefix - Key prefix
 * @param {string} key - Cache key
 * @param {any} value - Value to cache (will be JSON stringified)
 * @param {number} ttlSeconds - TTL in seconds
 * @returns {Promise<boolean>} Success status
 */
async function setCache(prefix, key, value, ttlSeconds) {
  if (!isAvailable()) {
    return false;
  }
  
  try {
    const fullKey = getCacheKey(prefix, key);
    const serialized = JSON.stringify(value);
    await redis.setex(fullKey, ttlSeconds, serialized);
    return true;
  } catch (error) {
    if (shouldLog()) {
      try {
        const { logger } = require('../src/config/logger');
        logger.warn({ err: error.message, key: prefix + key }, 'Redis setCache failed');
      } catch (_) {}
    }
    return false;
  }
}

/**
 * Get cache value
 * @param {string} prefix - Key prefix
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Cached value or null
 */
async function getCache(prefix, key) {
  if (!isAvailable()) {
    return null;
  }
  
  try {
    const fullKey = getCacheKey(prefix, key);
    const cached = await redis.get(fullKey);
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    if (shouldLog()) {
      try {
        const { logger } = require('../src/config/logger');
        logger.warn({ err: error.message, key: prefix + key }, 'Redis getCache failed');
      } catch (_) {}
    }
    return null;
  }
}

/**
 * Delete cache key
 * @param {string} prefix - Key prefix
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Success status
 */
async function deleteCache(prefix, key) {
  if (!isAvailable()) {
    return false;
  }
  
  try {
    const fullKey = getCacheKey(prefix, key);
    await redis.del(fullKey);
    return true;
  } catch (error) {
    if (shouldLog()) {
      try {
        const { logger } = require('../src/config/logger');
        logger.warn({ err: error.message }, 'Redis deleteCache failed');
      } catch (_) {}
    }
    return false;
  }
}

/**
 * Delete cache keys by pattern
 * @param {string} pattern - Pattern to match (e.g., 'ads:*')
 * @returns {Promise<number>} Number of keys deleted
 */
async function deleteCacheByPattern(pattern) {
  if (!isAvailable()) {
    return 0;
  }
  
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return keys.length;
  } catch (error) {
    if (shouldLog()) {
      try {
        const { logger } = require('../src/config/logger');
        logger.warn({ err: error.message, pattern }, 'Redis deleteCacheByPattern failed');
      } catch (_) {}
    }
    return 0;
  }
}

/**
 * Clear all cache (use with caution)
 * @returns {Promise<boolean>} Success status
 */
async function clearAllCache() {
  if (!isAvailable()) {
    return false;
  }
  
  try {
    await redis.flushdb();
    return true;
  } catch (error) {
    if (shouldLog()) {
      try {
        const { logger } = require('../src/config/logger');
        logger.warn({ err: error.message }, 'Redis clearAllCache failed');
      } catch (_) {}
    }
    return false;
  }
}

/**
 * Get cache statistics
 * @returns {Promise<object>} Cache stats
 */
async function getCacheStats() {
  if (!isAvailable()) {
    return { available: false };
  }
  
  try {
    const info = await redis.info('stats');
    const keyspace = await redis.info('keyspace');
    const memory = await redis.info('memory');
    
    return {
      available: true,
      status: redis.status,
      info: {
        stats: info,
        keyspace: keyspace,
        memory: memory
      }
    };
  } catch (error) {
    if (shouldLog()) {
      try {
        const { logger } = require('../src/config/logger');
        logger.warn({ err: error.message }, 'Redis getCacheStats failed');
      } catch (_) {}
    }
    return { available: false, error: error.message };
  }
}

/**
 * Close Redis connection gracefully
 */
async function closeRedis() {
  if (!redis) return;
  try {
    if (redis.status === 'ready' || redis.status === 'connecting') {
      await redis.quit();
      try {
        const { logger } = require('../src/config/logger');
        logger.info('Redis: connection closed gracefully');
      } catch (_) {}
    }
    isRedisAvailable = false;
  } catch (error) {
    if (error.message !== 'Connection is closed.' && shouldLog()) {
      try {
        const { logger } = require('../src/config/logger');
        logger.warn({ err: error.message }, 'Redis close error');
      } catch (_) {}
    }
  } finally {
    redis = null;
    if (backgroundRetryTimer) {
      clearInterval(backgroundRetryTimer);
      backgroundRetryTimer = null;
    }
  }
}

// Initialize Redis on module load; start background retry if connection fails
initRedis().then((client) => {
  if (!client || !isRedisAvailable) {
    redisGaveUp = true;
    startBackgroundRetry();
  }
}).catch(() => {
  redisGaveUp = true;
  startBackgroundRetry();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeRedis();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeRedis();
  process.exit(0);
});

module.exports = {
  initRedis,
  getRedis,
  isAvailable,
  startBackgroundRetry,
  getCacheKey,
  setCache,
  getCache,
  deleteCache,
  deleteCacheByPattern,
  clearAllCache,
  getCacheStats,
  closeRedis,
  PREFIXES: {
    ADS: 'ads:',
    SEARCH: 'search:',
    CATEGORIES: 'categories:',
    LOCATIONS: 'locations:',
    SESSION: 'session:',
    OTP: 'otp:',
    RATE_LIMIT: 'ratelimit:',
    USER: 'user:',
    FILTERS: 'filters:',
    NOTIFICATIONS: 'notif:',
  }
};
