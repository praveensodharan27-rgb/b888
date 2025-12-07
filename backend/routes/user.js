const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');

const router = express.Router();
const prisma = new PrismaClient();

// Get public user profile (no auth required)
router.get('/public/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        bio: true,
        showPhone: true,
        isVerified: true,
        createdAt: true,
        _count: {
          select: {
            ads: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get follower and following counts
    const [followersCount, followingCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } })
    ]);

    // Get user's most common location from their ads
    const userAds = await prisma.ad.findMany({
      where: { userId, status: 'APPROVED' },
      select: { locationId: true, city: true, state: true },
      take: 10
    });

    let userLocation = null;
    if (userAds.length > 0) {
      // Find most common location
      const locationCounts = {};
      userAds.forEach(ad => {
        if (ad.locationId) {
          locationCounts[ad.locationId] = (locationCounts[ad.locationId] || 0) + 1;
        }
      });

      const mostCommonLocationId = Object.keys(locationCounts).reduce((a, b) => 
        locationCounts[a] > locationCounts[b] ? a : b, Object.keys(locationCounts)[0]
      );

      if (mostCommonLocationId) {
        const location = await prisma.location.findUnique({
          where: { id: mostCommonLocationId },
          select: { id: true, name: true, city: true, state: true, latitude: true, longitude: true }
        });
        if (location) {
          userLocation = location;
        }
      }

      // Fallback to city/state from ads if no location found
      if (!userLocation) {
        const adWithLocation = userAds.find(ad => ad.city || ad.state);
        if (adWithLocation) {
          userLocation = {
            name: adWithLocation.city || adWithLocation.state || 'Unknown',
            city: adWithLocation.city,
            state: adWithLocation.state
          };
        }
      }
    }

    // Respect phone visibility setting
    const phoneNumber = user.showPhone ? user.phone : null;

    // Remove showPhone from public response (privacy)
    const { showPhone, ...userWithoutPrivacy } = user;

    res.json({
      success: true,
      user: {
        ...userWithoutPrivacy,
        phone: phoneNumber, // Only include if showPhone is true
        location: userLocation,
        tags: [], // Tags field removed as it doesn't exist in User model
        followersCount,
        followingCount
      }
    });
  } catch (error) {
    console.error('Get public user profile error:', error);
    console.error('Error details:', {
      userId: req.params.userId,
      errorMessage: error.message,
      errorStack: error.stack
    });
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch user profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        bio: true,
        showPhone: true,
        isVerified: true,
        provider: true,
        providerId: true,
        freeAdsUsed: true,
        createdAt: true,
        locationId: true,
        location: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            state: true
          }
        },
        _count: {
          select: {
            ads: true,
            favorites: true
          }
        }
      }
    });

    const FREE_ADS_LIMIT = 2;
    const freeAdsRemaining = Math.max(0, FREE_ADS_LIMIT - (user?.freeAdsUsed || 0));

    // Get follower and following counts
    const [followersCount, followingCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: req.user.id } }),
      prisma.follow.count({ where: { followerId: req.user.id } })
    ]);

    // Get business package status for premium slots information
    const now = new Date();
    const activePackages = await prisma.businessPackage.findMany({
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
        premiumSlotsTotal: true,
        premiumSlotsUsed: true,
        expiresAt: true
      }
    });

    // Aggregate premium slots from all active packages
    const totalPremiumSlots = activePackages.reduce((sum, pkg) => sum + (pkg.premiumSlotsTotal || 0), 0);
    const usedPremiumSlots = activePackages.reduce((sum, pkg) => sum + (pkg.premiumSlotsUsed || 0), 0);
    const availablePremiumSlots = Math.max(0, totalPremiumSlots - usedPremiumSlots);
    const hasActiveBusinessPackage = activePackages.length > 0;

    res.json({ 
      success: true, 
      user: {
        ...user,
        freeAdsRemaining,
        freeAdsLimit: FREE_ADS_LIMIT,
        followersCount,
        followingCount,
        // Business package premium slots information
        businessPackage: {
          hasActive: hasActiveBusinessPackage,
          premiumSlotsTotal: totalPremiumSlots,
          premiumSlotsUsed: usedPremiumSlots,
          premiumSlotsAvailable: availablePremiumSlots,
          activePackagesCount: activePackages.length
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

// Get free ad status
router.get('/free-ads-status', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { freeAdsUsed: true }
    });

    const FREE_ADS_LIMIT = 2;
    const freeAdsUsed = user?.freeAdsUsed || 0;
    const freeAdsRemaining = Math.max(0, FREE_ADS_LIMIT - freeAdsUsed);
    const hasFreeAdsRemaining = freeAdsRemaining > 0;

    res.json({
      success: true,
      freeAdsUsed,
      freeAdsRemaining,
      freeAdsLimit: FREE_ADS_LIMIT,
      hasFreeAdsRemaining,
      requiresPayment: !hasFreeAdsRemaining
    });
  } catch (error) {
    console.error('Get free ads status error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch free ads status' });
  }
});

// Update user profile
router.put('/profile',
  authenticate,
  [
    body('name').optional().trim().notEmpty(),
    body('email').optional().isEmail(),
    body('phone').optional().isMobilePhone(),
    body('bio').optional().trim().isLength({ max: 500 }),
    body('showPhone').optional().isBoolean(),
    body('tags').optional().isArray(),
    body('locationId').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { name, email, phone, bio, showPhone, tags, locationId } = req.body;
      const updateData = {};

      if (name) updateData.name = name;
      if (bio !== undefined) updateData.bio = bio;
      if (showPhone !== undefined) updateData.showPhone = showPhone;
      if (locationId !== undefined) {
        // Verify location exists if provided
        if (locationId) {
          const location = await prisma.location.findUnique({
            where: { id: locationId }
          });
          if (!location) {
            return res.status(400).json({ success: false, message: 'Invalid location' });
          }
        }
        // Store locationId in user profile (only if migration has been run)
        // If field doesn't exist, Prisma will throw an error which we'll catch
        updateData.locationId = locationId || null;
      }
      if (tags !== undefined) {
        // Validate tags array
        if (Array.isArray(tags)) {
          // Limit to 10 tags max, trim and filter empty
          const validTags = tags
            .slice(0, 10)
            .map(tag => typeof tag === 'string' ? tag.trim() : '')
            .filter(tag => tag.length > 0 && tag.length <= 30);
          updateData.tags = validTags; // Prisma handles array updates directly
        } else {
          return res.status(400).json({ success: false, message: 'Tags must be an array' });
        }
      }
      if (email) {
        // Check if email is already taken
        const existing = await prisma.user.findFirst({
          where: { email, id: { not: req.user.id } }
        });
        if (existing) {
          return res.status(400).json({ success: false, message: 'Email already in use' });
        }
        updateData.email = email;
        updateData.isVerified = false; // Require re-verification
      }
      if (phone) {
        const existing = await prisma.user.findFirst({
          where: { phone, id: { not: req.user.id } }
        });
        if (existing) {
          return res.status(400).json({ success: false, message: 'Phone already in use' });
        }
        updateData.phone = phone;
        updateData.isVerified = false;
      }

      // Try to update with locationId, but handle if field doesn't exist yet
      let user;
      try {
        user = await prisma.user.update({
          where: { id: req.user.id },
          data: updateData,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            bio: true,
            showPhone: true,
            isVerified: true,
            locationId: true,
            location: {
              select: {
                id: true,
                name: true,
                slug: true,
                city: true,
                state: true
              }
            }
          }
        });
      } catch (prismaError) {
        // If locationId field doesn't exist (migration not run), try without it
        if (prismaError.message && prismaError.message.includes('locationId')) {
          console.warn('locationId field not found. Run migration: npx prisma migrate dev');
          // Remove locationId from updateData and try again
          const { locationId: _, ...updateDataWithoutLocation } = updateData;
          user = await prisma.user.update({
            where: { id: req.user.id },
            data: updateDataWithoutLocation,
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
              bio: true,
              showPhone: true,
              isVerified: true
            }
          });
          // Return warning that location couldn't be saved
          return res.json({ 
            success: true, 
            user,
            warning: 'Location update skipped. Please run database migration: npx prisma migrate dev'
          });
        }
        throw prismaError;
      }

      res.json({ success: true, user });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to update profile',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Update avatar
router.put('/avatar', authenticate, uploadAvatar, async (req, res) => {
  try {
    if (!req.uploadedAvatar) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: req.uploadedAvatar },
      select: {
        id: true,
        avatar: true
      }
    });

    res.json({ success: true, user });
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({ success: false, message: 'Failed to update avatar' });
  }
});

// Change password
router.put('/password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { password: true }
      });

      if (!user.password) {
        return res.status(400).json({ success: false, message: 'Password not set' });
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: req.user.id },
        data: { password: hashedPassword }
      });

      res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ success: false, message: 'Failed to change password' });
    }
  }
);

// Get user's ads
router.get('/ads', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { userId: req.user.id };
    if (status) {
      where.status = status;
    }

    const [ads, total] = await Promise.all([
      prisma.ad.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
          location: { select: { id: true, name: true, slug: true } },
          _count: { select: { favorites: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.ad.count({ where })
    ]);

    // Ensure all ads have images as arrays and filter out empty/null values
    const adsWithImages = ads.map(ad => ({
      ...ad,
      images: Array.isArray(ad.images) 
        ? ad.images.filter(img => img && (typeof img === 'string' ? img.trim() !== '' : true))
        : (ad.images && typeof ad.images === 'string' && ad.images.trim() !== '' ? [ad.images] : [])
    }));

    console.log('📸 User ads with normalized images:', adsWithImages.map(ad => ({ id: ad.id, title: ad.title, images: ad.images })));

    res.json({
      success: true,
      ads: adsWithImages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get user ads error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ads' });
  }
});

// Get user's favorites
router.get('/favorites', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId: req.user.id },
        include: {
          ad: {
            include: {
              category: { select: { id: true, name: true, slug: true } },
              subcategory: { select: { id: true, name: true, slug: true } },
              location: { select: { id: true, name: true, slug: true } },
              user: { select: { id: true, name: true, avatar: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.favorite.count({ where: { userId: req.user.id } })
    ]);

    res.json({
      success: true,
      favorites,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch favorites' });
  }
});

// Get notifications
router.get('/notifications', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { userId: req.user.id };
    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user.id, isRead: false } })
    ]);

    res.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', authenticate, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      data: { isRead: true }
    });

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
});

// Mark all notifications as read
router.put('/notifications/read-all', authenticate, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ success: false, message: 'Failed to update notifications' });
  }
});

// Get user's orders (both premium and ad posting orders)
router.get('/orders', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { userId: req.user.id };

    // Fetch both types of orders
    const [premiumOrders, adPostingOrders, premiumTotal, adPostingTotal] = await Promise.all([
      type === 'ad-posting' ? [] : prisma.premiumOrder.findMany({
        where,
        include: {
          ad: {
            select: {
              id: true,
              title: true,
              images: true,
              status: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: type === 'premium' ? skip : 0,
        take: type === 'premium' ? parseInt(limit) : 1000
      }),
      type === 'premium' ? [] : prisma.adPostingOrder.findMany({
        where,
        include: {
          ad: {
            select: {
              id: true,
              title: true,
              images: true,
              status: true,
              expiresAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: type === 'ad-posting' ? skip : 0,
        take: type === 'ad-posting' ? parseInt(limit) : 1000
      }),
      type === 'ad-posting' ? 0 : prisma.premiumOrder.count({ where }),
      type === 'premium' ? 0 : prisma.adPostingOrder.count({ where })
    ]);

    // Combine and format orders
    const allOrders = [
      ...premiumOrders.map(order => ({
        id: order.id,
        type: 'premium',
        orderType: order.type,
        amount: order.amount,
        status: order.status,
        razorpayOrderId: order.razorpayOrderId,
        razorpayPaymentId: order.razorpayPaymentId,
        expiresAt: order.expiresAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        ad: order.ad
      })),
      ...adPostingOrders.map(order => ({
        id: order.id,
        type: 'ad-posting',
        amount: order.amount,
        status: order.status,
        razorpayOrderId: order.razorpayOrderId,
        razorpayPaymentId: order.razorpayPaymentId,
        expiresAt: order.ad?.expiresAt || null, // Get expiration from ad
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        ad: order.ad
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination if no type filter
    const total = premiumTotal + adPostingTotal;
    const paginatedOrders = type ? allOrders : allOrders.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      orders: paginatedOrders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

// Generate invoice PDF for an order
router.get('/orders/:orderId/invoice', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { type } = req.query; // 'premium' or 'ad-posting'

    let order;
    if (type === 'premium') {
      order = await prisma.premiumOrder.findUnique({
        where: { id: orderId },
        include: {
          ad: {
            select: {
              id: true,
              title: true,
              price: true,
              images: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        }
      });
    } else {
      order = await prisma.adPostingOrder.findUnique({
        where: { id: orderId },
        include: {
          ad: {
            select: {
              id: true,
              title: true,
              price: true,
              images: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        }
      });
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Generate PDF
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${orderId}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Invoice Header
    doc.fontSize(24).text('INVOICE', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Invoice #: ${orderId}`, { align: 'center' });
    doc.moveDown(2);

    // Company/Platform Info
    doc.fontSize(12).text('SellIt Platform', { align: 'left' });
    doc.fontSize(10).text('Online Marketplace', { align: 'left' });
    doc.moveDown(1);

    // Bill To
    doc.fontSize(12).text('Bill To:', { underline: true });
    doc.fontSize(10).text(order.user.name || 'Customer');
    if (order.user.email) doc.text(order.user.email);
    if (order.user.phone) doc.text(order.user.phone);
    doc.moveDown(1);

    // Order Details
    doc.fontSize(12).text('Order Details:', { underline: true });
    doc.fontSize(10);
    
    const orderDate = new Date(order.createdAt);
    doc.text(`Order Date: ${orderDate.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`);
    
    if (order.razorpayOrderId) {
      doc.text(`Razorpay Order ID: ${order.razorpayOrderId}`);
    }
    if (order.razorpayPaymentId) {
      doc.text(`Payment ID: ${order.razorpayPaymentId}`);
    }
    doc.text(`Status: ${order.status.toUpperCase()}`);
    doc.moveDown(1);

    // Items Table
    doc.fontSize(12).text('Items:', { underline: true });
    doc.moveDown(0.5);

    // Table header
    const tableTop = doc.y;
    doc.fontSize(10);
    doc.text('Description', 50, tableTop);
    doc.text('Amount', 450, tableTop, { align: 'right' });
    doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
    doc.moveDown(0.5);

    // Item row
    let itemDescription = '';
    if (type === 'premium') {
      const typeLabels = {
        TOP: 'Top Ad Premium',
        FEATURED: 'Featured Ad Premium',
        BUMP_UP: 'Bump Up Premium'
      };
      itemDescription = typeLabels[order.type] || 'Premium Ad Service';
      if (order.ad) {
        itemDescription += ` - ${order.ad.title}`;
      }
    } else {
      itemDescription = 'Ad Posting Service';
      if (order.ad) {
        itemDescription += ` - ${order.ad.title}`;
      }
    }

    doc.text(itemDescription, 50);
    doc.text(`₹${order.amount.toLocaleString('en-IN')}`, 450, doc.y - 12, { align: 'right' });
    doc.moveDown(1);

    // Total
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Total Amount:', 350);
    doc.text(`₹${order.amount.toLocaleString('en-IN')}`, 450, doc.y - 14, { align: 'right' });
    doc.moveDown(2);

    // Footer
    doc.fontSize(10).font('Helvetica');
    doc.text('Thank you for your business!', { align: 'center' });
    doc.moveDown(0.5);
    doc.text('This is a computer-generated invoice.', { align: 'center' });

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('Generate invoice error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate invoice' });
  }
});

// Deactivate account
router.post('/deactivate', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isDeactivated) {
      return res.status(400).json({ success: false, message: 'Account is already deactivated' });
    }

    // Set deactivation date
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        isDeactivated: true,
        deactivatedAt: new Date()
      }
    });

    res.json({ 
      success: true, 
      message: 'Account deactivated. It will be permanently deleted after 7 days. You can reactivate within this period.',
      deactivatedAt: new Date()
    });
  } catch (error) {
    console.error('Deactivate account error:', error);
    res.status(500).json({ success: false, message: 'Failed to deactivate account' });
  }
});

// Reactivate account
router.post('/reactivate', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.isDeactivated) {
      return res.status(400).json({ success: false, message: 'Account is not deactivated' });
    }

    // Check if 7 days have passed
    if (user.deactivatedAt) {
      const daysSinceDeactivation = (new Date() - new Date(user.deactivatedAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceDeactivation >= 7) {
        return res.status(400).json({ 
          success: false, 
          message: 'Account has been permanently deleted. Cannot reactivate.' 
        });
      }
    }

    // Reactivate account
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        isDeactivated: false,
        deactivatedAt: null
      }
    });

    res.json({ 
      success: true, 
      message: 'Account reactivated successfully'
    });
  } catch (error) {
    console.error('Reactivate account error:', error);
    res.status(500).json({ success: false, message: 'Failed to reactivate account' });
  }
});

// Get deactivation status
// Logout all devices
router.post('/logout-all-devices', authenticate, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        tokenInvalidatedAt: new Date()
      }
    });

    res.json({ 
      success: true, 
      message: 'All devices have been logged out successfully' 
    });
  } catch (error) {
    console.error('Logout all devices error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to logout all devices' 
    });
  }
});

router.get('/deactivation-status', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        isDeactivated: true,
        deactivatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let daysRemaining = null;
    if (user.isDeactivated && user.deactivatedAt) {
      const daysSinceDeactivation = (new Date() - new Date(user.deactivatedAt)) / (1000 * 60 * 60 * 24);
      daysRemaining = Math.max(0, 7 - daysSinceDeactivation);
    }

    res.json({
      success: true,
      isDeactivated: user.isDeactivated,
      deactivatedAt: user.deactivatedAt,
      daysRemaining: daysRemaining ? Math.ceil(daysRemaining) : null
    });
  } catch (error) {
    console.error('Get deactivation status error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch deactivation status' });
  }
});

module.exports = router;

