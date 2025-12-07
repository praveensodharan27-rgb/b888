const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

/**
 * Generate a unique referral code for a user
 * Format: First 3 letters of name (uppercase) + random 6 alphanumeric characters
 */
const generateReferralCode = async (name) => {
  let code;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  // Extract first 3 letters from name (uppercase, alphanumeric only)
  const namePart = name
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, 'X'); // Pad with X if name is too short

  while (!isUnique && attempts < maxAttempts) {
    // Generate random 6-character suffix
    const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 6);
    code = `${namePart}${randomPart}`;

    // Check if code already exists
    const existing = await prisma.user.findFirst({
      where: { referralCode: code },
      select: { id: true }
    });

    if (!existing) {
      isUnique = true;
    }

    attempts++;
  }

  // Fallback: if still not unique, use fully random code
  if (!isUnique) {
    code = crypto.randomBytes(6).toString('hex').toUpperCase();
  }

  return code;
};

/**
 * Process referral when a new user signs up
 * @param {string} referralCode - The referral code used
 * @param {string} newUserId - ID of the newly registered user
 * @returns {Promise<Object>} - Result of referral processing
 */
const processReferral = async (referralCode, newUserId) => {
  try {
    if (!referralCode || !newUserId) {
      return { success: false, message: 'Referral code and user ID are required' };
    }

    // Find the referrer by referral code
    const referrer = await prisma.user.findFirst({
      where: { referralCode: referralCode.toUpperCase() },
      select: {
        id: true,
        name: true,
        referralCode: true
      }
    });

    if (!referrer) {
      return { success: false, message: 'Invalid referral code' };
    }

    // Check if user is trying to refer themselves
    if (referrer.id === newUserId) {
      return { success: false, message: 'Cannot use your own referral code' };
    }

    // Check if user was already referred
    const existingReferral = await prisma.referral.findUnique({
      where: { referredUserId: newUserId }
    });

    if (existingReferral) {
      return { success: false, message: 'User already has a referral' };
    }

    // Get referral reward amount from environment or use default
    const referralReward = parseFloat(process.env.REFERRAL_REWARD_AMOUNT || '50'); // Default ₹50

    // Create referral record
    const referral = await prisma.referral.create({
      data: {
        referralCode: referralCode.toUpperCase(),
        referrerId: referrer.id,
        referredUserId: newUserId,
        rewardAmount: referralReward,
        status: 'pending'
      }
    });

    // Credit reward to referrer's wallet
    await creditReferralReward(referrer.id, referral.id, referralReward);

    // Update referral status to completed
    await prisma.referral.update({
      where: { id: referral.id },
      data: {
        status: 'completed',
        completedAt: new Date()
      }
    });

    // Update new user's referredBy field
    await prisma.user.update({
      where: { id: newUserId },
      data: { referredBy: referrer.id }
    });

    // Create notification for referrer
    await prisma.notification.create({
      data: {
        userId: referrer.id,
        title: '🎉 Referral Reward!',
        message: `You earned ₹${referralReward} for referring a new user!`,
        type: 'referral_reward',
        link: '/profile?tab=wallet'
      }
    });

    // Emit Socket.IO notification
    const { emitNotification } = require('../socket/socket');
    emitNotification(referrer.id, {
      title: '🎉 Referral Reward!',
      message: `You earned ₹${referralReward} for referring a new user!`,
      type: 'referral_reward',
      link: '/profile?tab=wallet',
      isRead: false,
      createdAt: new Date().toISOString()
    });

    console.log(`✅ Referral processed: ${referrer.name} referred new user, earned ₹${referralReward}`);

    return {
      success: true,
      referral,
      rewardAmount: referralReward,
      referrerName: referrer.name
    };
  } catch (error) {
    console.error('❌ Error processing referral:', error);
    return { success: false, message: error.message || 'Failed to process referral' };
  }
};

/**
 * Credit referral reward to referrer's wallet
 */
const creditReferralReward = async (userId, referralId, amount) => {
  try {
    // Get or create wallet
    let wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          balance: 0
        }
      });
    }

    // Update wallet balance
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          increment: amount
        }
      }
    });

    // Create transaction record
    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'CREDIT',
        amount,
        status: 'COMPLETED',
        description: `Referral reward for referring a new user`,
        referenceId: referralId,
        metadata: JSON.stringify({ type: 'referral_reward' })
      }
    });

    console.log(`✅ Credited ₹${amount} to wallet for user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error crediting referral reward:', error);
    throw error;
  }
};

/**
 * Get referral statistics for a user
 */
const getReferralStats = async (userId) => {
  try {
    const [referrals, totalEarnings, wallet] = await Promise.all([
      prisma.referral.findMany({
        where: { referrerId: userId },
        include: {
          referrer: {
            select: { name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.referral.aggregate({
        where: {
          referrerId: userId,
          status: 'completed'
        },
        _sum: {
          rewardAmount: true
        }
      }),
      prisma.wallet.findUnique({
        where: { userId },
        select: { balance: true }
      })
    ]);

    return {
      totalReferrals: referrals.length,
      completedReferrals: referrals.filter(r => r.status === 'completed').length,
      totalEarnings: totalEarnings._sum.rewardAmount || 0,
      walletBalance: wallet?.balance || 0,
      referrals: referrals.map(r => ({
        id: r.id,
        referredUserId: r.referredUserId,
        rewardAmount: r.rewardAmount,
        status: r.status,
        createdAt: r.createdAt,
        completedAt: r.completedAt
      }))
    };
  } catch (error) {
    console.error('Error getting referral stats:', error);
    throw error;
  }
};

module.exports = {
  generateReferralCode,
  processReferral,
  creditReferralReward,
  getReferralStats
};

