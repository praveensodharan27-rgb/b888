// Simple in-memory cache middleware for GET requests
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute default

const getCacheKey = (req) => {
  return `${req.method}:${req.originalUrl}`;
};

const cacheMiddleware = (ttl = CACHE_TTL) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = getCacheKey(req);
    const cached = cache.get(key);

    if (cached && Date.now() < cached.expiresAt) {
      // Return cached response
      return res.json(cached.data);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = function (data) {
      // Cache the response
      cache.set(key, {
        data,
        expiresAt: Date.now() + ttl,
      });

      // Call original json method
      return originalJson(data);
    };

    next();
  };
};

// Clear cache for specific pattern
const clearCache = (pattern) => {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
};

// Cleanup expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now >= value.expiresAt) {
      cache.delete(key);
    }
  }
}, 5 * 60 * 1000); // Cleanup every 5 minutes

module.exports = { cacheMiddleware, clearCache };

