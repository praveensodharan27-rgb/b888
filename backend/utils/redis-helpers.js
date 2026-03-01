/**
 * Redis helper utilities for common caching patterns
 */
const { setCache, getCache, deleteCache, deleteCacheByPattern, PREFIXES } = require('../config/redis');

/**
 * Cache ads list with proper prefix
 * @param {string} key - Cache key (e.g., query string hash)
 * @param {any} data - Data to cache
 * @param {number} ttlSeconds - TTL in seconds
 */
async function cacheAds(key, data, ttlSeconds = 60) {
  return await setCache(PREFIXES.ADS, key, data, ttlSeconds);
}

/**
 * Get cached ads
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Cached data or null
 */
async function getCachedAds(key) {
  return await getCache(PREFIXES.ADS, key);
}

/**
 * Clear all ads cache
 */
async function clearAdsCache() {
  return await deleteCacheByPattern(`${PREFIXES.ADS}*`);
}

/**
 * Cache search results
 * @param {string} query - Search query
 * @param {any} data - Search results
 * @param {number} ttlSeconds - TTL in seconds
 */
async function cacheSearch(query, data, ttlSeconds = 60) {
  // Create hash from query for consistent key
  const key = Buffer.from(query).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
  return await setCache(PREFIXES.SEARCH, key, data, ttlSeconds);
}

/**
 * Get cached search results
 * @param {string} query - Search query
 * @returns {Promise<any|null>} Cached results or null
 */
async function getCachedSearch(query) {
  const key = Buffer.from(query).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
  return await getCache(PREFIXES.SEARCH, key);
}

/**
 * Clear all search cache
 */
async function clearSearchCache() {
  return await deleteCacheByPattern(`${PREFIXES.SEARCH}*`);
}

/**
 * Cache categories
 * @param {string} key - Cache key
 * @param {any} data - Categories data
 * @param {number} ttlSeconds - TTL in seconds (default: 10 minutes)
 */
async function cacheCategories(key, data, ttlSeconds = 600) {
  return await setCache(PREFIXES.CATEGORIES, key, data, ttlSeconds);
}

/**
 * Get cached categories
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Cached categories or null
 */
async function getCachedCategories(key) {
  return await getCache(PREFIXES.CATEGORIES, key);
}

/**
 * Clear categories cache
 */
async function clearCategoriesCache() {
  return await deleteCacheByPattern(`${PREFIXES.CATEGORIES}*`);
}

/**
 * Cache locations
 * @param {string} key - Cache key
 * @param {any} data - Locations data
 * @param {number} ttlSeconds - TTL in seconds (default: 10 minutes)
 */
async function cacheLocations(key, data, ttlSeconds = 600) {
  return await setCache(PREFIXES.LOCATIONS, key, data, ttlSeconds);
}

/**
 * Get cached locations
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Cached locations or null
 */
async function getCachedLocations(key) {
  return await getCache(PREFIXES.LOCATIONS, key);
}

/**
 * Clear locations cache
 */
async function clearLocationsCache() {
  return await deleteCacheByPattern(`${PREFIXES.LOCATIONS}*`);
}

/**
 * Cache OTP
 * @param {string} phoneOrEmail - Phone number or email
 * @param {string} otp - OTP code
 * @param {number} ttlSeconds - TTL in seconds (default: 5 minutes)
 */
async function cacheOTP(phoneOrEmail, otp, ttlSeconds = 300) {
  return await setCache(PREFIXES.OTP, phoneOrEmail, otp, ttlSeconds);
}

/**
 * Get cached OTP
 * @param {string} phoneOrEmail - Phone number or email
 * @returns {Promise<string|null>} Cached OTP or null
 */
async function getCachedOTP(phoneOrEmail) {
  return await getCache(PREFIXES.OTP, phoneOrEmail);
}

/**
 * Delete cached OTP
 * @param {string} phoneOrEmail - Phone number or email
 */
async function deleteCachedOTP(phoneOrEmail) {
  return await deleteCache(PREFIXES.OTP, phoneOrEmail);
}

/**
 * Cache rate limit counter
 * @param {string} identifier - Rate limit identifier (IP, user ID, etc.)
 * @param {number} count - Current count
 * @param {number} ttlSeconds - TTL in seconds
 */
async function cacheRateLimit(identifier, count, ttlSeconds = 60) {
  return await setCache(PREFIXES.RATE_LIMIT, identifier, count, ttlSeconds);
}

/**
 * Get cached rate limit counter
 * @param {string} identifier - Rate limit identifier
 * @returns {Promise<number|null>} Cached count or null
 */
async function getCachedRateLimit(identifier) {
  const count = await getCache(PREFIXES.RATE_LIMIT, identifier);
  return count !== null ? parseInt(count) : null;
}

/**
 * Increment rate limit counter
 * @param {string} identifier - Rate limit identifier
 * @param {number} ttlSeconds - TTL in seconds
 * @returns {Promise<number>} New count
 */
async function incrementRateLimit(identifier, ttlSeconds = 60) {
  const { getRedis, isAvailable } = require('../config/redis');
  if (!isAvailable()) {
    return 0;
  }
  
  try {
    const redis = getRedis();
    const key = `${PREFIXES.RATE_LIMIT}${identifier}`;
    const count = await redis.incr(key);
    await redis.expire(key, ttlSeconds);
    return count;
  } catch (error) {
    console.error('❌ Increment rate limit error:', error.message);
    return 0;
  }
}

/**
 * Cache user session data
 * @param {string} sessionId - Session ID
 * @param {any} data - Session data
 * @param {number} ttlSeconds - TTL in seconds (default: 24 hours)
 */
async function cacheSession(sessionId, data, ttlSeconds = 86400) {
  return await setCache(PREFIXES.SESSION, sessionId, data, ttlSeconds);
}

/**
 * Get cached session data
 * @param {string} sessionId - Session ID
 * @returns {Promise<any|null>} Cached session data or null
 */
async function getCachedSession(sessionId) {
  return await getCache(PREFIXES.SESSION, sessionId);
}

/**
 * Delete cached session
 * @param {string} sessionId - Session ID
 */
async function deleteCachedSession(sessionId) {
  return await deleteCache(PREFIXES.SESSION, sessionId);
}

/**
 * Cache filter schema
 * @param {string} categoryId - Category ID
 * @param {any} data - Filter schema data
 * @param {number} ttlSeconds - TTL in seconds (default: 10 minutes)
 */
async function cacheFilters(categoryId, data, ttlSeconds = 600) {
  return await setCache(PREFIXES.FILTERS, categoryId, data, ttlSeconds);
}

/**
 * Get cached filter schema
 * @param {string} categoryId - Category ID
 * @returns {Promise<any|null>} Cached filter schema or null
 */
async function getCachedFilters(categoryId) {
  return await getCache(PREFIXES.FILTERS, categoryId);
}

/**
 * Clear filters cache
 */
async function clearFiltersCache() {
  return await deleteCacheByPattern(`${PREFIXES.FILTERS}*`);
}

// --- Notifications cache (ETag + list, TTL 30s) ---
const NOTIFICATIONS_CACHE_TTL = 30;

function notificationListKey(userId, page, limit, unreadOnly) {
  return `list:${userId}:${page}:${limit}:${String(unreadOnly)}`;
}

function notificationEtagKey(userId) {
  return `etag:${userId}`;
}

async function getNotificationEtag(userId) {
  return await getCache(PREFIXES.NOTIFICATIONS, notificationEtagKey(userId));
}

async function setNotificationEtag(userId, etag, ttlSeconds = NOTIFICATIONS_CACHE_TTL) {
  return await setCache(PREFIXES.NOTIFICATIONS, notificationEtagKey(userId), etag, ttlSeconds);
}

async function getNotificationListCache(userId, page, limit, unreadOnly) {
  return await getCache(PREFIXES.NOTIFICATIONS, notificationListKey(userId, page, limit, unreadOnly));
}

async function setNotificationListCache(userId, page, limit, unreadOnly, data, ttlSeconds = NOTIFICATIONS_CACHE_TTL) {
  return await setCache(PREFIXES.NOTIFICATIONS, notificationListKey(userId, page, limit, unreadOnly), data, ttlSeconds);
}

/**
 * Invalidate notification cache for a user (call after mark read / mark all read / new notification)
 */
async function invalidateNotificationCache(userId) {
  const { deleteCache } = require('../config/redis');
  await deleteCache(PREFIXES.NOTIFICATIONS, notificationEtagKey(userId));
  await deleteCacheByPattern(`${PREFIXES.NOTIFICATIONS}list:${userId}*`);
}

module.exports = {
  // Ads
  cacheAds,
  getCachedAds,
  clearAdsCache,
  
  // Search
  cacheSearch,
  getCachedSearch,
  clearSearchCache,
  
  // Categories
  cacheCategories,
  getCachedCategories,
  clearCategoriesCache,
  
  // Locations
  cacheLocations,
  getCachedLocations,
  clearLocationsCache,
  
  // OTP
  cacheOTP,
  getCachedOTP,
  deleteCachedOTP,
  
  // Rate limiting
  cacheRateLimit,
  getCachedRateLimit,
  incrementRateLimit,
  
  // Sessions
  cacheSession,
  getCachedSession,
  deleteCachedSession,
  
  // Filters
  cacheFilters,
  getCachedFilters,
  clearFiltersCache,

  // Notifications
  getNotificationEtag,
  setNotificationEtag,
  getNotificationListCache,
  setNotificationListCache,
  invalidateNotificationCache,
  NOTIFICATIONS_CACHE_TTL,
};
