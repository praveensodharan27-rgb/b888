const { getCache, setCache, isAvailable, PREFIXES } = require('../config/redis');
const { createRateLimitedLogger } = require('../utils/rateLimitedLog');
let _logger;
try {
  _logger = require('../src/config/logger').logger;
} catch (_) {
  _logger = { warn: () => {}, error: () => {} };
}
const rlLog = createRateLimitedLogger(_logger, 60000);

// Cache TTL constants (in seconds)
const CACHE_TTL = 60; // 1 minute default
const STATIC_CACHE_TTL = 10 * 60; // 10 minutes for static data (categories, locations)
const LONG_CACHE_TTL = 30 * 60; // 30 minutes for rarely changing data

/** Normalize TTL: if value > 86400 assume it was passed as milliseconds and convert to seconds */
const normalizeTTL = (ttl) => {
  if (ttl == null) return CACHE_TTL;
  const sec = typeof ttl === 'number' ? ttl : parseInt(ttl, 10);
  if (Number.isNaN(sec)) return CACHE_TTL;
  // If > 1 day in seconds, treat as milliseconds
  if (sec > 86400) return Math.min(Math.floor(sec / 1000), 86400);
  return Math.min(sec, 86400);
};

/**
 * Generate cache key from request
 * @param {object} req - Express request object
 * @returns {string} Cache key
 */
const getCacheKey = (req) => {
  // Use method and full URL as key
  // Remove query params that don't affect cache (like timestamps, cache-busting params)
  const url = req.originalUrl.split('?')[0];
  const query = new URLSearchParams(req.query);
  
  // Filter out cache-busting params (_t, _cb, timestamp, etc.)
  const cacheBustingParams = ['_t', '_cb', 'timestamp', 'nocache', 'refresh'];
  const filteredParams = Array.from(query.entries())
    .filter(([key]) => !cacheBustingParams.includes(key.toLowerCase()));
  
  // Sort query params for consistent keys
  const sortedParams = filteredParams
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  return `${req.method}:${url}${sortedParams ? `?${sortedParams}` : ''}`;
};

/**
 * Determine cache prefix based on route
 * @param {object} req - Express request object
 * @returns {string} Cache prefix
 */
const getCachePrefix = (req) => {
  const path = req.path || req.originalUrl.split('?')[0];
  
  if (path.includes('/ads')) {
    if (path.includes('/home-feed')) {
      return PREFIXES.ADS + 'homefeed:';
    }
    if (path.includes('/search')) {
      return PREFIXES.SEARCH;
    }
    return PREFIXES.ADS;
  }
  if (path.includes('/categories')) {
    return PREFIXES.CATEGORIES;
  }
  if (path.includes('/locations')) {
    return PREFIXES.LOCATIONS;
  }
  if (path.includes('/filters')) {
    return PREFIXES.FILTERS;
  }
  
  // Default prefix
  return 'api:';
};

/**
 * Redis-based cache middleware for GET requests
 * @param {number} ttlSeconds - TTL in seconds (default: 60)
 * @returns {function} Express middleware
 */
const cacheMiddleware = (ttlSeconds = CACHE_TTL) => {
  const ttl = normalizeTTL(ttlSeconds);
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Check for cache-busting parameters - if present, skip cache
    const cacheBustingParams = ['_t', '_cb', 'timestamp', 'nocache', 'refresh'];
    const hasCacheBust = Object.keys(req.query || {}).some(key => 
      cacheBustingParams.includes(key.toLowerCase())
    );
    
    if (hasCacheBust) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Cache-busting parameter detected, bypassing cache');
      }
      return next();
    }

    // Check if Redis is available
    if (!isAvailable()) {
      return next(); // Skip caching silently when Redis unavailable
    }

    const prefix = getCachePrefix(req);
    const key = getCacheKey(req);

    try {
      const cached = await getCache(prefix, key);
      
      if (cached !== null) {
        // Optional: set HTTP Cache-Control for client/CDN
        res.setHeader('Cache-Control', `public, max-age=${Math.min(ttl, 300)}, s-maxage=${ttl}`);
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }

      const originalJson = res.json.bind(res);
      res.json = async function (data) {
        setCache(prefix, key, data, ttl).catch(() => {
          rlLog.warn('cache_set', 'Failed to cache response');
        });
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('Cache-Control', `public, max-age=${Math.min(ttl, 300)}, s-maxage=${ttl}`);
        return originalJson(data);
      };

      next();
    } catch (error) {
      rlLog.warn('cache_middleware', { err: error.message }, 'Cache middleware error');
      next();
    }
  };
};

/**
 * Clear cache for specific pattern or all cache
 * @param {string} [pattern] - Pattern to match (e.g., 'ads:*', 'search:*'). If omitted, clears all.
 * @returns {Promise<number|boolean>} Number of keys deleted, or true if flush
 */
const clearCache = async (pattern) => {
  if (!isAvailable()) {
    return 0;
  }
  
  try {
    if (!pattern || pattern === '*' || pattern === 'all') {
      const { clearAllCache } = require('../config/redis');
      const ok = await clearAllCache();
      return ok ? 1 : 0;
    }
    const { deleteCacheByPattern } = require('../config/redis');
    return await deleteCacheByPattern(pattern);
  } catch (error) {
    rlLog.warn('cache_clear', { err: error.message }, 'Clear cache error');
    return 0;
  }
};

/**
 * Get cache size (for stats)
 * @returns {Promise<number>} Number of keys in cache
 */
const getCacheSize = async () => {
  if (!isAvailable()) {
    return 0;
  }
  
  try {
    const redis = require('../config/redis').getRedis();
    const keys = await redis.keys('*');
    return keys.length;
  } catch (error) {
    rlLog.warn('cache_size', { err: error.message }, 'Get cache size error');
    return 0;
  }
};

/**
 * Get all cache keys (for stats)
 * @param {string} pattern - Pattern to match (optional)
 * @returns {Promise<Array<string>>} Array of cache keys
 */
const getCacheKeys = async (pattern = '*') => {
  if (!isAvailable()) {
    return [];
  }
  
  try {
    const redis = require('../config/redis').getRedis();
    const keys = await redis.keys(pattern);
    return keys;
  } catch (error) {
    rlLog.warn('cache_keys', { err: error.message }, 'Get cache keys error');
    return [];
  }
};

module.exports = { 
  cacheMiddleware, 
  clearCache, 
  getCacheSize, 
  getCacheKeys,
  // Export TTL constants
  CACHE_TTL,
  STATIC_CACHE_TTL,
  LONG_CACHE_TTL
};
