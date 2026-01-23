import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';

let socket: Socket | null = null;

export const getSocket = (): Socket | null => {
  if (typeof window === 'undefined') return null;

  const token = Cookies.get('token');
  
  // Allow socket connection even without token (for public events like new ads)
  // But use token if available for authenticated features

  // If socket exists but is disconnected, reconnect
  if (socket && !socket.connected) {
    try {
      socket.connect();
    } catch (error) {
      // Silently handle reconnection errors
      if (process.env.NODE_ENV === 'development') {
        console.log('ℹ️ Socket.IO: Reconnection attempt failed');
      }
    }
    return socket;
  }

  // Create new socket if doesn't exist
  if (!socket) {
    try {
      socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
        auth: token ? { token } : undefined, // Only send token if available
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 5000, // 5 second timeout
        forceNew: false, // Reuse existing connection if available
      });
    } catch (error) {
      // If socket creation fails, return null instead of crashing
      if (process.env.NODE_ENV === 'development') {
        console.log('ℹ️ Socket.IO: Failed to create socket connection');
      }
      return null;
    }

    socket.on('connect', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Socket.IO connected');
      }
    });

    socket.on('disconnect', (reason) => {
      // Only log in development, and ignore normal disconnects
      if (process.env.NODE_ENV === 'development' && reason !== 'io client disconnect') {
        console.log('❌ Socket.IO disconnected:', reason);
      }
    });

    socket.on('connect_error', (error) => {
      // Only log in development, and suppress common connection errors
      if (process.env.NODE_ENV === 'development') {
        // Check if it's a connection refused error (backend not running)
        const errorMessage = error.message || String(error);
        if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Failed to fetch')) {
          // Backend not running - this is expected in some cases, don't show as error
          console.log('ℹ️ Socket.IO: Backend server not available (this is OK if backend is not running)');
        } else {
          console.warn('⚠️ Socket.IO connection error:', errorMessage);
        }
      }
      // Don't throw or show error to user - socket is optional for app functionality
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

