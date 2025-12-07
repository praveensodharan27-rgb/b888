import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import api from '@/lib/api';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

/**
 * Hook to manage notifications (payment, ads expiry, etc.)
 */
export const useNotifications = () => {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const notificationPermissionRef = useRef<NotificationPermission | null>(null);

  // Initialize notification permission
  useEffect(() => {
    if (typeof window !== 'undefined') {
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

  // Get notifications
  const { data: notificationsData } = useQuery<{
    notifications: Notification[];
    unreadCount: number;
  }>({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (!isAuthenticated) return { notifications: [], unreadCount: 0 };
      const response = await api.get('/user/notifications?limit=50');
      return response.data;
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unreadCount || 0;
  const previousUnreadCountRef = useRef<number>(0);

  // Play notification sound
  const playNotificationSound = (type: 'default' | 'offer' = 'default') => {
    try {
      if (typeof window === 'undefined') return;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different sounds for different notification types
      if (type === 'offer') {
        // Higher pitch for offer updates
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
      } else {
        // Standard notification sound
        oscillator.frequency.value = 600;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      }
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  // Play sound when new notifications arrive (detected via polling)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Only play sound if unread count increased (new notifications)
    if (unreadCount > previousUnreadCountRef.current && previousUnreadCountRef.current > 0) {
      const newNotifications = notifications.filter(n => !n.isRead);
      const hasOfferNotification = newNotifications.some(n => n.type === 'offer_update');
      
      // Play sound based on notification type
      playNotificationSound(hasOfferNotification ? 'offer' : 'default');
    }
    
    // Update previous count
    previousUnreadCountRef.current = unreadCount;
  }, [unreadCount, notifications, isAuthenticated]);

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await api.put(`/user/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api.put('/user/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

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
        tag: 'app-notification',
      });
    }
  };

  // Listen for real-time notifications via Socket.IO
  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();
    if (!socket) return;

    const handleNotification = (notification: Notification) => {
      // Invalidate notifications query to refresh
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      // Play sound based on notification type
      const soundType = notification.type === 'offer_update' ? 'offer' : 'default';
      playNotificationSound(soundType);

      // Show toast
      toast.success(`${notification.title}: ${notification.message}`, {
        duration: 5000,
      });

      // Show browser notification if tab is not focused
      if (document.hidden) {
        showBrowserNotification(notification.title, notification.message);
      }
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
    };
  }, [isAuthenticated, queryClient]);

  return {
    notifications,
    unreadCount,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    isLoading: markAsReadMutation.isPending || markAllAsReadMutation.isPending,
  };
};

