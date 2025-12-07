const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { areUsersBlocked } = require('../middleware/blockCheck');

const router = express.Router();
const prisma = new PrismaClient();

// Follow a user
router.post('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.user.id;

    // Check if trying to follow themselves
    if (followerId === userId) {
      return res.status(400).json({ success: false, message: 'You cannot follow yourself' });
    }

    // Check if users are blocked
    const isBlocked = await areUsersBlocked(followerId, userId);
    if (isBlocked) {
      return res.status(403).json({ success: false, message: 'You cannot follow this user', blocked: true });
    }

    // Check if user exists
    const userToFollow = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userToFollow) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: userId
        }
      }
    });

    if (existingFollow) {
      return res.status(400).json({ success: false, message: 'Already following this user' });
    }

    // Create follow relationship
    const follow = await prisma.follow.create({
      data: {
        followerId,
        followingId: userId
      }
    });

    // Create notification for the followed user
    try {
      await prisma.notification.create({
        data: {
          userId: userId,
          type: 'FOLLOW',
          title: 'New Follower',
          message: `${req.user.name || 'Someone'} started following you`,
          link: `/profile/${followerId}`
        }
      });
    } catch (notifError) {
      console.error('Notification creation error:', notifError);
      // Don't fail the follow if notification fails
    }

    res.json({ success: true, follow });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ success: false, message: 'Failed to follow user' });
  }
});

// Unfollow a user
router.delete('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.user.id;

    // Delete follow relationship
    const deletedFollow = await prisma.follow.deleteMany({
      where: {
        followerId,
        followingId: userId
      }
    });

    if (deletedFollow.count === 0) {
      return res.status(404).json({ success: false, message: 'Follow relationship not found' });
    }

    res.json({ success: true, message: 'Unfollowed successfully' });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ success: false, message: 'Failed to unfollow user' });
  }
});

// Check if following a user
router.get('/check/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.user.id;

    const isFollowing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: userId
        }
      }
    });

    res.json({ success: true, isFollowing: !!isFollowing });
  } catch (error) {
    console.error('Check following error:', error);
    res.status(500).json({ success: false, message: 'Failed to check following status' });
  }
});

// Get user's followers
router.get('/followers/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [followers, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followingId: userId },
        include: {
          follower: {
            select: {
              id: true,
              name: true,
              avatar: true,
              bio: true,
              isVerified: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.follow.count({
        where: { followingId: userId }
      })
    ]);

    res.json({
      success: true,
      followers: followers.map(f => f.follower),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch followers' });
  }
});

// Get user's following
router.get('/following/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [following, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: userId },
        include: {
          following: {
            select: {
              id: true,
              name: true,
              avatar: true,
              bio: true,
              isVerified: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.follow.count({
        where: { followerId: userId }
      })
    ]);

    res.json({
      success: true,
      following: following.map(f => f.following),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch following' });
  }
});

// Get follower and following counts for a user
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const [followersCount, followingCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } })
    ]);

    res.json({
      success: true,
      stats: {
        followers: followersCount,
        following: followingCount
      }
    });
  } catch (error) {
    console.error('Get follow stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch follow stats' });
  }
});

module.exports = router;

