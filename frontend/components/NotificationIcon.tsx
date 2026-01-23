'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  FiBell, 
  FiGift, 
  FiCheckCircle, 
  FiXCircle, 
  FiMessageCircle, 
  FiCreditCard, 
  FiClock, 
  FiUserPlus, 
  FiDollarSign,
  FiAlertCircle,
  FiStar,
  FiShoppingBag
} from 'react-icons/fi';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export default function NotificationIcon() {
  const { isAuthenticated } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    setIsOpen(false);
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const unreadNotifications = notifications.filter((n) => !n.isRead);
  const offerNotifications = notifications.filter((n) => n.type === 'offer_update' && !n.isRead);
  const displayNotifications = notifications.slice(0, 10); // Show latest 10

  // Get icon for notification type
  const getNotificationIcon = (type: string) => {
    const baseClass = "w-5 h-5 flex-shrink-0";
    
    switch (type) {
      case 'offer_update':
        return <FiGift className={`${baseClass} text-yellow-500`} />;
      case 'ad_approved':
        return <FiCheckCircle className={`${baseClass} text-green-500`} />;
      case 'ad_rejected':
        return <FiXCircle className={`${baseClass} text-red-500`} />;
      case 'new_message':
        return <FiMessageCircle className={`${baseClass} text-blue-500`} />;
      case 'payment':
      case 'payment_success':
        return <FiCreditCard className={`${baseClass} text-green-600`} />;
      case 'payment_failed':
        return <FiCreditCard className={`${baseClass} text-red-500`} />;
      case 'ad_expiry':
      case 'ad_expired':
        return <FiClock className={`${baseClass} text-orange-500`} />;
      case 'new_follower':
        return <FiUserPlus className={`${baseClass} text-purple-500`} />;
      case 'referral_reward':
        return <FiDollarSign className={`${baseClass} text-green-600`} />;
      case 'order_placed':
      case 'order_update':
        return <FiShoppingBag className={`${baseClass} text-blue-600`} />;
      case 'important':
      case 'alert':
        return <FiAlertCircle className={`${baseClass} text-red-600`} />;
      case 'featured':
      case 'promotion':
        return <FiStar className={`${baseClass} text-yellow-500`} />;
      default:
        return <FiBell className={`${baseClass} text-gray-500`} />;
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative text-gray-700 px-3 py-2 hover:bg-gray-50 transition-all navbar-icon-hover ${
          unreadCount > 0 ? 'animate-pulse' : ''
        }`}
        title={unreadCount > 0 ? `${unreadCount} new notification${unreadCount > 1 ? 's' : ''}` : 'Notifications'}
      >
        <FiBell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className={`absolute -top-1 -right-1 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ${
            offerNotifications.length > 0 
              ? 'bg-yellow-500 animate-bounce' 
              : 'bg-red-500'
          }`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-[100] max-h-96 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {displayNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <FiBell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {displayNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {getNotificationIcon(notification.type || 'default')}
                          <p
                            className={`text-sm font-medium ${
                              !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                            }`}
                          >
                            {notification.title}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="ml-2 flex-shrink-0">
                          <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 10 && (
            <div className="px-4 py-2 border-t border-gray-200 text-center">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

