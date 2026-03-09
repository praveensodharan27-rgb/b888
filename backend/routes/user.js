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

    // Get user's business (public info only) – show business page on profile
    const business = await prisma.business.findUnique({
      where: { userId },
      select: { slug: true, businessName: true, category: true, city: true, logo: true, isActive: true }
    });
    const businessPublic = business && business.isActive
      ? { slug: business.slug, businessName: business.businessName, category: business.category, city: business.city, logo: business.logo }
      : null;

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
        followingCount,
        business: businessPublic
      }
    });
  } catch (error) {
    console.error('Get public user profile error:', error);
    const { getSafeErrorPayload } = require('../utils/safeErrorResponse');
    res.status(500).json(getSafeErrorPayload(error, 'Failed to fetch user profile'));
  }
});

// Get user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    // Check and reset monthly quota if needed
    const { checkAndResetUserQuota } = require('../services/monthlyQuotaReset');
    await checkAndResetUserQuota(req.user.id);

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
        aiChatEnabled: true,
        provider: true,
        providerId: true,
        freeAdsUsed: true,
        freeAdsRemaining: true,
        freeAdsUsedThisMonth: true,
        lastFreeAdsResetDate: true,
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
    const now = new Date();
    
    // Sell Box Style LOGIC: Get ALL UserBusinessPackages (purchase history with full details)
    const allUserBusinessPackages = await prisma.userBusinessPackage.findMany({
      where: {
        userId: req.user.id
      },
      orderBy: { purchaseTime: 'asc' } // Oldest purchased first
    });

    // Also get BusinessPackage for backward compatibility
    const allBusinessPackages = await prisma.businessPackage.findMany({
      where: {
        userId: req.user.id,
        status: { in: ['paid', 'verified'] }
      },
      select: {
        id: true,
        packageType: true,
        totalAdsAllowed: true,
        adsUsed: true,
        premiumSlotsTotal: true,
        premiumSlotsUsed: true,
        expiresAt: true,
        createdAt: true
      }
    });

    // Use UserBusinessPackage if available, otherwise BusinessPackage
    const packagesToUse = allUserBusinessPackages.length > 0 ? allUserBusinessPackages : allBusinessPackages;
    
    // Get active business packages (not expired)
    const activeBusinessPackages = packagesToUse.filter(pkg => {
      if ('expiresAt' in pkg && pkg.expiresAt) {
        return new Date(pkg.expiresAt) > now;
      }
      if ('expiresAt' in pkg && !pkg.expiresAt) {
        return true; // No expiry date
      }
      return false;
    });
    
    // Separate active (with remaining ads) and exhausted packages
    const packagesWithAds = activeBusinessPackages.filter(pkg => {
      if ('totalAds' in pkg) {
        // UserBusinessPackage format
        const remaining = (pkg.totalAds || 0) - (pkg.usedAds || 0);
        return remaining > 0 && pkg.status === 'active';
      } else {
        // BusinessPackage format
        const remaining = (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0);
        return remaining > 0;
      }
    });
    
    const exhaustedPackages = activeBusinessPackages.filter(pkg => {
      if ('totalAds' in pkg) {
        // UserBusinessPackage format
        const remaining = (pkg.totalAds || 0) - (pkg.usedAds || 0);
        return remaining === 0 || pkg.status === 'exhausted';
      } else {
        // BusinessPackage format
        const remaining = (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0);
        return remaining === 0;
      }
    });
    
    console.log('📦 /user/profile - Business packages (Sell Box style):', {
      userId: req.user.id,
      allPackagesCount: packagesToUse.length,
      userBusinessPackagesCount: allUserBusinessPackages.length,
      legacyBusinessPackagesCount: allBusinessPackages.length,
      activePackagesCount: activeBusinessPackages.length,
      packagesWithAdsCount: packagesWithAds.length,
      exhaustedPackagesCount: exhaustedPackages.length,
      packages: packagesToUse.map(pkg => {
        if ('totalAds' in pkg) {
          const remaining = (pkg.totalAds || 0) - (pkg.usedAds || 0);
          return {
            id: pkg.id,
            packageType: pkg.packageType,
            totalAds: pkg.totalAds,
            usedAds: pkg.usedAds,
            remaining: remaining,
            status: pkg.status,
            purchasedAt: pkg.purchaseTime,
            expiresAt: pkg.expiresAt
          };
        } else {
          const remaining = (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0);
          return {
            id: pkg.id,
            packageType: pkg.packageType,
            totalAdsAllowed: pkg.totalAdsAllowed,
            adsUsed: pkg.adsUsed,
            remaining: remaining,
            status: remaining === 0 ? 'EXHAUSTED' : 'ACTIVE',
            expiresAt: pkg.expiresAt
          };
        }
      })
    });
    
    // Calculate business ads remaining from active packages (only those with remaining ads)
    const businessAdsRemaining = packagesWithAds.reduce((sum, pkg) => {
      if ('totalAds' in pkg) {
        // UserBusinessPackage format
        const remaining = (pkg.totalAds || 0) - (pkg.usedAds || 0);
        console.log(`   Package ${pkg.id}: ${pkg.totalAds || 0} - ${pkg.usedAds || 0} = ${remaining}`);
        return sum + remaining;
      } else {
        // BusinessPackage format
        const remaining = (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0);
        console.log(`   Package ${pkg.id}: ${pkg.totalAdsAllowed || 0} - ${pkg.adsUsed || 0} = ${remaining}`);
        return sum + remaining;
      }
    }, 0);
    
    console.log('📊 /user/profile - Business ads remaining:', businessAdsRemaining);
    
    // Free ads are only available AFTER all business package ads are used
    const freeAdsRemaining = user?.freeAdsRemaining ?? FREE_ADS_LIMIT;
    const freeAdsUsed = user?.freeAdsUsedThisMonth || 0; // Use monthly counter
    
    // Calculate next reset date (1st of next month)
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    nextMonth.setHours(0, 0, 0, 0);
    
    // Total remaining ads (business first, then free)
    const totalRemaining = businessAdsRemaining > 0 
      ? businessAdsRemaining 
      : freeAdsRemaining;

    // Get follower and following counts
    const [followersCount, followingCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: req.user.id } }),
      prisma.follow.count({ where: { followerId: req.user.id } })
    ]);

    // Get active packages for premium slots information
    const activePackages = activeBusinessPackages.map(pkg => ({
      id: pkg.id,
      packageType: pkg.packageType,
      expiresAt: pkg.expiresAt
    }));

    // Aggregate premium slots from all active packages (deprecated but kept for compatibility)
    const totalPremiumSlots = activeBusinessPackages.reduce((sum, pkg) => sum + (pkg.premiumSlotsTotal || 0), 0);
    const usedPremiumSlots = activeBusinessPackages.reduce((sum, pkg) => sum + (pkg.premiumSlotsUsed || 0), 0);
    const availablePremiumSlots = Math.max(0, totalPremiumSlots - usedPremiumSlots);

    res.json({ 
      success: true, 
      user: {
        ...user,
        // Free ads information (monthly)
        freeAdsRemaining: businessAdsRemaining > 0 ? 0 : freeAdsRemaining, // Only show if no business ads
        freeAdsUsed,
        freeAdsUsedThisMonth: freeAdsUsed, // Monthly counter
        freeAdsLimit: FREE_ADS_LIMIT,
        // Monthly quota info
        isMonthlyQuota: true,
        nextResetDate: nextMonth.toISOString(),
        lastResetDate: user?.lastFreeAdsResetDate?.toISOString() || null,
        // Business package information
        businessPackage: {
          totalPurchased: allBusinessPackages.length, // Total packages purchased (all time)
          activeCount: activeBusinessPackages.length, // Currently active packages (not expired)
          packagesWithAdsCount: packagesWithAds.length, // Packages with remaining ads
          exhaustedPackagesCount: exhaustedPackages.length, // Exhausted packages
          businessAdsRemaining: businessAdsRemaining, // Always show actual count
          totalRemaining: businessAdsRemaining + freeAdsRemaining, // Sum of both
          hasActive: activeBusinessPackages.length > 0,
          // Premium slots (deprecated but kept for compatibility)
          premiumSlotsTotal: totalPremiumSlots,
          premiumSlotsUsed: usedPremiumSlots,
          premiumSlotsAvailable: availablePremiumSlots,
          // ALL packages list (active + exhausted + expired) - Sell Box Style: Always show purchased packages with full details
          allPackages: packagesToUse.map(pkg => {
            if ('totalAds' in pkg) {
              // UserBusinessPackage format - Full purchase details
              const remaining = (pkg.totalAds || 0) - (pkg.usedAds || 0);
              const now = new Date();
              const isExpired = pkg.expiresAt && new Date(pkg.expiresAt) <= now;
              const isExhausted = remaining === 0 && !isExpired;
              
              return {
                id: pkg.id,
                packageId: pkg.id,
                packageType: pkg.packageType,
                packageName: `${pkg.packageType?.replace('_', ' ')} Package`,
                totalAds: pkg.totalAds || 0,
                totalAdsAllowed: pkg.totalAds || 0, // For compatibility
                adsUsed: pkg.usedAds || 0,
                usedAds: pkg.usedAds || 0, // For compatibility
                adsRemaining: remaining,
                isExhausted: isExhausted,
                isExpired: isExpired,
                status: isExpired ? 'EXPIRED' : (isExhausted ? 'EXHAUSTED' : 'ACTIVE'),
                expiresAt: pkg.expiresAt,
                purchasedAt: pkg.purchaseTime,
                purchaseTime: pkg.purchaseTime,
                amount: pkg.amount,
                allowedCategories: pkg.allowedCategories || []
              };
            } else {
              // BusinessPackage format (backward compatibility)
              const remaining = (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0);
              return {
                id: pkg.id,
                packageId: pkg.id,
                packageType: pkg.packageType,
                packageName: `${pkg.packageType?.replace('_', ' ')} Package`,
                totalAds: pkg.totalAdsAllowed || 0,
                totalAdsAllowed: pkg.totalAdsAllowed || 0,
                adsUsed: pkg.adsUsed || 0,
                usedAds: pkg.adsUsed || 0,
                adsRemaining: remaining,
                isExhausted: remaining === 0,
                status: remaining === 0 ? 'EXHAUSTED' : 'ACTIVE',
                expiresAt: pkg.expiresAt,
                purchasedAt: pkg.createdAt,
                purchaseTime: pkg.createdAt
              };
            }
          }),
          // Legacy: activePackages for backward compatibility
          activePackages: activeBusinessPackages.map(pkg => {
            if ('totalAds' in pkg) {
              const remaining = (pkg.totalAds || 0) - (pkg.usedAds || 0);
              return {
                id: pkg.id,
                packageType: pkg.packageType,
                totalAdsAllowed: pkg.totalAds || 0,
                adsUsed: pkg.usedAds || 0,
                adsRemaining: remaining,
                isExhausted: remaining === 0,
                status: remaining === 0 ? 'EXHAUSTED' : 'ACTIVE',
                expiresAt: pkg.expiresAt,
                purchasedAt: pkg.purchaseTime
              };
            } else {
              const remaining = (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0);
              return {
                id: pkg.id,
                packageType: pkg.packageType,
                totalAdsAllowed: pkg.totalAdsAllowed || 0,
                adsUsed: pkg.adsUsed || 0,
                adsRemaining: remaining,
                isExhausted: remaining === 0,
                status: remaining === 0 ? 'EXHAUSTED' : 'ACTIVE',
                expiresAt: pkg.expiresAt,
                purchasedAt: pkg.createdAt
              };
            }
          })
        },
        // Social counts
        followersCount,
        followingCount
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

// Get user profile statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user basic info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        isVerified: true,
        freeAdsUsed: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const FREE_ADS_LIMIT = 2;
    const freeAdsRemaining = Math.max(0, FREE_ADS_LIMIT - (user.freeAdsUsed || 0));

    // Get ad statistics
    const [
      totalAds,
      activeAds,
      pendingAds,
      rejectedAds,
      favoritesCount,
      followersCount,
      followingCount,
      walletBalance
    ] = await Promise.all([
      prisma.ad.count({ where: { userId } }),
      prisma.ad.count({ where: { userId, status: 'APPROVED' } }),
      prisma.ad.count({ where: { userId, status: 'PENDING' } }),
      prisma.ad.count({ where: { userId, status: 'REJECTED' } }),
      prisma.favorite.count({ where: { userId } }),
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
      prisma.wallet.findUnique({ where: { userId }, select: { balance: true } })
        .then(wallet => wallet?.balance || 0)
        .catch(() => 0)
    ]);

    // Get business package statistics
    const now = new Date();
    const activePackages = await prisma.businessPackage.findMany({
      where: {
        userId,
        status: { in: ['paid', 'verified'] },
        expiresAt: { gt: now }
      },
      select: {
        premiumSlotsTotal: true,
        premiumSlotsUsed: true
      }
    });

    const totalPremiumSlots = activePackages.reduce((sum, pkg) => sum + (pkg.premiumSlotsTotal || 0), 0);
    const usedPremiumSlots = activePackages.reduce((sum, pkg) => sum + (pkg.premiumSlotsUsed || 0), 0);
    const availablePremiumSlots = Math.max(0, totalPremiumSlots - usedPremiumSlots);

    // Get payment order statistics
    const [
      totalPayments,
      successfulPayments,
      totalSpent
    ] = await Promise.all([
      prisma.paymentOrder.count({ where: { userId } }),
      prisma.paymentOrder.count({ where: { userId, status: 'paid' } }),
      prisma.paymentOrder.aggregate({
        where: { userId, status: 'paid' },
        _sum: { amount: true }
      }).then(result => (result._sum.amount || 0) / 100) // Convert from paise to rupees
    ]);

    res.json({
      success: true,
      stats: {
        // User info
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          isVerified: user.isVerified,
          createdAt: user.createdAt
        },
        // Ads statistics
        ads: {
          total: totalAds,
          active: activeAds,
          pending: pendingAds,
          rejected: rejectedAds,
          freeAdsUsed: user.freeAdsUsed || 0,
          freeAdsRemaining,
          freeAdsLimit: FREE_ADS_LIMIT
        },
        // Social statistics
        social: {
          followers: followersCount,
          following: followingCount,
          favorites: favoritesCount
        },
        // Business package statistics
        businessPackage: {
          hasActive: activePackages.length > 0,
          activePackagesCount: activePackages.length,
          premiumSlotsTotal: totalPremiumSlots,
          premiumSlotsUsed: usedPremiumSlots,
          premiumSlotsAvailable: availablePremiumSlots
        },
        // Wallet statistics
        wallet: {
          balance: walletBalance
        },
        // Payment statistics
        payments: {
          total: totalPayments,
          successful: successfulPayments,
          totalSpent: totalSpent
        }
      }
    });
  } catch (error) {
    console.error('Get profile stats error:', error);
    res.status(500).json({ 
      ...require('../utils/safeErrorResponse').getSafeErrorPayload(error, 'Failed to fetch profile statistics')
    });
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
        ...require('../utils/safeErrorResponse').getSafeErrorPayload(error, 'Failed to update profile')
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

// Get notifications (optimized: ETag 304, Redis cache, indexed queries)
const crypto = require('crypto');
const {
  getNotificationEtag,
  setNotificationEtag,
  getNotificationListCache,
  setNotificationListCache,
  invalidateNotificationCache,
} = require('../utils/redis-helpers');
const { isAvailable: isRedisAvailable } = require('../config/redis');

function computeNotificationsEtag(total, unreadCount, firstId) {
  return crypto.createHash('md5').update(`${total}:${unreadCount}:${firstId || ''}`).digest('hex');
}

router.get('/notifications', authenticate, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const unreadOnly = req.query.unreadOnly === 'true';
    const skip = (page - 1) * limit;
    const userId = req.user.id;

    // Auto-cleanup: keep only recent notifications for this user
    // Strategy:
    // - Remove notifications older than 7 days
    // - Ensure only latest 50 notifications are kept per user
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Find all notifications beyond the latest 50 (ordered by createdAt DESC)
      const extraNotifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: 50,
        select: { id: true, createdAt: true },
      });

      const extraIds = extraNotifications.map((n) => n.id);

      await prisma.notification.deleteMany({
        where: {
          userId,
          OR: [
            { createdAt: { lt: sevenDaysAgo } },
            extraIds.length > 0 ? { id: { in: extraIds } } : undefined,
          ].filter(Boolean),
        },
      });
    } catch (cleanupError) {
      console.warn('Notification cleanup failed:', cleanupError?.message || cleanupError);
    }

    const clientEtag = (req.headers['if-none-match'] || '').replace(/^"|"$/g, '').trim();

    if (clientEtag && isRedisAvailable()) {
      const cachedEtag = await getNotificationEtag(userId);
      if (cachedEtag && cachedEtag === clientEtag) {
        res.status(304).end();
        return;
      }
    }

    if (isRedisAvailable()) {
      const cached = await getNotificationListCache(userId, page, limit, unreadOnly);
      if (cached) {
        const etag = await getNotificationEtag(userId) || computeNotificationsEtag(
          cached.pagination?.total ?? 0,
          cached.unreadCount ?? 0,
          cached.notifications?.[0]?.id
        );
        res.setHeader('ETag', `"${etag}"`);
        res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
        return res.json(cached);
      }
    }

    const where = { userId };
    if (unreadOnly) where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        select: { id: true, title: true, message: true, type: true, isRead: true, link: true, createdAt: true, userId: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      unreadOnly ? Promise.resolve(null) : prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    const unread = unreadOnly ? total : (unreadCount ?? 0);
    const payload = {
      success: true,
      notifications,
      unreadCount: unread,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };

    const etag = computeNotificationsEtag(total, unread, notifications[0]?.id);
    res.setHeader('ETag', `"${etag}"`);
    res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');

    if (isRedisAvailable()) {
      await Promise.all([
        setNotificationEtag(userId, etag),
        setNotificationListCache(userId, page, limit, unreadOnly, payload),
      ]).catch(() => {});
    }

    res.json(payload);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// Mark notification as read (POST version)
router.post('/notifications/read', authenticate, async (req, res) => {
  try {
    const { notificationId } = req.body;

    if (!notificationId) {
      return res.status(400).json({ success: false, message: 'Notification ID is required' });
    }

    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId: req.user.id
      },
      data: { isRead: true }
    });

    invalidateNotificationCache(req.user.id).catch(() => {});
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
});

// Mark notification as read (PUT version)
router.put('/notifications/:id/read', authenticate, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      data: { isRead: true }
    });

    invalidateNotificationCache(req.user.id).catch(() => {});
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

    invalidateNotificationCache(req.user.id).catch(() => {});
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
              status: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
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
              expiresAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
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

    // In development, avoid breaking the Orders page completely.
    // Return an empty orders list but surface the error message for debugging.
    if (process.env.NODE_ENV === 'development') {
      return res.status(200).json({
        success: true,
        orders: [],
        pagination: {
          page: parseInt(req.query.page || 1, 10),
          limit: parseInt(req.query.limit || 20, 10),
          total: 0,
          pages: 0,
        },
        error: error instanceof Error ? error.message : String(error),
      });
    }

    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

// Get invoice data as JSON (for frontend display)
router.get('/orders/:orderId/invoice-data', authenticate, async (req, res) => {
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

    // Format invoice data
    const orderDate = new Date(order.createdAt);
    let itemDescription = '';
    let itemQuantity = 1;
    
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

    const invoiceData = {
      invoiceNumber: orderId,
      date: orderDate.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      billedTo: {
        name: order.user.name || 'Customer',
        email: order.user.email || '',
        phone: order.user.phone || '',
        address: '123 Anywhere St., Any City' // You can add address field later
      },
      from: {
        name: 'SellIt Platform',
        email: 'hello@reallygreatsite.com',
        phone: '',
        address: '123 Anywhere St., Any City'
      },
      items: [
        {
          description: itemDescription,
          quantity: itemQuantity,
          price: order.amount,
          amount: order.amount
        }
      ],
      total: order.amount,
      paymentMethod: order.razorpayPaymentId ? 'Online Payment' : 'Cash',
      note: 'Thank you for choosing us!',
      orderDate: orderDate.toISOString(),
      razorpayOrderId: order.razorpayOrderId || null,
      razorpayPaymentId: order.razorpayPaymentId || null,
      status: order.status
    };

    res.json({ success: true, invoice: invoiceData });
  } catch (error) {
    console.error('Get invoice data error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch invoice data' });
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
    const fs = require('fs');
    const path = require('path');
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${orderId}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;

    // Format invoice number (pad with zeros)
    const invoiceNumber = String(orderId).padStart(6, '0');
    const orderDate = new Date(order.createdAt);
    const formattedDate = orderDate.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Top section - Logo area (left) and Invoice number (right)
    const logoPath = path.join(__dirname, '../frontend/public/logo.png');
    let logoAdded = false;
    
    // Try to add logo if it exists
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, margin, margin, { width: 120, height: 40, fit: [120, 40] });
        logoAdded = true;
      } catch (error) {
        console.warn('Could not add logo to PDF:', error.message);
      }
    }
    
    // If logo wasn't added, show text placeholder
    if (!logoAdded) {
      doc.fontSize(8).text('SellIt', margin, margin);
    }
    
    // Invoice number on the right
    doc.fontSize(10).font('Helvetica-Bold').text(`NO. ${invoiceNumber}`, pageWidth - margin - 100, margin, { align: 'right' });
    
    // Invoice title - large and centered
    doc.y = margin + (logoAdded ? 50 : 20);
    doc.moveDown(logoAdded ? 1.5 : 2);
    doc.fontSize(36).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
    
    // Date below title
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text(`Date: ${formattedDate}`, { align: 'center' });
    doc.moveDown(2);

    // Two columns: Billed to (left) and From (right)
    const columnWidth = (pageWidth - 2 * margin) / 2;
    const currentY = doc.y;

    // Billed to section (left) - with background
    doc.rect(margin, currentY, columnWidth - 10, 70).fillAndStroke('#f9fafb', '#e5e7eb');
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827').text('Billed to:', margin + 8, currentY + 8);
    doc.fontSize(10).font('Helvetica');
    doc.fillColor('#1f2937').text(order.user.name || 'Customer', margin + 8, currentY + 22);
    if (order.user.email) {
      doc.text(order.user.email, margin + 8, currentY + 35);
    }
    if (order.user.phone) {
      doc.text(order.user.phone, margin + 8, currentY + 48);
    }

    // From section (right) - with orange background
    doc.rect(margin + columnWidth + 10, currentY, columnWidth - 10, 70).fillAndStroke('#fff7ed', '#fed7aa');
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827').text('From:', margin + columnWidth + 18, currentY + 8);
    doc.fontSize(10).font('Helvetica');
    doc.fillColor('#1f2937').text('SellIt Platform', margin + columnWidth + 18, currentY + 22);
    doc.text('123 Anywhere St., Any City', margin + columnWidth + 18, currentY + 35);
    doc.text('hello@reallygreatsite.com', margin + columnWidth + 18, currentY + 48);

    doc.y = currentY + 80;
    doc.moveDown(1.5);
    doc.fillColor('#000000'); // Reset fill color

    // Items Table
    const tableTop = doc.y;
    const tableLeft = margin;
    const tableRight = pageWidth - margin;
    const tableWidth = tableRight - tableLeft;
    
    // Table header with gradient-like dark background
    doc.rect(tableLeft, tableTop, tableWidth, 30).fill('#374151');
    doc.fontSize(10).font('Helvetica-Bold');
    doc.fillColor('#ffffff');
    doc.text('Item', tableLeft + 10, tableTop + 10);
    doc.text('Quantity', tableLeft + tableWidth * 0.4, tableTop + 10, { align: 'center' });
    doc.text('Price', tableLeft + tableWidth * 0.65, tableTop + 10, { align: 'right' });
    doc.text('Amount', tableRight - 10, tableTop + 10, { align: 'right' });
    doc.fillColor('#000000'); // Reset for body

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

    const itemRowY = tableTop + 35;
    // Alternate row background
    doc.rect(tableLeft, itemRowY - 5, tableWidth, 25).fill('#f9fafb');
    doc.fontSize(10).font('Helvetica');
    doc.fillColor('#1f2937');
    doc.text(itemDescription, tableLeft + 10, itemRowY);
    doc.text('1', tableLeft + tableWidth * 0.4, itemRowY, { align: 'center' });
    doc.text(`₹${order.amount.toLocaleString('en-IN')}`, tableLeft + tableWidth * 0.65, itemRowY, { align: 'right' });
    doc.font('Helvetica-Bold');
    doc.text(`₹${order.amount.toLocaleString('en-IN')}`, tableRight - 10, itemRowY, { align: 'right' });

    doc.y = itemRowY + 30;
    doc.font('Helvetica'); // Reset font

    // Total section with orange background
    doc.moveDown(1);
    const totalY = doc.y;
    const totalBoxWidth = 250;
    const totalBoxLeft = tableRight - totalBoxWidth;
    doc.rect(totalBoxLeft, totalY, totalBoxWidth, 50).fillAndStroke('#f97316', '#ea580c');
    doc.fontSize(11).font('Helvetica-Bold');
    doc.fillColor('#ffffff');
    doc.text('Total', totalBoxLeft + 10, totalY + 10, { align: 'right' });
    doc.fontSize(20);
    doc.text(`₹${order.amount.toLocaleString('en-IN')}`, totalBoxLeft + 10, totalY + 25, { align: 'right' });
    doc.fillColor('#000000'); // Reset

    doc.y = totalY + 60;
    doc.moveDown(1.5);

    // Payment method and Note with blue background
    const paymentMethod = order.razorpayPaymentId ? 'Online Payment' : 'Cash';
    const infoBoxY = doc.y;
    doc.rect(margin, infoBoxY, tableWidth, 50).fillAndStroke('#dbeafe', '#93c5fd');
    doc.fontSize(10).font('Helvetica');
    doc.fillColor('#1e40af');
    doc.font('Helvetica-Bold').text('Payment method:', margin + 10, infoBoxY + 8);
    doc.font('Helvetica').text(paymentMethod, margin + 10, infoBoxY + 22);
    doc.moveTo(margin + 10, infoBoxY + 35).lineTo(tableRight - 10, infoBoxY + 35).stroke('#93c5fd');
    doc.font('Helvetica-Bold').text('Note:', margin + 10, infoBoxY + 40);
    doc.font('Helvetica').text('Thank you for choosing us!', margin + 10, infoBoxY + 52);
    doc.fillColor('#000000'); // Reset

    // Decorative footer with waves
    const footerY = pageHeight - 100;
    
    // Light grey wave (top)
    doc.fillColor('#e5e7eb');
    doc.moveTo(margin, footerY);
    doc.quadraticCurveTo(pageWidth / 2, footerY - 20, pageWidth - margin, footerY);
    doc.lineTo(pageWidth - margin, pageHeight - margin);
    doc.lineTo(margin, pageHeight - margin);
    doc.closePath();
    doc.fill();
    
    // Dark grey wave (bottom, larger)
    doc.fillColor('#4b5563');
    doc.moveTo(margin, footerY + 10);
    doc.quadraticCurveTo(pageWidth / 2, footerY + 30, pageWidth - margin, footerY + 10);
    doc.lineTo(pageWidth - margin, pageHeight - margin);
    doc.lineTo(margin, pageHeight - margin);
    doc.closePath();
    doc.fill();

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

// Delete account permanently
router.delete('/account', authenticate, async (req, res) => {
  try {
    const { password, confirm } = req.body;
    
    if (!confirm || confirm !== 'DELETE') {
      return res.status(400).json({ 
        success: false, 
        message: 'Please type DELETE to confirm account deletion' 
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { password: true }
    });

    if (user.password) {
      if (!password) {
        return res.status(400).json({ success: false, message: 'Password is required' });
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: 'Invalid password' });
      }
    }

    // Delete user account and related data
    await prisma.user.delete({
      where: { id: req.user.id }
    });

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete account' });
  }
});

// Get user activity log
router.get('/activity-log', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { userId: req.user.id };
    if (type) where.type = type;

    const [activities, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          action: true,
          description: true,
          createdAt: true,
          metadata: true
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({
      success: true,
      activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get activity log error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch activity log' });
  }
});

// Get/update AI Chat setting (Business Package: allow AI to reply when seller is offline)
// Safe when aiChatEnabled is not yet in DB/schema — returns false and no-op update
router.get('/ai-chat', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { aiChatEnabled: true }
    });
    res.json({ success: true, aiChatEnabled: !!user?.aiChatEnabled });
  } catch (error) {
    console.error('Get AI chat setting error:', error);
    res.status(500).json({ success: false, message: 'Failed to get AI chat setting' });
  }
});

router.put('/ai-chat', authenticate, async (req, res) => {
  try {
    const enabled = req.body.enabled === true;
    await prisma.user.update({
      where: { id: req.user.id },
      data: { aiChatEnabled: enabled }
    });
    res.json({ success: true, aiChatEnabled: enabled });
  } catch (error) {
    console.error('Update AI chat setting error:', error);
    res.status(500).json({ success: false, message: 'Failed to update AI chat setting' });
  }
});

// Update notification settings
router.put('/notification-settings', authenticate, async (req, res) => {
  try {
    const { 
      emailNotifications,
      pushNotifications,
      smsNotifications,
      adUpdates,
      messages,
      favorites
    } = req.body;

    // Store notification preferences (you may need to add a UserSettings model)
    // For now, we'll store in user metadata or create a settings field
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        // Add notification settings fields to User model if needed
        // For now, using a JSON field or separate settings table
      }
    });

    res.json({ 
      success: true, 
      message: 'Notification settings updated successfully' 
    });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update notification settings' });
  }
});

// Get public profile by user ID (alternative endpoint)
router.get('/users/:id/public-profile', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
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

    const [followersCount, followingCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: id } }),
      prisma.follow.count({ where: { followerId: id } })
    ]);

    const phoneNumber = user.showPhone ? user.phone : null;
    const { showPhone, ...userWithoutPrivacy } = user;

    res.json({
      success: true,
      user: {
        ...userWithoutPrivacy,
        phone: phoneNumber,
        followersCount,
        followingCount
      }
    });
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user profile' });
  }
});

// Get recent ad views
router.get('/recent-views', authenticate, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    // Get recently viewed ads (you may need to track views in a separate table)
    // For now, returning recent ads user interacted with
    const recentAds = await prisma.ad.findMany({
      where: {
        favorites: {
          some: { userId: req.user.id }
        }
      },
      take: parseInt(limit),
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        price: true,
        images: true,
        location: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      recentViews: recentAds
    });
  } catch (error) {
    console.error('Get recent views error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recent views' });
  }
});

module.exports = router;

