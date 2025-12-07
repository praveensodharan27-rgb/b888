const AdService = require('../../application/services/AdService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Ad Controller
 * Handles HTTP requests/responses for Ad operations
 */
class AdController {
  async getAds(req, res) {
    try {
      const filters = {
        page: req.query.page,
        limit: req.query.limit,
        category: req.query.category,
        subcategory: req.query.subcategory,
        location: req.query.location,
        minPrice: req.query.minPrice,
        maxPrice: req.query.maxPrice,
        search: req.query.search,
        condition: req.query.condition,
        sort: req.query.sort,
        latitude: req.query.latitude,
        longitude: req.query.longitude,
        radius: req.query.radius,
        userId: req.query.userId
      };

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
      console.error('Get ads error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch ads'
      });
    }
  }

  async getAdById(req, res) {
    try {
      const { id } = req.params;
      const ad = await AdService.getAdById(id);
      res.json({ success: true, ad });
    } catch (error) {
      console.error('Get ad error:', error);
      if (error.message === 'Ad not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch ad'
      });
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

      const adData = {
        title: req.body.title,
        description: req.body.description,
        price: req.body.price,
        originalPrice: req.body.originalPrice,
        condition: req.body.condition,
        categoryId: req.body.categoryId,
        subcategoryId: req.body.subcategoryId,
        locationId: req.body.locationId,
        state: req.body.state,
        city: req.body.city,
        neighbourhood: req.body.neighbourhood,
        exactLocation: req.body.exactLocation,
        images: req.uploadedImages || [],
        attributes: req.body.attributes ? (typeof req.body.attributes === 'string' ? JSON.parse(req.body.attributes) : req.body.attributes) : {},
        premiumType: req.body.premiumType,
        isUrgent: req.body.isUrgent
      };

      const ad = await AdService.createAd(req.user.id, adData, paymentOrder);

      res.status(201).json({
        success: true,
        message: 'Ad created successfully',
        ad
      });
    } catch (error) {
      console.error('Create ad error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create ad'
      });
    }
  }

  async updateAd(req, res) {
    try {
      const { id } = req.params;
      const adData = {
        title: req.body.title,
        description: req.body.description,
        price: req.body.price,
        originalPrice: req.body.originalPrice,
        condition: req.body.condition,
        categoryId: req.body.categoryId,
        subcategoryId: req.body.subcategoryId,
        locationId: req.body.locationId,
        images: req.uploadedImages || req.body.images,
        attributes: req.body.attributes
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
      console.error('Update ad error:', error);
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
      await AdService.deleteAd(id, req.user.id);
      res.json({
        success: true,
        message: 'Ad deleted successfully'
      });
    } catch (error) {
      console.error('Delete ad error:', error);
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
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete ad'
      });
    }
  }

  async checkLimit(req, res) {
    try {
      const limit = await AdService.checkAdLimit(req.user.id);
      res.json({
        success: true,
        ...limit
      });
    } catch (error) {
      console.error('Check limit error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to check ad limit'
      });
    }
  }
}

module.exports = new AdController();
