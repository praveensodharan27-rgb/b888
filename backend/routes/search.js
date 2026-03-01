/**
 * Search API Routes - OLX-style smart search
 * 
 * Endpoints:
 * - GET /api/search - Main search with filters
 * - GET /api/search/suggestions - Autocomplete suggestions
 * - GET /api/search/trending - Trending searches
 * - POST /api/search/bump/:id - Bump ad to top
 */

const express = require('express');
const router = express.Router();
const { searchAds, getSearchSuggestions, bumpAd, autocomplete, getHomeFeedWithGeo } = require('../services/meilisearch');
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../src/config/logger');
const { authenticate } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/cache');

const prisma = new PrismaClient();

/**
 * GET /api/search
 * Main search endpoint with OLX-style ranking
 * 
 * Query params:
 * - q: search query
 * - category: category filter
 * - location: location filter
 * - page: page number (default: 1)
 * - limit: results per page (default: 20)
 * - minPrice: minimum price
 * - maxPrice: maximum price
 * - condition: product condition
 * - sort: sort order (newest, oldest, price_low, price_high, featured, bumped)
 */
router.get('/', cacheMiddleware(150), async (req, res) => {
  try {
    const {
      q,
      query,
      category,
      categoryName,
      location,
      city,
      state,
      page = 1,
      limit = 20,
      minPrice,
      maxPrice,
      condition,
      sort = 'newest',
    } = req.query;

    const searchQuery = q || query || '';
    const startTime = Date.now();

    // Build search options
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      categoryName: category || categoryName,
      city: city || location,
      state,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      condition,
      sort,
      status: 'APPROVED',
    };

    // Search using Meilisearch
    const results = await searchAds(searchQuery, options);
    
    const processingTime = Date.now() - startTime;

    // Log search analytics
    logger.info({
      type: 'search',
      query: searchQuery,
      category: options.categoryName,
      location: options.city,
      resultsCount: results.total,
      processingTime,
    });

    res.json({
      success: true,
      query: searchQuery,
      hits: results.hits,
      total: results.total,
      page: results.page,
      limit: results.limit,
      totalPages: results.pages,
      processingTime,
    });
  } catch (error) {
    logger.error({ err: error.message }, 'Search error');
    
    // Fallback to database search
    try {
      const {
        q,
        query,
        category,
        categoryName,
        location,
        city,
        page = 1,
        limit = 20,
        minPrice,
        maxPrice,
        condition,
        sort = 'newest',
      } = req.query;

      const searchQuery = q || query || '';
      const where = {
        status: 'APPROVED',
        OR: searchQuery ? [
          { title: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } },
        ] : undefined,
      };

      if (category || categoryName) {
        where.category = { name: category || categoryName };
      }

      if (city || location) {
        where.city = city || location;
      }

      if (minPrice) {
        where.price = { ...where.price, gte: parseFloat(minPrice) };
      }

      if (maxPrice) {
        where.price = { ...where.price, lte: parseFloat(maxPrice) };
      }

      if (condition) {
        where.condition = condition;
      }

      const orderBy = [];
      switch (sort) {
        case 'oldest':
          orderBy.push({ createdAt: 'asc' });
          break;
        case 'price_low':
          orderBy.push({ price: 'asc' });
          break;
        case 'price_high':
          orderBy.push({ price: 'desc' });
          break;
        default:
          orderBy.push({ createdAt: 'desc' });
      }

      const [ads, total] = await Promise.all([
        prisma.ad.findMany({
          where,
          orderBy,
          skip: (parseInt(page, 10) - 1) * parseInt(limit, 10),
          take: parseInt(limit, 10),
          include: {
            category: { select: { id: true, name: true, slug: true } },
            subcategory: { select: { id: true, name: true, slug: true } },
            location: { select: { id: true, name: true, slug: true } },
            user: { select: { id: true, name: true, avatar: true } },
          },
        }),
        prisma.ad.count({ where }),
      ]);

      res.json({
        success: true,
        query: searchQuery,
        hits: ads,
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10)),
        processingTime: Date.now() - Date.now(),
        fallback: true,
      });
    } catch (fallbackError) {
      logger.error({ err: fallbackError.message }, 'Fallback search error');
      res.status(500).json({
        success: false,
        error: 'Search failed',
        message: 'Unable to perform search',
      });
    }
  }
});

/**
 * GET /api/search/suggestions
 * Autocomplete suggestions for search
 * 
 * Query params:
 * - q: search query (min 2 chars)
 * - limit: number of suggestions (default: 8)
 */
router.get('/suggestions', cacheMiddleware(60), async (req, res) => {
  try {
    const { q, query, limit = 8 } = req.query;
    const searchQuery = q || query || '';

    if (!searchQuery || searchQuery.trim().length < 2) {
      return res.json({
        success: true,
        suggestions: [],
      });
    }

    const suggestions = await getSearchSuggestions(searchQuery, parseInt(limit, 10));

    res.json({
      success: true,
      query: searchQuery,
      suggestions,
    });
  } catch (error) {
    logger.error({ err: error.message }, 'Suggestions error');
    res.json({
      success: true,
      suggestions: [],
    });
  }
});

/**
 * GET /api/search/trending
 * Get trending/popular searches
 * 
 * Query params:
 * - limit: number of trending searches (default: 10)
 */
router.get('/trending', cacheMiddleware(300), async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // For now, return hardcoded popular searches
    // In production, this would be calculated from search analytics
    const trending = [
      { query: 'iPhone', count: 1250 },
      { query: 'Car', count: 980 },
      { query: 'Laptop', count: 850 },
      { query: 'Bike', count: 720 },
      { query: 'House', count: 650 },
      { query: 'TV', count: 540 },
      { query: 'Furniture', count: 480 },
      { query: 'Mobile', count: 420 },
      { query: 'Apartment', count: 380 },
      { query: 'Job', count: 320 },
    ].slice(0, parseInt(limit, 10));

    res.json({
      success: true,
      trending,
    });
  } catch (error) {
    logger.error({ err: error.message }, 'Trending searches error');
    res.json({
      success: true,
      trending: [],
    });
  }
});

/**
 * POST /api/search/bump/:id
 * Bump ad to top (requires authentication)
 * 
 * Updates createdAt to current time and re-indexes
 */
router.post('/bump/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if ad belongs to user
    const ad = await prisma.ad.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!ad) {
      return res.status(404).json({
        success: false,
        error: 'Ad not found',
      });
    }

    if (ad.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Bump the ad
    const success = await bumpAd(id, prisma);

    if (success) {
      res.json({
        success: true,
        message: 'Ad bumped successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to bump ad',
      });
    }
  } catch (error) {
    logger.error({ err: error.message, adId: req.params.id }, 'Bump ad error');
    res.status(500).json({
      success: false,
      error: 'Failed to bump ad',
    });
  }
});

/**
 * GET /api/search/recent
 * Get user's recent searches (from localStorage on client)
 * This is a placeholder - actual implementation is client-side
 */
router.get('/recent', authenticate, async (req, res) => {
  try {
    // In a real implementation, you might store this in the database
    // For now, return empty array (client handles this with localStorage)
    res.json({
      success: true,
      recent: [],
    });
  } catch (error) {
    logger.error({ err: error.message }, 'Recent searches error');
    res.json({
      success: true,
      recent: [],
    });
  }
});

/**
 * GET /api/search/home-feed
 * Get home feed with geo-location support (OLX-style)
 * 
 * Query params:
 * - userLat: User latitude
 * - userLng: User longitude
 * - city: User city
 * - limit: Results per section (default: 20)
 * - radiusInMeters: Search radius (default: 50000 = 50km)
 */
router.get('/home-feed', cacheMiddleware(60), async (req, res) => {
  try {
    const {
      userLat,
      userLng,
      city,
      limit = 20,
      radiusInMeters = 50000,
    } = req.query;

    const results = await getHomeFeedWithGeo({
      userLat: userLat ? parseFloat(userLat) : undefined,
      userLng: userLng ? parseFloat(userLng) : undefined,
      city,
      limit: parseInt(limit, 10),
      radiusInMeters: parseInt(radiusInMeters, 10),
    });

    res.json({
      success: true,
      ...results,
    });
  } catch (error) {
    logger.error({ err: error.message }, 'Home feed error');
    
    // Fallback to basic feed without geo
    try {
      const results = await getHomeFeedWithGeo({
        limit: parseInt(req.query.limit || 20, 10),
      });
      
      res.json({
        success: true,
        ...results,
        fallback: true,
      });
    } catch (fallbackError) {
      logger.error({ err: fallbackError.message }, 'Home feed fallback error');
      res.status(500).json({
        success: false,
        error: 'Failed to fetch home feed',
      });
    }
  }
});

module.exports = router;
