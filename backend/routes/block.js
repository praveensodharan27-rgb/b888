const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Helper function to check if users are blocked
async function areUsersBlocked(userId1, userId2) {
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: userId1, blockedId: userId2 },
        { blockerId: userId2, blockedId: userId1 }
      ]
    }
  });
  return !!block;
}

// Block a user
router.post('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const blockerId = req.user.id;

    // Check if blocking self
    if (blockerId === userId) {
      return res.status(400).json({ success: false, message: 'Cannot block yourself' });
    }

    // Check if already blocked
    const existingBlock = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId: userId
        }
      }
    });

    if (existingBlock) {
      return res.status(400).json({ success: false, message: 'User already blocked' });
    }

    // Transaction: Create block, reject pending requests, log audit
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create block record
      const block = await tx.block.create({
        data: {
          blockerId,
          blockedId: userId,
          reason
        }
      });

      // 2. Auto-reject all pending contact requests from blocked user
      await tx.contactRequest.updateMany({
        where: {
          OR: [
            { requesterId: userId, sellerId: blockerId, status: 'PENDING' },
            { requesterId: blockerId, sellerId: userId, status: 'PENDING' }
          ]
        },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date()
        }
      });

      // 3. Create audit log
      await tx.auditLog.create({
        data: {
          actorId: blockerId,
          targetId: userId,
          action: 'BLOCK',
          reason,
          metadata: {
            timestamp: new Date().toISOString()
          }
        }
      });

      return block;
    });

    res.json({ success: true, block: result });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ success: false, message: 'Failed to block user' });
  }
});

// Unblock a user
router.delete('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const blockerId = req.user.id;

    const block = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId: userId
        }
      }
    });

    if (!block) {
      return res.status(404).json({ success: false, message: 'Block not found' });
    }

    // Transaction: Delete block, log audit
    await prisma.$transaction(async (tx) => {
      // 1. Delete block
      await tx.block.delete({
        where: {
          blockerId_blockedId: {
            blockerId,
            blockedId: userId
          }
        }
      });

      // 2. Create audit log
      await tx.auditLog.create({
        data: {
          actorId: blockerId,
          targetId: userId,
          action: 'UNBLOCK',
          metadata: {
            timestamp: new Date().toISOString()
          }
        }
      });
    });

    res.json({ success: true, message: 'User unblocked successfully' });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ success: false, message: 'Failed to unblock user' });
  }
});

// Check if user is blocked
router.get('/check/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const isBlocked = await areUsersBlocked(req.user.id, userId);

    res.json({ success: true, isBlocked });
  } catch (error) {
    console.error('Check block error:', error);
    res.status(500).json({ success: false, message: 'Failed to check block status' });
  }
});

// Get blocked users list
router.get('/list', authenticate, async (req, res) => {
  try {
    const blocks = await prisma.block.findMany({
      where: { blockerId: req.user.id },
      include: {
        blocked: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ 
      success: true, 
      blockedUsers: blocks.map(b => ({
        ...b.blocked,
        blockedAt: b.createdAt,
        reason: b.reason
      }))
    });
  } catch (error) {
    console.error('Get blocked users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch blocked users' });
  }
});

module.exports = router;
module.exports.areUsersBlocked = areUsersBlocked;

