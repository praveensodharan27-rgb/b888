/**
 * Search Cache Service
 * 
 * Implements caching for frequently searched keywords and locations
 * Uses in-memory cache with TTL (Time To Live)
 */

// Simple in-memory cache with TTL
const cache = new Map();

// Default TTL: 5 minutes (300 seconds)
const DEFAULT_TTL_MS = 5 * 60 * 1000;

/**
 * Generate cache key from search parameters
 */
function generateCacheKey(params) {
  const {
    keyword = '',
    category,
    subcategory,
    city,
    state,
    neighbourhood,
    pincode,
    minPrice,
    maxPrice,
    condition,
    sort,
    page,
    limit
  } = params;
  
  return `search:${JSON.stringify({
    keyword: keyword.toLowerCase().trim(),
    category,
    subcategory,
    city: city?.toLowerCase(),
    state: state?.toLowerCase(),
    neighbourhood: neighbourhood?.toLowerCase(),
    pincode,
    minPrice,
    maxPrice,
    condition,
    sort,
    page,
    limit
  })}`;
}

/**
 * Get cached search results
 */
function getCachedResults(key) {
  const cached = cache.get(key);
  
  if (!cached) return null;
  
  // Check if expired
  if (Date.now() > cached.expiresAt) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
}

/**
 * Set cache with TTL
 */
function setCache(key, data, ttlMs = DEFAULT_TTL_MS) {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs
  });
  
  // Cleanup expired entries periodically (every 10 minutes)
  if (cache.size > 1000) {
    cleanupCache();
  }
}

/**
 * Clean up expired cache entries
 */
function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now > value.expiresAt) {
      cache.delete(key);
    }
  }
}

/**
 * Clear cache (useful for testing or manual invalidation)
 */
function clearCache() {
  cache.clear();
}

/**
 * Get cache statistics
 */
function getCacheStats() {
  return {
    size: cache.size,
    entries: Array.from(cache.keys())
  };
}

module.exports = {
  generateCacheKey,
  getCachedResults,
  setCache,
  clearCache,
  getCacheStats,
  cleanupCache
};
