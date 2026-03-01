const express = require('express');
const { query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Common filters applied to ALL parent categories (and subcategories).
 * These are always returned so every listing page has consistent filter options.
 */
const COMMON_FILTERS = [
  {
    id: 'common-price',
    key: 'price',
    name: 'price',
    label: 'Price',
    type: 'range',
    order: 0,
    isRequired: false,
    placeholder: 'Any price',
    helpText: 'Min and max price',
    min: 0,
    max: 10000000,
    step: 100,
    unit: '₹',
    defaultValue: null,
    priceMin: 0,
    priceMax: 10000000,
    priceStep: 100,
    options: [],
    categoryId: null,
    subcategoryId: null,
    filterable: true,
  },
  {
    id: 'common-condition',
    key: 'condition',
    name: 'condition',
    label: 'Condition',
    type: 'select',
    order: 1,
    isRequired: false,
    placeholder: 'Any condition',
    helpText: null,
    options: [
      { id: 'opt-new', value: 'NEW', label: 'New', order: 0 },
      { id: 'opt-like-new', value: 'LIKE_NEW', label: 'Like New', order: 1 },
      { id: 'opt-used', value: 'USED', label: 'Used', order: 2 },
      { id: 'opt-refurbished', value: 'REFURBISHED', label: 'Refurbished', order: 3 },
    ],
    categoryId: null,
    subcategoryId: null,
    filterable: true,
  },
  {
    id: 'common-posted-time',
    key: 'postedTime',
    name: 'postedTime',
    label: 'Posted',
    type: 'select',
    order: 2,
    isRequired: false,
    placeholder: 'Any time',
    helpText: null,
    options: [
      { id: 'opt-24h', value: '24h', label: 'Last 24 hours', order: 0 },
      { id: 'opt-3d', value: '3d', label: 'Last 3 days', order: 1 },
      { id: 'opt-7d', value: '7d', label: 'Last 7 days', order: 2 },
      { id: 'opt-30d', value: '30d', label: 'Last 30 days', order: 3 },
    ],
    categoryId: null,
    subcategoryId: null,
    filterable: true,
  },
  {
    id: 'common-sort',
    key: 'sort',
    name: 'sort',
    label: 'Sort by',
    type: 'select',
    order: 3,
    isRequired: false,
    placeholder: 'Newest first',
    helpText: null,
    options: [
      { id: 'opt-newest', value: 'newest', label: 'Newest first', order: 0 },
      { id: 'opt-oldest', value: 'oldest', label: 'Oldest first', order: 1 },
      { id: 'opt-price-low', value: 'price_low', label: 'Price: Low to High', order: 2 },
      { id: 'opt-price-high', value: 'price_high', label: 'Price: High to Low', order: 3 },
      { id: 'opt-featured', value: 'featured', label: 'Featured', order: 4 },
    ],
    categoryId: null,
    subcategoryId: null,
    filterable: true,
  },
];

/**
 * GET /api/filter-configurations
 * Get filter configurations for a category/subcategory
 * Always includes common filters for all parent categories.
 * Query params: categorySlug, subcategorySlug, categoryId
 */
router.get('/',
  [
    query('categorySlug').optional().isString(),
    query('categoryId').optional().isString(),
    query('subcategorySlug').optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { categorySlug, categoryId, subcategorySlug } = req.query;

      // Find category and subcategory
      let category = null;
      let subcategory = null;

      if (categorySlug || categoryId) {
        category = await prisma.category.findFirst({
          where: categoryId 
            ? { id: categoryId }
            : { slug: categorySlug },
        });
      }

      if (subcategorySlug && category) {
        subcategory = await prisma.subcategory.findFirst({
          where: {
            slug: subcategorySlug,
            categoryId: category.id,
          },
        });
      }

      // Build where clause for filter configurations
      const where = {};
      
      if (category) {
        if (subcategory) {
          // Get filters specific to this subcategory
          where.subcategoryId = subcategory.id;
        } else {
          // Get filters for the category (not subcategory-specific)
          where.categoryId = category.id;
          where.subcategoryId = null;
        }
      } else {
        // If no category provided, get common filters (no categoryId or subcategoryId)
        where.categoryId = null;
        where.subcategoryId = null;
      }

      // Fetch filter configurations - handle case where model might not exist
      let filterConfigs = [];
      try {
        filterConfigs = await prisma.filterConfiguration.findMany({
          where,
          include: {
            options: {
              where: { isActive: true },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        });
      } catch (dbError) {
        // If FilterConfiguration model doesn't exist or query fails, return empty filters
        console.warn('⚠️ FilterConfiguration model not available or query failed:', dbError.message);
        filterConfigs = [];
      }

      // Start with common filters for ALL parent categories (always included)
      const commonFilterKeys = COMMON_FILTERS.map(f => f.key);
      const normalFilters = [...COMMON_FILTERS];
      const specialFilters = [];
      const allFilters = [...COMMON_FILTERS];
      const categoryFilterKeys = [];
      const subcategoryFilterKeys = [];

      // Add DB filter configs (if any) - avoid duplicating keys already in common
      const commonKeysSet = new Set(commonFilterKeys);
      filterConfigs.forEach((filter) => {
        if (commonKeysSet.has(filter.key)) return; // skip if already in common
        commonKeysSet.add(filter.key);

        const filterData = {
          id: filter.id,
          key: filter.key,
          name: filter.name,
          label: filter.label || filter.name,
          type: filter.type || 'select',
          order: (filter.order ?? 0) + COMMON_FILTERS.length,
          isRequired: filter.isRequired || false,
          placeholder: filter.placeholder,
          helpText: filter.helpText,
          min: filter.min,
          max: filter.max,
          step: filter.step,
          unit: filter.unit,
          defaultValue: filter.defaultValue,
          priceMin: filter.priceMin,
          priceMax: filter.priceMax,
          priceStep: filter.priceStep,
          options: (filter.options || []).map(opt => ({
            id: opt.id,
            value: opt.value,
            label: opt.label || opt.value,
            order: opt.order || 0,
          })),
          categoryId: filter.categoryId,
          subcategoryId: filter.subcategoryId,
          filterable: filter.filterable !== false,
        };

        allFilters.push(filterData);

        if (filter.filterCategory === 'SPECIAL') {
          specialFilters.push(filterData);
        } else {
          normalFilters.push(filterData);
        }

        if (filter.subcategoryId) {
          subcategoryFilterKeys.push(filter.key);
        } else if (filter.categoryId) {
          categoryFilterKeys.push(filter.key);
        } else {
          commonFilterKeys.push(filter.key);
        }
      });

      // Calculate price range from ads if category/subcategory provided
      let priceRange = null;
      if (category) {
        try {
          const priceStats = await prisma.ad.aggregate({
            where: {
              status: 'APPROVED',
              categoryId: category.id,
              ...(subcategory ? { subcategoryId: subcategory.id } : {}),
              price: { not: null },
            },
            _min: { price: true },
            _max: { price: true },
          });

          if (priceStats._min.price !== null && priceStats._max.price !== null) {
            priceRange = {
              min: Math.floor(priceStats._min.price),
              max: Math.ceil(priceStats._max.price),
              step: Math.max(1, Math.floor((priceStats._max.price - priceStats._min.price) / 100)),
            };
          }
        } catch (priceError) {
          console.warn('⚠️ Could not calculate price range:', priceError.message);
          // Continue without price range
        }
      }

      res.json({
        success: true,
        filters: {
          normal: normalFilters,
          special: specialFilters,
          all: allFilters,
          common: commonFilterKeys,
          category: categoryFilterKeys,
          subcategory: subcategoryFilterKeys,
        },
        category: category ? {
          id: category.id,
          name: category.name,
          slug: category.slug,
        } : null,
        subcategory: subcategory ? {
          id: subcategory.id,
          name: subcategory.name,
          slug: subcategory.slug,
        } : null,
        priceRange,
      });
    } catch (error) {
      console.error('❌ Error getting filter configurations:', error);
      
      // Return common filters only so frontend still has usable filters
      res.status(200).json({
        success: true,
        filters: {
          normal: COMMON_FILTERS,
          special: [],
          all: COMMON_FILTERS,
          common: COMMON_FILTERS.map(f => f.key),
          category: [],
          subcategory: [],
        },
        category: null,
        subcategory: null,
        priceRange: null,
        _error: process.env.NODE_ENV === 'development' ? { message: error.message } : undefined,
      });
    }
  }
);

module.exports = router;
