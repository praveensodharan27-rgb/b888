'use client';

import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';

/**
 * Responsive Toast Container
 * - Mobile: bottom-center
 * - Desktop: top-right
 * - 3s auto-dismiss, swipe to dismiss
 */
export default function AppToast() {
  const [position, setPosition] = useState<'top-right' | 'bottom-center'>(
    'top-right'
  );

  useEffect(() => {
    const checkMobile = () => {
      setPosition(
        typeof window !== 'undefined' && window.innerWidth < 640
          ? 'bottom-center'
          : 'top-right'
      );
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <Toaster
      position={position}
      toastOptions={{
        duration: 3000,
        style: {
          maxWidth: '100%',
          padding: 0,
          background: 'transparent',
          boxShadow: 'none',
        },
        className: 'app-toast-container',
      }}
      containerStyle={{
        zIndex: 9999,
      }}
    />
  );
}
