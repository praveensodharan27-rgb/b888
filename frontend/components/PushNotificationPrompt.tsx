'use client';

import { useEffect, useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/hooks/useAuth';
import { FiBell, FiBellOff, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function PushNotificationPrompt() {
  const { isAuthenticated } = useAuth();
  const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only show prompt if:
    // 1. User is authenticated
    // 2. Push notifications are supported
    // 3. User is not already subscribed
    // 4. Prompt hasn't been dismissed
    if (isAuthenticated && isSupported && !isSubscribed && !dismissed && !isLoading) {
      // Check if user has dismissed before (stored in localStorage)
      const hasDismissed = localStorage.getItem('push-notification-dismissed');
      if (!hasDismissed) {
        // Show prompt after a short delay
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 3000); // Show after 3 seconds

        return () => clearTimeout(timer);
      }
    }
  }, [isAuthenticated, isSupported, isSubscribed, dismissed, isLoading]);

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      toast.success('Push notifications enabled!');
      setShowPrompt(false);
    } else {
      toast.error('Failed to enable push notifications');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('push-notification-dismissed', 'true');
  };

  if (!isAuthenticated || !isSupported || isSubscribed || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-sm z-50 animate-slide-up">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <FiBell className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-gray-900">Enable Notifications</h3>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <FiX className="w-5 h-5" />
        </button>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Get instant notifications about new offers, messages, and updates!
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleSubscribe}
          className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm font-semibold"
        >
          Enable
        </button>
        <button
          onClick={handleDismiss}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
        >
          Not Now
        </button>
      </div>
    </div>
  );
}

// Settings component for managing push notifications
export function PushNotificationSettings() {
  const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      if (isSubscribed) {
        const success = await unsubscribe();
        if (success) {
          toast.success('Push notifications disabled');
        } else {
          toast.error('Failed to disable push notifications');
        }
      } else {
        const success = await subscribe();
        if (success) {
          toast.success('Push notifications enabled');
        } else {
          toast.error('Failed to enable push notifications');
        }
      }
    } finally {
      setIsToggling(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          Push notifications are not supported in your browser.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            {isSubscribed ? <FiBell className="w-5 h-5 text-primary-600" /> : <FiBellOff className="w-5 h-5 text-gray-400" />}
            Push Notifications
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {isSubscribed
              ? 'You will receive push notifications for offers and updates'
              : 'Enable to receive instant notifications'}
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={isLoading || isToggling}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            isSubscribed
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          } ${isLoading || isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isLoading || isToggling ? 'Loading...' : isSubscribed ? 'Disable' : 'Enable'}
        </button>
      </div>
    </div>
  );
}

