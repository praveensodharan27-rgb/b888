const AdService = require('../../application/services/AdService');
const { getHomeFeedAds } = require('../../../services/locationWiseAdRankingService');
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../../config/logger');
const { getSafeErrorPayload } = require('../../../utils/safeErrorResponse');
const { getBucketsForCategory } = require('../../../config/priceBucketProfiles');
const prisma = new PrismaClient();

function logError(req, err, msg, ctx = {}) {
  const log = (req && req.log) ? req.log : logger;
  log.error({ requestId: req && req.id, err: err && err.message, ...ctx }, msg);
}

/**
 * Ad Controller
 * Handles HTTP requests/responses for Ad operations
 */
class AdController {
  /**
   * Validate MongoDB ObjectID format
   * @param {string} id - The ID to validate
   * @returns {boolean} - True if valid ObjectID format
   */
  isValidObjectId(id) {
    if (!id || typeof id !== 'string') return false;
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return objectIdRegex.test(id);
  }

  async getHomeFeed(req, res) {
    try {
      const { page = 1, limit = 12, city, state, location, latitude, longitude, userLat, userLng, category, subcategory } = req.query;
      const lat = latitude ?? userLat;
      const lng = longitude ?? userLng;
      const result = await getHomeFeedAds({
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        city: city || undefined,
        state: state || undefined,
        locationSlug: location || undefined,
        latitude: lat != null && lat !== '' ? parseFloat(lat) : undefined,
        longitude: lng != null && lng !== '' ? parseFloat(lng) : undefined,
        category: category || undefined,
        subcategory: subcategory || undefined,
        includeSponsored: true,
      });
      res.json({
        success: true,
        ads: result.ads,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      logError(req, error, 'Get home feed error');
      res.status(500).json(getSafeErrorPayload(error, 'Failed to fetch home feed'));
    }
  }

  async getAds(req, res) {
    try {
      const filters = { ...req.query };
      // ram, storage, processor, graphics, etc. from query are passed through for attribute filtering

      const result = await AdService.getAds(filters);
      res.json({
        success: true,
        ads: result.ads,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      logError(req, error, 'Get ads error');
      res.status(500).json(getSafeErrorPayload(error, 'Failed to fetch ads'));
    }
  }

  /**
   * GET /ads/filter-options — aggregate from products (real data).
   * Returns filterOptions, brandModels, priceBucketCounts, filterOptionCounts (per-value counts), totalCount.
   */
  async getFilterOptions(req, res) {
    try {
      const categorySlug = req.query.category;
      const subcategorySlug = req.query.subcategory;
      const locationSlug = req.query.location;
      const brand = req.query.brand;

      let filterOptions = {};
      let brandModels = {};
      let filterOptionCounts = {};
      let totalCount = 0;
      let priceBucketCounts = [];

      if (categorySlug || subcategorySlug) {
        const result = await AdService.getFilterOptionsFromAds(categorySlug, subcategorySlug, {
          locationSlug: locationSlug || undefined,
          brand: brand || undefined,
        });
        filterOptions = result.filterOptions || {};
        brandModels = result.brandModels || {};
        filterOptionCounts = result.filterOptionCounts || {};
        totalCount = result.totalCount ?? 0;
      }

      // Price bucket counts for Budget filter (e.g. "₹2 – ₹3 Lakh (36)")
      try {
        const buckets = getBucketsForCategory(categorySlug, subcategorySlug);
        const baseWhere = {
          status: 'APPROVED',
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        };
        if (categorySlug) {
          const categoryObj = await prisma.category.findUnique({ where: { slug: categorySlug }, select: { id: true } });
          if (categoryObj) baseWhere.categoryId = categoryObj.id;
        }
        if (subcategorySlug) {
          const subcategoryObj = await prisma.subcategory.findFirst({ where: { slug: subcategorySlug }, select: { id: true } });
          if (subcategoryObj) baseWhere.subcategoryId = subcategoryObj.id;
        }
        if (locationSlug) {
          const locationObj = await prisma.location.findUnique({ where: { slug: locationSlug }, select: { id: true } });
          if (locationObj) baseWhere.locationId = locationObj.id;
        }
        priceBucketCounts = await Promise.all(
          buckets.map((b) => prisma.ad.count({ where: { ...baseWhere, price: { gte: b.min, lte: b.max } } }))
        );
      } catch (countErr) {
        logError(req, countErr, 'Filter options: price bucket counts failed');
      }

      res.json({ success: true, filterOptions, brandModels, priceBucketCounts, filterOptionCounts, totalCount });
    } catch (error) {
      logError(req, error, 'Get filter options error');
      res.status(500).json(getSafeErrorPayload(error, 'Failed to fetch filter options'));
    }
  }

  /**
   * GET /ads/price-bucket-counts — count of ads per price bucket for current category/filters.
   * Used by frontend to show e.g. "₹2 – ₹3 Lakh (36)".
   * Query: category, subcategory, location, brand (optional). Counts respect category and filters.
   */
  async getPriceBucketCounts(req, res) {
    try {
      const { category: categorySlug, subcategory: subcategorySlug, location: locationSlug, brand } = req.query;
      const buckets = getBucketsForCategory(categorySlug, subcategorySlug);

      const baseWhere = {
        status: 'APPROVED',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      };

      if (categorySlug) {
        const categoryObj = await prisma.category.findUnique({
          where: { slug: categorySlug },
          select: { id: true },
        });
        if (categoryObj) baseWhere.categoryId = categoryObj.id;
      }

      if (subcategorySlug) {
        const subcategoryObj = await prisma.subcategory.findFirst({
          where: { slug: subcategorySlug },
          select: { id: true },
        });
        if (subcategoryObj) baseWhere.subcategoryId = subcategoryObj.id;
      }

      if (locationSlug) {
        const locationObj = await prisma.location.findUnique({
          where: { slug: locationSlug },
          select: { id: true },
        });
        if (locationObj) baseWhere.locationId = locationObj.id;
      }

      // Brand filter: Prisma MongoDB Json filter by key is not trivial; counts are category/location-aware only for now
      // TODO: add brand to aggregation via raw query if needed

      const counts = await Promise.all(
        buckets.map((b) =>
          prisma.ad.count({
            where: {
              ...baseWhere,
              price: { gte: b.min, lte: b.max },
            },
          })
        )
      );

      res.json({ success: true, priceBucketCounts: counts });
    } catch (error) {
      logError(req, error, 'Get price bucket counts error');
      res.status(500).json(getSafeErrorPayload(error, 'Failed to fetch price bucket counts'));
    }
  }

  async getAdById(req, res) {
    try {
      const { id } = req.params;
      
      // Log the request for debugging
      console.log('🔍 getAdById - Request received:', {
        id,
        idLength: id?.length,
        idType: typeof id,
        url: req.url,
        path: req.path
      });
      
      // Validate MongoDB ObjectID format (24 hex characters)
      // This prevents errors when non-ID strings like "home-feed" are passed
      if (!this.isValidObjectId(id)) {
        console.warn('⚠️ getAdById - Invalid ObjectID format:', id);
        return res.status(404).json({
          success: false,
          message: 'Ad not found'
        });
      }
      
      const ad = await AdService.getAdById(id);
      
      if (!ad) {
        console.warn('⚠️ getAdById - Ad not found in database:', id);
        return res.status(404).json({
          success: false,
          message: 'Ad not found'
        });
      }
      
      console.log('✅ getAdById - Ad found:', {
        id: ad.id,
        title: ad.title?.substring(0, 50),
        status: ad.status
      });
      
      res.json({ success: true, ad });
    } catch (error) {
      logError(req, error, 'Get ad error', {
        message: error.message,
        code: error.code,
        id: req.params.id,
        stack: error.stack
      });

      // Handle Prisma ObjectID validation errors
      if (error.code === 'P2023' || error.message?.includes('Malformed ObjectID')) {
        return res.status(404).json({
          success: false,
          message: 'Ad not found'
        });
      }
      
      if (error.message === 'Ad not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      res.status(500).json(getSafeErrorPayload(error, 'Failed to fetch ad'));
    }
  }

  /** GET /ads/by-path/:stateSlug/:citySlug/:categorySlug/:slug — ad by SEO path for /{state}/{city}/{category}/{slug} */
  async getAdByPath(req, res) {
    try {
      const { stateSlug, citySlug, categorySlug, slug } = req.params;
      const ad = await AdService.getAdByPath(stateSlug, citySlug, categorySlug, slug);
      if (!ad) {
        return res.status(404).json({ success: false, message: 'Ad not found' });
      }
      res.json({ success: true, ad });
    } catch (error) {
      logError(req, error, 'Get ad by path error', { message: error.message });
      res.status(500).json(getSafeErrorPayload(error, 'Failed to fetch ad'));
    }
  }

  /** GET /ads/by-service-path/:locationSlug/:categorySlug/:slug — JustDial-style /:city/services/:category/:slug */
  async getAdByServicePath(req, res) {
    try {
      const { locationSlug, categorySlug, slug } = req.params;
      const ad = await AdService.getAdByServicePath(locationSlug, categorySlug, slug);
      if (!ad) {
        return res.status(404).json({ success: false, message: 'Ad not found' });
      }
      res.json({ success: true, ad });
    } catch (error) {
      logError(req, error, 'Get ad by service path error', { message: error.message });
      res.status(500).json(getSafeErrorPayload(error, 'Failed to fetch ad'));
    }
  }

  async createAd(req, res) {
    try {
      // Verify payment order if provided
      let paymentOrder = null;
      if (req.body.paymentOrderId) {
        paymentOrder = await prisma.adPostingOrder.findUnique({
          where: { razorpayOrderId: req.body.paymentOrderId },
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
          return res.status(402).json({
            success: false,
            message: 'Payment order not found. Please complete payment first.',
            requiresPayment: true
          });
        }

        if (paymentOrder.userId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'Payment order does not belong to you.',
            requiresPayment: true
          });
        }

        if (paymentOrder.status !== 'paid') {
          return res.status(402).json({
            success: false,
            message: `Payment not completed. Order status: ${paymentOrder.status}. Please complete payment first.`,
            requiresPayment: true,
            orderStatus: paymentOrder.status
          });
        }
      }

      const attributes = req.body.attributes ? (typeof req.body.attributes === 'string' ? JSON.parse(req.body.attributes) : req.body.attributes) : {};
      const specifications = req.body.specifications ? (typeof req.body.specifications === 'string' ? JSON.parse(req.body.specifications) : req.body.specifications) : [];
      if (Array.isArray(specifications) && specifications.length > 0) {
        const specObj = {};
        specifications.forEach((s) => {
          if (s && (s.specificationId || s.name) && s.value != null && s.value !== '') {
            const key = s.name || s.specificationId || s.id;
            if (key) specObj[key] = s.value;
          }
        });
        Object.assign(attributes, specObj);
      }
      const adData = {
        title: req.body.title,
        description: req.body.description,
        price: req.body.price,
        originalPrice: req.body.originalPrice,
        discount: req.body.discount != null && req.body.discount !== '' ? parseFloat(req.body.discount) : null,
        condition: req.body.condition,
        categoryId: req.body.categoryId,
        subcategoryId: req.body.subcategoryId,
        locationId: req.body.locationId || null,
        state: req.body.state || null,
        city: req.body.city || null,
        neighbourhood: req.body.neighbourhood || null,
        exactLocation: req.body.exactLocation || null,
        images: req.uploadedImages || [],
        attributes,
        premiumType: req.body.premiumType || null,
        isUrgent: req.body.isUrgent === true || req.body.isUrgent === 'true'
      };

      const ad = await AdService.createAd(req.user.id, adData, paymentOrder);

      res.status(201).json({
        success: true,
        message: 'Ad created successfully',
        ad
      });
    } catch (error) {
      logError(req, error, 'Create ad error');
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create ad'
      });
    }
  }

  async updateAd(req, res) {
    try {
      const { id } = req.params;
      
      // Validate MongoDB ObjectID format
      if (!this.isValidObjectId(id)) {
        return res.status(404).json({
          success: false,
          message: 'Ad not found'
        });
      }
      // Only allow user to set status to INACTIVE or SOLD (prevent moderation bypass)
      const allowedStatusesForUser = ['INACTIVE', 'SOLD'];
      const requestedStatus = req.body.status;
      const statusForUpdate =
        requestedStatus && allowedStatusesForUser.includes(requestedStatus)
          ? requestedStatus
          : undefined;

      const adData = {
        title: req.body.title,
        description: req.body.description,
        price: req.body.price,
        originalPrice: req.body.originalPrice,
        discount: req.body.discount != null && req.body.discount !== '' ? parseFloat(req.body.discount) : undefined,
        condition: req.body.condition,
        ...(statusForUpdate && { status: statusForUpdate }),
        categoryId: req.body.categoryId,
        subcategoryId: req.body.subcategoryId,
        locationId: req.body.locationId != null ? req.body.locationId : undefined,
        state: req.body.state != null ? req.body.state : undefined,
        city: req.body.city != null ? req.body.city : undefined,
        neighbourhood: req.body.neighbourhood != null ? req.body.neighbourhood : undefined,
        exactLocation: req.body.exactLocation != null ? req.body.exactLocation : undefined,
        images: req.uploadedImages || req.body.images,
        attributes: (() => {
          const raw = req.body.attributes;
          if (raw == null) return undefined;
          if (typeof raw === 'object') return raw;
          try {
            return typeof raw === 'string' ? JSON.parse(raw) : raw;
          } catch (e) {
            return {};
          }
        })()
      };

      // Remove undefined values
      Object.keys(adData).forEach(key => {
        if (adData[key] === undefined) {
          delete adData[key];
        }
      });

      const ad = await AdService.updateAd(id, req.user.id, adData);
      res.json({
        success: true,
        message: 'Ad updated successfully',
        ad
      });
    } catch (error) {
      logError(req, error, 'Update ad error');
      
      // Handle Prisma ObjectID validation errors
      if (error.code === 'P2023' || error.message?.includes('Malformed ObjectID')) {
        return res.status(404).json({
          success: false,
          message: 'Ad not found'
        });
      }
      
      if (error.message === 'Ad not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      if (error.message.includes('only update')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update ad'
      });
    }
  }

  async deleteAd(req, res) {
    try {
      const { id } = req.params;
      
      // Validate MongoDB ObjectID format
      if (!this.isValidObjectId(id)) {
        return res.status(404).json({
          success: false,
          message: 'Ad not found'
        });
      }
      
      await AdService.deleteAd(id, req.user.id);
      res.json({
        success: true,
        message: 'Ad deleted successfully'
      });
    } catch (error) {
      logError(req, error, 'Delete ad error');
      
      // Handle Prisma ObjectID validation errors
      if (error.code === 'P2023' || error.message?.includes('Malformed ObjectID')) {
        return res.status(404).json({
          success: false,
          message: 'Ad not found'
        });
      }
      
      if (error.message === 'Ad not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      if (error.message.includes('only delete')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }
      res.status(500).json(getSafeErrorPayload(error, 'Failed to delete ad'));
    }
  }

  async checkLimit(req, res) {
    try {
      const premiumSelected = req.query.premiumSelected === 'true';
      const limit = await AdService.checkAdLimit(req.user.id, { premiumSelected });
      res.json({
        success: true,
        ...limit
      });
    } catch (error) {
      logError(req, error, 'Check limit error');
      res.status(500).json(getSafeErrorPayload(error, 'Failed to check ad limit'));
    }
  }

  async getFavoriteStatus(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Validate ObjectID
      if (!this.isValidObjectId(id)) {
        return res.status(404).json({
          success: false,
          message: 'Ad not found'
        });
      }

      // Check if ad exists
      const ad = await prisma.ad.findUnique({
        where: { id },
        select: { id: true }
      });

      if (!ad) {
        return res.status(404).json({
          success: false,
          message: 'Ad not found'
        });
      }

      // Check if favorite exists
      const favorite = await prisma.favorite.findUnique({
        where: {
          userId_adId: {
            userId,
            adId: id
          }
        }
      });

      res.json({
        success: true,
        isFavorite: !!favorite
      });
    } catch (error) {
      logError(req, error, 'Get favorite status error');
      res.status(500).json(getSafeErrorPayload(error, 'Failed to check favorite status'));
    }
  }

  async toggleFavorite(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Validate ObjectID
      if (!this.isValidObjectId(id)) {
        return res.status(404).json({
          success: false,
          message: 'Ad not found'
        });
      }

      // Check if ad exists
      const ad = await prisma.ad.findUnique({
        where: { id },
        select: { id: true }
      });

      if (!ad) {
        return res.status(404).json({
          success: false,
          message: 'Ad not found'
        });
      }

      // Check if favorite already exists
      const existingFavorite = await prisma.favorite.findUnique({
        where: {
          userId_adId: {
            userId,
            adId: id
          }
        }
      });

      let isFavorite;
      if (existingFavorite) {
        // Remove favorite
        await prisma.favorite.delete({
          where: {
            userId_adId: {
              userId,
              adId: id
            }
          }
        });
        isFavorite = false;
      } else {
        // Add favorite
        await prisma.favorite.create({
          data: {
            userId,
            adId: id
          }
        });
        isFavorite = true;
      }

      res.json({
        success: true,
        isFavorite
      });
    } catch (error) {
      logError(req, error, 'Toggle favorite error');
      
      // Handle unique constraint violation (already favorited)
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          message: 'Favorite already exists'
        });
      }

      res.status(500).json(getSafeErrorPayload(error, 'Failed to toggle favorite'));
    }
  }

  /**
   * Autocomplete endpoint for search suggestions
   * GET /ads/autocomplete?q=<query>&limit=<limit>
   */
  async autocomplete(req, res) {
    try {
      const { q: query, limit = 8 } = req.query;
      
      if (!query || query.trim().length < 2) {
        return res.json({ success: true, suggestions: [] });
      }

      // Use Meilisearch autocomplete
      const { autocomplete } = require('../../../services/meilisearch');
      const suggestions = await autocomplete(query.trim(), parseInt(limit, 10));

      // Log search for analytics (async, non-blocking)
      const { logSearch } = require('../../../utils/searchAnalytics');
      setImmediate(() => {
        logSearch(query.trim(), suggestions?.length || 0, req.user?.id, { type: 'autocomplete' });
      });

      res.json({
        success: true,
        suggestions: suggestions || [],
      });
    } catch (error) {
      logError(req, error, 'Autocomplete error');
      // Return empty array on error (graceful degradation)
      res.json({ success: true, suggestions: [] });
    }
  }

  /**
   * Get popular searches
   * GET /ads/popular-searches?limit=<limit>
   */
  async getPopularSearches(req, res) {
    try {
      const { limit = 10 } = req.query;
      
      const { getPopularSearches } = require('../../../utils/searchAnalytics');
      const searches = await getPopularSearches(parseInt(limit, 10));

      res.json({
        success: true,
        searches: searches || [],
      });
    } catch (error) {
      logError(req, error, 'Get popular searches error');
      res.json({ success: true, searches: [] });
    }
  }

}

module.exports = new AdController();
