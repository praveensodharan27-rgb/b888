const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { areUsersBlocked } = require('../middleware/blockCheck');

const router = express.Router();
const prisma = new PrismaClient();

// Get or create chat room
router.post('/room',
  authenticate,
  async (req, res) => {
    try {
      // Support both receiverId and userId for backward compatibility
      const { adId, receiverId, userId } = req.body;
      const actualReceiverId = receiverId || userId;
      
      console.log('Creating chat room:', { 
        adId, 
        receiverId: actualReceiverId, 
        currentUserId: req.user.id,
        body: req.body 
      });
      
      if (!actualReceiverId) {
        console.error('Missing receiverId/userId');
        return res.status(400).json({ 
          success: false, 
          message: 'Receiver ID (or User ID) is required',
          received: { receiverId, userId }
        });
      }

      if (actualReceiverId === req.user.id) {
        return res.status(400).json({ success: false, message: 'Cannot chat with yourself' });
      }

      // Check if users are blocked
      const isBlocked = await areUsersBlocked(req.user.id, actualReceiverId);
      if (isBlocked) {
        return res.status(403).json({ success: false, message: 'You cannot contact this user', blocked: true });
      }

      // If no adId provided, get the receiver's first active ad
      let actualAdId = adId;
      if (!actualAdId) {
        const receiverAd = await prisma.ad.findFirst({
          where: {
            userId: actualReceiverId,
            status: 'APPROVED',
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          },
          orderBy: { createdAt: 'desc' }
        });

        if (!receiverAd) {
          return res.status(400).json({ 
            success: false, 
            message: 'This user has no active ads. Please visit one of their ads to start a conversation.' 
          });
        }

        actualAdId = receiverAd.id;
      }

      // Verify ad exists
      const ad = await prisma.ad.findUnique({
        where: { id: actualAdId }
      });

      if (!ad) {
        return res.status(404).json({ success: false, message: 'Ad not found' });
      }

      // Find or create room
      const user1Id = req.user.id < actualReceiverId ? req.user.id : actualReceiverId;
      const user2Id = req.user.id < actualReceiverId ? actualReceiverId : req.user.id;

      let room = await prisma.chatRoom.findUnique({
        where: {
          user1Id_user2Id_adId: {
            user1Id,
            user2Id,
            adId: actualAdId
          }
        },
        include: {
          user1: { select: { id: true, name: true, avatar: true, phone: true } },
          user2: { select: { id: true, name: true, avatar: true, phone: true } },
          ad: { select: { id: true, title: true, images: true, price: true } }
        }
      });

      if (!room) {
        room = await prisma.chatRoom.create({
          data: {
            user1Id,
            user2Id,
            adId: actualAdId
          },
          include: {
            user1: { select: { id: true, name: true, avatar: true, phone: true } },
            user2: { select: { id: true, name: true, avatar: true, phone: true } },
            ad: { select: { id: true, title: true, images: true, price: true } }
          }
        });
      }

      res.json({ success: true, room });
    } catch (error) {
      console.error('Get/create room error:', error);
      res.status(500).json({ success: false, message: 'Failed to get/create room' });
    }
  }
);

// Get user's chat rooms
router.get('/rooms', authenticate, async (req, res) => {
  try {
    const rooms = await prisma.chatRoom.findMany({
      where: {
        OR: [
          { user1Id: req.user.id },
          { user2Id: req.user.id }
        ]
      },
      include: {
        user1: { select: { id: true, name: true, avatar: true, phone: true } },
        user2: { select: { id: true, name: true, avatar: true, phone: true } },
        ad: { select: { id: true, title: true, images: true, price: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: { select: { id: true, name: true } }
          }
        },
        _count: {
          select: {
            messages: {
              where: {
                receiverId: req.user.id,
                isRead: false
              }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({ success: true, rooms });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch rooms' });
  }
});

// Get messages for a room
router.get('/rooms/:roomId/messages', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Verify user has access to room
    const room = await prisma.chatRoom.findUnique({
      where: { id: req.params.roomId }
    });

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    if (room.user1Id !== req.user.id && room.user2Id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const [messages, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { roomId: req.params.roomId },
        include: {
          sender: { select: { id: true, name: true, avatar: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.chatMessage.count({ where: { roomId: req.params.roomId } })
    ]);

    // Mark messages as read
    await prisma.chatMessage.updateMany({
      where: {
        roomId: req.params.roomId,
        receiverId: req.user.id,
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({
      success: true,
      messages: messages.reverse(),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
});

// Get online users status
router.get('/online-users', authenticate, async (req, res) => {
  try {
    const { getIO } = require('../socket/socket');
    const io = getIO();
    
    if (!io) {
      return res.json({ success: true, onlineUsers: [] });
    }

    // Get all connected socket IDs
    const sockets = await io.fetchSockets();
    const onlineUserIds = new Set();
    
    sockets.forEach(socket => {
      if (socket.userId) {
        onlineUserIds.add(socket.userId);
      }
    });

    res.json({ 
      success: true, 
      onlineUsers: Array.from(onlineUserIds)
    });
  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({ success: false, message: 'Failed to get online users' });
  }
});

module.exports = router;

