const { PrismaClient } = require('@prisma/client');
const { logger } = require('../src/config/logger');

const prisma = new PrismaClient();

/**
 * Search Analytics Utility
 * Track search queries, popular searches, and zero-result queries
 */

// In-memory cache for popular searches (refreshed periodically)
let popularSearchesCache = [];
let lastCacheUpdate = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Log a search query for analytics
 * @param {string} query - Search query
 * @param {number} resultsCount - Number of results returned
 * @param {string} userId - User ID (optional)
 * @param {object} filters - Applied filters
 */
async function logSearch(query, resultsCount = 0, userId = null, filters = {}) {
  try {
    // Skip logging empty queries
    if (!query || !query.trim()) return;

    // Create search log entry (you can create a SearchLog model if needed)
    // For now, just log to console/logger
    logger.info({
      type: 'search',
      query: query.trim(),
      resultsCount,
      userId,
      filters,
      timestamp: new Date().toISOString(),
      isZeroResult: resultsCount === 0,
    }, 'Search logged');

    // TODO: Store in database for analytics
    // await prisma.searchLog.create({
    //   data: {
    //     query: query.trim(),
    //     resultsCount,
    //     userId,
    //     filters: JSON.stringify(filters),
    //     isZeroResult: resultsCount === 0,
    //   }
    // });

  } catch (error) {
    logger.error({ err: error.message }, 'Error logging search');
  }
}

/**
 * Get popular searches (cached)
 * @param {number} limit - Number of popular searches to return
 * @returns {Promise<string[]>} - Array of popular search queries
 */
async function getPopularSearches(limit = 10) {
  try {
    const now = Date.now();
    
    // Return cached if still valid
    if (popularSearchesCache.length > 0 && (now - lastCacheUpdate) < CACHE_TTL_MS) {
      return popularSearchesCache.slice(0, limit);
    }

    // TODO: Fetch from database when SearchLog model is created
    // const results = await prisma.searchLog.groupBy({
    //   by: ['query'],
    //   where: {
    //     createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
    //     isZeroResult: false, // Only queries with results
    //   },
    //   _count: { query: true },
    //   orderBy: { _count: { query: 'desc' } },
    //   take: limit,
    // });
    // popularSearchesCache = results.map(r => r.query);

    // Hardcoded popular searches for now
    popularSearchesCache = [
      'iPhone',
      'Car',
      'Laptop',
      'Bike',
      'Furniture',
      'Mobile',
      'House',
      'Apartment',
      'Scooter',
      'TV',
      'Sofa',
      'Refrigerator',
      'Washing Machine',
      'Motorcycle',
      'Plot',
    ];
    
    lastCacheUpdate = now;
    return popularSearchesCache.slice(0, limit);
  } catch (error) {
    logger.error({ err: error.message }, 'Error fetching popular searches');
    return popularSearchesCache.slice(0, limit);
  }
}

/**
 * Get zero-result queries for improvement
 * @param {number} limit - Number of queries to return
 * @returns {Promise<object[]>} - Array of zero-result queries with counts
 */
async function getZeroResultQueries(limit = 20) {
  try {
    // TODO: Fetch from database when SearchLog model is created
    // const results = await prisma.searchLog.groupBy({
    //   by: ['query'],
    //   where: {
    //     isZeroResult: true,
    //     createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
    //   },
    //   _count: { query: true },
    //   orderBy: { _count: { query: 'desc' } },
    //   take: limit,
    // });
    // return results.map(r => ({ query: r.query, count: r._count.query }));

    return [];
  } catch (error) {
    logger.error({ err: error.message }, 'Error fetching zero-result queries');
    return [];
  }
}

/**
 * Get search statistics
 * @returns {Promise<object>} - Search statistics
 */
async function getSearchStats() {
  try {
    // TODO: Fetch from database when SearchLog model is created
    // const [totalSearches, zeroResultCount, avgResultsCount] = await Promise.all([
    //   prisma.searchLog.count(),
    //   prisma.searchLog.count({ where: { isZeroResult: true } }),
    //   prisma.searchLog.aggregate({ _avg: { resultsCount: true } }),
    // ]);

    // return {
    //   totalSearches,
    //   zeroResultCount,
    //   zeroResultPercentage: totalSearches > 0 ? (zeroResultCount / totalSearches) * 100 : 0,
    //   avgResultsCount: avgResultsCount._avg.resultsCount || 0,
    // };

    return {
      totalSearches: 0,
      zeroResultCount: 0,
      zeroResultPercentage: 0,
      avgResultsCount: 0,
    };
  } catch (error) {
    logger.error({ err: error.message }, 'Error fetching search stats');
    return {
      totalSearches: 0,
      zeroResultCount: 0,
      zeroResultPercentage: 0,
      avgResultsCount: 0,
    };
  }
}

module.exports = {
  logSearch,
  getPopularSearches,
  getZeroResultQueries,
  getSearchStats,
};
