/**
 * Clusters & Auto Lists API Routes
 * Handles search intelligence, clustering, and auto-generated SEO lists
 */

const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const prisma = require('../prisma/client');
const { parseIndianQuery, recordSearchPattern } = require('../services/searchIntelligence');
const { 
  findOrCreateClusterFromQuery, 
  updateCluster, 
  getClustersByCategory, 
  getClustersByLocation 
} = require('../services/clusteringService');
const { 
  createOrUpdateAutoList, 
  getActiveLists, 
  getListBySlug,
  generateListsForAllClusters,
  generateListsForCategory,
  updateListFromCluster
} = require('../services/autoListGenerator');

/**
 * POST /api/clusters/parse-query
 * Parse Indian search query and return intent
 */
router.post('/parse-query',
  [
    body('query').notEmpty().trim().isLength({ min: 1, max: 500 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { query } = req.body;
      const parsed = parseIndianQuery(query);

      // Record search pattern
      await recordSearchPattern(parsed);

      res.json({
        success: true,
        parsed
      });
    } catch (error) {
      console.error('Error parsing query:', error);
      res.status(500).json({ success: false, message: 'Failed to parse query' });
    }
  }
);

/**
 * POST /api/clusters/from-query
 * Find or create cluster from search query
 */
router.post('/from-query',
  [
    body('query').notEmpty().trim().isLength({ min: 1, max: 500 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { query } = req.body;
      const cluster = await findOrCreateClusterFromQuery(query);

      if (!cluster) {
        return res.status(404).json({ 
          success: false, 
          message: 'Could not create cluster from query' 
        });
      }

      res.json({
        success: true,
        cluster
      });
    } catch (error) {
      console.error('Error creating cluster from query:', error);
      res.status(500).json({ success: false, message: 'Failed to create cluster' });
    }
  }
);

/**
 * GET /api/clusters
 * Get clusters with filters
 */
router.get('/',
  [
    query('categoryId').optional().isString(),
    query('locationId').optional().isString(),
    query('level').optional().isInt({ min: 1, max: 4 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('minAdCount').optional().isInt({ min: 0 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { categoryId, locationId, level, limit = 50, minAdCount = 0 } = req.query;

      let clusters = [];

      if (categoryId) {
        clusters = await getClustersByCategory(categoryId, { level, limit });
      } else if (locationId) {
        clusters = await getClustersByLocation(locationId, { level, limit });
      } else {
        const where = {};
        if (level) where.level = parseInt(level);
        if (minAdCount) where.adCount = { gte: parseInt(minAdCount) };

        clusters = await prisma.adCluster.findMany({
          where,
          include: {
            category: true,
            location: true,
            lists: {
              where: { isActive: true }
            }
          },
          orderBy: [
            { popularityScore: 'desc' },
            { adCount: 'desc' }
          ],
          take: parseInt(limit)
        });
      }

      res.json({
        success: true,
        clusters,
        count: clusters.length
      });
    } catch (error) {
      console.error('Error fetching clusters:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch clusters' });
    }
  }
);

/**
 * GET /api/clusters/:id
 * Get cluster by ID
 */
router.get('/:id',
  [
    param('id').notEmpty().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { id } = req.params;

      const cluster = await prisma.adCluster.findUnique({
        where: { id },
        include: {
          category: true,
          location: true,
          lists: {
            where: { isActive: true },
            orderBy: { priority: 'desc' }
          }
        }
      });

      if (!cluster) {
        return res.status(404).json({ success: false, message: 'Cluster not found' });
      }

      res.json({
        success: true,
        cluster
      });
    } catch (error) {
      console.error('Error fetching cluster:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch cluster' });
    }
  }
);

/**
 * PUT /api/clusters/:id/update
 * Update cluster (refresh ad list)
 */
router.put('/:id/update',
  [
    param('id').notEmpty().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { id } = req.params;
      const updatedCluster = await updateCluster(id);

      if (!updatedCluster) {
        return res.status(404).json({ success: false, message: 'Cluster not found' });
      }

      // Update associated lists
      await updateListFromCluster(id);

      res.json({
        success: true,
        cluster: updatedCluster
      });
    } catch (error) {
      console.error('Error updating cluster:', error);
      res.status(500).json({ success: false, message: 'Failed to update cluster' });
    }
  }
);

/**
 * GET /api/lists
 * Get all active auto-generated lists
 */
router.get('/lists',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    query('sortBy').optional().isIn(['priority', 'searchVolume', 'adCount', 'lastUpdated'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { limit = 50, offset = 0, sortBy = 'priority' } = req.query;

      const lists = await getActiveLists({ limit: parseInt(limit), offset: parseInt(offset), sortBy });

      res.json({
        success: true,
        lists,
        count: lists.length
      });
    } catch (error) {
      console.error('Error fetching lists:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch lists' });
    }
  }
);

/**
 * GET /api/lists/:slug
 * Get list by slug (for SEO pages)
 */
router.get('/lists/:slug',
  [
    param('slug').notEmpty().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { slug } = req.params;

      const list = await getListBySlug(slug);

      if (!list) {
        return res.status(404).json({ success: false, message: 'List not found' });
      }

      // Get actual ad data
      const ads = await prisma.ad.findMany({
        where: {
          id: { in: list.adIds },
          status: 'APPROVED',
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        include: {
          category: true,
          subcategory: true,
          location: true,
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              isVerified: true
            }
          }
        },
        orderBy: [
          { isPremium: 'desc' },
          { featuredAt: 'desc' },
          { bumpedAt: 'desc' },
          { createdAt: 'desc' }
        ],
        take: 50
      });

      res.json({
        success: true,
        list: {
          ...list,
          ads
        }
      });
    } catch (error) {
      console.error('Error fetching list:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch list' });
    }
  }
);

/**
 * POST /api/lists/generate
 * Generate lists for all clusters (admin endpoint)
 */
router.post('/lists/generate',
  [
    body('categoryId').optional().isString(),
    body('limit').optional().isInt({ min: 1, max: 1000 }),
    body('minAdCount').optional().isInt({ min: 0 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { categoryId, limit = 100, minAdCount = 5 } = req.body;

      let results;
      if (categoryId) {
        results = await generateListsForCategory(categoryId, { minAdCount });
      } else {
        results = await generateListsForAllClusters({ limit, minAdCount });
      }

      res.json({
        success: true,
        results
      });
    } catch (error) {
      console.error('Error generating lists:', error);
      res.status(500).json({ success: false, message: 'Failed to generate lists' });
    }
  }
);

/**
 * GET /api/lists/:slug/ads
 * Get ads for a list (paginated)
 */
router.get('/lists/:slug/ads',
  [
    param('slug').notEmpty().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { slug } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const list = await getListBySlug(slug);

      if (!list) {
        return res.status(404).json({ success: false, message: 'List not found' });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const adIds = list.adIds.slice(skip, skip + parseInt(limit));

      const ads = await prisma.ad.findMany({
        where: {
          id: { in: adIds },
          status: 'APPROVED',
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        include: {
          category: true,
          subcategory: true,
          location: true,
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              isVerified: true
            }
          }
        },
        orderBy: [
          { isPremium: 'desc' },
          { featuredAt: 'desc' },
          { bumpedAt: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      res.json({
        success: true,
        ads,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: list.adCount,
          pages: Math.ceil(list.adCount / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching list ads:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch list ads' });
    }
  }
);

module.exports = router;

