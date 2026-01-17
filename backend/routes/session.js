const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

const router = express.Router();
const prisma = new PrismaClient();

// Get all active sessions for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const sessions = await prisma.refreshToken.findMany({
      where: {
        userId: req.user.id,
        expiresAt: { gt: new Date() },
        revoked: false
      },
      select: {
        id: true,
        token: false, // Don't expose full token
        createdAt: true,
        expiresAt: true,
        revoked: true,
        revokedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      sessions: sessions.map(session => ({
        ...session,
        isCurrent: false, // Can be determined client-side by comparing token
        deviceInfo: {
          // Extract device info from token if needed
          deviceName: 'Device',
          location: null
        }
      }))
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sessions' });
  }
});

// Get current session details
router.get('/current', authenticate, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
    
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token required' });
    }

    const session = await prisma.refreshToken.findFirst({
      where: {
        token: token,
        userId: req.user.id,
        expiresAt: { gt: new Date() },
        revoked: false
      },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        revoked: true,
        revokedAt: true
      }
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    res.json({
      success: true,
      session: {
        ...session,
        deviceInfo: {
          deviceName: 'Current Device',
          location: null
        }
      }
    });
  } catch (error) {
    console.error('Get current session error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch session' });
  }
});

// Revoke a specific session
router.delete('/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.refreshToken.findFirst({
      where: {
        id: sessionId,
        userId: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    await prisma.refreshToken.update({
      where: { id: sessionId },
      data: {
        revoked: true,
        revokedAt: new Date()
      }
    });

    res.json({ success: true, message: 'Session revoked successfully' });
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({ success: false, message: 'Failed to revoke session' });
  }
});

// Revoke all other sessions (keep current)
router.delete('/others', authenticate, async (req, res) => {
  try {
    const currentToken = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
    
    const where = {
      userId: req.user.id,
      expiresAt: { gt: new Date() },
      revoked: false
    };

    if (currentToken) {
      where.token = { not: currentToken };
    }

    const result = await prisma.refreshToken.updateMany({
      where,
      data: {
        revoked: true,
        revokedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: `Revoked ${result.count} session(s)`,
      revokedCount: result.count
    });
  } catch (error) {
    console.error('Revoke other sessions error:', error);
    res.status(500).json({ success: false, message: 'Failed to revoke sessions' });
  }
});

// Revoke all sessions (including current)
router.delete('/all', authenticate, async (req, res) => {
  try {
    const result = await prisma.refreshToken.updateMany({
      where: {
        userId: req.user.id,
        revoked: false
      },
      data: {
        revoked: true,
        revokedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: `Revoked all ${result.count} session(s)`,
      revokedCount: result.count
    });
  } catch (error) {
    console.error('Revoke all sessions error:', error);
    res.status(500).json({ success: false, message: 'Failed to revoke sessions' });
  }
});

// Update session activity (refresh token usage updates expiresAt)
router.patch('/:sessionId/activity', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.refreshToken.findFirst({
      where: {
        id: sessionId,
        userId: req.user.id,
        revoked: false
      }
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Session activity is tracked via token refresh, so we just confirm it exists
    res.json({ success: true, message: 'Session is active' });
  } catch (error) {
    console.error('Update session activity error:', error);
    res.status(500).json({ success: false, message: 'Failed to update session activity' });
  }
});

// Get session statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const now = new Date();
    
    const [total, active, expired] = await Promise.all([
      prisma.refreshToken.count({
        where: { userId: req.user.id }
      }),
      prisma.refreshToken.count({
        where: {
          userId: req.user.id,
          expiresAt: { gt: now }
        }
      }),
      prisma.refreshToken.count({
        where: {
          userId: req.user.id,
          expiresAt: { lte: now }
        }
      })
    ]);

    res.json({
      success: true,
      stats: {
        total,
        active,
        expired
      }
    });
  } catch (error) {
    console.error('Get session stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch session statistics' });
  }
});

// Admin: Get all sessions for a user
router.get('/admin/user/:userId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [sessions, total] = await Promise.all([
      prisma.refreshToken.findMany({
        where: { userId },
        select: {
          id: true,
          createdAt: true,
          expiresAt: true,
          revoked: true,
          revokedAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.refreshToken.count({ where: { userId } })
    ]);

    res.json({
      success: true,
      sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin get user sessions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user sessions' });
  }
});

module.exports = router;

