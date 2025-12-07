import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import api from '@/lib/api';
import { useAuth } from './useAuth';

/**
 * Hook to get unread message count and handle notifications
 */
export const useChatNotifications = () => {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const notificationPermissionRef = useRef<NotificationPermission | null>(null);

  // Initialize audio for notification sound
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Request notification permission
      if ('Notification' in window) {
        notificationPermissionRef.current = Notification.permission;
        if (Notification.permission === 'default') {
          Notification.requestPermission().then((permission) => {
            notificationPermissionRef.current = permission;
          });
        }
      }
    }
  }, []);

  // Get unread message count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['chat', 'unread-count'],
    queryFn: async () => {
      if (!isAuthenticated) return 0;
      const response = await api.get('/chat/rooms');
      const rooms = response.data.rooms || [];
      return rooms.reduce((total: number, room: any) => {
        return total + (room._count?.messages || 0);
      }, 0);
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Play notification sound using Web Audio API
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // Higher pitch for notification
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.error('Error playing notification sound:', error);
      // Fallback: try to play a simple beep using Audio API
      try {
        const beep = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OSfTgwOUKnm8LZjGwY4kdfyzHksBSR3x/DdkEAKFF606euoVRQKRp/g8r5sIQUrgc7y2Yk2CBtpvfDkn04MDlCp5vC2YxsGOJHX8sx5LAUkd8fw3ZBACg==');
        beep.volume = 0.3;
        beep.play().catch(() => {});
      } catch (e) {
        // Silent fail if audio is not supported
      }
    }
  };

  // Show browser notification
  const showBrowserNotification = (title: string, message: string) => {
    if (
      'Notification' in window &&
      notificationPermissionRef.current === 'granted' &&
      document.hidden
    ) {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'chat-message',
      });
    }
  };

  // Listen for new messages via Socket.IO and update unread count
  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (newMessage: any) => {
      // Only notify if message is not from current user
      const isCurrentUser = newMessage.senderId === user?.id;
      const isOnChatPage = window.location.pathname === '/chat';
      
      if (!isCurrentUser) {
        // Invalidate unread count query to refresh the count
        queryClient.invalidateQueries({ queryKey: ['chat', 'unread-count'] });
        
        // Play sound
        playNotificationSound();
        
        // Show browser notification if tab is not focused
        if (document.hidden || !isOnChatPage) {
          showBrowserNotification(
            'New Message',
            `${newMessage.sender?.name || 'Someone'} sent you a message`
          );
        }
      }
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [isAuthenticated, user?.id, queryClient]);

  return {
    unreadCount: unreadCount || 0,
    playNotificationSound,
    showBrowserNotification,
  };
};

