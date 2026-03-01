const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const { uploadImages } = require('../middleware/upload');

const router = express.Router();
const prisma = new PrismaClient();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('ADMIN'));

// Dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalUsers,
      totalAds,
      pendingAds,
      approvedAds,
      premiumRevenue,
      adPostingRevenue,
      todayAds,
      todayUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.ad.count(),
      prisma.ad.count({ where: { status: 'PENDING' } }),
      prisma.ad.count({ where: { status: 'APPROVED' } }),
      prisma.premiumOrder.aggregate({
        where: { status: 'paid' },
        _sum: { amount: true }
      }),
      prisma.adPostingOrder.aggregate({
        where: { status: 'paid' },
        _sum: { amount: true }
      }),
      prisma.ad.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalAds,
        pendingAds,
        approvedAds,
        totalRevenue: (premiumRevenue._sum.amount || 0) + (adPostingRevenue._sum.amount || 0),
        todayAds,
        todayUsers
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

// Get recent activity
router.get('/recent-activity', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get recent ads
    const recentAds = await prisma.ad.findMany({
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        user: {
          select: { id: true, name: true, avatar: true }
        }
      }
    });

    // Get recent users
    const recentUsers = await prisma.user.findMany({
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true
      }
    });

    // Combine and format activity
    const activity = [
      ...recentAds.map(ad => ({
        id: ad.id,
        type: 'ad',
        action: 'Posted new ad',
        title: ad.title,
        user: ad.user,
        status: ad.status,
        timestamp: ad.createdAt
      })),
      ...recentUsers.map(user => ({
        id: user.id,
        type: 'user',
        action: 'Registered',
        title: `${user.name} joined`,
        user: { id: user.id, name: user.name, avatar: user.avatar },
        status: 'COMPLETED',
        timestamp: user.createdAt
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, parseInt(limit));

    res.json({
      success: true,
      activity
    });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recent activity' });
  }
});

// Get online users (users with activity in last 15 minutes)
router.get('/active-users', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const today = new Date(new Date().setHours(0, 0, 0, 0));
    
    // Get users with very recent activity (last 15 minutes) - truly online
    const onlineUsers = await prisma.user.findMany({
      where: {
        OR: [
          {
            // Users created in last 15 minutes
            createdAt: { gte: fifteenMinutesAgo }
          },
          {
            // Users who posted ads in last 15 minutes
            ads: {
              some: {
                createdAt: { gte: fifteenMinutesAgo }
              }
            }
          },
          {
            // Users with favorites in last 15 minutes
            favorites: {
              some: {
                createdAt: { gte: fifteenMinutesAgo }
              }
            }
          }
        ]
      },
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            ads: true
          }
        }
      }
    });

    // If no users in last 15 minutes, show users active today
    let users = onlineUsers;
    if (onlineUsers.length === 0) {
      users = await prisma.user.findMany({
        where: {
          OR: [
            {
              createdAt: { gte: today }
            },
            {
              ads: {
                some: {
                  createdAt: { gte: today }
                }
              }
            }
          ]
        },
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              ads: true
            }
          }
        }
      });
    }

    res.json({
      success: true,
      users: users,
      total: users.length,
      onlineCount: onlineUsers.length,
      isRealTime: onlineUsers.length > 0
    });
  } catch (error) {
    console.error('Active users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch active users' });
  }
});

// Get all ads with filters
router.get('/ads', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [ads, total] = await Promise.all([
      prisma.ad.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          category: { select: { id: true, name: true, slug: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
          location: { select: { id: true, name: true, slug: true } }
        },
        orderBy: { createdAt: 'desc' },
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
    console.error('Get admin ads error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ads' });
  }
});

// Get flagged/auto-rejected ads
router.get('/ads/flagged', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [ads, total] = await Promise.all([
      prisma.ad.findMany({
        where: {
          OR: [
            { autoRejected: true },
            { moderationStatus: 'rejected' },
            { moderationStatus: 'flagged' }
          ]
        },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          category: { select: { id: true, name: true, slug: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
          location: { select: { id: true, name: true, slug: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.ad.count({
        where: {
          OR: [
            { autoRejected: true },
            { moderationStatus: 'rejected' },
            { moderationStatus: 'flagged' }
          ]
        }
      })
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
    console.error('Get flagged ads error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch flagged ads' });
  }
});

// Approve/Reject ad
router.put('/ads/:id/status',
  [
    body('status').isIn(['APPROVED', 'REJECTED']).withMessage('Invalid status')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const msg = errors.array().map(e => e.msg).join('; ') || 'Validation failed';
        return res.status(400).json({ success: false, message: msg, errors: errors.array() });
      }

      const { status, reason } = req.body;

      const ad = await prisma.ad.findUnique({
        where: { id: req.params.id },
        include: { user: true }
      });

      if (!ad) {
        return res.status(404).json({ success: false, message: 'Ad not found' });
      }

      // Update ad status and clear auto-rejection if manually approved
      const updateData = { status };
      if (status === 'APPROVED') {
        updateData.autoRejected = false;
        updateData.moderationStatus = 'manually_approved';
        // Set postedAt when ad is approved (goes live)
        if (!ad.postedAt) {
          updateData.postedAt = new Date();
        }
      } else if (reason) {
        updateData.rejectionReason = reason;
        updateData.moderationStatus = 'manually_rejected';
      }

      const updatedAd = await prisma.ad.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          category: { select: { id: true, name: true } },
          subcategory: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
        }
      });

      // Sync with Meilisearch when ad status changes
      try {
        const { indexAd, deleteAd } = require('../services/meilisearch');
        if (status === 'APPROVED') {
          await indexAd(updatedAd);
          console.log(`✅ Indexed approved ad in Meilisearch: ${updatedAd.id}`);
        } else if (status === 'REJECTED') {
          // Remove rejected ad from index
          await deleteAd(updatedAd.id);
          console.log(`✅ Removed rejected ad from Meilisearch: ${updatedAd.id}`);
        }
      } catch (indexError) {
        console.error(`⚠️ Error syncing ad ${updatedAd.id} with Meilisearch:`, indexError);
      }

      // Create notification
      const notif = await prisma.notification.create({
        data: {
          userId: ad.userId,
          title: status === 'APPROVED' ? 'Ad Approved' : 'Ad Rejected',
          message: status === 'APPROVED'
            ? `Your ad "${ad.title}" has been approved.`
            : `Your ad "${ad.title}" has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
          type: status === 'APPROVED' ? 'ad_approved' : 'ad_rejected',
          link: `/ads/${ad.id}`
        }
      });
      try {
        const { emitNotification } = require('../socket/socket');
        emitNotification(ad.userId, {
          id: notif.id,
          title: notif.title,
          message: notif.message,
          type: notif.type,
          link: notif.link,
          isRead: false,
          createdAt: notif.createdAt
        });
      } catch (e) {
        console.warn('⚠️ Socket emit for admin status notification failed:', e?.message);
      }
      try {
        const { invalidateNotificationCache } = require('../utils/redis-helpers');
        await invalidateNotificationCache(ad.userId);
      } catch (_) {}

      // Send email and SMS notifications when ad is approved
      if (status === 'APPROVED') {
        const { sendAdApprovalNotification } = require('../utils/notifications');
        try {
          console.log(`📧📱 Sending approval notifications to user ${ad.user.name} (${ad.user.email || 'no email'}, ${ad.user.phone || 'no phone'})`);
          const notificationResults = await sendAdApprovalNotification(ad.user, ad);
          console.log('✅ Notification results:', {
            email: notificationResults.email?.success ? 'sent' : 'failed',
            sms: notificationResults.sms?.success ? 'sent' : 'failed'
          });
        } catch (notificationError) {
          console.error('⚠️  Error sending approval notifications:', notificationError);
          // Don't fail the approval if notifications fail
        }

        // Emit socket event for new approved ad (for live location feed)
        try {
          // Get full ad data with location coordinates
          const fullAd = await prisma.ad.findUnique({
            where: { id: ad.id },
            include: {
              category: { select: { id: true, name: true, slug: true } },
              subcategory: { select: { id: true, name: true, slug: true } },
              location: { select: { id: true, name: true, slug: true, latitude: true, longitude: true } },
              user: { select: { id: true, name: true, avatar: true } }
            }
          });
          
          // Access io from socket module
          const { getIO } = require('../socket/socket');
          const io = getIO();
          if (io) {
            // Emit to all connected clients (for live location feed)
            io.emit('ad_approved', fullAd);
            io.emit('new_ad', fullAd);
            console.log('📡 Emitted new_ad and ad_approved events for ad:', ad.id);
          }

          // Index ad in Meilisearch
          try {
            const { indexAd } = require('../services/meilisearch');
            await indexAd(fullAd);
          } catch (indexError) {
            console.error('⚠️ Error indexing ad in Meilisearch:', indexError);
            // Don't fail if indexing fails
          }
        } catch (socketError) {
          console.error('Error emitting socket event:', socketError);
          // Don't fail if socket emit fails
        }
      }

      res.json({ success: true, message: `Ad ${status.toLowerCase()}` });
    } catch (error) {
      console.error('Update ad status error:', error);
      res.status(500).json({ success: false, message: 'Failed to update ad status' });
    }
  }
);

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatar: true,
          role: true,
          isVerified: true,
          isDeactivated: true,
          deactivatedAt: true,
          provider: true,
          providerId: true,
          createdAt: true,
          _count: {
            select: {
              ads: true,
              favorites: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// Get analytics
router.get('/analytics', async (req, res) => {
  try {
    const { period = '7d' } = req.query; // 7d, 30d, 90d, 1y
    
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    const [
      newUsers,
      newAds,
      revenue,
      activeUsers,
      topCategories,
      topLocations
    ] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: startDate } } }),
      prisma.ad.count({ where: { createdAt: { gte: startDate } } }),
      prisma.paymentOrder.aggregate({
        where: { 
          status: 'paid',
          createdAt: { gte: startDate }
        },
        _sum: { amount: true }
      }),
      prisma.user.count({
        where: {
          ads: {
            some: {
              createdAt: { gte: startDate }
            }
          }
        }
      }),
      prisma.category.findMany({
        take: 10,
        include: {
          _count: {
            select: { ads: true }
          }
        },
        orderBy: {
          ads: { _count: 'desc' }
        }
      }),
      prisma.location.findMany({
        take: 10,
        include: {
          _count: {
            select: { ads: true }
          }
        },
        orderBy: {
          ads: { _count: 'desc' }
        }
      })
    ]);

    res.json({
      success: true,
      analytics: {
        period,
        startDate,
        newUsers,
        newAds,
        revenue: revenue._sum.amount || 0,
        activeUsers,
        topCategories: topCategories.map(cat => ({
          id: cat.id,
          name: cat.name,
          adCount: cat._count.ads
        })),
        topLocations: topLocations.map(loc => ({
          id: loc.id,
          name: loc.name,
          adCount: loc._count.ads
        }))
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

// Get audit logs
router.get('/audit-logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, type, userId, action } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (type) where.type = type;
    if (userId) where.userId = userId;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: { id: true, name: true, email: true }
          },
          target: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
});

// Get roles
router.get('/roles', async (req, res) => {
  try {
    const roles = [
      { value: 'USER', label: 'User', description: 'Regular user with standard permissions' },
      { value: 'ADMIN', label: 'Admin', description: 'Administrator with full access' },
      { value: 'MODERATOR', label: 'Moderator', description: 'Moderator with content moderation permissions' }
    ];

    res.json({
      success: true,
      roles
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch roles' });
  }
});

// Create/Update role (for future role management)
router.post('/roles', async (req, res) => {
  try {
    const { name, permissions, description } = req.body;

    // For now, roles are hardcoded in User model
    // In future, you can create a Role model
    res.json({
      success: true,
      message: 'Role management coming soon',
      note: 'Currently roles are USER and ADMIN only'
    });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ success: false, message: 'Failed to create role' });
  }
});

// Update user role
router.put('/users/:id/role',
  [
    body('role').isIn(['USER', 'ADMIN']).withMessage('Invalid role')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { role } = req.body;

      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: { role },
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      });

      res.json({ success: true, user });
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({ success: false, message: 'Failed to update user role' });
    }
  }
);

// Block user
router.post('/users/:id/block', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Cannot block admin users' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        isDeactivated: true,
        deactivatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        isDeactivated: true,
        deactivatedAt: true
      }
    });

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Account Blocked',
        message: 'Your account has been blocked by an administrator. Please contact support for more information.',
        type: 'account_blocked',
        link: '/profile'
      }
    });

    // Emit notification via Socket.IO
    const { emitNotification } = require('../socket/socket');
    emitNotification(user.id, {
      title: 'Account Blocked',
      message: 'Your account has been blocked by an administrator. Please contact support for more information.',
      type: 'account_blocked',
      link: '/profile',
      isRead: false,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, message: 'User blocked successfully', user: updatedUser });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ success: false, message: 'Failed to block user' });
  }
});

// Unblock user
router.post('/users/:id/unblock', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        isDeactivated: false,
        deactivatedAt: null
      },
      select: {
        id: true,
        name: true,
        email: true,
        isDeactivated: true,
        deactivatedAt: true
      }
    });

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Account Unblocked',
        message: 'Your account has been unblocked. You can now access all features.',
        type: 'account_unblocked',
        link: '/profile'
      }
    });

    // Emit notification via Socket.IO
    const { emitNotification } = require('../socket/socket');
    emitNotification(user.id, {
      title: 'Account Unblocked',
      message: 'Your account has been unblocked. You can now access all features.',
      type: 'account_unblocked',
      link: '/profile',
      isRead: false,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, message: 'User unblocked successfully', user: updatedUser });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ success: false, message: 'Failed to unblock user' });
  }
});

// Banner management
router.get('/banners', async (req, res) => {
  try {
    const banners = await prisma.banner.findMany({
      include: {
        category: { select: { id: true, name: true, slug: true } },
        location: { select: { id: true, name: true, slug: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, banners });
  } catch (error) {
    console.error('Get banners error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch banners' });
  }
});

// Create banner
router.post('/banners',
  uploadImages,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('position').isIn(['homepage', 'category', 'search']).withMessage('Invalid position')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      if (!req.uploadedImages || req.uploadedImages.length === 0) {
        return res.status(400).json({ success: false, message: 'Image is required' });
      }

      const { title, link, position, categoryId, locationId, order, startDate, endDate } = req.body;

      // Normalize image URL (handle both string and object formats)
      const imageUrl = typeof req.uploadedImages[0] === 'string' 
        ? req.uploadedImages[0] 
        : (req.uploadedImages[0]?.url || req.uploadedImages[0]);
      
      const banner = await prisma.banner.create({
        data: {
          title,
          image: imageUrl,
          link,
          position,
          categoryId: categoryId || null,
          locationId: locationId || null,
          order: order ? parseInt(order) : 0,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null
        }
      });

      res.status(201).json({ success: true, banner });
    } catch (error) {
      console.error('Create banner error:', error);
      res.status(500).json({ success: false, message: 'Failed to create banner' });
    }
  }
);

// Update banner
router.put('/banners/:id',
  uploadImages,
  async (req, res) => {
    try {
      const updateData = {};
      if (req.body.title) updateData.title = req.body.title;
      if (req.body.link) updateData.link = req.body.link;
      if (req.body.position) updateData.position = req.body.position;
      if (req.body.categoryId) updateData.categoryId = req.body.categoryId;
      if (req.body.locationId) updateData.locationId = req.body.locationId;
      if (req.body.order) updateData.order = parseInt(req.body.order);
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive === 'true';
      if (req.body.startDate) updateData.startDate = new Date(req.body.startDate);
      if (req.body.endDate) updateData.endDate = new Date(req.body.endDate);
      if (req.uploadedImages) {
        // Normalize image URL (handle both string and object formats)
        updateData.image = typeof req.uploadedImages[0] === 'string' 
          ? req.uploadedImages[0] 
          : (req.uploadedImages[0]?.url || req.uploadedImages[0]);
      }

      const banner = await prisma.banner.update({
        where: { id: req.params.id },
        data: updateData
      });

      res.json({ success: true, banner });
    } catch (error) {
      console.error('Update banner error:', error);
      res.status(500).json({ success: false, message: 'Failed to update banner' });
    }
  }
);

// Delete banner
router.delete('/banners/:id', async (req, res) => {
  try {
    await prisma.banner.delete({
      where: { id: req.params.id }
    });

    res.json({ success: true, message: 'Banner deleted' });
  } catch (error) {
    console.error('Delete banner error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete banner' });
  }
});

// -------- Free Posting Promo Cards --------
router.get('/free-posting-promos', async (req, res) => {
  try {
    const promos = await prisma.freePostingPromo.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ success: true, promos });
  } catch (error) {
    console.error('Get free-posting-promos error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch promo cards' });
  }
});

router.post('/free-posting-promos',
  uploadImages,
  [],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      const {
        title, description, ctaText, ctaLink, priority,
        startDate, endDate, isActive, showForAllLocations
      } = req.body;
      let targetLocations = req.body.targetLocations;
      if (typeof targetLocations === 'string') {
        try { targetLocations = JSON.parse(targetLocations); } catch { targetLocations = []; }
      }
      const imageUrl = req.uploadedImages?.length
        ? (typeof req.uploadedImages[0] === 'string' ? req.uploadedImages[0] : (req.uploadedImages[0]?.url || req.uploadedImages[0]))
        : null;
      if (!imageUrl && !(title || '').trim()) {
        return res.status(400).json({ success: false, message: 'Image or title is required' });
      }
      const promo = await prisma.freePostingPromo.create({
        data: {
          image: imageUrl,
          title: title || '',
          description: description || null,
          ctaText: ctaText || 'Post Free Ad',
          ctaLink: ctaLink || '/post-ad',
          priority: priority ? parseInt(priority) : 0,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          isActive: isActive === false || isActive === 'false' ? false : true,
          showForAllLocations: showForAllLocations === true || showForAllLocations === 'true',
          targetLocations: Array.isArray(targetLocations) ? targetLocations : [],
        },
      });
      res.status(201).json({ success: true, promo });
    } catch (error) {
      console.error('Create free-posting-promo error:', error);
      res.status(500).json({ success: false, message: 'Failed to create promo card' });
    }
  }
);

router.put('/free-posting-promos/:id',
  uploadImages,
  async (req, res) => {
    try {
      const updateData = {};
      if (req.body.title !== undefined) updateData.title = req.body.title;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.ctaText !== undefined) updateData.ctaText = req.body.ctaText;
      if (req.body.ctaLink !== undefined) updateData.ctaLink = req.body.ctaLink;
      if (req.body.priority !== undefined) updateData.priority = parseInt(req.body.priority);
      if (req.body.startDate !== undefined) updateData.startDate = req.body.startDate ? new Date(req.body.startDate) : null;
      if (req.body.endDate !== undefined) updateData.endDate = req.body.endDate ? new Date(req.body.endDate) : null;
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive === true || req.body.isActive === 'true';
      if (req.body.showForAllLocations !== undefined) updateData.showForAllLocations = req.body.showForAllLocations === true || req.body.showForAllLocations === 'true';
      if (req.body.targetLocations !== undefined) {
        let tl = req.body.targetLocations;
        if (typeof tl === 'string') { try { tl = JSON.parse(tl); } catch { tl = []; } }
        updateData.targetLocations = Array.isArray(tl) ? tl : [];
      }
      if (req.uploadedImages?.length) {
        updateData.image = typeof req.uploadedImages[0] === 'string' ? req.uploadedImages[0] : (req.uploadedImages[0]?.url || req.uploadedImages[0]);
      }
      const promo = await prisma.freePostingPromo.update({
        where: { id: req.params.id },
        data: updateData,
      });
      res.json({ success: true, promo });
    } catch (error) {
      console.error('Update free-posting-promo error:', error);
      res.status(500).json({ success: false, message: 'Failed to update promo card' });
    }
  }
);

router.delete('/free-posting-promos/:id', async (req, res) => {
  try {
    await prisma.freePostingPromo.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Promo card deleted' });
  } catch (error) {
    console.error('Delete free-posting-promo error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete promo card' });
  }
});

// Interstitial Ad management - Public endpoint (no auth required for GET)
router.get('/interstitial-ads', async (req, res) => {
  try {
    const { position } = req.query;
    const now = new Date();
    
    const where = {
      isActive: true, // Only get active ads
      // Date filtering - ad must be within start and end dates (if set)
      AND: [
        {
          OR: [
            { startDate: null },
            { startDate: { lte: now } }
          ]
        },
        {
          OR: [
            { endDate: null },
            { endDate: { gte: now } }
          ]
        }
      ]
    };
    
    // Filter by position if provided
    if (position) {
      where.position = position;
    }
    
    const ads = await prisma.interstitialAd.findMany({
      where,
      orderBy: [
        { order: 'asc' }, // Order by custom order first
        { createdAt: 'desc' } // Then by creation date
      ]
    });

    console.log(`[InterstitialAds] Found ${ads.length} ads for position: ${position || 'all'}`);
    res.json({ success: true, ads });
  } catch (error) {
    console.error('Get interstitial ads error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch interstitial ads' });
  }
});

// Create interstitial ad
router.post('/interstitial-ads',
  uploadImages,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('position').isIn(['page_load', 'page_exit', 'after_action', 'between_pages']).withMessage('Invalid position')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      if (!req.uploadedImages || req.uploadedImages.length === 0) {
        return res.status(400).json({ success: false, message: 'Image is required' });
      }

      const { title, link, position, isActive, frequency, width, height, startDate, endDate, order } = req.body;

      // Normalize image URL (handle both string and object formats)
      const imageUrl = typeof req.uploadedImages[0] === 'string' 
        ? req.uploadedImages[0] 
        : (req.uploadedImages[0]?.url || req.uploadedImages[0]);
      
      const ad = await prisma.interstitialAd.create({
        data: {
          title,
          image: imageUrl,
          link: link || null,
          position,
          isActive: isActive === 'true' || isActive === true,
          frequency: parseInt(frequency) || 1,
          width: width ? parseInt(width) : null,
          height: height ? parseInt(height) : null,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          order: parseInt(order) || 0
        }
      });

      res.status(201).json({ success: true, ad });
    } catch (error) {
      console.error('Create interstitial ad error:', error);
      res.status(500).json({ success: false, message: 'Failed to create interstitial ad' });
    }
  }
);

// Update interstitial ad
router.put('/interstitial-ads/:id',
  uploadImages,
  async (req, res) => {
    try {
      const { title, link, position, isActive, frequency, width, height, startDate, endDate, order } = req.body;

      const updateData = {
        title,
        link: link || null,
        position,
        isActive: isActive === 'true' || isActive === true,
        frequency: parseInt(frequency) || 1,
        width: width ? parseInt(width) : null,
        height: height ? parseInt(height) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        order: parseInt(order) || 0
      };

      if (req.uploadedImages && req.uploadedImages.length > 0) {
        // Normalize image URL (handle both string and object formats)
        updateData.image = typeof req.uploadedImages[0] === 'string' 
          ? req.uploadedImages[0] 
          : (req.uploadedImages[0]?.url || req.uploadedImages[0]);
      }

      const ad = await prisma.interstitialAd.update({
        where: { id: req.params.id },
        data: updateData
      });

      res.json({ success: true, ad });
    } catch (error) {
      console.error('Update interstitial ad error:', error);
      res.status(500).json({ success: false, message: 'Failed to update interstitial ad' });
    }
  }
);

// Delete interstitial ad
router.delete('/interstitial-ads/:id', async (req, res) => {
  try {
    await prisma.interstitialAd.delete({
      where: { id: req.params.id }
    });

    res.json({ success: true, message: 'Interstitial ad deleted' });
  } catch (error) {
    console.error('Delete interstitial ad error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete interstitial ad' });
  }
});

// ==================== Sponsored Ads Management ====================
const sponsoredAdsService = require('../services/sponsoredAdsService');
const { normalizeLocationSlug } = require('../utils/locationSlug');

// Get all sponsored ads (admin)
router.get('/sponsored-ads', async (req, res) => {
  try {
    const ads = await sponsoredAdsService.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 200
    });
    res.json({ success: true, ads });
  } catch (error) {
    console.error('Get sponsored ads error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sponsored ads' });
  }
});

// Create sponsored ad
router.post('/sponsored-ads',
  uploadImages,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('adSize').optional().isIn(['auto', 'all', 'small', 'medium', 'large']),
    body('ctaType').optional().isIn(['call', 'whatsapp', 'website']),
    body('status').optional().isIn(['active', 'paused', 'expired'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const {
        title, bannerImage, bannerVideo, description,
        ctaType, ctaLabel, redirectUrl,
        targetLocations, categorySlug, adSize,
        startDate, endDate, budget, priority, status
      } = req.body;

      const imageUrl = req.uploadedImages?.[0]
        ? (typeof req.uploadedImages[0] === 'string' ? req.uploadedImages[0] : req.uploadedImages[0]?.url)
        : bannerImage || null;
      const locations = Array.isArray(targetLocations) ? targetLocations : (targetLocations ? JSON.parse(targetLocations || '[]') : []);

      const ad = await sponsoredAdsService.create({
        title: title.trim(),
        bannerImage: imageUrl || bannerImage,
        bannerVideo: bannerVideo || null,
        description: description?.trim() || null,
        ctaType: ctaType || 'website',
        ctaLabel: ctaLabel?.trim() || null,
        redirectUrl: redirectUrl?.trim() || null,
        targetLocations: locations.map((l) => normalizeLocationSlug(String(l))).filter(Boolean),
        categorySlug: categorySlug?.trim().toLowerCase() || null,
        adSize: adSize || 'auto',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        budget: parseFloat(budget) || 0,
        priority: parseInt(priority) || 0,
        status: status || 'active'
      });

      res.status(201).json({ success: true, ad });
    } catch (error) {
      console.error('Create sponsored ad error:', error);
      res.status(500).json({ success: false, message: 'Failed to create sponsored ad' });
    }
  }
);

// Update sponsored ad
router.put('/sponsored-ads/:id',
  uploadImages,
  async (req, res) => {
    try {
      const {
        title, bannerImage, bannerVideo, description,
        ctaType, ctaLabel, redirectUrl,
        targetLocations, categorySlug, adSize,
        startDate, endDate, budget, priority, status
      } = req.body;

      const updateData = {};
      if (title !== undefined) updateData.title = title.trim();
      if (bannerImage !== undefined) updateData.bannerImage = bannerImage;
      if (bannerVideo !== undefined) updateData.bannerVideo = bannerVideo;
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (ctaType !== undefined) updateData.ctaType = ctaType;
      if (ctaLabel !== undefined) updateData.ctaLabel = ctaLabel?.trim() || null;
      if (redirectUrl !== undefined) updateData.redirectUrl = redirectUrl?.trim() || null;
      if (targetLocations !== undefined) {
        const locations = Array.isArray(targetLocations) ? targetLocations : (targetLocations ? JSON.parse(targetLocations || '[]') : []);
        updateData.targetLocations = locations.map((l) => normalizeLocationSlug(String(l))).filter(Boolean);
      }
      if (categorySlug !== undefined) updateData.categorySlug = categorySlug?.trim().toLowerCase() || null;
      if (adSize !== undefined) updateData.adSize = adSize;
      if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
      if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
      if (budget !== undefined) updateData.budget = parseFloat(budget) || 0;
      if (priority !== undefined) updateData.priority = parseInt(priority) || 0;
      if (status !== undefined) updateData.status = status;

      if (req.uploadedImages?.[0]) {
        updateData.bannerImage = typeof req.uploadedImages[0] === 'string' ? req.uploadedImages[0] : req.uploadedImages[0]?.url;
      }

      const ad = await sponsoredAdsService.update(req.params.id, updateData);

      res.json({ success: true, ad });
    } catch (error) {
      console.error('Update sponsored ad error:', error);
      res.status(500).json({ success: false, message: 'Failed to update sponsored ad' });
    }
  }
);

// Delete sponsored ad
router.delete('/sponsored-ads/:id', async (req, res) => {
  try {
    await sponsoredAdsService.deleteOne(req.params.id);
    res.json({ success: true, message: 'Sponsored ad deleted' });
  } catch (error) {
    console.error('Delete sponsored ad error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete sponsored ad' });
  }
});

// Sponsored ads analytics
router.get('/sponsored-ads/analytics', async (req, res) => {
  try {
    const ads = await sponsoredAdsService.findMany({
      take: 500
    });

    const totalImpressions = ads.reduce((s, a) => s + (a.impressions || 0), 0);
    const totalClicks = ads.reduce((s, a) => s + (a.clicks || 0), 0);
    const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      analytics: {
        totalImpressions,
        totalClicks,
        ctr: parseFloat(ctr),
        ads: ads.map((a) => ({
          ...a,
          ctr: (a.impressions || 0) > 0 ? (((a.clicks || 0) / (a.impressions || 1)) * 100).toFixed(2) : 0
        }))
      }
    });
  } catch (error) {
    console.error('Sponsored ads analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

// ==================== Category Management ====================

// Get all categories (admin view - includes inactive)
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        subcategories: {
          orderBy: { name: 'asc' }
        },
        _count: {
          select: { ads: true }
        }
      },
      orderBy: { order: 'asc' }
    });

    res.json({ success: true, categories });
  } catch (error) {
    console.error('Get admin categories error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// Create category
router.post('/categories',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('slug').optional().trim(),
    body('description').optional().trim(),
    body('order').optional().isInt({ min: 0 }),
    body('isActive').optional().isBoolean(),
    body('adPostingPrice').optional().isFloat({ min: 0 }).withMessage('Ad posting price must be a positive number')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { name, slug, description, order, isActive, icon, image, adPostingPrice } = req.body;
      
      // Auto-generate slug from name if not provided
      const categorySlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      // Check if slug already exists
      const existing = await prisma.category.findUnique({
        where: { slug: categorySlug }
      });
      
      if (existing) {
        return res.status(400).json({ 
          success: false, 
          message: 'Category with this slug already exists' 
        });
      }

      const category = await prisma.category.create({
        data: {
          name: name.trim(),
          slug: categorySlug,
          description: description?.trim() || null,
          order: order || 0,
          isActive: isActive !== undefined ? isActive : true,
          icon: icon || null,
          image: image || null,
          adPostingPrice: adPostingPrice ? parseFloat(adPostingPrice) : null
        },
        include: {
          subcategories: true,
          _count: { select: { ads: true } }
        }
      });

      res.status(201).json({ success: true, category });
    } catch (error) {
      console.error('Create category error:', error);
      if (error.code === 'P2002') {
        return res.status(400).json({ 
          success: false, 
          message: 'Category with this slug already exists' 
        });
      }
      res.status(500).json({ success: false, message: 'Failed to create category' });
    }
  }
);

// Update category
router.put('/categories/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('slug').optional().trim(),
    body('description').optional().trim(),
    body('order').optional().isInt({ min: 0 }),
    body('isActive').optional().isBoolean(),
    body('adPostingPrice').optional().isFloat({ min: 0 }).withMessage('Ad posting price must be a positive number')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const category = await prisma.category.findUnique({
        where: { id: req.params.id }
      });

      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      const updateData = {};
      if (req.body.name) updateData.name = req.body.name.trim();
      if (req.body.slug) {
        // Check if new slug conflicts with another category
        const existing = await prisma.category.findUnique({
          where: { slug: req.body.slug }
        });
        if (existing && existing.id !== req.params.id) {
          return res.status(400).json({ 
            success: false, 
            message: 'Category with this slug already exists' 
          });
        }
        updateData.slug = req.body.slug.trim();
      }
      if (req.body.description !== undefined) updateData.description = req.body.description?.trim() || null;
      if (req.body.order !== undefined) updateData.order = parseInt(req.body.order);
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
      if (req.body.icon !== undefined) updateData.icon = req.body.icon || null;
      if (req.body.image !== undefined) updateData.image = req.body.image || null;
      if (req.body.adPostingPrice !== undefined) {
        // Allow null to use default price, or set specific price
        updateData.adPostingPrice = req.body.adPostingPrice === null || req.body.adPostingPrice === '' 
          ? null 
          : parseFloat(req.body.adPostingPrice);
      }

      const updated = await prisma.category.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          subcategories: true,
          _count: { select: { ads: true } }
        }
      });

      res.json({ success: true, category: updated });
    } catch (error) {
      console.error('Update category error:', error);
      if (error.code === 'P2002') {
        return res.status(400).json({ 
          success: false, 
          message: 'Category with this slug already exists' 
        });
      }
      res.status(500).json({ success: false, message: 'Failed to update category' });
    }
  }
);

// Bulk update category pricing
router.put('/categories/pricing/bulk',
  [
    body('pricing').isArray().withMessage('Pricing array is required'),
    body('pricing.*.categoryId').notEmpty().withMessage('Category ID is required'),
    body('pricing.*.adPostingPrice').optional().isFloat({ min: 0 }).withMessage('Ad posting price must be a positive number')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { pricing } = req.body;
      const results = [];

      for (const item of pricing) {
        try {
          const category = await prisma.category.findUnique({
            where: { id: item.categoryId }
          });

          if (!category) {
            results.push({ categoryId: item.categoryId, success: false, message: 'Category not found' });
            continue;
          }

          const priceValue = item.adPostingPrice === null || item.adPostingPrice === '' 
            ? null 
            : parseFloat(item.adPostingPrice);

          await prisma.category.update({
            where: { id: item.categoryId },
            data: { adPostingPrice: priceValue }
          });

          results.push({ 
            categoryId: item.categoryId, 
            categoryName: category.name,
            success: true, 
            adPostingPrice: priceValue 
          });
        } catch (error) {
          results.push({ 
            categoryId: item.categoryId, 
            success: false, 
            message: error.message 
          });
        }
      }

      res.json({ success: true, results });
    } catch (error) {
      console.error('Bulk update category pricing error:', error);
      res.status(500).json({ success: false, message: 'Failed to update category pricing' });
    }
  }
);

// Delete category
router.delete('/categories/:id', async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { ads: true, subcategories: true } }
      }
    });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (category._count.ads > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete category with ${category._count.ads} ads. Please reassign or delete ads first.` 
      });
    }

    await prisma.category.delete({
      where: { id: req.params.id }
    });

    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
});

// ==================== Specification Management ====================

// Get specifications for category/subcategory (defaults/suggestions) or ad (product-specific)
router.get('/specifications', async (req, res) => {
  try {
    const { categoryId, subcategoryId, adId } = req.query;
    
    const where = {};
    if (adId) {
      where.adId = adId; // Product-specific specifications
    } else if (categoryId || subcategoryId) {
      // Category-level defaults (no adId)
      where.adId = null;
      if (categoryId) where.categoryId = categoryId;
      if (subcategoryId) where.subcategoryId = subcategoryId;
    }
    
    const specifications = await prisma.specification.findMany({
      where,
      include: {
        options: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { order: 'asc' }
    });

    res.json({ success: true, specifications });
  } catch (error) {
    console.error('Get specifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch specifications' });
  }
});

// Create specification
router.post('/specifications',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('label').trim().notEmpty().withMessage('Label is required'),
    body('type').isIn(['text', 'number', 'select', 'multiselect']).withMessage('Type must be text, number, select, or multiselect'),
    body('adId').optional().notEmpty(),
    body('categoryId').optional().notEmpty(),
    body('subcategoryId').optional().notEmpty(),
    body('required').optional().isBoolean(),
    body('order').optional().isInt({ min: 0 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { name, label, type, adId, categoryId, subcategoryId, required, placeholder, order } = req.body;

      // Validate: either adId (product-specific) OR categoryId/subcategoryId (defaults) must be provided
      if (!adId && !categoryId && !subcategoryId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Either adId (for product-specific) or categoryId/subcategoryId (for defaults) must be provided' 
        });
      }

      // If adId is provided, verify ad exists
      if (adId) {
        const ad = await prisma.ad.findUnique({
          where: { id: adId }
        });
        if (!ad) {
          return res.status(404).json({ success: false, message: 'Ad not found' });
        }
      }

      const specification = await prisma.specification.create({
        data: {
          name: name.trim(),
          label: label.trim(),
          type,
          adId: adId || null,
          categoryId: categoryId || null,
          subcategoryId: subcategoryId || null,
          required: required || false,
          placeholder: placeholder?.trim() || null,
          order: order || 0
        },
        include: {
          options: true
        }
      });

      res.status(201).json({ success: true, specification });
    } catch (error) {
      console.error('Create specification error:', error);
      res.status(500).json({ success: false, message: 'Failed to create specification' });
    }
  }
);

// Update specification
router.put('/specifications/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('label').optional().trim().notEmpty(),
    body('type').optional().isIn(['text', 'number', 'select', 'multiselect']),
    body('required').optional().isBoolean(),
    body('order').optional().isInt({ min: 0 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const specification = await prisma.specification.findUnique({
        where: { id: req.params.id }
      });

      if (!specification) {
        return res.status(404).json({ success: false, message: 'Specification not found' });
      }

      const updateData = {};
      if (req.body.name) updateData.name = req.body.name.trim();
      if (req.body.label) updateData.label = req.body.label.trim();
      if (req.body.type) updateData.type = req.body.type;
      if (req.body.required !== undefined) updateData.required = req.body.required;
      if (req.body.placeholder !== undefined) updateData.placeholder = req.body.placeholder?.trim() || null;
      if (req.body.order !== undefined) updateData.order = parseInt(req.body.order);
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

      const updated = await prisma.specification.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          options: {
            where: { isActive: true },
            orderBy: { order: 'asc' }
          }
        }
      });

      res.json({ success: true, specification: updated });
    } catch (error) {
      console.error('Update specification error:', error);
      res.status(500).json({ success: false, message: 'Failed to update specification' });
    }
  }
);

// Delete specification
router.delete('/specifications/:id', async (req, res) => {
  try {
    const specification = await prisma.specification.findUnique({
      where: { id: req.params.id }
    });

    if (!specification) {
      return res.status(404).json({ success: false, message: 'Specification not found' });
    }

    await prisma.specification.delete({
      where: { id: req.params.id }
    });

    res.json({ success: true, message: 'Specification deleted successfully' });
  } catch (error) {
    console.error('Delete specification error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete specification' });
  }
});

// ==================== Specification Option Management ====================

// Create specification option
router.post('/specifications/:specificationId/options',
  [
    body('value').trim().notEmpty().withMessage('Value is required'),
    body('label').optional().trim(),
    body('order').optional().isInt({ min: 0 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const specification = await prisma.specification.findUnique({
        where: { id: req.params.specificationId }
      });

      if (!specification) {
        return res.status(404).json({ success: false, message: 'Specification not found' });
      }

      const { value, label, order } = req.body;

      const option = await prisma.specificationOption.create({
        data: {
          value: value.trim(),
          label: label?.trim() || value.trim(),
          specificationId: req.params.specificationId,
          order: order || 0
        }
      });

      res.status(201).json({ success: true, option });
    } catch (error) {
      console.error('Create specification option error:', error);
      res.status(500).json({ success: false, message: 'Failed to create specification option' });
    }
  }
);

// Update specification option
router.put('/specifications/options/:id',
  [
    body('value').optional().trim().notEmpty(),
    body('label').optional().trim(),
    body('order').optional().isInt({ min: 0 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const option = await prisma.specificationOption.findUnique({
        where: { id: req.params.id }
      });

      if (!option) {
        return res.status(404).json({ success: false, message: 'Specification option not found' });
      }

      const updateData = {};
      if (req.body.value) updateData.value = req.body.value.trim();
      if (req.body.label !== undefined) updateData.label = req.body.label?.trim() || req.body.value?.trim();
      if (req.body.order !== undefined) updateData.order = parseInt(req.body.order);
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

      const updated = await prisma.specificationOption.update({
        where: { id: req.params.id },
        data: updateData
      });

      res.json({ success: true, option: updated });
    } catch (error) {
      console.error('Update specification option error:', error);
      res.status(500).json({ success: false, message: 'Failed to update specification option' });
    }
  }
);

// Delete specification option
router.delete('/specifications/options/:id', async (req, res) => {
  try {
    const option = await prisma.specificationOption.findUnique({
      where: { id: req.params.id }
    });

    if (!option) {
      return res.status(404).json({ success: false, message: 'Specification option not found' });
    }

    await prisma.specificationOption.delete({
      where: { id: req.params.id }
    });

    res.json({ success: true, message: 'Specification option deleted successfully' });
  } catch (error) {
    console.error('Delete specification option error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete specification option' });
  }
});

// ==================== Subcategory Management ====================

// Get all subcategories
router.get('/subcategories', async (req, res) => {
  try {
    const { categoryId } = req.query;
    const where = {};
    if (categoryId) where.categoryId = categoryId;

    const subcategories = await prisma.subcategory.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { ads: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, subcategories });
  } catch (error) {
    console.error('Get admin subcategories error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subcategories' });
  }
});

// Create subcategory
router.post('/subcategories',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('categoryId').notEmpty().withMessage('Category ID is required'),
    body('slug').optional().trim(),
    body('description').optional().trim(),
    body('isActive').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { name, categoryId, slug, description, isActive } = req.body;

      // Verify category exists
      const category = await prisma.category.findUnique({
        where: { id: categoryId }
      });

      if (!category) {
        return res.status(400).json({ success: false, message: 'Category not found' });
      }

      // Auto-generate slug from name if not provided
      const subcategorySlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      // Check if slug already exists for this category
      const existing = await prisma.subcategory.findUnique({
        where: {
          categoryId_slug: {
            categoryId,
            slug: subcategorySlug
          }
        }
      });
      
      if (existing) {
        return res.status(400).json({ 
          success: false, 
          message: 'Subcategory with this slug already exists in this category' 
        });
      }

      const subcategory = await prisma.subcategory.create({
        data: {
          name: name.trim(),
          slug: subcategorySlug,
          categoryId,
          description: description?.trim() || null,
          isActive: isActive !== undefined ? isActive : true
        },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          _count: { select: { ads: true } }
        }
      });

      res.status(201).json({ success: true, subcategory });
    } catch (error) {
      console.error('Create subcategory error:', error);
      if (error.code === 'P2002') {
        return res.status(400).json({ 
          success: false, 
          message: 'Subcategory with this slug already exists in this category' 
        });
      }
      res.status(500).json({ success: false, message: 'Failed to create subcategory' });
    }
  }
);

// Update subcategory
router.put('/subcategories/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('slug').optional().trim(),
    body('description').optional().trim(),
    body('isActive').optional().isBoolean(),
    body('categoryId').optional().notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const subcategory = await prisma.subcategory.findUnique({
        where: { id: req.params.id },
        include: { category: true }
      });

      if (!subcategory) {
        return res.status(404).json({ success: false, message: 'Subcategory not found' });
      }

      const updateData = {};
      const categoryId = req.body.categoryId || subcategory.categoryId;

      if (req.body.name) updateData.name = req.body.name.trim();
      if (req.body.slug) {
        // Check if new slug conflicts
        const existing = await prisma.subcategory.findUnique({
          where: {
            categoryId_slug: {
              categoryId,
              slug: req.body.slug
            }
          }
        });
        if (existing && existing.id !== req.params.id) {
          return res.status(400).json({ 
            success: false, 
            message: 'Subcategory with this slug already exists in this category' 
          });
        }
        updateData.slug = req.body.slug.trim();
      }
      if (req.body.categoryId && req.body.categoryId !== subcategory.categoryId) {
        // Verify new category exists
        const newCategory = await prisma.category.findUnique({
          where: { id: req.body.categoryId }
        });
        if (!newCategory) {
          return res.status(400).json({ success: false, message: 'Category not found' });
        }
        updateData.categoryId = req.body.categoryId;
      }
      if (req.body.description !== undefined) updateData.description = req.body.description?.trim() || null;
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

      const updated = await prisma.subcategory.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          _count: { select: { ads: true } }
        }
      });

      res.json({ success: true, subcategory: updated });
    } catch (error) {
      console.error('Update subcategory error:', error);
      if (error.code === 'P2002') {
        return res.status(400).json({ 
          success: false, 
          message: 'Subcategory with this slug already exists in this category' 
        });
      }
      res.status(500).json({ success: false, message: 'Failed to update subcategory' });
    }
  }
);

// Delete subcategory
router.delete('/subcategories/:id', async (req, res) => {
  try {
    const subcategory = await prisma.subcategory.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { ads: true } }
      }
    });

    if (!subcategory) {
      return res.status(404).json({ success: false, message: 'Subcategory not found' });
    }

    if (subcategory._count.ads > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete subcategory with ${subcategory._count.ads} ads. Please reassign or delete ads first.` 
      });
    }

    await prisma.subcategory.delete({
      where: { id: req.params.id }
    });

    res.json({ success: true, message: 'Subcategory deleted successfully' });
  } catch (error) {
    console.error('Delete subcategory error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete subcategory' });
  }
});

// Location management
// Get all locations (with hierarchical support)
router.get('/locations', async (req, res) => {
  try {
    const { state, city, isActive, type } = req.query;
    const where = {};

    if (state) where.state = state;
    if (city) where.city = city;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    // Type filter: 'city' (only cities), 'area' (only local areas), or all
    if (type === 'city') {
      where.neighbourhood = null;
      where.city = { not: null };
    } else if (type === 'area') {
      where.neighbourhood = { not: null };
    }

    const locations = await prisma.location.findMany({
      where,
      include: {
        _count: {
          select: { ads: { where: { status: 'APPROVED' } } }
        }
      },
      orderBy: { name: 'asc' } // Alphabetical sorting
    });

    res.json({ success: true, locations });
  } catch (error) {
    console.error('Get admin locations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch locations' });
  }
});

// Get cities by state (for admin panel)
router.get('/locations/states/:state/cities', async (req, res) => {
  try {
    const { state } = req.params;
    const cities = await prisma.location.findMany({
      where: {
        state: decodeURIComponent(state),
        city: { not: null },
        neighbourhood: null, // Only cities
        isActive: true
      },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { ads: { where: { status: 'APPROVED' } } }
        }
      }
    });

    res.json({ success: true, cities, state: decodeURIComponent(state) });
  } catch (error) {
    console.error('Get admin cities by state error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cities' });
  }
});

// Get local areas by city (for admin panel)
router.get('/locations/cities/:city/areas', async (req, res) => {
  try {
    const { city } = req.params;
    const { state } = req.query;
    
    const where = {
      city: decodeURIComponent(city),
      neighbourhood: { not: null }, // Only local areas
      isActive: true
    };
    
    if (state) where.state = decodeURIComponent(state);

    const areas = await prisma.location.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { ads: { where: { status: 'APPROVED' } } }
        }
      }
    });

    res.json({ success: true, areas, city: decodeURIComponent(city) });
  } catch (error) {
    console.error('Get admin areas by city error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch local areas' });
  }
});

// Get single location
router.get('/locations/:id', async (req, res) => {
  try {
    const location = await prisma.location.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { ads: { where: { status: 'APPROVED' } } }
        }
      }
    });

    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    res.json({ success: true, location });
  } catch (error) {
    console.error('Get location error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch location' });
  }
});

// Create location
router.post('/locations',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('slug').optional().trim(),
    body('state').optional().trim(),
    body('city').optional().trim(),
    body('neighbourhood').optional().trim(),
    body('pincode').optional().trim(),
    body('latitude').optional().isFloat(),
    body('longitude').optional().isFloat(),
    body('isActive').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { name, slug, state, city, neighbourhood, pincode, latitude, longitude, isActive } = req.body;
      
      // Auto-generate slug from name if not provided
      const locationSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      // Check if slug already exists
      const existing = await prisma.location.findUnique({
        where: { slug: locationSlug }
      });

      if (existing) {
        return res.status(400).json({ success: false, message: 'Location with this slug already exists' });
      }

      const location = await prisma.location.create({
        data: {
          name,
          slug: locationSlug,
          state: state || null,
          city: city || null,
          neighbourhood: neighbourhood || null,
          pincode: pincode || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          isActive: isActive !== undefined ? isActive : true
        }
      });

      res.status(201).json({ success: true, location });
    } catch (error) {
      console.error('Create location error:', error);
      res.status(500).json({ success: false, message: 'Failed to create location' });
    }
  }
);

// Update location
router.put('/locations/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('slug').optional().trim(),
    body('state').optional().trim(),
    body('city').optional().trim(),
    body('neighbourhood').optional().trim(),
    body('pincode').optional().trim(),
    body('latitude').optional().isFloat(),
    body('longitude').optional().isFloat(),
    body('isActive').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { name, slug, state, city, neighbourhood, pincode, latitude, longitude, isActive } = req.body;

      // Check if location exists
      const existing = await prisma.location.findUnique({
        where: { id: req.params.id }
      });

      if (!existing) {
        return res.status(404).json({ success: false, message: 'Location not found' });
      }

      // Check if new slug conflicts with another location
      if (slug && slug !== existing.slug) {
        const slugConflict = await prisma.location.findUnique({
          where: { slug }
        });

        if (slugConflict) {
          return res.status(400).json({ success: false, message: 'Location with this slug already exists' });
        }
      }

      const updateData = {};
      if (name) updateData.name = name;
      if (slug) updateData.slug = slug;
      if (state !== undefined) updateData.state = state || null;
      if (city !== undefined) updateData.city = city || null;
      if (neighbourhood !== undefined) updateData.neighbourhood = neighbourhood || null;
      if (pincode !== undefined) updateData.pincode = pincode || null;
      if (latitude !== undefined) updateData.latitude = latitude ? parseFloat(latitude) : null;
      if (longitude !== undefined) updateData.longitude = longitude ? parseFloat(longitude) : null;
      if (isActive !== undefined) updateData.isActive = isActive;

      const location = await prisma.location.update({
        where: { id: req.params.id },
        data: updateData
      });

      res.json({ success: true, location });
    } catch (error) {
      console.error('Update location error:', error);
      res.status(500).json({ success: false, message: 'Failed to update location' });
    }
  }
);

// Update location with geocoding data (using coordinates or address)
router.post('/locations/:id/update-from-geocoding', async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    require('dotenv').config();

    // Check if location exists
    const location = await prisma.location.findUnique({
      where: { id: req.params.id }
    });

    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    // Get Google Maps API key
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyDufUVTJcEr5UMqg8-LgoY4mCHu66-_mUA';

    if (!GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({ success: false, message: 'Google Maps API key is not configured' });
    }

    let geocodingUrl;
    let lat, lng;

    // Use coordinates if provided, otherwise use address
    if (latitude && longitude) {
      lat = parseFloat(latitude);
      lng = parseFloat(longitude);
      
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ success: false, message: 'Invalid coordinates' });
      }

      const formattedLat = lat.toFixed(6);
      const formattedLng = lng.toFixed(6);
      geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${formattedLat},${formattedLng}&key=${GOOGLE_MAPS_API_KEY}`;
    } else if (address) {
      const encodedAddress = encodeURIComponent(address);
      geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`;
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Either latitude/longitude or address is required' 
      });
    }

    console.log('Geocoding URL (key hidden):', geocodingUrl.replace(GOOGLE_MAPS_API_KEY, 'API_KEY_HIDDEN'));

    // Call Google Geocoding API
    const geocodingResponse = await fetch(geocodingUrl);
    const geocodingData = await geocodingResponse.json();

    if (geocodingData.status !== 'OK' || !geocodingData.results || geocodingData.results.length === 0) {
      return res.status(400).json({
        success: false,
        message: geocodingData.error_message || 'Could not geocode the provided location',
        geocodingStatus: geocodingData.status
      });
    }

    const result = geocodingData.results[0];
    const addressComponents = result.address_components;

    // Extract location details
    let city = null;
    let state = null;
    let neighbourhood = null;
    let pincode = null;
    let extractedLat = lat;
    let extractedLng = lng;

    addressComponents.forEach((component) => {
      const types = component.types;
      if (types.includes('locality') || types.includes('sublocality_level_1')) {
        city = component.long_name;
      }
      if (types.includes('sublocality') || types.includes('sublocality_level_2') || types.includes('neighborhood')) {
        neighbourhood = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        state = component.long_name;
      }
      if (types.includes('postal_code')) {
        pincode = component.long_name;
      }
    });

    // Get coordinates from result if not provided
    if (!extractedLat || !extractedLng) {
      extractedLat = result.geometry.location.lat;
      extractedLng = result.geometry.location.lng;
    }

    // Update location with geocoding data
    const updateData = {};
    if (state) updateData.state = state;
    if (city) updateData.city = city;
    if (neighbourhood) updateData.neighbourhood = neighbourhood;
    if (pincode) updateData.pincode = pincode;
    if (extractedLat) updateData.latitude = extractedLat;
    if (extractedLng) updateData.longitude = extractedLng;

    const updatedLocation = await prisma.location.update({
      where: { id: req.params.id },
      data: updateData
    });

    console.log('Location updated with geocoding data:', {
      id: updatedLocation.id,
      name: updatedLocation.name,
      state,
      city,
      neighbourhood,
      pincode
    });

    res.json({
      success: true,
      message: 'Location updated successfully with geocoding data',
      location: updatedLocation,
      geocodedData: {
        state,
        city,
        neighbourhood,
        pincode,
        latitude: extractedLat,
        longitude: extractedLng,
        formattedAddress: result.formatted_address
      }
    });
  } catch (error) {
    console.error('Update location from geocoding error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to update location from geocoding' 
    });
  }
});

// Bulk update locations with geocoding data (for locations with coordinates)
router.post('/locations/bulk-update-geocoding', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    require('dotenv').config();

    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyDufUVTJcEr5UMqg8-LgoY4mCHu66-_mUA';

    if (!GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({ success: false, message: 'Google Maps API key is not configured' });
    }

    // Get all locations that have coordinates but missing state/city/neighbourhood
    const locations = await prisma.location.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
        OR: [
          { state: null },
          { city: null },
          { neighbourhood: null }
        ]
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        state: true,
        city: true,
        neighbourhood: true
      },
      take: 50 // Limit to 50 at a time to avoid rate limits
    });

    if (locations.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No locations need updating',
        updated: 0 
      });
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const location of locations) {
      try {
        const formattedLat = location.latitude.toFixed(6);
        const formattedLng = location.longitude.toFixed(6);
        const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${formattedLat},${formattedLng}&key=${GOOGLE_MAPS_API_KEY}`;

        const geocodingResponse = await fetch(geocodingUrl);
        const geocodingData = await geocodingResponse.json();

        if (geocodingData.status === 'OK' && geocodingData.results && geocodingData.results.length > 0) {
          const result = geocodingData.results[0];
          const addressComponents = result.address_components;

          let city = location.city;
          let state = location.state;
          let neighbourhood = location.neighbourhood;
          let pincode = null;

          addressComponents.forEach((component) => {
            const types = component.types;
            if (!city && (types.includes('locality') || types.includes('sublocality_level_1'))) {
              city = component.long_name;
            }
            if (!neighbourhood && (types.includes('sublocality') || types.includes('sublocality_level_2') || types.includes('neighborhood'))) {
              neighbourhood = component.long_name;
            }
            if (!state && types.includes('administrative_area_level_1')) {
              state = component.long_name;
            }
            if (types.includes('postal_code')) {
              pincode = component.long_name;
            }
          });

          const updateData = {};
          if (state && !location.state) updateData.state = state;
          if (city && !location.city) updateData.city = city;
          if (neighbourhood && !location.neighbourhood) updateData.neighbourhood = neighbourhood;
          if (pincode) updateData.pincode = pincode;

          if (Object.keys(updateData).length > 0) {
            await prisma.location.update({
              where: { id: location.id },
              data: updateData
            });

            successCount++;
            results.push({
              id: location.id,
              name: location.name,
              status: 'updated',
              data: updateData
            });
          } else {
            results.push({
              id: location.id,
              name: location.name,
              status: 'no_changes',
              message: 'All fields already populated'
            });
          }

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          errorCount++;
          results.push({
            id: location.id,
            name: location.name,
            status: 'error',
            message: geocodingData.error_message || 'Geocoding failed'
          });
        }
      } catch (error) {
        errorCount++;
        results.push({
          id: location.id,
          name: location.name,
          status: 'error',
          message: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Processed ${locations.length} locations`,
      updated: successCount,
      errors: errorCount,
      results
    });
  } catch (error) {
    console.error('Bulk update locations error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to bulk update locations' 
    });
  }
});

// Delete location
router.delete('/locations/:id', async (req, res) => {
  try {
    const location = await prisma.location.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { ads: true }
        }
      }
    });

    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    // Check if location has ads
    if (location._count.ads > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete location. It has ${location._count.ads} associated ads.` 
      });
    }

    await prisma.location.delete({
      where: { id: req.params.id }
    });

    res.json({ success: true, message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Delete location error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete location' });
  }
});

// Get all orders (both premium and ad posting orders)
router.get('/orders', async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status, userId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const premiumWhere = {};
    const adPostingWhere = {};

    if (status) {
      premiumWhere.status = status;
      adPostingWhere.status = status;
    }
    if (userId) {
      premiumWhere.userId = userId;
      adPostingWhere.userId = userId;
    }

    // Fetch both types of orders
    const [premiumOrders, adPostingOrders, premiumTotal, adPostingTotal] = await Promise.all([
      type === 'ad-posting' ? [] : prisma.premiumOrder.findMany({
        where: premiumWhere,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
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
        where: adPostingWhere,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
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
      type === 'ad-posting' ? 0 : prisma.premiumOrder.count({ where: premiumWhere }),
      type === 'premium' ? 0 : prisma.adPostingOrder.count({ where: adPostingWhere })
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
        user: order.user,
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
        user: order.user,
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
    console.error('Get admin orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

// ========== ADMIN FEATURE FLAGS ==========

// Get all feature flags
router.get('/feature-flags', authenticate, requireAdmin, async (req, res) => {
  try {
    // Use PremiumSettings model to store feature flags
    const featureFlags = await prisma.premiumSettings.findMany({
      where: {
        key: { startsWith: 'feature_' }
      },
      orderBy: { key: 'asc' }
    });

    const flags = featureFlags.reduce((acc, flag) => {
      const flagName = flag.key.replace('feature_', '');
      acc[flagName] = {
        enabled: flag.value === 'true' || flag.value === '1',
        value: flag.value,
        updatedAt: flag.updatedAt,
        updatedBy: flag.updatedBy
      };
      return acc;
    }, {});

    res.json({
      success: true,
      featureFlags: flags,
      count: featureFlags.length
    });
  } catch (error) {
    console.error('Get feature flags error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch feature flags' });
  }
});

// Get a specific feature flag
router.get('/feature-flags/:flagName', authenticate, requireAdmin, async (req, res) => {
  try {
    const { flagName } = req.params;
    const flagKey = `feature_${flagName}`;

    const flag = await prisma.premiumSettings.findUnique({
      where: { key: flagKey }
    });

    if (!flag) {
      return res.status(404).json({ success: false, message: 'Feature flag not found' });
    }

    res.json({
      success: true,
      flag: {
        name: flagName,
        enabled: flag.value === 'true' || flag.value === '1',
        value: flag.value,
        updatedAt: flag.updatedAt,
        updatedBy: flag.updatedBy
      }
    });
  } catch (error) {
    console.error('Get feature flag error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch feature flag' });
  }
});

// Create or update a feature flag
router.post('/feature-flags/:flagName', authenticate, requireAdmin, async (req, res) => {
  try {
    const { flagName } = req.params;
    const { enabled, value, description } = req.body;
    const flagKey = `feature_${flagName}`;

    if (enabled === undefined && value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Either "enabled" (boolean) or "value" (string) must be provided'
      });
    }

    const flagValue = enabled !== undefined ? (enabled ? 'true' : 'false') : value;

    const flag = await prisma.premiumSettings.upsert({
      where: { key: flagKey },
      update: {
        value: flagValue,
        updatedBy: req.user.id
      },
      create: {
        key: flagKey,
        value: flagValue,
        updatedBy: req.user.id
      }
    });

    res.json({
      success: true,
      message: 'Feature flag updated successfully',
      flag: {
        name: flagName,
        enabled: flag.value === 'true' || flag.value === '1',
        value: flag.value,
        updatedAt: flag.updatedAt,
        updatedBy: flag.updatedBy
      }
    });
  } catch (error) {
    console.error('Update feature flag error:', error);
    res.status(500).json({ success: false, message: 'Failed to update feature flag' });
  }
});

// Toggle a feature flag
router.patch('/feature-flags/:flagName/toggle', authenticate, requireAdmin, async (req, res) => {
  try {
    const { flagName } = req.params;
    const flagKey = `feature_${flagName}`;

    const existingFlag = await prisma.premiumSettings.findUnique({
      where: { key: flagKey }
    });

    const newValue = existingFlag
      ? (existingFlag.value === 'true' || existingFlag.value === '1' ? 'false' : 'true')
      : 'true';

    const flag = await prisma.premiumSettings.upsert({
      where: { key: flagKey },
      update: {
        value: newValue,
        updatedBy: req.user.id
      },
      create: {
        key: flagKey,
        value: newValue,
        updatedBy: req.user.id
      }
    });

    res.json({
      success: true,
      message: `Feature flag ${newValue === 'true' ? 'enabled' : 'disabled'}`,
      flag: {
        name: flagName,
        enabled: flag.value === 'true' || flag.value === '1',
        value: flag.value,
        updatedAt: flag.updatedAt,
        updatedBy: flag.updatedBy
      }
    });
  } catch (error) {
    console.error('Toggle feature flag error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle feature flag' });
  }
});

// Delete a feature flag
router.delete('/feature-flags/:flagName', authenticate, requireAdmin, async (req, res) => {
  try {
    const { flagName } = req.params;
    const flagKey = `feature_${flagName}`;

    const flag = await prisma.premiumSettings.findUnique({
      where: { key: flagKey }
    });

    if (!flag) {
      return res.status(404).json({ success: false, message: 'Feature flag not found' });
    }

    await prisma.premiumSettings.delete({
      where: { key: flagKey }
    });

    res.json({
      success: true,
      message: 'Feature flag deleted successfully'
    });
  } catch (error) {
    console.error('Delete feature flag error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete feature flag' });
  }
});

// Bulk update feature flags
router.post('/feature-flags/bulk', authenticate, requireAdmin, async (req, res) => {
  try {
    const { flags } = req.body;

    if (!flags || typeof flags !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Flags object required. Format: { "flagName": { "enabled": true } }'
      });
    }

    const updates = Object.entries(flags).map(([flagName, config]) => {
      const flagKey = `feature_${flagName}`;
      const flagValue = config.enabled !== undefined
        ? (config.enabled ? 'true' : 'false')
        : config.value || 'false';

      return prisma.premiumSettings.upsert({
        where: { key: flagKey },
        update: {
          value: flagValue,
          updatedBy: req.user.id
        },
        create: {
          key: flagKey,
          value: flagValue,
          updatedBy: req.user.id
        }
      });
    });

    await Promise.all(updates);

    res.json({
      success: true,
      message: `Updated ${updates.length} feature flag(s)`,
      updatedCount: updates.length
    });
  } catch (error) {
    console.error('Bulk update feature flags error:', error);
    res.status(500).json({ success: false, message: 'Failed to bulk update feature flags' });
  }
});

// Get feature flag usage statistics
router.get('/feature-flags/:flagName/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const { flagName } = req.params;
    const flagKey = `feature_${flagName}`;

    const flag = await prisma.premiumSettings.findUnique({
      where: { key: flagKey }
    });

    if (!flag) {
      return res.status(404).json({ success: false, message: 'Feature flag not found' });
    }

    // Return basic stats (can be enhanced with actual usage tracking)
    res.json({
      success: true,
      stats: {
        flagName,
        enabled: flag.value === 'true' || flag.value === '1',
        createdAt: flag.createdAt || null,
        updatedAt: flag.updatedAt,
        updatedBy: flag.updatedBy,
        // Placeholder for future usage tracking
        usageCount: 0,
        lastUsedAt: null
      }
    });
  } catch (error) {
    console.error('Get feature flag stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch feature flag statistics' });
  }
});

// Clear server cache
router.post('/cache/clear', async (req, res) => {
  try {
    const { clearCache } = require('../middleware/cache');
    const { clearAdsCache } = require('../utils/redis-helpers');
    const { pattern } = req.body || {};
    
    let result;
    if (pattern && pattern !== '*' && pattern !== 'all') {
      result = await clearCache(pattern);
      res.json({
        success: true,
        message: `Cache cleared for pattern: ${pattern}`,
        keysDeleted: result
      });
    } else {
      result = await clearCache('all');
      // Also clear in-memory ad rank cache if any
      try { await clearAdsCache(); } catch (_) {}
      res.json({
        success: true,
        message: 'All server cache cleared successfully',
        keysDeleted: result
      });
    }
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to clear cache',
      error: error.message 
    });
  }
});

// Get cache stats
router.get('/cache/stats', async (req, res) => {
  try {
    const { getCacheSize, getCacheKeys } = require('../middleware/cache');
    const { isAvailable } = require('../config/redis');
    
    const size = await getCacheSize();
    const keys = await getCacheKeys('*');
    const keysList = Array.isArray(keys) ? keys : [];
    
    res.json({
      success: true,
      redisAvailable: isAvailable(),
      stats: {
        size,
        totalKeys: keysList.length,
        keys: keysList.slice(0, 50)
      }
    });
  } catch (error) {
    console.error('Get cache stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get cache stats' 
    });
  }
});

// Ad ranking + rotation config (Business Basic/Pro/Enterprise)
const { getRankConfig, updateRankConfig, invalidateRankConfigCache } = require('../services/adRankConfigService');
const { runRotationCycle } = require('../services/adRotationService');

router.get('/rank-config', async (req, res) => {
  try {
    const config = await getRankConfig();
    res.json({ success: true, config });
  } catch (error) {
    console.error('Get rank config error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch rank config' });
  }
});

router.put('/rank-config',
  [
    body('featuredDurationDays').optional().isInt({ min: 1, max: 90 }),
    body('bumpDurationDays').optional().isInt({ min: 1, max: 30 }),
    body('rotationIntervalHours').optional().isFloat({ min: 0.5, max: 24 }),
    body('proSearchPercent').optional().isInt({ min: 0, max: 100 }),
    body('enterpriseSearchPercent').optional().isInt({ min: 0, max: 100 }),
    body('basicSearchPercent').optional().isInt({ min: 0, max: 100 }),
    body('boostLimits').optional().isObject(),
    body('disableRotation').optional().isBoolean(),
    body('manualPriorityOverrides').optional().isObject()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      const updates = { ...req.body };
      delete updates.updatedAt;
      delete updates.updatedBy;
      const config = await updateRankConfig(updates, req.user?.id);
      invalidateRankConfigCache();
      res.json({ success: true, config });
    } catch (error) {
      console.error('Update rank config error:', error);
      res.status(500).json({ success: false, message: 'Failed to update rank config' });
    }
  }
);

router.post('/rank-config/rotate-now', async (req, res) => {
  try {
    const result = await runRotationCycle();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Run rotation error:', error);
    res.status(500).json({ success: false, message: 'Failed to run rotation' });
  }
});

module.exports = router;

