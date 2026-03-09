const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { authenticate } = require('../../../middleware/auth');
const { uploadImages } = require('../../../middleware/upload');
const { cacheMiddleware } = require('../../../middleware/cache');
const cacheConfig = require('../../../config/cache-config');
const AdController = require('../controllers/AdController');

const router = express.Router();

// Filter schema for sidebar (must be before /:id so "filters" is not treated as ad id)
const FILTER_SCHEMA = [
  { name: 'price', label: 'Price Range', type: 'range', key: 'price', min: 0, max: 10000000, step: 100, placeholder: 'Any price' },
  { name: 'condition', label: 'Condition', type: 'dropdown', key: 'condition', options: [
    { value: 'NEW', label: 'New' },
    { value: 'LIKE_NEW', label: 'Like New' },
    { value: 'USED', label: 'Used' },
    { value: 'REFURBISHED', label: 'Refurbished' },
  ], placeholder: 'Any condition' },
  { name: 'postedTime', label: 'Posted', type: 'dropdown', key: 'postedTime', options: [
    { value: '24h', label: 'Last 24 hours' },
    { value: '3d', label: 'Last 3 days' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
  ], placeholder: 'Any time' },
  { name: 'sort', label: 'Sort by', type: 'dropdown', key: 'sort', options: [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'featured', label: 'Featured' },
  ], placeholder: 'Newest first' },
];

router.get('/filters',
  cacheMiddleware(cacheConfig.ADS_FILTERS_TTL),
  [
    query('categoryId').optional().isString(),
  ],
  (req, res) => {
    const { categoryId } = req.query;
    res.json({
      success: true,
      filters: FILTER_SCHEMA,
      ...(categoryId && { category: { id: categoryId } }),
    });
  }
);

// Home feed: ALL ads with location-prioritized ranking + sponsored injection
router.get('/home-feed',
  cacheMiddleware(cacheConfig.ADS_LIST_TTL),
  [
    query('page').optional({ checkFalsy: true }).isInt({ min: 1 }),
    query('limit').optional({ checkFalsy: true }).isInt({ min: 1, max: 50 }),
    query('city').optional({ checkFalsy: true }).isString(),
    query('state').optional({ checkFalsy: true }).isString(),
    query('location').optional({ checkFalsy: true }).isString(),
    query('latitude').optional({ checkFalsy: true }).isFloat(),
    query('longitude').optional({ checkFalsy: true }).isFloat(),
    query('userLat').optional({ checkFalsy: true }).isFloat(),
    query('userLng').optional({ checkFalsy: true }).isFloat(),
    query('category').optional({ checkFalsy: true }).isString(),
    query('subcategory').optional({ checkFalsy: true }).isString(),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    next();
  },
  AdController.getHomeFeed.bind(AdController)
);

// optional({ checkFalsy: true }) so empty string in query is treated as missing and not validated
router.get('/',
  cacheMiddleware(cacheConfig.ADS_LIST_TTL),
  [
    query('page').optional({ checkFalsy: true }).isInt({ min: 1 }),
    query('limit').optional({ checkFalsy: true }).isInt({ min: 1, max: 100 }),
    query('category').optional({ checkFalsy: true }).isString(),
    query('subcategory').optional({ checkFalsy: true }).isString(),
    query('location').optional({ checkFalsy: true }).isString(),
    query('minPrice').optional({ checkFalsy: true }).isFloat({ min: 0 }),
    query('maxPrice').optional({ checkFalsy: true }).isFloat({ min: 0 }),
    query('search').optional({ checkFalsy: true }).isString(),
    query('condition').optional({ checkFalsy: true }).isIn(['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED']),
    query('sort').optional({ checkFalsy: true }).isIn(['newest', 'oldest', 'price_low', 'price_high', 'featured', 'bumped']),
    query('latitude').optional({ checkFalsy: true }).isFloat(),
    query('longitude').optional({ checkFalsy: true }).isFloat(),
    query('radius').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('radius must be a number'),
    query('brand').optional({ checkFalsy: true }).isString(),
    query('model').optional({ checkFalsy: true }).isString(),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  },
  AdController.getAds.bind(AdController)
);

// Filter options aggregated from actual products (includes priceBucketCounts for Budget labels)
router.get('/filter-options',
  cacheMiddleware(60), // 1 min cache (so filterOptionCounts/totalCount refresh after deploy)
  [
    query('category').optional({ checkFalsy: true }).isString(),
    query('subcategory').optional({ checkFalsy: true }).isString(),
    query('location').optional({ checkFalsy: true }).isString(),
    query('brand').optional({ checkFalsy: true }).isString(),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    next();
  },
  AdController.getFilterOptions.bind(AdController)
);

// Price bucket counts for filter UI (e.g. "₹2 – ₹3 Lakh (36)"). Category-aware; short cache.
router.get('/price-bucket-counts',
  cacheMiddleware(60), // 1 min
  [
    query('category').optional({ checkFalsy: true }).isString(),
    query('subcategory').optional({ checkFalsy: true }).isString(),
    query('location').optional({ checkFalsy: true }).isString(),
    query('brand').optional({ checkFalsy: true }).isString(),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    next();
  },
  AdController.getPriceBucketCounts.bind(AdController)
);

// Autocomplete endpoint for search suggestions (must be before /:id)
router.get('/autocomplete',
  cacheMiddleware(60), // Cache for 1 minute
  [
    query('q').notEmpty().withMessage('Query is required'),
    query('limit').optional({ checkFalsy: true }).isInt({ min: 1, max: 20 }),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  },
  AdController.autocomplete.bind(AdController)
);

// Popular searches endpoint (must be before /:id)
router.get('/popular-searches',
  cacheMiddleware(300), // Cache for 5 minutes
  [
    query('limit').optional({ checkFalsy: true }).isInt({ min: 1, max: 50 }),
  ],
  AdController.getPopularSearches.bind(AdController)
);

// Check ad limit (must be before /:id so "check-limit" is not treated as ad id)
router.get('/check-limit',
  authenticate,
  AdController.checkLimit.bind(AdController)
);

// Get ad by JustDial-style path: /:city/services/:category/:slug (3 params)
router.get('/by-service-path/:locationSlug/:categorySlug/:slug',
  cacheMiddleware(cacheConfig.ADS_SINGLE_TTL),
  AdController.getAdByServicePath.bind(AdController)
);

// Get ad by SEO path: /{state}/{city}/{category}/{slug} (must be before /:id)
router.get('/by-path/:stateSlug/:citySlug/:categorySlug/:slug',
  cacheMiddleware(cacheConfig.ADS_SINGLE_TTL),
  AdController.getAdByPath.bind(AdController)
);

// Favorite routes (must be before /:id so ":id/favorite" is not treated as ad id)
router.get('/:id/favorite',
  authenticate,
  AdController.getFavoriteStatus.bind(AdController)
);

router.post('/:id/favorite',
  authenticate,
  AdController.toggleFavorite.bind(AdController)
);

// Get ad by ID
router.get('/:id',
  cacheMiddleware(cacheConfig.ADS_SINGLE_TTL),
  AdController.getAdById.bind(AdController)
);

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
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  },
  AdController.createAd.bind(AdController)
);

// Update ad
router.put('/:id',
  authenticate,
  uploadImages,
  AdController.updateAd.bind(AdController)
);

// Delete ad
router.delete('/:id',
  authenticate,
  AdController.deleteAd.bind(AdController)
);

module.exports = router;
