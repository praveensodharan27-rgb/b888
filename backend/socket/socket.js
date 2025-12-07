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

// Helper function to get io instance
const getIO = () => {
  return ioInstance;
};

const setupSocketIO = (io) => {
  ioInstance = io;
  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user.id;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
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

    // Handle joining chat room
    socket.on('join_room', (roomId) => {
      socket.join(`room:${roomId}`);
      console.log(`User ${socket.userId} joined room ${roomId}`);
    });

    // Handle leaving chat room
    socket.on('leave_room', (roomId) => {
      socket.leave(`room:${roomId}`);
      console.log(`User ${socket.userId} left room ${roomId}`);
    });

    // Handle sending message
    socket.on('send_message', async (data) => {
      try {
        const { roomId, content, type = 'TEXT', imageUrl } = data;

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

        const receiverId = room.user1Id === socket.userId ? room.user2Id : room.user1Id;

        // Save message to database
        const message = await prisma.chatMessage.create({
          data: {
            content,
            type,
            imageUrl,
            senderId: socket.userId,
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

        // Update room's updatedAt
        await prisma.chatRoom.update({
          where: { id: roomId },
          data: { updatedAt: new Date() }
        });

        // Emit message to room
        io.to(`room:${roomId}`).emit('new_message', message);

        // Send notification to receiver if offline
        const receiverSockets = userSockets.get(receiverId) || [];
        if (receiverSockets.length === 0) {
          // Create notification
          await prisma.notification.create({
            data: {
              userId: receiverId,
              title: 'New Message',
              message: `You have a new message from ${message.sender.name}`,
              type: 'new_message',
              link: `/chat/${roomId}`
            }
          });

          // Emit notification to receiver's personal room
          io.to(`user:${receiverId}`).emit('notification', {
            title: 'New Message',
            message: `You have a new message from ${message.sender.name}`,
            type: 'new_message',
            link: `/chat/${roomId}`
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
      socket.to(`room:${roomId}`).emit('user_typing', {
        userId: socket.userId,
        roomId
      });
    });

    // Handle stop typing
    socket.on('stop_typing', (data) => {
      const { roomId } = data;
      socket.to(`room:${roomId}`).emit('user_stopped_typing', {
        userId: socket.userId,
        roomId
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

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);

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

module.exports = { setupSocketIO, emitNotification, getIO };

