const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { uploadImages } = require('../middleware/upload');
const { cacheMiddleware, clearCache } = require('../middleware/cache');
const { indexAd, deleteAd } = require('../services/meilisearch');
const { moderateAd, getModerationStatus } = require('../services/contentModeration');
const Razorpay = require('razorpay');

// Ensure dotenv is loaded
require('dotenv').config();

const router = express.Router();
const prisma = new PrismaClient();

// Initialize Razorpay (only if keys are provided)
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
  console.log('✅ Razorpay initialized in ads route');
} else {
  console.warn('⚠️ Razorpay not initialized in ads route - keys missing');
}

// Ad posting price (in INR)
const AD_POSTING_PRICE = 49;
const FREE_ADS_LIMIT = 2;

// Get all ads with filters, search, and sorting
router.get('/',
  cacheMiddleware(60 * 1000), // Cache for 60 seconds (increased from 30)
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('category').optional().isString(),
    query('subcategory').optional().isString(),
    query('location').optional().isString(),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
    query('search').optional().isString(),
    query('condition').optional().isIn(['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED']),
    query('sort').optional().isIn(['newest', 'oldest', 'price_low', 'price_high', 'featured', 'bumped']),
    query('latitude').optional().isFloat(),
    query('longitude').optional().isFloat(),
    query('radius').optional().isFloat({ min: 0 }) // Radius in kilometers
  ],
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        subcategory,
        location,
        minPrice,
        maxPrice,
        search,
        condition,
        sort = 'newest',
        latitude,
        longitude,
        radius = 50, // Default 50km radius
        userId // Filter by user ID
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const now = new Date();
      const where = {
        status: 'APPROVED',
        // Filter out expired ads
        AND: [
          {
            OR: [
              { expiresAt: null }, // Ads without expiration (legacy)
              { expiresAt: { gt: now } } // Ads that haven't expired yet
            ]
          }
        ]
      };

      // Parallelize category, subcategory, and location lookups
      const [categoryObj, subcategoryObj, locationObj] = await Promise.all([
        category ? prisma.category.findUnique({ where: { slug: category }, select: { id: true } }) : null,
        subcategory ? prisma.subcategory.findFirst({ where: { slug: subcategory }, select: { id: true } }) : null,
        location ? prisma.location.findUnique({ where: { slug: location }, select: { id: true } }) : null,
      ]);

      if (categoryObj) {
        where.categoryId = categoryObj.id;
      }

      if (subcategoryObj) {
        where.subcategoryId = subcategoryObj.id;
      }

      if (locationObj) {
        where.locationId = locationObj.id;
      }

      // Price filter
      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price.gte = parseFloat(minPrice);
        if (maxPrice) where.price.lte = parseFloat(maxPrice);
      }

      // Condition filter
      if (condition) {
        where.condition = condition;
      }

      // User ID filter
      if (userId) {
        where.userId = userId;
      }

      // Search - optimized with case-insensitive search
      if (search) {
        where.AND.push({
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        });
      }

      // Sorting - Premium ads always appear first
      // Priority: isPremium (desc) > premiumType (TOP > FEATURED > BUMP_UP) > selected sort criteria
      let orderBy = [];
      
      // First priority: Premium ads first (isPremium desc)
      // Second priority: Premium type (TOP > FEATURED > BUMP_UP)
      // We'll handle this in post-processing since Prisma doesn't support custom enum ordering easily
      
      // Third priority: Selected sort criteria
      switch (sort) {
        case 'oldest':
          orderBy = [{ isPremium: 'desc' }, { createdAt: 'asc' }];
          break;
        case 'price_low':
          orderBy = [{ isPremium: 'desc' }, { price: 'asc' }, { createdAt: 'desc' }];
          break;
        case 'price_high':
          orderBy = [{ isPremium: 'desc' }, { price: 'desc' }, { createdAt: 'desc' }];
          break;
        case 'featured':
          orderBy = [{ isPremium: 'desc' }, { featuredAt: 'desc' }, { createdAt: 'desc' }];
          break;
        case 'bumped':
          orderBy = [{ isPremium: 'desc' }, { bumpedAt: 'desc' }, { createdAt: 'desc' }];
          break;
        default:
          // newest: Premium first, then by creation date
          orderBy = [{ isPremium: 'desc' }, { createdAt: 'desc' }];
          break;
      }

      // Optimized query with parallel execution and minimal data selection
      const [ads, total] = await Promise.all([
        prisma.ad.findMany({
          where,
          select: {
            id: true,
            title: true,
            description: true, // Added back for AdCard display
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
            updatedAt: true,
            attributes: true, // Include attributes for Product Specifications
            category: { select: { id: true, name: true, slug: true } },
            subcategory: { select: { id: true, name: true, slug: true } },
            location: { select: { id: true, name: true, slug: true, latitude: true, longitude: true } },
            user: { select: { id: true, name: true, avatar: true, phone: true, showPhone: true, isVerified: true } },
            _count: { select: { favorites: true } }
          },
          orderBy,
          skip,
          take: parseInt(limit)
        }),
        prisma.ad.count({ where })
      ]);

      // Calculate distance if latitude/longitude provided
      let adsWithDistance = ads;
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

        adsWithDistance = ads
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

      // Ensure all ads have images as arrays
      const adsWithImages = adsWithDistance.map(ad => ({
        ...ad,
        images: Array.isArray(ad.images) ? ad.images.filter(img => img && (typeof img === 'string' ? img.trim() !== '' : true)) : (ad.images && typeof ad.images === 'string' && ad.images.trim() !== '' ? [ad.images] : [])
      }));

      // Sort ads to prioritize premium types: TOP > FEATURED > BUMP_UP > regular
      // Within each tier, sort by newest first (createdAt desc)
      const sortedAds = adsWithImages.sort((a, b) => {
        // 1. Premium ads first
        if (a.isPremium && !b.isPremium) return -1;
        if (!a.isPremium && b.isPremium) return 1;
        
        // 2. If both are premium, sort by premium type priority
        if (a.isPremium && b.isPremium) {
          const premiumPriority = { 'TOP': 1, 'FEATURED': 2, 'BUMP_UP': 3 };
          const aPriority = premiumPriority[a.premiumType] || 4;
          const bPriority = premiumPriority[b.premiumType] || 4;
          
          // If different premium types, sort by priority
          if (aPriority !== bPriority) return aPriority - bPriority;
          
          // 3. If same premium type (e.g., both TOP), sort by newest first (createdAt desc)
          const aDate = new Date(a.createdAt).getTime();
          const bDate = new Date(b.createdAt).getTime();
          return bDate - aDate; // Descending order (newest first)
        }
        
        // 4. For non-premium ads, maintain original order (already sorted by orderBy)
        // This preserves the selected sort option (newest, price, etc.)
        return 0;
      });

      // Filter phone numbers based on privacy settings
      const adsWithPrivacy = sortedAds.map(ad => ({
        ...ad,
        user: ad.user ? {
          ...ad.user,
          phone: ad.user.showPhone ? ad.user.phone : null
        } : ad.user
      }));

      // Set cache headers for GET requests
      res.set({
        'Cache-Control': 'public, max-age=60, s-maxage=120', // Cache for 60s, CDN cache for 120s
        'Vary': 'Accept-Encoding'
      });

      res.json({
        success: true,
        ads: adsWithPrivacy,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Get ads error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch ads' });
    }
  }
);

// Check ad limit status
router.get('/check-limit',
  authenticate,
  async (req, res) => {
    try {
      const now = new Date();
      const FREE_ADS_LIMIT = 2;

      // Get user's free ads usage
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { freeAdsUsed: true }
      });

      const freeAdsUsed = user?.freeAdsUsed || 0;

      // Check if user has any active business packages
      const activeBusinessPackages = await prisma.businessPackage.findMany({
        where: {
          userId: req.user.id,
          status: 'paid',
          expiresAt: {
            gt: now
          }
        },
        select: {
          id: true,
          packageType: true,
          totalAdsAllowed: true,
          adsUsed: true,
          premiumSlotsTotal: true,
          premiumSlotsUsed: true,
          expiresAt: true,
          createdAt: true
        },
        orderBy: {
          expiresAt: 'asc' // Oldest expiry first
        }
      });

      // Calculate total ads remaining from business packages
      const totalAdsRemaining = activeBusinessPackages.reduce((sum, pkg) => {
        const remaining = (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0);
        return sum + remaining;
      }, 0);

      // Check if user can post ads
      const hasFreeAdsRemaining = freeAdsUsed < FREE_ADS_LIMIT;
      const canPost = hasFreeAdsRemaining || totalAdsRemaining > 0;
      const hasLimit = !canPost;

      // Format packages for response
      const packages = activeBusinessPackages.map(pkg => ({
        id: pkg.id,
        packageType: pkg.packageType,
        totalAdsAllowed: pkg.totalAdsAllowed || 0,
        adsUsed: pkg.adsUsed || 0,
        adsRemaining: (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0),
        premiumSlotsTotal: pkg.premiumSlotsTotal || 0,
        premiumSlotsUsed: pkg.premiumSlotsUsed || 0,
        premiumSlotsAvailable: (pkg.premiumSlotsTotal || 0) - (pkg.premiumSlotsUsed || 0),
        expiresAt: pkg.expiresAt,
        createdAt: pkg.createdAt
      }));

      res.json({
        success: true,
        hasLimit,
        canPost,
        freeAdsUsed,
        freeAdsLimit: FREE_ADS_LIMIT,
        freeAdsRemaining: Math.max(0, FREE_ADS_LIMIT - freeAdsUsed),
        activePackagesCount: activeBusinessPackages.length,
        totalAdsRemaining,
        packages,
        // Legacy fields for backward compatibility
        premiumSlotsTotal: activeBusinessPackages.reduce((sum, pkg) => sum + (pkg.premiumSlotsTotal || 0), 0),
        premiumSlotsUsed: activeBusinessPackages.reduce((sum, pkg) => sum + (pkg.premiumSlotsUsed || 0), 0),
        premiumSlotsAvailable: activeBusinessPackages.reduce((sum, pkg) => {
          return sum + ((pkg.premiumSlotsTotal || 0) - (pkg.premiumSlotsUsed || 0));
        }, 0)
      });
    } catch (error) {
      console.error('Check ad limit error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to check ad limit status',
        hasLimit: false,
        canPost: true,
        freeAdsUsed: 0,
        freeAdsLimit: 2,
        activePackagesCount: 0,
        totalAdsRemaining: 0,
        packages: []
      });
    }
  }
);

// Get price suggestion based on similar ads
router.get('/price-suggestion',
  cacheMiddleware(300 * 1000), // Cache for 5 minutes
  [
    query('categoryId').notEmpty().withMessage('Category ID is required'),
    query('subcategoryId').optional().isString(),
    query('condition').optional().isIn(['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed',
          errors: errors.array() 
        });
      }

      const { categoryId, subcategoryId, condition } = req.query;
      const now = new Date();

      // Build where clause for similar ads
      const where = {
        status: 'APPROVED',
        categoryId: categoryId,
        price: { gt: 0 }, // Only include ads with valid prices
        // Filter out expired ads
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } }
            ]
          }
        ]
      };

      // Add subcategory filter if provided
      if (subcategoryId) {
        where.subcategoryId = subcategoryId;
      }

      // Add condition filter if provided
      if (condition) {
        where.condition = condition;
      }

      // Get similar ads with prices
      const similarAds = await prisma.ad.findMany({
        where,
        select: {
          price: true,
          condition: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 100 // Limit to recent 100 ads for better accuracy
      });

      if (similarAds.length === 0) {
        return res.json({
          success: true,
          suggestion: {
            min: null,
            max: null,
            average: null,
            median: null,
            recommended: null,
            sampleSize: 0,
            message: 'No similar ads found to suggest a price'
          }
        });
      }

      // Extract prices and calculate statistics
      const prices = similarAds.map(ad => ad.price).filter(price => price > 0).sort((a, b) => a - b);

      if (prices.length === 0) {
        return res.json({
          success: true,
          suggestion: {
            min: null,
            max: null,
            average: null,
            median: null,
            recommended: null,
            sampleSize: 0,
            message: 'No valid prices found in similar ads'
          }
        });
      }

      // Calculate statistics
      const min = prices[0];
      const max = prices[prices.length - 1];
      const sum = prices.reduce((acc, price) => acc + price, 0);
      const average = Math.round(sum / prices.length);
      
      // Calculate median
      const median = prices.length % 2 === 0
        ? Math.round((prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2)
        : prices[Math.floor(prices.length / 2)];

      // Recommended price: Use median as it's less affected by outliers
      // But also consider average for a balanced suggestion
      const recommended = Math.round((median + average) / 2);

      // Calculate price ranges
      const lowerQuartile = prices[Math.floor(prices.length * 0.25)];
      const upperQuartile = prices[Math.floor(prices.length * 0.75)];

      res.json({
        success: true,
        suggestion: {
          min,
          max,
          average,
          median,
          recommended,
          lowerQuartile,
          upperQuartile,
          sampleSize: prices.length,
          priceRange: {
            low: lowerQuartile,
            medium: median,
            high: upperQuartile
          },
          message: `Based on ${prices.length} similar ${condition ? condition.toLowerCase() : ''} ad${prices.length > 1 ? 's' : ''}`
        }
      });
    } catch (error) {
      console.error('Price suggestion error:', error);
      res.status(500).json({ success: false, message: 'Failed to get price suggestion' });
    }
  }
);

// Live Location Feed - Get ads within 100km radius
router.get('/live-location',
  cacheMiddleware(30 * 1000), // Cache for 30 seconds (shorter for live feed)
  [
    query('latitude').notEmpty().isFloat().withMessage('Latitude is required'),
    query('longitude').notEmpty().isFloat().withMessage('Longitude is required'),
    query('radius').optional().isFloat({ min: 1, max: 200 }).withMessage('Radius must be between 1 and 200 km'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('category').optional().isString(),
    query('subcategory').optional().isString(),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
    query('search').optional().isString(),
    query('condition').optional().isIn(['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed',
          errors: errors.array() 
        });
      }

      const {
        latitude,
        longitude,
        radius = 100, // Default 100km for live location feed
        page = 1,
        limit = 20,
        category,
        subcategory,
        minPrice,
        maxPrice,
        search,
        condition
      } = req.query;

      const userLat = parseFloat(latitude);
      const userLng = parseFloat(longitude);
      const radiusKm = parseFloat(radius) || 100;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const now = new Date();

      // Build where clause
      const where = {
        status: 'APPROVED',
        // Only include ads with location coordinates
        location: {
          latitude: { not: null },
          longitude: { not: null }
        },
        // Filter out expired ads
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } }
            ]
          }
        ]
      };

      // Parallelize category and subcategory lookups
      const [categoryObj, subcategoryObj] = await Promise.all([
        category ? prisma.category.findUnique({ where: { slug: category }, select: { id: true } }) : null,
        subcategory ? prisma.subcategory.findFirst({ where: { slug: subcategory }, select: { id: true } }) : null,
      ]);

      if (categoryObj) {
        where.categoryId = categoryObj.id;
      }

      if (subcategoryObj) {
        where.subcategoryId = subcategoryObj.id;
      }

      // Price filter
      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price.gte = parseFloat(minPrice);
        if (maxPrice) where.price.lte = parseFloat(maxPrice);
      }

      // Condition filter
      if (condition) {
        where.condition = condition;
      }

      // Search filter
      if (search) {
        where.AND.push({
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        });
      }

      // Get all ads with location data (we'll filter by distance in memory)
      // Note: For better performance with large datasets, consider using PostGIS or similar
      const ads = await prisma.ad.findMany({
        where,
        select: {
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
          updatedAt: true,
          attributes: true,
          category: { select: { id: true, name: true, slug: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
          location: { select: { id: true, name: true, slug: true, latitude: true, longitude: true } },
          user: { select: { id: true, name: true, avatar: true, isVerified: true } },
          _count: { select: { favorites: true } }
        },
        orderBy: [
          { isPremium: 'desc' },
          { createdAt: 'desc' }
        ]
      });

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

      // Calculate distance for each ad and filter by radius
      const adsWithDistance = ads
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
          return null;
        })
        .filter(ad => ad !== null && ad.distance <= radiusKm)
        .sort((a, b) => {
          // Sort by distance first (nearest first), then by premium status
          if (a.distance !== null && b.distance !== null) {
            if (Math.abs(a.distance - b.distance) < 0.1) {
              // If distances are very close, prioritize premium ads
              if (a.isPremium && !b.isPremium) return -1;
              if (!a.isPremium && b.isPremium) return 1;
              return 0;
            }
            return a.distance - b.distance;
          }
          return 0;
        });

      // Apply pagination
      const total = adsWithDistance.length;
      const paginatedAds = adsWithDistance.slice(skip, skip + parseInt(limit));

      // Ensure all ads have images as arrays
      const adsWithImages = paginatedAds.map(ad => ({
        ...ad,
        images: Array.isArray(ad.images) 
          ? ad.images.filter(img => img && (typeof img === 'string' ? img.trim() !== '' : true)) 
          : (ad.images && typeof ad.images === 'string' && ad.images.trim() !== '' ? [ad.images] : [])
      }));

      // Sort ads to prioritize premium types within same distance
      const sortedAds = adsWithImages.sort((a, b) => {
        // If distances are very close (within 1km), prioritize premium
        if (a.distance && b.distance && Math.abs(a.distance - b.distance) < 1) {
          if (a.isPremium && !b.isPremium) return -1;
          if (!a.isPremium && b.isPremium) return 1;
          
          // If both premium, sort by premium type
          if (a.isPremium && b.isPremium) {
            const premiumPriority = { 'TOP': 1, 'FEATURED': 2, 'BUMP_UP': 3 };
            const aPriority = premiumPriority[a.premiumType] || 4;
            const bPriority = premiumPriority[b.premiumType] || 4;
            if (aPriority !== bPriority) return aPriority - bPriority;
          }
        }
        return 0; // Maintain distance-based order
      });

      // Set cache headers for live feed (shorter cache)
      res.set({
        'Cache-Control': 'public, max-age=30, s-maxage=60', // Cache for 30s, CDN cache for 60s
        'Vary': 'Accept-Encoding'
      });

      res.json({
        success: true,
        ads: sortedAds,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        location: {
          latitude: userLat,
          longitude: userLng,
          radius: radiusKm
        }
      });
    } catch (error) {
      console.error('Live location feed error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch live location feed' });
    }
  }
);

// Get single ad
router.get('/:id', cacheMiddleware(60 * 1000), async (req, res) => {
  try {
    const ad = await prisma.ad.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        subcategory: true,
        location: true,
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            phone: true,
            showPhone: true,
            email: true,
            isVerified: true
          }
        },
        _count: { select: { favorites: true } }
      }
    });

    if (!ad) {
      return res.status(404).json({ success: false, message: 'Ad not found' });
    }

    // Check if ad is expired (but still allow viewing for owner)
    const now = new Date();
    if (ad.expiresAt && ad.expiresAt <= now && ad.status === 'APPROVED') {
      // Mark as expired if not already marked
      if (ad.status !== 'EXPIRED') {
        await prisma.ad.update({
          where: { id: ad.id },
          data: { status: 'EXPIRED' }
        });
        ad.status = 'EXPIRED';
      }
    }

    // Ensure images is always an array
    if (ad.images) {
      ad.images = Array.isArray(ad.images) ? ad.images.filter(img => img && img.trim && img.trim() !== '') : (ad.images.trim && ad.images.trim() !== '' ? [ad.images] : []);
    } else {
      ad.images = [];
    }

    // Increment views
    await prisma.ad.update({
      where: { id: ad.id },
      data: { views: { increment: 1 } }
    });

    // Apply phone privacy filtering
    if (ad.user && !ad.user.showPhone) {
      ad.user.phone = null;
    }

    res.json({ success: true, ad });
  } catch (error) {
    console.error('Get ad error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ad' });
  }
});


// Create ad
router.post('/',
  authenticate,
  uploadImages,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('price')
      .notEmpty().withMessage('Price is required')
      .isFloat({ min: 0 }).withMessage('Price must be a valid number greater than or equal to 0'),
    body('categoryId').notEmpty().withMessage('Category is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('❌ Validation errors:', errors.array());
        console.error('📝 Request body keys:', Object.keys(req.body || {}));
        console.error('📝 Request body values:', {
          title: req.body?.title?.substring(0, 50),
          description: req.body?.description?.substring(0, 50),
          price: req.body?.price,
          categoryId: req.body?.categoryId,
          hasImages: !!req.uploadedImages?.length
        });
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed',
          errors: errors.array() 
        });
      }
      
      // Log full request body for debugging premium slot issues
      console.log('📦 Full request body (after validation):', {
        premiumType: req.body.premiumType,
        isUrgent: req.body.isUrgent,
        title: req.body.title?.substring(0, 30),
        hasImages: !!req.uploadedImages && req.uploadedImages.length > 0,
        imageCount: req.uploadedImages?.length || 0,
        allBodyKeys: Object.keys(req.body || {})
      });

      if (!req.uploadedImages || req.uploadedImages.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one image is required' });
      }

      if (req.uploadedImages.length > 12) {
        return res.status(400).json({ success: false, message: 'Maximum 12 images allowed' });
      }

      // Ad posting is now FREE - only premium features require payment
      const paymentOrderId = req.body.paymentOrderId; // Optional payment order ID (for premium features)

      // If payment order ID provided, verify it (for premium features)
      let paymentOrder = null;
      if (paymentOrderId) {
        // Verify payment order - fetch with adData included
        console.log('🔍 Verifying payment order for premium features:', paymentOrderId);
        paymentOrder = await prisma.adPostingOrder.findUnique({
          where: { razorpayOrderId: paymentOrderId },
          select: {
            id: true,
            userId: true,
            status: true,
            amount: true,
            adData: true,
            razorpayPaymentId: true
          }
        });

        if (!paymentOrder) {
          console.error('❌ Payment order not found:', paymentOrderId);
          return res.status(402).json({ 
            success: false, 
            message: 'Payment order not found. Please complete payment first.',
            requiresPayment: true
          });
        }

        if (paymentOrder.userId !== req.user.id) {
          console.error('❌ Payment order belongs to different user');
          return res.status(403).json({ 
            success: false, 
            message: 'Payment order does not belong to you.',
            requiresPayment: true
          });
        }

        if (paymentOrder.status !== 'paid') {
          console.error('❌ Payment order not paid. Status:', paymentOrder.status);
          return res.status(402).json({ 
            success: false, 
            message: `Payment not completed. Order status: ${paymentOrder.status}. Please complete payment first.`,
            requiresPayment: true,
            orderStatus: paymentOrder.status
          });
        }

        console.log('✅ Payment order verified for premium features:', {
          orderId: paymentOrder.id,
          status: paymentOrder.status,
          amount: paymentOrder.amount
        });
      }

      const { title, description, price, originalPrice, discount, condition, categoryId, subcategoryId, locationId, state, city, neighbourhood, exactLocation, attributes } = req.body;

      // Verify category exists
      const category = await prisma.category.findUnique({ where: { id: categoryId } });

      if (!category) {
        return res.status(400).json({ success: false, message: 'Invalid category' });
      }

      // Verify location exists if provided
      let location = null;
      if (locationId) {
        location = await prisma.location.findUnique({ where: { id: locationId } });
        if (!location) {
          return res.status(400).json({ success: false, message: 'Invalid location' });
        }
      }

      // Verify subcategory if provided
      if (subcategoryId) {
        const subcategory = await prisma.subcategory.findUnique({
          where: { id: subcategoryId }
        });
        if (!subcategory || subcategory.categoryId !== categoryId) {
          return res.status(400).json({ success: false, message: 'Invalid subcategory' });
        }
      }

      // Ensure images is an array
      const imagesArray = Array.isArray(req.uploadedImages) ? req.uploadedImages : [];
      
      // Set expiration date to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      // Get premium options from payment order OR request body (for business package slots)
      let premiumType = null;
      let isUrgent = false;
      let premiumExpiresAt = null;
      
      // First, try to get from request body (for business package slots)
      console.log('📦 Request body premium fields:', {
        premiumType: req.body.premiumType,
        isUrgent: req.body.isUrgent,
        hasPaymentOrder: !!paymentOrderId
      });
      
      if (req.body.premiumType) {
        premiumType = req.body.premiumType;
        console.log('📦 Premium type from request body:', premiumType);
      }
      if (req.body.isUrgent !== undefined) {
        isUrgent = req.body.isUrgent === 'true' || req.body.isUrgent === true;
        console.log('📦 Urgent flag from request body:', isUrgent);
      }
      
      // If payment order exists, override with payment order data (for paid premium features)
      if (paymentOrder && paymentOrder.adData) {
          // Parse adData if it's a JSON string
          let adData = paymentOrder.adData;
          if (typeof adData === 'string') {
            try {
              adData = JSON.parse(adData);
            } catch (e) {
              console.error('Error parsing adData:', e);
              adData = {};
            }
          }
          
          // Override with payment order data (paid premium features take precedence)
          premiumType = adData.premiumType || premiumType;
          isUrgent = adData.isUrgent !== undefined ? adData.isUrgent : isUrgent;
      }
      
      // Calculate premium expiry based on type (for both payment order and business package slots)
      if (premiumType || isUrgent) {
        // Get settings from database
        const settingsRecord = await prisma.premiumSettings.findUnique({
          where: { key: 'premium_settings' }
        });
        
        let durations = {
          TOP: parseInt(process.env.PREMIUM_DURATION_TOP || '7'),
          FEATURED: parseInt(process.env.PREMIUM_DURATION_FEATURED || '14'),
          BUMP_UP: parseInt(process.env.PREMIUM_DURATION_BUMP_UP || '1'),
        };
        
        if (settingsRecord && settingsRecord.value) {
          try {
            const parsed = JSON.parse(settingsRecord.value);
            durations = parsed.durations || durations;
          } catch (e) {
            console.error('Error parsing settings:', e);
          }
        }
        
        // Calculate premium expiry
        if (premiumType) {
          const duration = durations[premiumType] || 7;
          premiumExpiresAt = new Date();
          premiumExpiresAt.setDate(premiumExpiresAt.getDate() + duration);
        }
        
        // Urgent badge expiry
        if (isUrgent) {
          let urgentDuration = parseInt(process.env.PREMIUM_DURATION_URGENT || '7');
          
          if (settingsRecord && settingsRecord.value) {
            try {
              const parsed = JSON.parse(settingsRecord.value);
              urgentDuration = parsed.durations?.URGENT || urgentDuration;
            } catch (e) {
              console.error('Error parsing settings:', e);
            }
          }
          
          // If no premium type, set urgent expiry, otherwise use premium expiry
          if (!premiumType) {
            premiumExpiresAt = new Date();
            premiumExpiresAt.setDate(premiumExpiresAt.getDate() + urgentDuration);
          }
        }
        
        console.log('⭐ Premium options:', {
          premiumType,
          isUrgent,
          premiumExpiresAt,
          source: paymentOrder ? 'payment_order' : 'business_package_slot'
        });
      }
      
      // Determine if this is a premium ad (has premium features)
      const isPremiumAd = !!(premiumType || isUrgent);
      const now = new Date();
      
      console.log('🔍 Premium ad check:', {
        premiumType,
        isUrgent,
        isPremiumAd,
        hasPaymentOrder: !!paymentOrderId
      });

      // Check if user has any active business packages
      const activeBusinessPackages = await prisma.businessPackage.findMany({
        where: {
          userId: req.user.id,
          status: 'paid',
          expiresAt: {
            gt: now
          }
        },
        select: {
          id: true,
          packageType: true,
          totalAdsAllowed: true,
          adsUsed: true,
          premiumSlotsTotal: true, // Keep for backward compatibility
          premiumSlotsUsed: true // Keep for backward compatibility
        }
      });
      
      console.log('📦 Active business packages found:', activeBusinessPackages.length);
      activeBusinessPackages.forEach((pkg, index) => {
        const adsRemaining = (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0);
        const premiumSlotsAvailable = (pkg.premiumSlotsTotal || 0) - (pkg.premiumSlotsUsed || 0);
        console.log(`   Package ${index + 1}: ${pkg.packageType} - ${pkg.adsUsed}/${pkg.totalAdsAllowed} ads used, ${adsRemaining} remaining`);
        console.log(`      (Premium slots: ${pkg.premiumSlotsUsed}/${pkg.premiumSlotsTotal} used, ${premiumSlotsAvailable} available - deprecated)`);
      });

      // NEW SYSTEM: Check ads allowed from business packages (for ALL ads, not just premium)
      // Sum up all available ads (totalAdsAllowed - adsUsed)
      const totalAdsRemaining = activeBusinessPackages.reduce((sum, pkg) => {
        const remaining = (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0);
        return sum + remaining;
      }, 0);
      
      console.log('📊 Total ads remaining from business packages:', totalAdsRemaining);

      // Check free ads limit (always fetch freeAdsUsed for logging, but only check limit if no business package ads available)
      let hasFreeAdsRemaining = false;
      let freeAdsUsed = 0;
      
      // Always fetch freeAdsUsed for logging purposes
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { freeAdsUsed: true }
      });
      
      freeAdsUsed = user?.freeAdsUsed || 0;
      
      // Only check if free ads are remaining if no business package ads are available
      if (totalAdsRemaining <= 0 && !paymentOrderId) {
        hasFreeAdsRemaining = freeAdsUsed < FREE_ADS_LIMIT;
      }

      // If user has no free ads remaining AND no business package ads remaining AND no payment order, require payment
      if (!hasFreeAdsRemaining && totalAdsRemaining <= 0 && !paymentOrderId) {
        // Check if this is a premium ad - if so, they can still purchase premium options
        if (isPremiumAd) {
          console.log('❌ No business package ads remaining - premium ad requires payment');
          return res.status(402).json({
            success: false,
            message: 'No business package ads left. Please use premium options to post this ad.',
            requiresPayment: true,
            adsRemaining: 0,
            options: {
              premiumOptions: 'Purchase Premium Options for this ad',
              businessPackage: 'Purchase a Business Package for more ads'
            }
          });
        } else {
          // Regular ad - require payment or business package
          console.log('❌ No free ads and no business package ads remaining - requiring payment');
          return res.status(402).json({
            success: false,
            message: `You have used all ${FREE_ADS_LIMIT} free ads and all business package ads. Please purchase a Business Package or Premium Options to post more ads.`,
            requiresPayment: true,
            freeAdsUsed: freeAdsUsed,
            freeAdsLimit: FREE_ADS_LIMIT,
            adsRemaining: 0,
            options: {
              businessPackage: 'Purchase a Business Package for more ads',
              premiumOptions: 'Purchase Premium Options for this ad'
            }
          });
        }
      }

      // Find a package with available ads to use (for tracking which package to increment)
      // IMPORTANT: This applies to ALL ads posted using business package slots (regular OR premium)
      // Premium features don't require payment when using business package slots
      let packageToUse = null;
      if (totalAdsRemaining > 0 && !paymentOrderId) {
        for (const pkg of activeBusinessPackages) {
          const remaining = (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0);
          if (remaining > 0) {
            packageToUse = pkg;
            console.log(`✅ Found package to use: ${pkg.id} (${pkg.packageType}) with ${remaining} ads remaining`);
            break;
          }
        }
        // Store package ID to increment adsUsed after ad creation
        req.businessPackageId = packageToUse?.id;
        console.log('📝 Stored businessPackageId for adsUsed increment:', req.businessPackageId);
        console.log('📝 Ad details:', {
          isPremiumAd,
          premiumType,
          isUrgent,
          willUseBusinessPackage: !!req.businessPackageId
        });
      } else {
        console.log('⚠️ Package selection skipped:', {
          totalAdsRemaining,
          hasPaymentOrder: !!paymentOrderId,
          reason: paymentOrderId ? 'Has payment order' : totalAdsRemaining <= 0 ? 'No ads remaining' : 'Unknown'
        });
      }


      // Note: Users can ALWAYS purchase individual premium ads via paymentOrderId
      // This check only applies when trying to use business package premium slots

      console.log('📸 Creating ad with images:', imagesArray);
      console.log('⏰ Ad expires at:', expiresAt);
      if (premiumType) {
        console.log('⭐ Creating premium ad:', { premiumType, isUrgent, premiumExpiresAt });
      }
      
      // Parse attributes if provided (should be JSON string or object)
      let parsedAttributes = null;
      if (attributes) {
        try {
          parsedAttributes = typeof attributes === 'string' ? JSON.parse(attributes) : attributes;
        } catch (e) {
          console.error('Error parsing attributes:', e);
          parsedAttributes = null;
        }
      }

      // Build ad data object
      const adData = {
        title,
        description,
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        discount: discount ? parseFloat(discount) : null,
        condition: condition || null,
        images: imagesArray,
        attributes: parsedAttributes, // Store attributes as JSON
        categoryId,
        state: state || null,
        city: city || null,
        neighbourhood: neighbourhood || null,
        exactLocation: exactLocation || null,
        userId: req.user.id,
        status: 'PENDING',
        expiresAt: expiresAt,
        // Premium fields
        isPremium: !!premiumType,
        premiumType: premiumType,
        premiumExpiresAt: premiumExpiresAt,
        isUrgent: isUrgent,
        featuredAt: premiumType === 'FEATURED' ? new Date() : null,
        bumpedAt: premiumType === 'BUMP_UP' ? new Date() : null,
      };
      
      // Only include subcategoryId if provided
      if (subcategoryId) {
        adData.subcategoryId = subcategoryId;
      }
      
      // Only include locationId if it's provided (to handle optional location)
      if (locationId) {
        adData.locationId = locationId;
      }
      
      console.log('📝 Ad data to create:', {
        title: adData.title,
        categoryId: adData.categoryId,
        subcategoryId: adData.subcategoryId || 'null',
        locationId: adData.locationId || 'null',
        userId: adData.userId,
        imagesCount: adData.images.length
      });

      // ==================== CONTENT MODERATION ====================
      console.log('🔍 Starting AI content moderation (results will be applied after 5 minutes)...');
      const moderationResult = await moderateAd(title, description, imagesArray);
      
      // Store moderation results but keep as PENDING for 5 minutes
      adData.status = 'PENDING'; // Always PENDING initially
      adData.moderationStatus = 'pending_review';
      adData.moderationFlags = moderationResult.moderationFlags;
      
      // Store rejection reason if flagged, but don't reject yet
      if (moderationResult.rejectionReason) {
        adData.rejectionReason = moderationResult.rejectionReason;
      }
      
      // Mark if should be auto-rejected (will be processed after 5 min)
      adData.autoRejected = moderationResult.shouldReject;
      
      console.log('🎯 Moderation completed, results saved:', {
        shouldReject: moderationResult.shouldReject,
        shouldAutoApprove: moderationResult.shouldAutoApprove,
        willProcessIn: '5 minutes'
      });
      console.log('⏳ Ad will be approved/rejected after 5-minute review period');
      // ==================== END MODERATION ====================

      // Build include object conditionally
      const includeObj = {
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } }
      };
      
      // Only include location if locationId is provided
      if (locationId) {
        includeObj.location = { select: { id: true, name: true, slug: true } };
      }

      let ad;
      try {
        console.log('🔄 Attempting to create ad with Prisma...');
        ad = await prisma.ad.create({
          data: adData,
          include: includeObj
        });
        console.log('✅ Ad created successfully:', ad.id);
      } catch (createError) {
        console.error('❌ Prisma create error details:');
        console.error('   Code:', createError.code);
        console.error('   Message:', createError.message);
        console.error('   Meta:', JSON.stringify(createError.meta, null, 2));
        console.error('   Ad data that failed:', JSON.stringify(adData, null, 2));
        throw createError; // Re-throw to be caught by outer catch
      }

      // NEW SYSTEM: Increment adsUsed when ad is posted using business package (for ALL ads, not just premium)
      console.log('🔍 Checking if adsUsed should be incremented:', {
        hasPaymentOrder: !!paymentOrderId,
        hasPackageId: !!req.businessPackageId,
        adId: ad.id,
        isPremiumAd
      });
      
      if (!paymentOrderId && req.businessPackageId) {
        try {
          // Get current package state before increment
          const packageBefore = await prisma.businessPackage.findUnique({
            where: { id: req.businessPackageId },
            select: {
              id: true,
              totalAdsAllowed: true,
              adsUsed: true,
              packageType: true
            }
          });
          
          if (!packageBefore) {
            console.error(`❌ Package ${req.businessPackageId} not found!`);
          } else {
            console.log(`🔄 Attempting to increment adsUsed for package ${req.businessPackageId}`);
            console.log(`   Before: ${packageBefore.adsUsed}/${packageBefore.totalAdsAllowed} ads used`);
            
            const updatedPackage = await prisma.businessPackage.update({
              where: { id: req.businessPackageId },
              data: { adsUsed: { increment: 1 } },
              select: {
                id: true,
                totalAdsAllowed: true,
                adsUsed: true,
                packageType: true
              }
            });
            
            console.log(`✅ Incremented adsUsed for package ${req.businessPackageId}`);
            console.log(`   After: ${updatedPackage.adsUsed}/${updatedPackage.totalAdsAllowed} ads used`);
            console.log(`   Remaining: ${updatedPackage.totalAdsAllowed - updatedPackage.adsUsed} ads remaining`);
            console.log(`   Package Type: ${updatedPackage.packageType}`);
            
            // Verify the increment actually happened
            if (updatedPackage.adsUsed === packageBefore.adsUsed + 1) {
              console.log(`✅ AdsUsed increment verified: ${packageBefore.adsUsed} → ${updatedPackage.adsUsed}`);
            } else {
              console.error(`⚠️ WARNING: Increment mismatch! Expected ${packageBefore.adsUsed + 1}, got ${updatedPackage.adsUsed}`);
            }
            
            if (updatedPackage.adsUsed <= updatedPackage.totalAdsAllowed) {
              console.log(`✅ Ads count verified: ${updatedPackage.adsUsed} used out of ${updatedPackage.totalAdsAllowed} total`);
            } else {
              console.error(`⚠️ WARNING: Ads used (${updatedPackage.adsUsed}) exceeds total (${updatedPackage.totalAdsAllowed})!`);
            }
          }
        } catch (adsError) {
          console.error('❌ Error incrementing adsUsed:', adsError);
          console.error('   Error details:', {
            code: adsError.code,
            message: adsError.message,
            meta: adsError.meta,
            stack: adsError.stack
          });
          // Don't fail ad creation if increment fails - log it for manual fix
        }
      } else {
        console.log('ℹ️ AdsUsed increment skipped:', {
          hasPaymentOrder: !!paymentOrderId,
          hasPackageId: !!req.businessPackageId,
          reason: paymentOrderId ? 'Paid via payment order' : !req.businessPackageId ? 'No package ID found' : 'Unknown'
        });
      }

      // Create premium order record if premium was purchased
      if (premiumType && paymentOrder) {
        try {
          // Get premium prices from database settings
          const settingsRecord = await prisma.premiumSettings.findUnique({
            where: { key: 'premium_settings' }
          });
          
          let PREMIUM_PRICES = {
            TOP: parseFloat(process.env.PREMIUM_PRICE_TOP || '299'),
            FEATURED: parseFloat(process.env.PREMIUM_PRICE_FEATURED || '199'),
            BUMP_UP: parseFloat(process.env.PREMIUM_PRICE_BUMP_UP || '99'),
          };
          
          if (settingsRecord && settingsRecord.value) {
            try {
              const parsed = JSON.parse(settingsRecord.value);
              PREMIUM_PRICES = parsed.prices || PREMIUM_PRICES;
            } catch (e) {
              console.error('Error parsing premium prices:', e);
            }
          }
          
          // Get razorpayPaymentId from paymentOrder
          const razorpayPaymentId = paymentOrder.razorpayPaymentId || null;
          
          await prisma.premiumOrder.create({
            data: {
              type: premiumType,
              amount: PREMIUM_PRICES[premiumType] || 0,
              razorpayOrderId: paymentOrderId,
              razorpayPaymentId: razorpayPaymentId,
              userId: req.user.id,
              adId: ad.id,
              status: 'paid',
              expiresAt: premiumExpiresAt
            }
          });
          
          console.log('✅ Premium order created for ad:', ad.id);
        } catch (premiumError) {
          console.error('⚠️ Error creating premium order:', premiumError);
          // Don't fail ad creation if premium order creation fails
        }
      }

      // Link ad to payment order if premium features were purchased
      if (paymentOrder) {
        console.log('🔗 Linking ad to payment order:', paymentOrderId);
        try {
          await prisma.adPostingOrder.update({
            where: { id: paymentOrder.id },
            data: { adId: ad.id }
          });
          console.log('✅ Ad linked to payment order successfully');
        } catch (linkError) {
          console.error('❌ Error linking ad to payment order:', linkError);
          // Don't fail ad creation if linking fails
        }
      }

      // Log ad posting method (freeAdsUsed increment already handled above for regular ads)
      if (activeBusinessPackages.length > 0) {
        console.log(`📦 User ${req.user.id} posting ad using business package (${activeBusinessPackages.length} active). Free ads: ${freeAdsUsed}/${FREE_ADS_LIMIT}`);
      } else if (paymentOrderId) {
        console.log(`💳 User ${req.user.id} posting ad with premium options payment. Free ads: ${freeAdsUsed}/${FREE_ADS_LIMIT}`);
      } else if (!isPremiumAd) {
        console.log(`📊 User ${req.user.id} posting regular ad. Free ads: ${freeAdsUsed}/${FREE_ADS_LIMIT}`);
      }

      // Create notification for user (non-blocking)
      try {
        const notificationData = {
          userId: req.user.id,
          title: 'Ad Under Review',
          message: `Your ad "${title}" is being reviewed. It will be posted after 5 minutes if it passes our content moderation.`,
          type: 'ad_pending',
          link: `/ads/${ad.id}`
        };
        
        const notification = await prisma.notification.create({
          data: notificationData
        });

        // Emit real-time notification via Socket.IO (non-blocking)
        try {
          const { emitNotification } = require('../socket/socket');
          emitNotification(req.user.id, {
            id: notification.id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            link: notification.link,
            isRead: false,
            createdAt: notification.createdAt
          });
        } catch (socketError) {
          console.error('⚠️ Error emitting socket notification:', socketError);
          // Don't fail ad creation if socket emit fails
        }
      } catch (notificationError) {
        console.error('⚠️ Error creating notification:', notificationError);
        // Don't fail ad creation if notification creation fails
      }

      // Ensure images is an array in the response
      const adWithImages = {
        ...ad,
        images: Array.isArray(ad.images) 
          ? ad.images.filter(img => img && (typeof img === 'string' ? img.trim() !== '' : true))
          : (ad.images && typeof ad.images === 'string' && ad.images.trim() !== '' ? [ad.images] : [])
      };
      
      console.log('📸 Created ad response with images:', { id: adWithImages.id, title: adWithImages.title, images: adWithImages.images });

      // Clear cache after creation
      clearCache('ads');
      
      res.status(201).json({ success: true, ad: adWithImages });
    } catch (error) {
      console.error('❌ Create ad error:', error);
      console.error('Error stack:', error.stack);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error meta:', error.meta);
      console.error('Request body keys:', Object.keys(req.body || {}));
      console.error('Request body values:', {
        title: req.body?.title?.substring(0, 50),
        categoryId: req.body?.categoryId,
        subcategoryId: req.body?.subcategoryId,
        locationId: req.body?.locationId,
        price: req.body?.price,
        hasImages: !!req.uploadedImages?.length
      });
      console.error('Uploaded images:', req.uploadedImages?.length || 0);
      console.error('User ID:', req.user?.id);
      
      // Provide more detailed error message
      let errorMessage = 'Failed to create ad';
      if (error.code === 'P2002') {
        errorMessage = 'A record with this information already exists';
      } else if (error.code === 'P2003') {
        const field = error.meta?.field_name || 'unknown';
        errorMessage = `Invalid reference: ${field}. Please check category, subcategory, or location.`;
      } else if (error.code === 'P2011') {
        errorMessage = 'Null constraint violation. A required field is missing.';
      } else if (error.code === 'P2012') {
        errorMessage = 'Missing required value. Please check all required fields.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      res.status(500).json({ 
        success: false, 
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          code: error.code,
          meta: error.meta,
          stack: error.stack?.split('\n').slice(0, 5).join('\n') // First 5 lines of stack
        } : undefined
      });
    }
  }
);

// Update ad
router.put('/:id',
  authenticate,
  uploadImages,
  [
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim().notEmpty(),
    body('price').optional().isFloat({ min: 0 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      const ad = await prisma.ad.findUnique({
        where: { id: req.params.id }
      });

      if (!ad) {
        return res.status(404).json({ success: false, message: 'Ad not found' });
      }

      if (ad.userId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      const updateData = {};
      if (req.body.title) updateData.title = req.body.title;
      if (req.body.description) updateData.description = req.body.description;
      if (req.body.price) updateData.price = parseFloat(req.body.price);
      if (req.body.originalPrice !== undefined) updateData.originalPrice = req.body.originalPrice ? parseFloat(req.body.originalPrice) : null;
      if (req.body.discount !== undefined) updateData.discount = req.body.discount ? parseFloat(req.body.discount) : null;
      if (req.body.condition !== undefined) updateData.condition = req.body.condition || null;
      if (req.body.categoryId) updateData.categoryId = req.body.categoryId;
      if (req.body.subcategoryId) updateData.subcategoryId = req.body.subcategoryId;
      if (req.body.locationId) updateData.locationId = req.body.locationId;
      if (req.body.state !== undefined) updateData.state = req.body.state || null;
      if (req.body.city !== undefined) updateData.city = req.body.city || null;
      if (req.body.neighbourhood !== undefined) updateData.neighbourhood = req.body.neighbourhood || null;
      if (req.body.exactLocation !== undefined) updateData.exactLocation = req.body.exactLocation || null;
      // Handle attributes update
      if (req.body.attributes !== undefined) {
        try {
          updateData.attributes = typeof req.body.attributes === 'string' 
            ? JSON.parse(req.body.attributes) 
            : req.body.attributes;
        } catch (e) {
          console.error('Error parsing attributes:', e);
        }
      }
      // Handle image updates - merge existing with new if provided
      if (req.uploadedImages && req.uploadedImages.length > 0) {
        // If existingImages are provided, merge them
        if (req.body.existingImages) {
          const existing = Array.isArray(req.body.existingImages) 
            ? req.body.existingImages.filter((img) => img && img.trim() !== '')
            : (req.body.existingImages && req.body.existingImages.trim() !== '' ? [req.body.existingImages] : []);
          updateData.images = [...existing, ...req.uploadedImages];
        } else {
          updateData.images = req.uploadedImages;
        }
        updateData.status = 'PENDING'; // Require re-approval if images changed
      } else if (req.body.existingImages) {
        // Only existing images, no new uploads
        updateData.images = Array.isArray(req.body.existingImages) 
          ? req.body.existingImages.filter((img) => img && img.trim() !== '')
          : (req.body.existingImages && req.body.existingImages.trim() !== '' ? [req.body.existingImages] : []);
      }
      
      console.log('📸 Updating ad with images:', updateData.images);

      const updatedAd = await prisma.ad.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
          location: { select: { id: true, name: true, slug: true } }
        }
      });

      // Index/update in Meilisearch if ad is approved
      if (updatedAd.status === 'APPROVED') {
        try {
          await indexAd(updatedAd);
        } catch (indexError) {
          console.error('⚠️ Error indexing updated ad in Meilisearch:', indexError);
        }
      } else {
        // Remove from index if status changed to non-approved
        try {
          await deleteAd(updatedAd.id);
        } catch (deleteError) {
          console.error('⚠️ Error deleting ad from Meilisearch:', deleteError);
        }
      }

      // Clear cache after update
      clearCache('ads');
      clearCache(`ads/${req.params.id}`);

      res.json({ success: true, ad: updatedAd });
    } catch (error) {
      console.error('Update ad error:', error);
      res.status(500).json({ success: false, message: 'Failed to update ad' });
    }
  }
);

// Delete ad
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const ad = await prisma.ad.findUnique({
      where: { id: req.params.id }
    });

    if (!ad) {
      return res.status(404).json({ success: false, message: 'Ad not found' });
    }

    if (ad.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await prisma.ad.delete({
      where: { id: req.params.id }
    });

    // Remove from Meilisearch index
    try {
      await deleteAd(req.params.id);
    } catch (deleteError) {
      console.error('⚠️ Error deleting ad from Meilisearch:', deleteError);
    }

    // Clear cache after deletion
    clearCache('ads');
    clearCache(`ads/${req.params.id}`);

    res.json({ success: true, message: 'Ad deleted successfully' });
  } catch (error) {
    console.error('Delete ad error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete ad' });
  }
});

// Toggle favorite
router.post('/:id/favorite', authenticate, async (req, res) => {
  try {
    const ad = await prisma.ad.findUnique({
      where: { id: req.params.id }
    });

    if (!ad) {
      return res.status(404).json({ success: false, message: 'Ad not found' });
    }

    const existing = await prisma.favorite.findUnique({
      where: {
        userId_adId: {
          userId: req.user.id,
          adId: req.params.id
        }
      }
    });

    if (existing) {
      await prisma.favorite.delete({
        where: { id: existing.id }
      });
      res.json({ success: true, isFavorite: false });
    } else {
      await prisma.favorite.create({
        data: {
          userId: req.user.id,
          adId: req.params.id
        }
      });
      res.json({ success: true, isFavorite: true });
    }
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle favorite' });
  }
});

// Check if ad is favorite
router.get('/:id/favorite', authenticate, async (req, res) => {
  try {
    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_adId: {
          userId: req.user.id,
          adId: req.params.id
        }
      }
    });

    res.json({ success: true, isFavorite: !!favorite });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({ success: false, message: 'Failed to check favorite' });
  }
});

module.exports = router;

