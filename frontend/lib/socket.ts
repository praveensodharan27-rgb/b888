import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';

let socket: Socket | null = null;
let isConnecting = false;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;

export const getSocket = (): Socket | null => {
  if (typeof window === 'undefined') return null;

  const token = Cookies.get('token');
  
  // If socket exists and is connected, return it
  if (socket && socket.connected) {
    return socket;
  }

  // If socket exists but is disconnected, don't reconnect immediately
  // Let Socket.IO handle reconnection automatically
  if (socket && !socket.connected && !isConnecting) {
    // Only reconnect if we haven't exceeded max attempts
    if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
      isConnecting = true;
      connectionAttempts++;
      
      // Use Socket.IO's built-in reconnection
      try {
        socket.connect();
      } catch (error) {
        isConnecting = false;
        // Silently handle reconnection errors
      }
    }
    return socket;
  }

  // Create new socket if doesn't exist
  if (!socket) {
    // Prevent multiple simultaneous connection attempts
    if (isConnecting) {
      return null;
    }

    isConnecting = true;
    connectionAttempts = 0;

    try {
      socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://148.230.67.118:5000', {
        auth: token ? { token } : undefined,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 2000, // Increased delay
        reconnectionDelayMax: 10000, // Max delay
        reconnectionAttempts: 5,
        timeout: 10000, // Increased timeout
        forceNew: false,
        autoConnect: true,
      });

      socket.on('connect', () => {
        isConnecting = false;
        connectionAttempts = 0;
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Socket.IO connected');
        }
      });

      socket.on('disconnect', (reason) => {
        isConnecting = false;
        // Only log unexpected disconnects in development
        if (process.env.NODE_ENV === 'development') {
          // Ignore normal disconnects and page navigation
          if (reason !== 'io client disconnect' && reason !== 'transport close') {
            console.log('❌ Socket.IO disconnected:', reason);
          }
        }
      });

      socket.on('connect_error', (error) => {
        isConnecting = false;
        connectionAttempts++;
        
        // Only log in development, and suppress common connection errors
        if (process.env.NODE_ENV === 'development') {
          const errorMessage = error.message || String(error);
          // Suppress common errors that are expected
          if (
            errorMessage.includes('ECONNREFUSED') || 
            errorMessage.includes('Failed to fetch') ||
            errorMessage.includes('timeout') ||
            errorMessage.includes('websocket error') ||
            errorMessage.includes('transport error')
          ) {
            // These are expected in some cases, don't log as errors
            // Only log if we've tried multiple times
            if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
              console.log('ℹ️ Socket.IO: Connection unavailable after multiple attempts');
            }
          } else {
            console.warn('⚠️ Socket.IO connection error:', errorMessage);
          }
        }
      });

      // Reset connection attempts on successful connection
      socket.on('reconnect', () => {
        connectionAttempts = 0;
        isConnecting = false;
      });
    } catch (error) {
      isConnecting = false;
      // If socket creation fails, return null instead of crashing
      if (process.env.NODE_ENV === 'development') {
        console.log('ℹ️ Socket.IO: Failed to create socket connection');
      }
      return null;
    }
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

