'use client';

/**
 * Toast Design System - Marketplace / OLX-like
 *
 * Style: Minimal, rounded corners, soft shadow, smooth animation
 * Duration: 3s auto-dismiss
 * Position: Bottom center (mobile) | Top right (desktop)
 *
 * Types: success (green) | error (red) | warning (orange) | info (blue)
 */

import { Toaster, toast as rhToast, type ToastOptions } from 'react-hot-toast';
import { Toast as ToastComponent } from '@/components/ui/Toast';

// Re-export Toaster for use in layout
export { Toaster };

// ─── Design Tokens ─────────────────────────────────────────────────────────

export const TOAST = {
  duration: 3000,
  success: { bg: '#059669', icon: '✓' },
  error: { bg: '#dc2626', icon: '✕' },
  warning: { bg: '#ea580c', icon: '!' },
  info: { bg: '#2563eb', icon: 'i' },
} as const;

// ─── Predefined Messages (emotionally positive, short & clear) ──────────────

export const TOAST_MESSAGES = {
  // 1. Ad Posted Successfully
  adPostedSuccess: {
    title: 'Success',
    message: 'Your ad is live 🎉 More buyers will see it now.',
    type: 'success' as const,
  },
  // 2. Ad Under Review
  adUnderReview: {
    title: 'Under Review',
    message: "Your ad is being reviewed. Usually live within 3 minutes.",
    type: 'info' as const,
  },
  // 3. Ad Rejected (Policy)
  adRejected: {
    title: 'Rejected',
    message: 'This ad violates our content policy. Please update and retry.',
    type: 'error' as const,
  },
  // 4. Image Upload Failed
  imageUploadFailed: {
    title: 'Upload Failed',
    message: 'Could not upload image. Please try again.',
    type: 'error' as const,
  },
  // 5. Nudity Detected
  nudityDetected: {
    title: 'Not Allowed',
    message: 'Adult content is not permitted. Please upload another image.',
    type: 'error' as const,
  },
  // 6. Network Error
  networkError: {
    title: 'Connection Error',
    message: 'No internet. Check your connection.',
    type: 'error' as const,
  },
  // 7. Login Success
  loginSuccess: {
    title: 'Welcome',
    message: 'Login successful. Happy selling!',
    type: 'success' as const,
  },
  // 8. Form Validation Error
  formValidationError: {
    title: 'Missing Info',
    message: 'Please fill all required fields.',
    type: 'warning' as const,
  },
  // 9. Premium Activated
  premiumActivated: {
    title: 'Premium Active',
    message: 'Your ad is boosted 🚀 Enjoy more visibility!',
    type: 'success' as const,
  },
  // 10. Draft Saved
  draftSaved: {
    title: 'Saved',
    message: 'Your draft is saved successfully.',
    type: 'success' as const,
  },
  // 11. Seller Plus / Business Package Activated
  sellerPlusActivated: {
    title: '🚀 Seller Plus Activated',
    message: 'Enjoy premium benefits for 30 days!',
    type: 'success' as const,
  },
} as const;

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastMessageKey = keyof typeof TOAST_MESSAGES;

// ─── Toast API ─────────────────────────────────────────────────────────────

export interface ShowToastOptions {
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
}

function showToast(
  options: ShowToastOptions | string,
  type: ToastType = 'info'
): string {
  const opts: ShowToastOptions =
    typeof options === 'string'
      ? { message: options, type }
      : { ...options, type: options.type ?? type };

  const toastOpts: ToastOptions = {
    duration: opts.duration ?? TOAST.duration,
    position: 'top-right', // Overridden by responsive AppToast
  };

  // Use custom toast for full design control
  return rhToast.custom(
    (t) => (
      <ToastComponent
        visible={t.visible}
        title={opts.title}
        message={opts.message}
        type={opts.type ?? 'info'}
        actionLabel={opts.actionLabel}
        onAction={opts.onAction}
        onDismiss={() => rhToast.dismiss(t.id)}
      />
    ),
    toastOpts
  );
}

// Parse (title, message) vs (message) vs (message, opts) for backward compat
function parseArgs(
  a: string,
  b?: string | Partial<ShowToastOptions>,
  c?: Partial<ShowToastOptions>
): ShowToastOptions {
  const opts = (typeof b === 'object' ? b : c) ?? {};
  if (b !== undefined && typeof b === 'string') return { title: a, message: b, ...opts };
  return { message: a, ...opts };
}

// Convenience methods: toast.success('msg') | toast.success('Title','msg') | toast.success('msg', { duration: 5 })
export const toast = {
  success: (a: string, b?: string | Partial<ShowToastOptions>, c?: Partial<ShowToastOptions>) =>
    showToast({ ...parseArgs(a, b, c), type: 'success' }),
  error: (a: string, b?: string | Partial<ShowToastOptions>, c?: Partial<ShowToastOptions>) =>
    showToast({ ...parseArgs(a, b, c), type: 'error' }),
  warning: (a: string, b?: string | Partial<ShowToastOptions>, c?: Partial<ShowToastOptions>) =>
    showToast({ ...parseArgs(a, b, c), type: 'warning' }),
  info: (a: string, b?: string | Partial<ShowToastOptions>, c?: Partial<ShowToastOptions>) =>
    showToast({ ...parseArgs(a, b, c), type: 'info' }),

  // Predefined marketplace messages
  adPostedSuccess: (opts?: Partial<ShowToastOptions>) => {
    const m = TOAST_MESSAGES.adPostedSuccess;
    return showToast({ ...m, ...opts });
  },
  adUnderReview: (opts?: Partial<ShowToastOptions>) => {
    const m = TOAST_MESSAGES.adUnderReview;
    return showToast({ ...m, ...opts });
  },
  adRejected: (opts?: Partial<ShowToastOptions>) => {
    const m = TOAST_MESSAGES.adRejected;
    return showToast({ ...m, ...opts });
  },
  imageUploadFailed: (opts?: Partial<ShowToastOptions>) => {
    const m = TOAST_MESSAGES.imageUploadFailed;
    return showToast({ ...m, ...opts });
  },
  nudityDetected: (opts?: Partial<ShowToastOptions>) => {
    const m = TOAST_MESSAGES.nudityDetected;
    return showToast({ ...m, ...opts });
  },
  networkError: (opts?: Partial<ShowToastOptions>) => {
    const m = TOAST_MESSAGES.networkError;
    return showToast({ ...m, ...opts });
  },
  loginSuccess: (opts?: Partial<ShowToastOptions>) => {
    const m = TOAST_MESSAGES.loginSuccess;
    return showToast({ ...m, ...opts });
  },
  formValidationError: (opts?: Partial<ShowToastOptions>) => {
    const m = TOAST_MESSAGES.formValidationError;
    return showToast({ ...m, ...opts });
  },
  premiumActivated: (opts?: Partial<ShowToastOptions>) => {
    const m = TOAST_MESSAGES.premiumActivated;
    return showToast({ ...m, ...opts });
  },
  draftSaved: (opts?: Partial<ShowToastOptions>) => {
    const m = TOAST_MESSAGES.draftSaved;
    return showToast({ ...m, ...opts });
  },
  sellerPlusActivated: (opts?: Partial<ShowToastOptions>) => {
    const m = TOAST_MESSAGES.sellerPlusActivated;
    return showToast({ ...m, ...opts });
  },

  // Raw message (backward compatible with react-hot-toast)
  custom: (
    title: string,
    message: string,
    type: ToastType = 'info',
    opts?: Partial<ShowToastOptions>
  ) => showToast({ title, message, type, ...opts }),

  dismiss: rhToast.dismiss,
  promise: rhToast.promise,
  loading: rhToast.loading,
};

export default toast;
