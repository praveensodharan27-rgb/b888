const express = require('express');
const { query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { searchAds, autocomplete } = require('../services/meilisearch');
const { saveSearchQuery } = require('../services/searchAlerts');
const { authenticate } = require('../middleware/auth');
const { rankAds } = require('../services/adRankingService');
const { rankAdsWithSmartScoring, getCurrentLocationFromRequest } = require('../services/smartAdScoringService');
const { advancedSearch } = require('../services/advancedSearchService');
const { rankAdsWithPriority } = require('../services/priorityAdRankingService');
const { getUserLastCategory, storeSearchQuery: storePersonalizedSearchQuery } = require('../services/searchPersonalizationService');
const { generateCacheKey, getCachedResults, setCache } = require('../services/searchCacheService');

const router = express.Router();
const prisma = new PrismaClient();

// Advanced search ads with multi-parameter support and priority ranking
router.get('/',
  [
    query('q').optional().isString(),
    query('keyword').optional().isString(), // Alias for q
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('category').optional().isString(),
    query('subcategory').optional().isString(),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
    query('condition').optional().isIn(['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED']),
    query('sort').optional().isIn(['newest', 'oldest', 'price_low', 'price_high', 'featured', 'bumped']),
    query('city').optional().isString(),
    query('state').optional().isString(),
    query('district').optional().isString(),
    query('neighbourhood').optional().isString(),
    query('pincode').optional().isString(),
    query('place').optional().isString(), // Generic place name
    query('location').optional().isString() // Location slug
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const startTime = Date.now();
      
      const {
        q = '',
        keyword = '',
        page = 1,
        limit = 20,
        category,
        subcategory,
        minPrice,
        maxPrice,
        condition,
        sort = 'newest',
        city,
        state,
        district,
        neighbourhood,
        pincode,
        place,
        location: locationSlug
      } = req.query;
      
      // Use keyword or q (keyword takes priority)
      const searchKeyword = keyword || q;
      
      // Check cache first
      const cacheKey = generateCacheKey({
        keyword: searchKeyword,
        category,
        subcategory,
        city,
        state,
        district,
        neighbourhood,
        pincode,
        place,
        minPrice,
        maxPrice,
        condition,
        sort,
        page,
        limit
      });
      
      const cachedResult = getCachedResults(cacheKey);
      if (cachedResult) {
        console.log(`⚡ Cache hit for search: ${searchKeyword}`);
        return res.json(cachedResult);
      }

      // Get current location from navbar (LOCATION-FIRST CONTEXT)
      let currentLocation = null;
      if (city || state || district || neighbourhood) {
        currentLocation = { city, state, district, neighbourhood };
      } else if (locationSlug) {
        try {
          const location = await prisma.location.findFirst({
            where: { slug: locationSlug },
            select: { city: true, state: true, neighbourhood: true }
          });
          if (location) {
            currentLocation = {
              city: location.city,
              state: location.state,
              neighbourhood: location.neighbourhood
            };
          }
        } catch (error) {
          console.error('Error fetching location:', error);
        }
      }
      
      // Get user's last searched category for personalization
      const userId = req.user?.id;
      const userEmail = req.user?.email;
      const userLastCategory = await getUserLastCategory(userId, userEmail);

      // Use advanced search service for multi-parameter search
      const searchParams = {
        keyword: searchKeyword,
        category,
        subcategory,
        place,
        district,
        city,
        neighbourhood,
        pincode,
        state,
        minPrice,
        maxPrice,
        condition,
        sort,
        page: parseInt(page),
        limit: parseInt(limit)
      };
      
      // Perform advanced search
      const searchResult = await advancedSearch(searchParams);
      let ads = searchResult.ads;
      
      // STEP 2: Apply priority-based ranking with 5-hour rotation
      const locationKey = currentLocation?.city || currentLocation?.state || 'all';
      const rankedAds = await rankAdsWithPriority(ads, {
        locationKey,
        updateLastShown: true,
        userLastCategory: userLastCategory || category // Use last category or current category
      });
      
      // Apply pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const orderedAds = rankedAds.slice(skip, skip + parseInt(limit));
      
      const finalAds = orderedAds;

      // Prepare response
      const response = {
        success: true,
        ads: finalAds,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: rankedAds.length,
          pages: Math.ceil(rankedAds.length / parseInt(limit)),
        },
      };
      
      // Cache the result
      setCache(cacheKey, response);
      
      // Save search query for alerts and personalization (async, don't wait)
      if (searchKeyword && searchKeyword.trim().length > 0) {
        const filters = {};
        if (category) filters.category = category;
        if (minPrice) filters.minPrice = minPrice;
        if (maxPrice) filters.maxPrice = maxPrice;
        if (condition) filters.condition = condition;
        
        const locationString = currentLocation?.city || currentLocation?.state || null;
        
        // Save for alerts (existing system)
        if (userEmail) {
          saveSearchQuery(searchKeyword, userId, userEmail, category, null, filters).catch(err => {
            console.error('Error saving search query for alerts:', err);
          });
        }
        
        // Save for personalization (new system)
        storePersonalizedSearchQuery(searchKeyword, userId, userEmail, category, locationString).catch(err => {
          console.error('Error storing search query for personalization:', err);
        });
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`⚡ Advanced search completed in ${duration}ms: ${searchKeyword}`);
      
      // Ensure search completes within 300ms (log warning if slower)
      if (duration > 300) {
        console.warn(`⚠️ Search took ${duration}ms (target: <300ms)`);
      }
      
      res.json(response);
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({
        success: false,
        message: 'Search failed. Please try again.',
      });
    }
  }
);

// Get trending searches
router.get('/trending', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get trending search queries (you may need to track searches)
    // For now, returning popular categories/subcategories
    // Note: Prisma doesn't support ordering by _count directly, so we fetch all and sort in JavaScript
    const allCategories = await prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: { ads: true }
        }
      }
    });

    // Sort by ad count (descending) and take top N
    const trending = allCategories
      .sort((a, b) => (b._count?.ads || 0) - (a._count?.ads || 0))
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      trending: trending.map(cat => ({
        query: cat.name,
        count: cat._count?.ads || 0,
        type: 'category',
        slug: cat.slug
      }))
    });
  } catch (error) {
    console.error('Get trending searches error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch trending searches' });
  }
});

// Autocomplete endpoint
router.get('/autocomplete',
  [
    query('q').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 10 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { q = '', limit = 5 } = req.query;
      
      // If query is empty, return popular searches and categories
      if (!q || q.trim().length < 2) {
        try {
          // Get popular categories with ad count
          const popularCategories = await prisma.category.findMany({
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              slug: true,
              icon: true,
              _count: {
                select: { 
                  ads: { 
                    where: { 
                      status: 'APPROVED',
                      OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: new Date() } }
                      ]
                    } 
                  } 
                }
              }
            },
            take: 5,
            orderBy: { order: 'asc' }
          });

          // Sort by ad count (descending)
          popularCategories.sort((a, b) => (b._count?.ads || 0) - (a._count?.ads || 0));

          const categorySuggestions = popularCategories.map(cat => ({
            type: 'category',
            title: cat.name,
            category: cat.name,
            slug: cat.slug,
            icon: cat.icon,
            count: cat._count?.ads || 0,
          }));

          return res.json({
            success: true,
            suggestions: categorySuggestions,
            type: 'popular',
          });
        } catch (categoryError) {
          console.error('Error fetching popular categories:', categoryError);
          // Fallback: return empty suggestions instead of crashing
          return res.json({
            success: true,
            suggestions: [],
            type: 'popular',
          });
        }
      }
      
      // Get autocomplete suggestions from Meilisearch (gracefully handle errors)
      let suggestions = [];
      try {
        suggestions = await autocomplete(q, parseInt(limit));
        // Ensure suggestions is an array
        if (!Array.isArray(suggestions)) {
          suggestions = [];
        }
      } catch (autocompleteError) {
        console.warn('⚠️ Autocomplete error (non-fatal):', autocompleteError.message);
        suggestions = [];
      }
      
      // Also get category matches
      let categoryMatches = [];
      try {
        categoryMatches = await prisma.category.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { slug: { contains: q, mode: 'insensitive' } },
            ],
            isActive: true,
          },
          take: 3,
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
          }
        });
      } catch (categoryMatchError) {
        console.warn('⚠️ Error fetching category matches:', categoryMatchError.message);
        categoryMatches = [];
      }

      const categoryResults = categoryMatches.map(cat => ({
        type: 'category',
        title: cat.name,
        category: cat.name,
        slug: cat.slug,
        icon: cat.icon,
      }));

      // Combine results: categories first, then product suggestions
      const allSuggestions = [
        ...categoryResults,
        ...suggestions.map(s => ({ ...s, type: 'product' }))
      ];

      res.json({
        success: true,
        suggestions: allSuggestions.slice(0, parseInt(limit) + 3),
        type: 'search',
      });
    } catch (error) {
      console.error('Autocomplete error:', error);
      // Always return success with empty suggestions instead of 500 error
      res.json({
        success: true,
        message: 'Autocomplete failed, returning empty results',
        suggestions: [],
        type: 'search',
      });
    }
  }
);

module.exports = router;

