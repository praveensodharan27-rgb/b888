'use client';

import { useEffect, useRef, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

// ─── Design Tokens (Ant Design / reference style) ───────────────────────────
// Colored background fill + full border + circular icon

const TOAST_STYLES: Record<
  ToastType,
  { bg: string; border: string; iconBg: string; actionColor: string; Icon: React.ReactNode }
> = {
  success: {
    bg: '#E6F7ED',
    border: '#52C41A',
    iconBg: '#52C41A',
    actionColor: '#1890FF',
    Icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  error: {
    bg: '#FFF0F0',
    border: '#FF4D4F',
    iconBg: '#FF4D4F',
    actionColor: '#CF1322',
    Icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
  warning: {
    bg: '#FFFBE6',
    border: '#FAAD14',
    iconBg: '#FAAD14',
    actionColor: '#1890FF',
    Icon: (
      <span className="text-base font-bold">!</span>
    ),
  },
  info: {
    bg: '#E6F7FE',
    border: '#1890FF',
    iconBg: '#1890FF',
    actionColor: '#1890FF',
    Icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6A4.997 4.997 0 0 1 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z" />
      </svg>
    ),
  },
};

// ─── Toast Component ───────────────────────────────────────────────────────

export interface ToastProps {
  visible: boolean;
  title?: string;
  message: string;
  type?: ToastType;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

export function Toast({
  visible,
  title,
  message,
  type = 'info',
  actionLabel,
  onAction,
  onDismiss,
}: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const style = TOAST_STYLES[type];

  useEffect(() => {
    if (!visible) setIsExiting(true);
  }, [visible]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss?.(), 200);
  };

  // Swipe to dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(diff) > 80) handleDismiss();
    setTouchStart(null);
  };

  return (
    <div
      ref={containerRef}
      role="alert"
      aria-live="polite"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`
        w-full max-w-sm min-w-[280px] sm:min-w-[320px]
        rounded-2xl overflow-hidden border
        transition-all duration-200 ease-out
        ${visible && !isExiting
          ? 'opacity-100 translate-y-0 translate-x-0'
          : 'opacity-0 translate-y-2 sm:translate-y-0 sm:translate-x-8 pointer-events-none'}
      `}
      style={{
        backgroundColor: style.bg,
        borderColor: style.border,
        borderWidth: 1,
        boxShadow: '0 4px 16px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex gap-3 p-4">
        {/* Icon - white symbol in colored circle */}
        <div
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white"
          style={{ backgroundColor: style.iconBg }}
        >
          {style.Icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && (
            <p className="text-sm font-bold text-gray-900 truncate">
              {title}
            </p>
          )}
          <p className={`text-sm text-gray-800 ${title ? 'mt-0.5' : ''}`} style={{ lineHeight: 1.5 }}>
            {message}
          </p>
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={() => {
                onAction();
                handleDismiss();
              }}
              className="mt-2 text-sm font-medium underline focus:outline-none focus:ring-2 focus:ring-offset-1 rounded"
              style={{ color: style.actionColor }}
            >
              {actionLabel}
            </button>
          )}
        </div>

        {/* Dismiss */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 p-1 rounded text-gray-500 hover:text-gray-700 hover:bg-black/5 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
