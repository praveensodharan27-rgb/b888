/**
 * Home Feed API - OLX-style with Paid Ads Priority + Geo-Location
 * 
 * Priority Order:
 * 1. Paid ads (Top/Featured) + nearest distance
 * 2. Paid ads (Top/Featured) + far distance
 * 3. Free ads + nearest distance
 * 4. Free ads + other cities
 */

const express = require('express');
const router = express.Router();
const { client, getIsMeilisearchAvailable } = require('../services/meilisearch');
const { logger } = require('../src/config/logger');
const { cacheMiddleware } = require('../middleware/cache');
const { MongoClient } = require('mongodb');

const INDEX_NAME = process.env.MEILI_INDEX || process.env.MEILISEARCH_INDEX || 'ads';

// MongoDB connection for fallback
let mongoClient = null;
async function getMongoDb() {
  if (!mongoClient) {
    mongoClient = new MongoClient(process.env.DATABASE_URL);
    await mongoClient.connect();
  }
  return mongoClient.db('olx_app');
}

/**
 * GET /api/home-feed
 * Get home feed with paid ads priority and geo-location sorting
 * 
 * Query params:
 * - userLat: User latitude (optional)
 * - userLng: User longitude (optional)
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 20)
 */
router.get('/', async (req, res) => {
  // Disable caching - always return fresh data
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });
  try {
    const {
      userLat,
      userLng,
      page = 1,
      limit = 20,
    } = req.query;

    // Check if Meilisearch is available - fallback to MongoDB if not
    const useMeilisearch = getIsMeilisearchAvailable();
    
    if (!useMeilisearch) {
      logger.warn('Meilisearch unavailable, falling back to MongoDB');
      
      // MongoDB fallback
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;
      
      const db = await getMongoDb();
      const adsCollection = db.collection('ads');
      
      const now = new Date();
      const query = {
        status: 'APPROVED',
        $or: [
          { adExpiryDate: null },
          { adExpiryDate: { $gt: now } }
        ]
      };
      
      // Add location-based filtering if provided
      if (req.query.city) {
        query.city = { $regex: new RegExp(req.query.city, 'i') };
      }
      if (req.query.state) {
        query.state = { $regex: new RegExp(req.query.state, 'i') };
      }
      
      // Sort by priority: featured/premium first, then newest (mirrors Meilisearch ranking)
      const ads = await adsCollection.find(query)
        .sort([
          ['isTopAdActive', -1],
          ['isFeaturedActive', -1],
          ['isBumpActive', -1],
          ['isPremium', -1],
          ['planPriority', -1],
          ['createdAt', -1],
        ])
        .skip(skip)
        .limit(limitNum)
        .project({
          _id: 0,
          id: { $toString: '$_id' },
          title: 1,
          price: 1,
          images: 1,
          categoryName: 1,
          category: 1,
          subcategory: 1,
          location: 1,
          city: 1,
          state: 1,
          slug: 1,
          planType: 1,
          isTopAdActive: 1,
          isFeaturedActive: 1,
          isUrgent: 1,
          isBumpActive: 1,
          createdAt: 1,
          userId: { $toString: '$userId' },
          // Specifications/Attributes
          attributes: 1,
          specifications: 1,
          // Additional fields for ad card
          categorySlug: 1,
          subcategorySlug: 1,
          locationSlug: 1,
          locationName: 1,
          postedAt: 1,
          isPremium: 1,
          premiumType: 1,
          premiumExpiresAt: 1
        })
        .toArray();
      
      const total = await adsCollection.countDocuments(query);
      
      return res.json({
        success: true,
        ads,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
        hasUserLocation: false,
        fallback: 'mongodb'
      });
    }

    const index = client.index(INDEX_NAME);
    const now = Date.now();
    
    // Build filter to exclude expired ads
    const filter = `(adExpiryDate IS NULL OR adExpiryDate > ${now})`;
    
    // Build sort array based on location availability
    let sort = [];
    
    if (userLat && userLng) {
      // WITH USER LOCATION: Use ranking score, then distance, then recency
      const lat = parseFloat(userLat);
      const lng = parseFloat(userLng);
      
      sort = [
        'rankingScore:desc',                     // Primary: Precomputed ranking score
        `_geoPoint(${lat}, ${lng}):asc`,        // Secondary: Distance (nearest first)
        'createdAt:desc',                        // Tertiary: Newest
      ];
    } else {
      // WITHOUT USER LOCATION: Use ranking score, then recency
      sort = [
        'rankingScore:desc',     // Primary: Precomputed ranking score
        'createdAt:desc',        // Secondary: Newest
      ];
    }

    // Execute search with optimized attributes (reduced payload)
    const results = await index.search('', {
      filter,
      sort,
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      attributesToRetrieve: [
        'id',
        'title',
        'price',
        'images',
        'categoryName',
        'category',
        'subcategory',
        'location',
        'city',
        'state',
        'slug',
        '_geo',
        'planType',
        'planPriority',
        'rankingScore',
        'isTopAdActive',
        'isFeaturedActive',
        'isUrgent',
        'isBumpActive',
        'createdAt',
        'userId',
        // Specifications and additional fields
        'attributes',
        'specifications',
        'categorySlug',
        'subcategorySlug',
        'locationSlug',
        'locationName',
        'postedAt',
        'isPremium',
        'premiumType',
        'premiumExpiresAt',
      ],
    });

    // Calculate distance for each ad if user location is available
    const ads = results.hits.map(ad => {
      const adData = { ...ad };
      
      // Calculate distance if both user and ad have coordinates
      if (userLat && userLng && ad._geo?.lat && ad._geo?.lng) {
        const distance = calculateDistance(
          parseFloat(userLat),
          parseFloat(userLng),
          ad._geo.lat,
          ad._geo.lng
        );
        adData.distance = distance;
        adData.distanceText = formatDistance(distance);
      }
      
      return adData;
    });

    res.json({
      success: true,
      ads,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: results.estimatedTotalHits || 0,
        totalPages: Math.ceil((results.estimatedTotalHits || 0) / parseInt(limit, 10)),
      },
      hasUserLocation: !!(userLat && userLng),
    });

  } catch (error) {
    logger.error({ err: error.message }, 'Home feed error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch home feed',
      message: error.message,
    });
  }
});

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude 1
 * @param {number} lng1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lng2 - Longitude 2
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Format distance for display
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance
 */
function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)}m away`;
  } else if (meters < 10000) {
    return `${(meters / 1000).toFixed(1)}km away`;
  } else {
    return `${Math.round(meters / 1000)}km away`;
  }
}

module.exports = router;
