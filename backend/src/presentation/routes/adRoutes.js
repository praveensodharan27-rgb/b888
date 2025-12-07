const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { authenticate } = require('../../../middleware/auth');
const { uploadImages } = require('../../../middleware/upload');
const { cacheMiddleware } = require('../../../middleware/cache');
const AdController = require('../controllers/AdController');

const router = express.Router();

// Get all ads
router.get('/',
  cacheMiddleware(60 * 1000),
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
    query('radius').optional().isFloat({ min: 0 })
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

// Get ad by ID
router.get('/:id',
  cacheMiddleware(60 * 1000),
  AdController.getAdById.bind(AdController)
);

// Check ad limit
router.get('/check-limit',
  authenticate,
  AdController.checkLimit.bind(AdController)
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
