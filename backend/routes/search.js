const express = require('express');
const { query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { searchAds, autocomplete } = require('../services/meilisearch');
const { saveSearchQuery } = require('../services/searchAlerts');
const { authenticate } = require('../middleware/auth');
const { rankAds } = require('../services/adRankingService');
const { rankAdsWithSmartScoring, getCurrentLocationFromRequest } = require('../services/smartAdScoringService');

const router = express.Router();
const prisma = new PrismaClient();

// Search ads using Meilisearch
router.get('/',
  [
    query('q').optional().isString(),
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
    query('location').optional().isString() // Location slug
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const {
        q = '',
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
        location: locationSlug
      } = req.query;

      // Get current location from navbar (LOCATION-FIRST CONTEXT)
      let currentLocation = null;
      if (city || state) {
        currentLocation = { city, state };
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

      // IMPORTANT: If search keyword exists, ignore category/subcategory filters (search overrides category)
      const shouldIgnoreCategory = q && q.trim();
      
      // Resolve category and subcategory IDs
      const [categoryObj, subcategoryObj] = await Promise.all([
        (!shouldIgnoreCategory && category) ? prisma.category.findUnique({ where: { slug: category }, select: { id: true } }) : null,
        (!shouldIgnoreCategory && subcategory) ? prisma.subcategory.findFirst({ where: { slug: subcategory }, select: { id: true } }) : null,
      ]);

      // STEP 1: Search using Meilisearch (get all matching ads)
      const searchResults = await searchAds(q, {
        page: 1,
        limit: 200, // Fetch more to allow city/state filtering
        categoryId: (!shouldIgnoreCategory && categoryObj) ? categoryObj.id : undefined,
        subcategoryId: (!shouldIgnoreCategory && subcategoryObj) ? subcategoryObj.id : undefined,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        condition,
        sort,
        status: 'APPROVED',
      });

      // Get all ad IDs from search results
      const allAdIds = searchResults.hits.map(hit => hit.id);
      
      if (allAdIds.length === 0) {
        return res.json({
          success: true,
          ads: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0,
          },
        });
      }

      // STEP 2: CITY-FIRST FILTERING - Get ads from selected city first
      const adSelectFields = {
        id: true,
        title: true,
        description: true,
        price: true,
        originalPrice: true,
        discount: true,
        condition: true,
        images: true,
        status: true,
        isPremium: true,
        premiumType: true,
        isUrgent: true,
        views: true,
        expiresAt: true,
        createdAt: true,
        postedAt: true,
        packageType: true,
        lastShownAt: true,
        userId: true,
        city: true,
        state: true,
        slug: true,
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
        location: { select: { id: true, name: true, slug: true, latitude: true, longitude: true, city: true, state: true } },
        user: { select: { id: true, name: true, avatar: true } }
      };

      const now = new Date();
      let cityAds = [];
      let stateAds = [];
      let ads = [];

      // Priority 1: Fetch ads from same city (if location available)
      if (currentLocation && currentLocation.city) {
        cityAds = await prisma.ad.findMany({
          where: {
            id: { in: allAdIds },
            status: 'APPROVED',
            city: currentLocation.city,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } }
            ]
          },
          select: adSelectFields,
          take: 100 // Limit to prevent too many results
        });

        console.log(`📍 Search: Found ${cityAds.length} ads in city: ${currentLocation.city}`);
      }

      // Priority 2: If city results are low (< 10), fetch state-level ads as fallback
      if (cityAds.length < 10 && currentLocation && currentLocation.state) {
        // Get state-level ads (excluding city ads already fetched)
        const cityAdIds = new Set(cityAds.map(ad => ad.id));
        
        stateAds = await prisma.ad.findMany({
          where: {
            id: { in: allAdIds.filter(id => !cityAdIds.has(id)) },
            status: 'APPROVED',
            state: currentLocation.state,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } }
            ]
          },
          select: adSelectFields,
          take: 50 // Limit state ads
        });

        console.log(`📍 Search: Found ${stateAds.length} additional ads in state: ${currentLocation.state}`);
      }

      // Combine: City ads first, then state ads (if city results are low)
      if (cityAds.length >= 10) {
        // Enough city results - use only city ads
        ads = cityAds;
      } else {
        // Low city results - combine city + state ads
        ads = [...cityAds, ...stateAds];
      }

      // If no location or no location-based results, use all search results
      if (ads.length === 0) {
        ads = await prisma.ad.findMany({
          where: {
            id: { in: allAdIds.slice(0, 100) },
            status: 'APPROVED',
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } }
            ]
          },
          select: adSelectFields
        });
      }

      // STEP 3: Apply smart ranking with location boost (isSearch = true for higher location boost)
      const rankedAds = rankAdsWithSmartScoring(ads, {
        query: q,
        currentLocation,
        isSearch: true // Enable search location boost
      });

      // Apply pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const orderedAds = rankedAds.slice(skip, skip + parseInt(limit));

      const finalAds = orderedAds;

      // Save search query for alerts (async, don't wait)
      if (q && q.trim().length > 0) {
        const userId = req.user?.id;
        const userEmail = req.user?.email;
        
        // Only save if user has email
        if (userEmail) {
          const filters = {};
          if (category) filters.category = category;
          if (minPrice) filters.minPrice = minPrice;
          if (maxPrice) filters.maxPrice = maxPrice;
          if (condition) filters.condition = condition;
          
          // Save asynchronously, don't wait for completion
          saveSearchQuery(q, userId, userEmail, category, null, filters).catch(err => {
            console.error('Error saving search query:', err);
          });
        }
      }

      res.json({
        success: true,
        ads: finalAds,
        pagination: {
          page: searchResults.page,
          limit: searchResults.limit,
          total: searchResults.total,
          pages: searchResults.pages,
        },
      });
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

