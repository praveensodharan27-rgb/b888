const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Middleware to check if users are blocked
 * Prevents interaction between blocked users
 */
async function checkNotBlocked(req, res, next) {
  try {
    const currentUserId = req.user?.id;
    const targetUserId = req.params.userId || req.body.receiverId || req.body.sellerId;

    // Skip check if no users to compare
    if (!currentUserId || !targetUserId) {
      return next();
    }

    // Check if either user has blocked the other
    const block = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: currentUserId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: currentUserId }
        ]
      }
    });

    if (block) {
      return res.status(403).json({ 
        success: false, 
        message: 'You cannot contact this user',
        blocked: true
      });
    }

    next();
  } catch (error) {
    console.error('Block check error:', error);
    // Don't fail the request, just log and continue
    next();
  }
}

/**
 * Helper function to check block status without middleware
 */
async function areUsersBlocked(userId1, userId2) {
  try {
    const block = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId1, blockedId: userId2 },
          { blockerId: userId2, blockedId: userId1 }
        ]
      }
    });
    return !!block;
  } catch (error) {
    console.error('Are users blocked check error:', error);
    return false;
  }
}

module.exports = { checkNotBlocked, areUsersBlocked };

