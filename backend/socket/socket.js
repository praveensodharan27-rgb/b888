const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// Store user socket connections
const userSockets = new Map();
let ioInstance = null;

// Helper function to emit notification to a user
const emitNotification = (userId, notification) => {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit('notification', notification);
  }
};

// Helper function to emit ad quota update to a user
const emitAdQuotaUpdate = (userId, quotaData) => {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit('AD_QUOTA_UPDATED', quotaData);
    console.log(`📡 Emitted AD_QUOTA_UPDATED to user ${userId}`, {
      freeAds: quotaData.monthlyFreeAds?.remaining || 0,
      packages: quotaData.packages?.length || 0
    });
  } else {
    console.warn('⚠️ Socket.IO instance not available - cannot emit quota update');
  }
};

// Helper function to get io instance
const getIO = () => {
  return ioInstance;
};

const setupSocketIO = (io) => {
  ioInstance = io;
  // Authentication middleware for Socket.IO
  // Allow unauthenticated connections for public events (like new_ad)
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        // Allow connection without token (for public events)
        socket.userId = null;
        socket.isAuthenticated = false;
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user) {
        // Allow connection even if user not found (for public events)
        socket.userId = null;
        socket.isAuthenticated = false;
        return next();
      }

      socket.userId = user.id;
      socket.isAuthenticated = true;
      next();
    } catch (error) {
      // Allow connection even on auth error (for public events)
      socket.userId = null;
      socket.isAuthenticated = false;
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Store socket connection
    const wasOffline = !userSockets.has(socket.userId) || userSockets.get(socket.userId).length === 0;
    if (!userSockets.has(socket.userId)) {
      userSockets.set(socket.userId, []);
    }
    userSockets.get(socket.userId).push(socket);

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // Emit user online status to all rooms this user is in
    if (wasOffline) {
      // Broadcast that this user is now online
      io.emit('user_online', { userId: socket.userId });
    }

    // Handle joining chat room (also tracks which room user is viewing for AI sales assistant)
    socket.on('join_room', (roomId) => {
      const roomIdString = String(roomId);
      socket.viewingRoomId = roomIdString;
      socket.join(`room:${roomIdString}`);
      console.log(`User ${socket.userId} joined room ${roomIdString}`);
    });

    // Handle leaving chat room
    socket.on('leave_room', (roomId) => {
      const roomIdString = String(roomId);
      if (socket.viewingRoomId === roomIdString) socket.viewingRoomId = null;
      socket.leave(`room:${roomIdString}`);
      console.log(`User ${socket.userId} left room ${roomIdString}`);
    });

    // Handle sending message
    socket.on('send_message', async (data) => {
      try {
        const { roomId, content, type = 'TEXT', imageUrl } = data;

        // CRITICAL: Convert roomId to STRING to avoid type mismatch
        const roomIdString = String(roomId);

        // Verify room access and get ad owner for lastSellerMessageAt
        const room = await prisma.chatRoom.findUnique({
          where: { id: roomIdString },
          include: {
            user1: true,
            user2: true,
            ad: { select: { userId: true } }
          }
        });

        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        if (room.user1Id !== socket.userId && room.user2Id !== socket.userId) {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        const receiverId = room.user1Id === socket.userId ? room.user2Id : room.user1Id;
        const sellerId = room.ad?.userId;

        // Save message to database
        const message = await prisma.chatMessage.create({
          data: {
            content,
            type,
            imageUrl,
            senderId: socket.userId,
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

        // Update room's updatedAt; if sender is seller, set lastSellerMessageAt (human override - AI stays silent 30 min)
        const now = new Date();
        await prisma.chatRoom.update({
          where: { id: roomIdString },
          data: {
            updatedAt: now,
            ...(sellerId && socket.userId === sellerId ? { lastSellerMessageAt: now } : {})
          }
        });

        // ROOT FIX: Use io.to() to broadcast to ALL users in room (not just sender)
        const roomName = `room:${roomIdString}`;
        io.to(roomName).emit('new_message', message);
        console.log(`📤 Emitted new_message to room: ${roomIdString}`);

        // Check if receiver is online via WebSocket
        const receiverSockets = userSockets.get(receiverId) || [];
        const isReceiverOnline = receiverSockets.length > 0;

        // If receiver is offline, send FCM push notification
        if (!isReceiverOnline) {
          // Create notification in database
          await prisma.notification.create({
            data: {
              userId: receiverId,
              title: 'New Message',
              message: `You have a new message from ${message.sender.name}`,
              type: 'new_message',
              link: `/chat/${roomIdString}`
            }
          });

          // Send FCM push notification (WhatsApp-style)
          try {
            const { sendFCMNotificationToUser } = require('../utils/fcmService');
            
            // Prepare notification body based on message type (WhatsApp-style)
            let notificationBody = content;
            if (type === 'IMAGE') {
              notificationBody = '📷 Image';
            } else if (type === 'AUDIO') {
              notificationBody = '🎵 Audio';
            } else if (type === 'VIDEO') {
              notificationBody = '🎥 Video';
            } else if (type === 'FILE') {
              notificationBody = '📎 File';
            } else if (type !== 'TEXT') {
              notificationBody = 'Sent a message';
            }
            
            // Truncate long messages (WhatsApp-style preview)
            if (notificationBody.length > 100) {
              notificationBody = notificationBody.substring(0, 97) + '...';
            }
            
            await sendFCMNotificationToUser(
              receiverId,
              {
                title: message.sender.name || 'SellIt',
                body: notificationBody,
                type: 'chat_message'
              },
              {
                type: 'chat_message',
                chatId: roomIdString, // Use chatId for Flutter intent
                roomId: roomIdString, // Keep for backward compatibility
                messageId: message.id,
                senderId: socket.userId,
                senderName: message.sender.name,
                content: type === 'TEXT' ? content : '',
                messageType: type,
                url: `/chat/${roomIdString}`
              }
            );
            console.log(`📱 FCM notification sent to offline user: ${receiverId} (chatId: ${roomIdString})`);
          } catch (fcmError) {
            console.error('Error sending FCM notification:', fcmError);
            // Don't fail message sending if FCM fails
          }
        } else {
          // Receiver is online - WebSocket will handle it
          console.log(`✅ Receiver ${receiverId} is online, message delivered via WebSocket`);
        }

        // Auto AI reply: if sender is buyer (not seller), trigger AI reply in background if seller eligible
        if (sellerId && socket.userId !== sellerId) {
          const openAiKey = process.env.OPENAI_API_KEY;
          setImmediate(() => {
            const { triggerAiReplyIfEligible } = require('../services/salesAssistantService');
            triggerAiReplyIfEligible(roomIdString, sellerId, openAiKey).catch((err) =>
              console.error('AI auto-reply:', err.message)
            );
          });
        }
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      const { roomId } = data;
      const roomIdString = String(roomId);
      socket.to(`room:${roomIdString}`).emit('user_typing', {
        userId: socket.userId,
        roomId: roomIdString
      });
    });

    // Handle stop typing
    socket.on('stop_typing', (data) => {
      const { roomId } = data;
      const roomIdString = String(roomId);
      socket.to(`room:${roomIdString}`).emit('user_stopped_typing', {
        userId: socket.userId,
        roomId: roomIdString
      });
    });

    // ========== WebRTC Signaling Handlers ==========
    
    // Handle WebRTC call initiation
    socket.on('webrtc_initiate_call', async (data) => {
      try {
        const { roomId, receiverId, isAudioOnly } = data;

        // Verify room access
        const room = await prisma.chatRoom.findUnique({
          where: { id: roomId },
          include: {
            user1: true,
            user2: true
          }
        });

        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        if (room.user1Id !== socket.userId && room.user2Id !== socket.userId) {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        // Verify receiver is in the room
        if (room.user1Id !== receiverId && room.user2Id !== receiverId) {
          socket.emit('error', { message: 'Invalid receiver' });
          return;
        }

        // Emit call initiation to receiver
        io.to(`user:${receiverId}`).emit('webrtc_incoming_call', {
          roomId,
          callerId: socket.userId,
          callerName: room.user1Id === socket.userId ? room.user1.name : room.user2.name,
          isAudioOnly: isAudioOnly || false,
        });

        console.log(`WebRTC call initiated: ${socket.userId} -> ${receiverId} in room ${roomId} (${isAudioOnly ? 'audio' : 'video'})`);
      } catch (error) {
        console.error('WebRTC initiate call error:', error);
        socket.emit('error', { message: 'Failed to initiate call' });
      }
    });

    // Handle WebRTC offer
    socket.on('webrtc_offer', async (data) => {
      try {
        const { roomId, offer, receiverId } = data;

        // Verify room access
        const room = await prisma.chatRoom.findUnique({
          where: { id: roomId }
        });

        if (!room || (room.user1Id !== socket.userId && room.user2Id !== socket.userId)) {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        // Forward offer to receiver
        io.to(`user:${receiverId}`).emit('webrtc_offer', {
          offer,
          callerId: socket.userId,
          roomId
        });
      } catch (error) {
        console.error('WebRTC offer error:', error);
        socket.emit('error', { message: 'Failed to send offer' });
      }
    });

    // Handle WebRTC answer
    socket.on('webrtc_answer', async (data) => {
      try {
        const { roomId, answer, receiverId } = data;

        // Verify room access
        const room = await prisma.chatRoom.findUnique({
          where: { id: roomId }
        });

        if (!room || (room.user1Id !== socket.userId && room.user2Id !== socket.userId)) {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        // Forward answer to caller
        io.to(`user:${receiverId}`).emit('webrtc_answer', {
          answer,
          roomId
        });
      } catch (error) {
        console.error('WebRTC answer error:', error);
        socket.emit('error', { message: 'Failed to send answer' });
      }
    });

    // Handle ICE candidates
    socket.on('webrtc_ice_candidate', async (data) => {
      try {
        const { roomId, candidate, receiverId } = data;

        // Verify room access
        const room = await prisma.chatRoom.findUnique({
          where: { id: roomId }
        });

        if (!room || (room.user1Id !== socket.userId && room.user2Id !== socket.userId)) {
          return; // Silently fail for ICE candidates
        }

        // Forward ICE candidate to receiver
        io.to(`user:${receiverId}`).emit('webrtc_ice_candidate', {
          candidate,
          roomId
        });
      } catch (error) {
        console.error('WebRTC ICE candidate error:', error);
        // Silently fail for ICE candidates
      }
    });

    // Handle call rejection
    socket.on('webrtc_reject_call', async (data) => {
      try {
        const { roomId, callerId } = data;

        // Verify room access
        const room = await prisma.chatRoom.findUnique({
          where: { id: roomId }
        });

        if (!room || (room.user1Id !== socket.userId && room.user2Id !== socket.userId)) {
          socket.emit('error', { message: 'Not authorized' });
          return;
        }

        // Notify caller that call was rejected
        io.to(`user:${callerId}`).emit('webrtc_call_rejected', {
          roomId
        });

        console.log(`WebRTC call rejected: ${callerId} by ${socket.userId} in room ${roomId}`);
      } catch (error) {
        console.error('WebRTC reject call error:', error);
        socket.emit('error', { message: 'Failed to reject call' });
      }
    });

    // Handle call end
    socket.on('webrtc_end_call', async (data) => {
      try {
        const { roomId, receiverId } = data;

        // Verify room access
        const room = await prisma.chatRoom.findUnique({
          where: { id: roomId }
        });

        if (!room || (room.user1Id !== socket.userId && room.user2Id !== socket.userId)) {
          return; // Silently fail
        }

        // Notify receiver that call ended
        io.to(`user:${receiverId}`).emit('webrtc_call_ended', {
          roomId
        });

        console.log(`WebRTC call ended: ${socket.userId} -> ${receiverId} in room ${roomId}`);
      } catch (error) {
        console.error('WebRTC end call error:', error);
        // Silently fail
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      socket.viewingRoomId = null;

      // Remove socket from userSockets
      const sockets = userSockets.get(socket.userId);
      if (sockets) {
        const index = sockets.indexOf(socket);
        if (index > -1) {
          sockets.splice(index, 1);
        }
        if (sockets.length === 0) {
          userSockets.delete(socket.userId);
          // Broadcast that this user is now offline
          io.emit('user_offline', { userId: socket.userId });
        }
      }
    });
  });
};

/** Whether the user has any connected socket (online). */
function isUserOnline(userId) {
  if (!userId) return false;
  const sockets = userSockets.get(userId);
  return !!sockets && sockets.length > 0;
}

/** Room ID the user is currently viewing (any of their sockets). Null if not viewing a chat. */
function getViewingRoomId(userId) {
  if (!userId) return null;
  const sockets = userSockets.get(userId);
  if (!sockets || sockets.length === 0) return null;
  const s = sockets.find((sock) => sock.viewingRoomId);
  return s ? s.viewingRoomId : null;
}

module.exports = {
  setupSocketIO,
  emitNotification,
  emitAdQuotaUpdate,
  getIO,
  isUserOnline,
  getViewingRoomId,
  userSockets,
};

