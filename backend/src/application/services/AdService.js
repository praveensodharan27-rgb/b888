const Ad = require('../../domain/entities/Ad');
const AdConfig = require('../../domain/config/AdConfig');
const AdRepository = require('../../infrastructure/database/repositories/AdRepository');
const { moderateAd } = require('../../../services/contentModeration');
const { indexAd } = require('../../../services/meilisearch');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Ad Service
 * Business logic for Ad operations
 */
class AdService {
  constructor(adRepository = AdRepository) {
    this.adRepository = adRepository;
  }

  async getAds(filters = {}) {
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
      radius = 50,
      userId
    } = filters;

    const where = {
      status: 'APPROVED',
      AND: [
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      ]
    };

    // Category filter
    if (category) {
      const categoryObj = await prisma.category.findUnique({
        where: { slug: category },
        select: { id: true }
      });
      if (categoryObj) {
        where.categoryId = categoryObj.id;
      }
    }

    // Subcategory filter
    if (subcategory) {
      const subcategoryObj = await prisma.subcategory.findFirst({
        where: { slug: subcategory },
        select: { id: true }
      });
      if (subcategoryObj) {
        where.subcategoryId = subcategoryObj.id;
      }
    }

    // Location filter
    if (location) {
      const locationObj = await prisma.location.findUnique({
        where: { slug: location },
        select: { id: true }
      });
      if (locationObj) {
        where.locationId = locationObj.id;
      }
    }

    // Price filters
    if (minPrice !== undefined) {
      where.price = { ...where.price, gte: parseFloat(minPrice) };
    }
    if (maxPrice !== undefined) {
      where.price = { ...where.price, lte: parseFloat(maxPrice) };
    }

    // Condition filter
    if (condition && AdConfig.VALID_CONDITIONS.includes(condition)) {
      where.condition = condition;
    }

    // User filter
    if (userId) {
      where.userId = userId;
    }

    // Location-based search (latitude/longitude)
    if (latitude && longitude) {
      // This would require PostGIS or similar for proper distance calculation
      // For now, we'll use a simple bounding box approximation
      // In production, use proper geospatial queries
    }

    const result = await this.adRepository.findMany(where, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort
    });

    // If search query provided, filter results using Meilisearch
    if (search && search.trim()) {
      // This would integrate with Meilisearch for full-text search
      // For now, return the filtered results
    }

    return result;
  }

  async getAdById(id) {
    const ad = await this.adRepository.findById(id, {
      user: true,
      category: true,
      subcategory: true,
      location: true
    });

    if (!ad) {
      throw new Error('Ad not found');
    }

    return ad;
  }

  async createAd(userId, adData, paymentOrder = null) {
    // Check free ads limit
    const limitCheck = await this.adRepository.checkLimit(userId);
    if (!limitCheck.canPost && !paymentOrder) {
      throw new Error(`Free ad limit reached. You can post ${AdConfig.FREE_ADS_LIMIT} free ads.`);
    }

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: adData.categoryId }
    });
    if (!category) {
      throw new Error('Invalid category');
    }

    // Verify location if provided
    if (adData.locationId) {
      const location = await prisma.location.findUnique({
        where: { id: adData.locationId }
      });
      if (!location) {
        throw new Error('Invalid location');
      }
    }

    // Verify subcategory if provided
    if (adData.subcategoryId) {
      const subcategory = await prisma.subcategory.findUnique({
        where: { id: adData.subcategoryId }
      });
      if (!subcategory || subcategory.categoryId !== adData.categoryId) {
        throw new Error('Invalid subcategory');
      }
    }

    // Get premium options from payment order or request body
    let premiumType = adData.premiumType || null;
    let isUrgent = adData.isUrgent === true || adData.isUrgent === 'true';

    if (paymentOrder && paymentOrder.adData) {
      let parsedAdData = paymentOrder.adData;
      if (typeof parsedAdData === 'string') {
        try {
          parsedAdData = JSON.parse(parsedAdData);
        } catch (e) {
          parsedAdData = {};
        }
      }
      premiumType = parsedAdData.premiumType || premiumType;
      isUrgent = parsedAdData.isUrgent !== undefined ? parsedAdData.isUrgent : isUrgent;
    }

    // Calculate premium expiry
    let premiumExpiresAt = null;
    if (premiumType || isUrgent) {
      premiumExpiresAt = AdConfig.calculatePremiumExpiry(premiumType, isUrgent);
    }

    // Create ad entity
    const adEntity = new Ad({
      title: adData.title,
      description: adData.description,
      price: adData.price,
      originalPrice: adData.originalPrice,
      condition: adData.condition || 'USED',
      status: 'PENDING', // Will be moderated
      userId,
      categoryId: adData.categoryId,
      subcategoryId: adData.subcategoryId || null,
      locationId: adData.locationId || null,
      images: adData.images || [],
      attributes: adData.attributes || {},
      premiumType,
      isUrgent,
      expiresAt: AdConfig.calculateExpiryDate(),
      premiumExpiresAt
    });

    // Create ad in database
    const ad = await this.adRepository.create(adEntity.toJSON());

    // Moderate content
    try {
      const moderationResult = await moderateAd(ad.id, ad.title, ad.description, ad.images);
      if (moderationResult.flagged) {
        await this.adRepository.update(ad.id, {
          status: 'REJECTED'
        });
        throw new Error(`Ad rejected: ${moderationResult.reason || 'Content violation'}`);
      }
    } catch (moderationError) {
      console.error('Moderation error:', moderationError);
      // Continue with creation even if moderation fails
    }

    // Index in search
    try {
      await indexAd(ad);
    } catch (indexError) {
      console.error('Indexing error:', indexError);
      // Continue even if indexing fails
    }

    // Update free ads count if it's a free ad
    if (!paymentOrder && limitCheck.canPost) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          freeAdsUsed: { increment: 1 }
        }
      });
    }

    return ad;
  }

  async updateAd(adId, userId, adData) {
    // Verify ad exists and belongs to user
    const existingAd = await this.adRepository.findById(adId);
    if (!existingAd) {
      throw new Error('Ad not found');
    }
    if (existingAd.userId !== userId) {
      throw new Error('You can only update your own ads');
    }

    // Update ad
    const updatedAd = await this.adRepository.update(adId, adData);

    // Re-index in search
    try {
      await indexAd(updatedAd);
    } catch (indexError) {
      console.error('Indexing error:', indexError);
    }

    return updatedAd;
  }

  async deleteAd(adId, userId) {
    // Verify ad exists and belongs to user
    const existingAd = await this.adRepository.findById(adId);
    if (!existingAd) {
      throw new Error('Ad not found');
    }
    if (existingAd.userId !== userId) {
      throw new Error('You can only delete your own ads');
    }

    // Delete from search index
    try {
      const { deleteAd } = require('../../../services/meilisearch');
      await deleteAd(adId);
    } catch (indexError) {
      console.error('Delete from index error:', indexError);
    }

    // Delete ad
    await this.adRepository.delete(adId);

    return { success: true };
  }

  async checkAdLimit(userId) {
    return await this.adRepository.checkLimit(userId);
  }
}

module.exports = new AdService();
