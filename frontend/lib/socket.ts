import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';

let socket: Socket | null = null;

export const getSocket = (): Socket | null => {
  if (typeof window === 'undefined') return null;

  const token = Cookies.get('token');
  
  // If no token, don't create socket
  if (!token) {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    return null;
  }

  // If socket exists but is disconnected, reconnect
  if (socket && !socket.connected) {
    socket.connect();
    return socket;
  }

  // Create new socket if doesn't exist
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('✅ Socket.IO connected');
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket.IO disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

