const express = require('express');
const { query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { searchAds, autocomplete } = require('../services/meilisearch');
const { saveSearchQuery } = require('../services/searchAlerts');
const { authenticate } = require('../middleware/auth');

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
    query('location').optional().isString(),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
    query('condition').optional().isIn(['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED']),
    query('sort').optional().isIn(['newest', 'oldest', 'price_low', 'price_high', 'featured', 'bumped']),
    query('latitude').optional().isFloat(),
    query('longitude').optional().isFloat(),
    query('radius').optional().isFloat({ min: 0 }), // Radius in kilometers
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
        location,
        minPrice,
        maxPrice,
        condition,
        sort = 'newest',
        latitude,
        longitude,
        radius = 50, // Default 50km radius
      } = req.query;

      // Resolve category, subcategory, and location IDs
      const [categoryObj, subcategoryObj, locationObj] = await Promise.all([
        category ? prisma.category.findUnique({ where: { slug: category }, select: { id: true } }) : null,
        subcategory ? prisma.subcategory.findFirst({ where: { slug: subcategory }, select: { id: true } }) : null,
        location ? prisma.location.findUnique({ where: { slug: location }, select: { id: true } }) : null,
      ]);

      // Search using Meilisearch
      const searchResults = await searchAds(q, {
        page: parseInt(page),
        limit: parseInt(limit),
        categoryId: categoryObj?.id,
        subcategoryId: subcategoryObj?.id,
        locationId: locationObj?.id,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        condition,
        sort,
        status: 'APPROVED',
      });

      // Get full ad details from database using IDs from search results
      const adIds = searchResults.hits.map(hit => hit.id);
      
      if (adIds.length === 0) {
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

      const ads = await prisma.ad.findMany({
        where: {
          id: { in: adIds },
          status: 'APPROVED',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          subcategory: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          location: {
            select: {
              id: true,
              name: true,
              slug: true,
              latitude: true,
              longitude: true,
            },
          },
        },
      });

      // Maintain search result order
      const adsMap = new Map(ads.map(ad => [ad.id, ad]));
      let orderedAds = adIds.map(id => adsMap.get(id)).filter(Boolean);

      // Calculate distance if latitude/longitude provided
      if (latitude && longitude) {
        const userLat = parseFloat(latitude);
        const userLng = parseFloat(longitude);
        const radiusKm = parseFloat(radius) || 50;

        // Haversine formula to calculate distance
        const calculateDistance = (lat1, lon1, lat2, lon2) => {
          const R = 6371; // Earth's radius in kilometers
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c; // Distance in kilometers
        };

        orderedAds = orderedAds
          .map(ad => {
            if (ad.location?.latitude && ad.location?.longitude) {
              const distance = calculateDistance(
                userLat,
                userLng,
                ad.location.latitude,
                ad.location.longitude
              );
              return { ...ad, distance };
            }
            return { ...ad, distance: null };
          })
          .filter(ad => {
            // Filter by radius if location has coordinates
            if (ad.location?.latitude && ad.location?.longitude) {
              return ad.distance <= radiusKm;
            }
            // Include ads without location coordinates if no location filter
            return !locationObj;
          })
          .sort((a, b) => {
            // Sort by distance if available, otherwise by original order
            if (a.distance !== null && b.distance !== null) {
              return a.distance - b.distance;
            }
            if (a.distance !== null) return -1;
            if (b.distance !== null) return 1;
            return 0;
          });
      }

      // Post-process to prioritize premium ads
      const premiumAds = orderedAds.filter(ad => ad.isPremium);
      const regularAds = orderedAds.filter(ad => !ad.isPremium);
      
      // Sort premium ads by type (TOP > FEATURED > BUMP_UP), then by distance if available
      premiumAds.sort((a, b) => {
        // First sort by premium type
        const typeOrder = { TOP: 0, FEATURED: 1, BUMP_UP: 2 };
        const aOrder = typeOrder[a.premiumType] ?? 3;
        const bOrder = typeOrder[b.premiumType] ?? 3;
        if (aOrder !== bOrder) return aOrder - bOrder;
        
        // Then sort by distance if available
        if (a.distance !== null && b.distance !== null) {
          return a.distance - b.distance;
        }
        if (a.distance !== null) return -1;
        if (b.distance !== null) return 1;
        return 0;
      });

      // Sort regular ads by distance if available
      if (latitude && longitude) {
        regularAds.sort((a, b) => {
          if (a.distance !== null && b.distance !== null) {
            return a.distance - b.distance;
          }
          if (a.distance !== null) return -1;
          if (b.distance !== null) return 1;
          return 0;
        });
      }

      const finalAds = [...premiumAds, ...regularAds];

      // Save search query for alerts (async, don't wait)
      if (q && q.trim().length > 0) {
        const userId = req.user?.id;
        const userEmail = req.user?.email;
        
        // Only save if user has email
        if (userEmail) {
          const filters = {};
          if (category) filters.category = category;
          if (location) filters.location = location;
          if (minPrice) filters.minPrice = minPrice;
          if (maxPrice) filters.maxPrice = maxPrice;
          if (condition) filters.condition = condition;
          
          // Save asynchronously, don't wait for completion
          saveSearchQuery(q, userId, userEmail, category, location, filters).catch(err => {
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
    const trending = await prisma.category.findMany({
      take: parseInt(limit),
      where: { isActive: true },
      orderBy: { _count: { ads: 'desc' } },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: { ads: true }
        }
      }
    });

    res.json({
      success: true,
      trending: trending.map(cat => ({
        query: cat.name,
        count: cat._count.ads,
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

