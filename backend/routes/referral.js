const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { getReferralStats } = require('../utils/referral');

const router = express.Router();
const prisma = new PrismaClient();

// Get user's referral code and stats
router.get('/my-referral', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        referralCode: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Generate referral code if user doesn't have one
    let referralCode = user.referralCode;
    if (!referralCode) {
      const { generateReferralCode } = require('../utils/referral');
      referralCode = await generateReferralCode(user.name, user.id);
      await prisma.user.update({
        where: { id: user.id },
        data: { referralCode }
      });
    }

    // Get referral statistics
    const stats = await getReferralStats(req.user.id);

    // Get referral reward amount from environment
    const referralReward = parseFloat(process.env.REFERRAL_REWARD_AMOUNT || '50');

    // Build referral link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const referralLink = `${frontendUrl}/register?ref=${referralCode}`;

    res.json({
      success: true,
      referralCode: referralCode,
      referralLink,
      rewardAmount: referralReward,
      stats: {
        totalReferrals: stats.totalReferrals,
        completedReferrals: stats.completedReferrals,
        totalEarnings: stats.totalEarnings,
        walletBalance: stats.walletBalance
      }
    });
  } catch (error) {
    console.error('Get referral info error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch referral information' });
  }
});

// Get referral history
router.get('/history', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [referrals, total] = await Promise.all([
      prisma.referral.findMany({
        where: { referrerId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        include: {
          referrer: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.referral.count({
        where: { referrerId: req.user.id }
      })
    ]);

    res.json({
      success: true,
      referrals: referrals.map(r => ({
        id: r.id,
        referralCode: r.referralCode,
        rewardAmount: r.rewardAmount,
        status: r.status,
        createdAt: r.createdAt,
        completedAt: r.completedAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get referral history error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch referral history' });
  }
});

module.exports = router;

