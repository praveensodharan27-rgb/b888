const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const router = express.Router();
const prisma = new PrismaClient();

// Setup multer for offer image
const offerImagesDir = path.join(__dirname, '../uploads/offers');
if (!fs.existsSync(offerImagesDir)) {
  fs.mkdirSync(offerImagesDir, { recursive: true });
}

const offerImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, offerImagesDir);
  },
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    const filename = `offer_${crypto.randomBytes(16).toString('hex')}.${ext}`;
    cb(null, filename);
  }
});

const uploadOfferImage = multer({
  storage: offerImageStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, webp)'));
    }
  }
});

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('ADMIN'));

// Premium Settings Configuration (stored in database with env fallback)
const getDefaultSettings = () => {
  return {
    prices: {
      TOP: parseFloat(process.env.PREMIUM_PRICE_TOP || '299'),
      FEATURED: parseFloat(process.env.PREMIUM_PRICE_FEATURED || '199'),
      BUMP_UP: parseFloat(process.env.PREMIUM_PRICE_BUMP_UP || '99'),
      URGENT: parseFloat(process.env.PREMIUM_PRICE_URGENT || '49'),
    },
    offerPrices: {
      TOP: null,
      FEATURED: null,
      BUMP_UP: null,
      URGENT: null,
    },
    offerImage: null,
    durations: {
      TOP: parseInt(process.env.PREMIUM_DURATION_TOP || '7'),
      FEATURED: parseInt(process.env.PREMIUM_DURATION_FEATURED || '14'),
      BUMP_UP: parseInt(process.env.PREMIUM_DURATION_BUMP_UP || '1'),
      URGENT: parseInt(process.env.PREMIUM_DURATION_URGENT || '7'),
    },
  };
};

const getPremiumSettings = async () => {
  try {
    const settingsRecord = await prisma.premiumSettings.findUnique({
      where: { key: 'premium_settings' }
    });
    
    if (settingsRecord && settingsRecord.value) {
      const parsed = JSON.parse(settingsRecord.value);
      return parsed;
    }
  } catch (error) {
    console.error('Error loading premium settings from database:', error);
  }
  
  // Fallback to defaults
  return getDefaultSettings();
};

// Get premium settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await getPremiumSettings();
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Get premium settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
});

// Update premium settings
router.put('/settings',
  uploadOfferImage.single('offerImage'),
  async (req, res) => {
    try {
      // Parse JSON fields from form data
      let prices = {};
      let offerPrices = {};
      let durations = {};

      if (req.body.prices) {
        try {
          prices = typeof req.body.prices === 'string' ? JSON.parse(req.body.prices) : req.body.prices;
        } catch (e) {
          return res.status(400).json({ success: false, message: 'Invalid prices format' });
        }
      }

      if (req.body.offerPrices) {
        try {
          offerPrices = typeof req.body.offerPrices === 'string' ? JSON.parse(req.body.offerPrices) : req.body.offerPrices;
        } catch (e) {
          return res.status(400).json({ success: false, message: 'Invalid offerPrices format' });
        }
      }

      if (req.body.durations) {
        try {
          durations = typeof req.body.durations === 'string' ? JSON.parse(req.body.durations) : req.body.durations;
        } catch (e) {
          return res.status(400).json({ success: false, message: 'Invalid durations format' });
        }
      }

      // Handle uploaded image or deletion
      const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
      let offerImageUrl = null;
      const shouldDeleteImage = req.body.deleteOfferImage === 'true';
      
      // Get current settings first to get existing image path
      const currentSettings = await getPremiumSettings();
      
      // Delete existing image file if deletion is requested
      if (shouldDeleteImage && currentSettings.offerImage) {
        try {
          // Extract filename from URL
          const imageUrl = currentSettings.offerImage;
          const filename = imageUrl.split('/').pop();
          if (filename) {
            const imagePath = path.join(offerImagesDir, filename);
            if (fs.existsSync(imagePath)) {
              fs.unlinkSync(imagePath);
              console.log('✅ Deleted offer image:', filename);
            }
          }
        } catch (deleteError) {
          console.error('⚠️ Error deleting offer image:', deleteError);
          // Continue even if deletion fails
        }
        offerImageUrl = null; // Set to null when deleting
      } else if (req.file) {
        // New image uploaded
        offerImageUrl = `${baseUrl}/uploads/offers/${req.file.filename}`;
        
        // Delete old image if it exists
        if (currentSettings.offerImage) {
          try {
            const oldImageUrl = currentSettings.offerImage;
            const oldFilename = oldImageUrl.split('/').pop();
            if (oldFilename) {
              const oldImagePath = path.join(offerImagesDir, oldFilename);
              if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
                console.log('✅ Deleted old offer image:', oldFilename);
              }
            }
          } catch (deleteError) {
            console.error('⚠️ Error deleting old offer image:', deleteError);
            // Continue even if deletion fails
          }
        }
      } else {
        // No new upload and no deletion - keep existing
        offerImageUrl = currentSettings.offerImage || null;
      }
      
      // Merge settings
      const updatedSettings = {
        prices: {
          ...currentSettings.prices,
          ...(prices || {})
        },
        offerPrices: {
          ...(currentSettings.offerPrices || { TOP: null, FEATURED: null, BUMP_UP: null, URGENT: null }),
          ...(offerPrices || {})
        },
        offerImage: offerImageUrl,
        durations: {
          ...currentSettings.durations,
          ...(durations || {})
        }
      };

      // Save to database
      await prisma.premiumSettings.upsert({
        where: { key: 'premium_settings' },
        update: {
          value: JSON.stringify(updatedSettings),
          updatedBy: req.user.id
        },
        create: {
          key: 'premium_settings',
          value: JSON.stringify(updatedSettings),
          updatedBy: req.user.id
        }
      });

      // Check if offer prices were updated (if any offer price changed)
      const hasOfferUpdates = offerPrices && Object.keys(offerPrices).length > 0 && 
        Object.values(offerPrices).some(price => price !== null && price !== undefined);
      
      // Send notifications to all users if offers were updated
      if (hasOfferUpdates) {
        console.log('📢 Offer prices updated, sending notifications to all users...');
        const { sendOfferUpdateNotification } = require('../utils/notifications');
        
        // Send notifications asynchronously (don't wait for it to complete)
        sendOfferUpdateNotification(updatedSettings).catch(error => {
          console.error('⚠️ Error sending offer update notifications:', error);
          // Don't fail the request if notifications fail
        });
      }

      res.json({ 
        success: true, 
        message: 'Premium settings updated successfully',
        settings: updatedSettings,
        notificationsSent: hasOfferUpdates
      });
    } catch (error) {
      console.error('Update premium settings error:', error);
      res.status(500).json({ success: false, message: 'Failed to update settings' });
    }
  }
);

// Get premium ads by type
router.get('/premium-ads', async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      status: 'APPROVED',
    };

    if (type && type !== 'ALL') {
      if (type === 'URGENT') {
        where.isUrgent = true;
        // Urgent ads can be premium or not
      } else {
        where.isPremium = true;
        where.premiumType = type;
      }
    } else {
      // Show all premium, urgent, or paid ads
      where.OR = [
        { isPremium: true },
        { isUrgent: true },
        // Include ads with paid premium orders
        { premiumOrders: { some: { status: 'paid' } } },
        // Include ads with paid ad posting orders
        { adPostingOrders: { some: { status: 'paid' } } }
      ];
    }

    const [ads, total] = await Promise.all([
      prisma.ad.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          images: true,
          isPremium: true,
          premiumType: true,
          isUrgent: true,
          premiumExpiresAt: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true, phone: true } },
          category: { select: { id: true, name: true, slug: true } },
          location: { select: { id: true, name: true, slug: true } },
          // Include payment information
          premiumOrders: {
            where: { status: 'paid' },
            select: {
              id: true,
              type: true,
              amount: true,
              createdAt: true,
            },
            take: 1,
            orderBy: { createdAt: 'desc' }
          },
          adPostingOrders: {
            where: { status: 'paid' },
            select: {
              id: true,
              amount: true,
              createdAt: true,
            },
            take: 1,
            orderBy: { createdAt: 'desc' }
          },
        },
        orderBy: [
          { isPremium: 'desc' },
          { premiumType: 'asc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: parseInt(limit)
      }),
      prisma.ad.count({ where })
    ]);

    res.json({
      success: true,
      ads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get premium ads error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch premium ads' });
  }
});

// Make ad TOP premium
router.post('/ads/:id/make-top', async (req, res) => {
  try {
    const { days } = req.body;
    const settings = await getPremiumSettings();
    const duration = days || settings.durations.TOP;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration);

    const ad = await prisma.ad.update({
      where: { id: req.params.id },
      data: {
        isPremium: true,
        premiumType: 'TOP',
        premiumExpiresAt: expiresAt,
        featuredAt: null, // Clear other premium types
        bumpedAt: null,
      },
      include: { user: true }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: ad.userId,
        title: 'Ad Made TOP Premium',
        message: `Your ad "${ad.title}" has been upgraded to TOP premium.`,
        type: 'premium_activated',
        link: `/ads/${ad.id}`
      }
    });

    // Emit notification
    const { emitNotification } = require('../socket/socket');
    emitNotification(ad.userId, {
      title: 'Ad Made TOP Premium',
      message: `Your ad "${ad.title}" has been upgraded to TOP premium.`,
      type: 'premium_activated',
      link: `/ads/${ad.id}`,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, message: 'Ad made TOP premium', ad });
  } catch (error) {
    console.error('Make TOP premium error:', error);
    res.status(500).json({ success: false, message: 'Failed to make ad TOP premium' });
  }
});

// Make ad FEATURED premium
router.post('/ads/:id/make-featured', async (req, res) => {
  try {
    const { days } = req.body;
    const settings = await getPremiumSettings();
    const duration = days || settings.durations.FEATURED;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration);

    const ad = await prisma.ad.update({
      where: { id: req.params.id },
      data: {
        isPremium: true,
        premiumType: 'FEATURED',
        premiumExpiresAt: expiresAt,
        featuredAt: new Date(),
        bumpedAt: null,
      },
      include: { user: true }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: ad.userId,
        title: 'Ad Made Featured',
        message: `Your ad "${ad.title}" has been featured.`,
        type: 'premium_activated',
        link: `/ads/${ad.id}`
      }
    });

    // Emit notification
    const { emitNotification } = require('../socket/socket');
    emitNotification(ad.userId, {
      title: 'Ad Made Featured',
      message: `Your ad "${ad.title}" has been featured.`,
      type: 'premium_activated',
      link: `/ads/${ad.id}`,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, message: 'Ad made featured', ad });
  } catch (error) {
    console.error('Make featured error:', error);
    res.status(500).json({ success: false, message: 'Failed to make ad featured' });
  }
});

// Bump/Refresh ad
router.post('/ads/:id/bump', async (req, res) => {
  try {
    const settings = await getPremiumSettings();
    const duration = settings.durations.BUMP_UP;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration);

    const ad = await prisma.ad.update({
      where: { id: req.params.id },
      data: {
        isPremium: true,
        premiumType: 'BUMP_UP',
        premiumExpiresAt: expiresAt,
        bumpedAt: new Date(),
      },
      include: { user: true }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: ad.userId,
        title: 'Ad Bumped',
        message: `Your ad "${ad.title}" has been bumped to the top.`,
        type: 'premium_activated',
        link: `/ads/${ad.id}`
      }
    });

    // Emit notification
    const { emitNotification } = require('../socket/socket');
    emitNotification(ad.userId, {
      title: 'Ad Bumped',
      message: `Your ad "${ad.title}" has been bumped to the top.`,
      type: 'premium_activated',
      link: `/ads/${ad.id}`,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, message: 'Ad bumped successfully', ad });
  } catch (error) {
    console.error('Bump ad error:', error);
    res.status(500).json({ success: false, message: 'Failed to bump ad' });
  }
});

// Make ad URGENT
router.post('/ads/:id/make-urgent', async (req, res) => {
  try {
    const { days } = req.body;
    const settings = await getPremiumSettings();
    const duration = days || settings.durations.URGENT;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration);

    const ad = await prisma.ad.update({
      where: { id: req.params.id },
      data: {
        isUrgent: true,
        premiumExpiresAt: expiresAt,
      },
      include: { user: true }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: ad.userId,
        title: 'Ad Marked as Urgent',
        message: `Your ad "${ad.title}" has been marked as urgent.`,
        type: 'premium_activated',
        link: `/ads/${ad.id}`
      }
    });

    // Emit notification
    const { emitNotification } = require('../socket/socket');
    emitNotification(ad.userId, {
      title: 'Ad Marked as Urgent',
      message: `Your ad "${ad.title}" has been marked as urgent.`,
      type: 'premium_activated',
      link: `/ads/${ad.id}`,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, message: 'Ad marked as urgent', ad });
  } catch (error) {
    console.error('Make urgent error:', error);
    res.status(500).json({ success: false, message: 'Failed to make ad urgent' });
  }
});

// Remove premium status
router.post('/ads/:id/remove-premium', async (req, res) => {
  try {
    const ad = await prisma.ad.update({
      where: { id: req.params.id },
      data: {
        isPremium: false,
        premiumType: null,
        premiumExpiresAt: null,
        featuredAt: null,
        bumpedAt: null,
        isUrgent: false,
      }
    });

    res.json({ success: true, message: 'Premium status removed', ad });
  } catch (error) {
    console.error('Remove premium error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove premium status' });
  }
});

// Update premium expiry date
router.put('/ads/:id/premium-expiry', 
  [
    body('expiresAt').isISO8601().withMessage('Valid expiry date required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { expiresAt } = req.body;

      const ad = await prisma.ad.update({
        where: { id: req.params.id },
        data: {
          premiumExpiresAt: new Date(expiresAt)
        }
      });

      res.json({ success: true, message: 'Premium expiry updated', ad });
    } catch (error) {
      console.error('Update premium expiry error:', error);
      res.status(500).json({ success: false, message: 'Failed to update premium expiry' });
    }
  }
);

// Business Package Settings Management
const getBusinessPackageSettings = async () => {
  try {
    const settingsRecord = await prisma.premiumSettings.findUnique({
      where: { key: 'business_package_settings' }
    });
    
    if (settingsRecord && settingsRecord.value) {
      const parsed = JSON.parse(settingsRecord.value);
      return parsed;
    }
  } catch (error) {
    console.error('Error loading business package settings from database:', error);
  }
  
  // Fallback to defaults
  return {
    prices: {
      MAX_VISIBILITY: 299,
      SELLER_PLUS: 399,
      SELLER_PRIME: 499
    },
    durations: {
      MAX_VISIBILITY: 30,
      SELLER_PLUS: 30,
      SELLER_PRIME: 30
    },
    maxAds: {
      MAX_VISIBILITY: 5,
      SELLER_PLUS: 7,
      SELLER_PRIME: 12
    },
    descriptions: {
      MAX_VISIBILITY: 'Maximum visibility for your ads',
      SELLER_PLUS: 'Enhanced features for serious sellers',
      SELLER_PRIME: 'Premium package with all features'
    }
  };
};

// Get business package settings
router.get('/business-packages', async (req, res) => {
  try {
    console.log('📦 Admin business package GET endpoint hit');
    const settings = await getBusinessPackageSettings();
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Get business package settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
});

// Update business package settings
router.put('/business-packages',
  [
    body('prices.MAX_VISIBILITY').optional().isFloat({ min: 0 }).withMessage('Invalid price for Max Visibility'),
    body('prices.SELLER_PLUS').optional().isFloat({ min: 0 }).withMessage('Invalid price for Seller Plus'),
    body('prices.SELLER_PRIME').optional().isFloat({ min: 0 }).withMessage('Invalid price for Seller Prime'),
    body('durations.MAX_VISIBILITY').optional().isInt({ min: 1 }).withMessage('Invalid duration for Max Visibility'),
    body('durations.SELLER_PLUS').optional().isInt({ min: 1 }).withMessage('Invalid duration for Seller Plus'),
    body('durations.SELLER_PRIME').optional().isInt({ min: 1 }).withMessage('Invalid duration for Seller Prime'),
    body('maxAds.MAX_VISIBILITY').optional().isInt({ min: 0 }).withMessage('Invalid max ads for Max Visibility'),
    body('maxAds.SELLER_PLUS').optional().isInt({ min: 0 }).withMessage('Invalid max ads for Seller Plus'),
    body('maxAds.SELLER_PRIME').optional().isInt({ min: 0 }).withMessage('Invalid max ads for Seller Prime')
  ],
  async (req, res) => {
    try {
      console.log('📦 Admin business package PUT endpoint hit');
      console.log('Request body:', req.body);
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const currentSettings = await getBusinessPackageSettings();
      
      // Merge settings
      const updatedSettings = {
        prices: {
          ...currentSettings.prices,
          ...(req.body.prices || {})
        },
        durations: {
          ...currentSettings.durations,
          ...(req.body.durations || {})
        },
        maxAds: {
          ...(currentSettings.maxAds || { MAX_VISIBILITY: 5, SELLER_PLUS: 7, SELLER_PRIME: 12 }),
          ...(req.body.maxAds || {})
        },
        descriptions: {
          ...currentSettings.descriptions,
          ...(req.body.descriptions || {})
        }
      };

      // Save to database
      await prisma.premiumSettings.upsert({
        where: { key: 'business_package_settings' },
        update: {
          value: JSON.stringify(updatedSettings),
          updatedBy: req.user.id
        },
        create: {
          key: 'business_package_settings',
          value: JSON.stringify(updatedSettings),
          updatedBy: req.user.id
        }
      });

      res.json({ 
        success: true, 
        message: 'Business package settings updated successfully',
        settings: updatedSettings
      });
    } catch (error) {
      console.error('Update business package settings error:', error);
      res.status(500).json({ success: false, message: 'Failed to update settings' });
    }
  }
);

// Get business package orders (admin view)
router.get('/business-packages/orders', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, packageType } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (packageType) where.packageType = packageType;

    const [orders, total] = await Promise.all([
      prisma.businessPackage.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.businessPackage.count({ where })
    ]);

    res.json({
      success: true,
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get business package orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

module.exports = router;

