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

// Send message (REST endpoint for clients that don't use Socket.IO)
router.post('/rooms/:roomId/messages',
  authenticate,
  [
    body('content').trim().notEmpty().withMessage('Message content is required'),
    body('type').optional().isIn(['TEXT', 'IMAGE', 'SYSTEM']).withMessage('Invalid message type'),
    body('imageUrl').optional().isURL().withMessage('Invalid image URL')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      // CRITICAL: Convert roomId to STRING to avoid type mismatch
      const roomIdString = String(req.params.roomId);
      const { content, type = 'TEXT', imageUrl } = req.body;

      // Verify room access
      const room = await prisma.chatRoom.findUnique({
        where: { id: roomIdString },
        include: {
          user1: true,
          user2: true
        }
      });

      if (!room) {
        return res.status(404).json({ success: false, message: 'Room not found' });
      }

      if (room.user1Id !== req.user.id && room.user2Id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      // Check if users are blocked
      const { areUsersBlocked } = require('../middleware/blockCheck');
      const receiverId = room.user1Id === req.user.id ? room.user2Id : room.user1Id;
      const isBlocked = await areUsersBlocked(req.user.id, receiverId);
      if (isBlocked) {
        return res.status(403).json({ success: false, message: 'You cannot send messages to this user', blocked: true });
      }

      // Validate image URL if type is IMAGE
      if (type === 'IMAGE' && !imageUrl) {
        return res.status(400).json({ success: false, message: 'Image URL is required for IMAGE type messages' });
      }

      // Save message to database
      const message = await prisma.chatMessage.create({
        data: {
          content,
          type,
          imageUrl: type === 'IMAGE' ? imageUrl : null,
          senderId: req.user.id,
          receiverId,
          roomId: roomIdString
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        }
      });

      // Update room's updatedAt
      await prisma.chatRoom.update({
        where: { id: roomIdString },
        data: { updatedAt: new Date() }
      });

      // ROOT FIX: Emit message via Socket.IO using io.to() to broadcast to ALL users in room
      try {
        const { getIO } = require('../socket/socket');
        const io = getIO();
        if (io) {
          // Use io.to() to broadcast to ALL users in room (not just sender)
          const roomName = `room:${roomIdString}`;
          io.to(roomName).emit('new_message', message);
          console.log(`📤 Emitted new_message to room: ${roomIdString}`);

          // Check if receiver is online by checking Socket.IO connections
          const sockets = await io.fetchSockets();
          const receiverOnline = sockets.some(socket => socket.userId === receiverId);

          // Create notification if receiver is offline
          if (!receiverOnline) {
            await prisma.notification.create({
              data: {
                userId: receiverId,
                title: 'New Message',
                message: `You have a new message from ${message.sender.name}`,
                type: 'new_message',
                link: `/chat/${roomId}`
              }
            });

            // Emit notification to receiver's personal room (in case they reconnect)
            io.to(`user:${receiverId}`).emit('notification', {
              title: 'New Message',
              message: `You have a new message from ${message.sender.name}`,
              type: 'new_message',
              link: `/chat/${roomIdString}`
            });
          }
        }
      } catch (socketError) {
        // Socket.IO not available, but message is saved - continue
        console.warn('Socket.IO not available, message saved via REST:', socketError.message);
      }

      res.json({
        success: true,
        message: message
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ success: false, message: 'Failed to send message', error: error.message });
    }
  }
);

// Get unread message count
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const unreadCount = await prisma.chatMessage.count({
      where: {
        receiverId: req.user.id,
        read: false
      }
    });

    res.json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, message: 'Failed to get unread count' });
  }
});

// Block user in chat
router.post('/block/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot block yourself' });
    }

    // Check if user exists
    const userToBlock = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userToBlock) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Block user (using existing block functionality)
    const existingBlock = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: req.user.id,
          blockedId: userId
        }
      }
    });

    if (existingBlock) {
      return res.json({ success: true, message: 'User already blocked' });
    }

    await prisma.block.create({
      data: {
        blockerId: req.user.id,
        blockedId: userId
      }
    });

    res.json({ success: true, message: 'User blocked successfully' });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ success: false, message: 'Failed to block user' });
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

// ========== CHAT READ RECEIPTS ==========

// Mark messages as read
router.post('/messages/:messageId/read', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: {
        room: true
      }
    });

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Verify user is the receiver
    if (message.receiverId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Verify user has access to the room
    if (message.room.user1Id !== req.user.id && message.room.user2Id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const updatedMessage = await prisma.chatMessage.update({
      where: { id: messageId },
      data: { isRead: true }
    });

    res.json({
      success: true,
      message: 'Message marked as read',
      message: updatedMessage
    });
  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark message as read' });
  }
});

// Mark all messages in a room as read
router.post('/rooms/:roomId/read-all', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId }
    });

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    if (room.user1Id !== req.user.id && room.user2Id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const result = await prisma.chatMessage.updateMany({
      where: {
        roomId,
        receiverId: req.user.id,
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({
      success: true,
      message: `Marked ${result.count} message(s) as read`,
      readCount: result.count
    });
  } catch (error) {
    console.error('Mark all messages as read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark messages as read' });
  }
});

// Get read receipts for a message
router.get('/messages/:messageId/read-receipts', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: {
        room: true,
        sender: { select: { id: true, name: true, avatar: true } },
        receiver: { select: { id: true, name: true, avatar: true } }
      }
    });

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Verify user has access to the room
    if (message.room.user1Id !== req.user.id && message.room.user2Id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({
      success: true,
      receipt: {
        messageId: message.id,
        isRead: message.isRead,
        readAt: message.isRead ? message.updatedAt : null,
        sender: message.sender,
        receiver: message.receiver
      }
    });
  } catch (error) {
    console.error('Get read receipts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch read receipts' });
  }
});

// Get read status for multiple messages
router.post('/messages/read-status', authenticate, async (req, res) => {
  try {
    const { messageIds } = req.body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Message IDs array required' });
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        id: { in: messageIds },
        receiverId: req.user.id
      },
      select: {
        id: true,
        isRead: true,
        updatedAt: true
      }
    });

    const readStatus = messages.map(msg => ({
      messageId: msg.id,
      isRead: msg.isRead,
      readAt: msg.isRead ? msg.updatedAt : null
    }));

    res.json({
      success: true,
      readStatus
    });
  } catch (error) {
    console.error('Get read status error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch read status' });
  }
});

// Get unread message count per room
router.get('/rooms/unread-counts', authenticate, async (req, res) => {
  try {
    const rooms = await prisma.chatRoom.findMany({
      where: {
        OR: [
          { user1Id: req.user.id },
          { user2Id: req.user.id }
        ]
      },
      include: {
        messages: {
          where: {
            receiverId: req.user.id,
            isRead: false
          },
          select: { id: true }
        }
      }
    });

    const unreadCounts = rooms.map(room => ({
      roomId: room.id,
      unreadCount: room.messages.length
    }));

    res.json({
      success: true,
      unreadCounts,
      totalUnread: unreadCounts.reduce((sum, item) => sum + item.unreadCount, 0)
    });
  } catch (error) {
    console.error('Get unread counts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch unread counts' });
  }
});

// Mobile: Get chat summary (lightweight for mobile)
router.get('/mobile/summary', authenticate, async (req, res) => {
  try {
    const rooms = await prisma.chatRoom.findMany({
      where: {
        OR: [
          { user1Id: req.user.id },
          { user2Id: req.user.id }
        ]
      },
      include: {
        user1: { select: { id: true, name: true, avatar: true } },
        user2: { select: { id: true, name: true, avatar: true } },
        ad: { select: { id: true, title: true, images: true, price: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            type: true,
            createdAt: true,
            isRead: true,
            senderId: true
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

    const summary = rooms.map(room => {
      const otherUser = room.user1Id === req.user.id ? room.user2 : room.user1;
      const lastMessage = room.messages[0] || null;

      return {
        roomId: room.id,
        otherUser: {
          id: otherUser.id,
          name: otherUser.name,
          avatar: otherUser.avatar
        },
        ad: room.ad,
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          content: lastMessage.content,
          type: lastMessage.type,
          createdAt: lastMessage.createdAt,
          isRead: lastMessage.isRead,
          isFromMe: lastMessage.senderId === req.user.id
        } : null,
        unreadCount: room._count.messages,
        updatedAt: room.updatedAt
      };
    });

    res.json({
      success: true,
      summary,
      totalUnread: summary.reduce((sum, room) => sum + room.unreadCount, 0)
    });
  } catch (error) {
    console.error('Get chat summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch chat summary' });
  }
});

// Mobile: Send message with image upload support
router.post('/mobile/message',
  authenticate,
  [
    body('roomId').notEmpty().withMessage('Room ID is required'),
    body('content').optional().trim(),
    body('type').isIn(['TEXT', 'IMAGE', 'SYSTEM']).withMessage('Invalid message type'),
    body('imageUrl').optional().isURL().withMessage('Invalid image URL')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { roomId, content, type = 'TEXT', imageUrl } = req.body;

      // Verify room access
      const room = await prisma.chatRoom.findUnique({
        where: { id: roomId },
        include: {
          user1: true,
          user2: true
        }
      });

      if (!room) {
        return res.status(404).json({ success: false, message: 'Room not found' });
      }

      if (room.user1Id !== req.user.id && room.user2Id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      const receiverId = room.user1Id === req.user.id ? room.user2Id : room.user1Id;

      // Validate content based on type
      if (type === 'TEXT' && !content) {
        return res.status(400).json({ success: false, message: 'Content is required for TEXT messages' });
      }

      if (type === 'IMAGE' && !imageUrl) {
        return res.status(400).json({ success: false, message: 'Image URL is required for IMAGE messages' });
      }

      // Save message
      const message = await prisma.chatMessage.create({
        data: {
          content: content || '',
          type,
          imageUrl: type === 'IMAGE' ? imageUrl : null,
          senderId: req.user.id,
          receiverId,
          roomId
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        }
      });

      // Update room
      await prisma.chatRoom.update({
        where: { id: roomId },
        data: { updatedAt: new Date() }
      });

      // Emit via Socket.IO if available
      try {
        const { getIO } = require('../socket/socket');
        const io = getIO();
        if (io) {
          const roomName = `room:${roomId}`;
          io.to(roomName).emit('new_message', message);
        }
      } catch (socketError) {
        console.warn('Socket.IO not available:', socketError.message);
      }

      res.json({
        success: true,
        message
      });
    } catch (error) {
      console.error('Send mobile message error:', error);
      res.status(500).json({ success: false, message: 'Failed to send message' });
    }
  }
);

module.exports = router;

