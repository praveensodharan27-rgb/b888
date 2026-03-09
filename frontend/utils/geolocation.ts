/**
 * Geolocation utilities - Optimized for performance
 *
 * Performance improvements:
 * - Reduced timeout from 15s to 5s
 * - Prevent retry loops on failure
 * - Only run on user action (not auto)
 */

const GEOLOCATION_TIMEOUT_MS = 5000; // Reduced from 15s to 5s
const GEOLOCATION_MAX_AGE_MS = 300000;  // Accept cached position up to 5 min (increased)

export interface GeolocationResult {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface GeolocationError {
  code: number; // 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT
  message: string;
}

// Track failed attempts to prevent retry loops
const failedAttempts = new Map<string, number>();
const MAX_RETRIES = 1; // Only retry once
const RETRY_COOLDOWN_MS = 60000; // 1 minute cooldown

/**
 * Get current position with optimized timeout and retry prevention
 */
export function getCurrentPosition(): Promise<GeolocationResult> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      reject({ code: 0, message: 'Geolocation not supported' });
      return;
    }

    // Check if we've failed too many times recently
    const now = Date.now();
    const lastFailTime = failedAttempts.get('last_fail') || 0;
    const failCount = failedAttempts.get('count') || 0;

    if (failCount >= MAX_RETRIES && (now - lastFailTime) < RETRY_COOLDOWN_MS) {
      reject({ 
        code: 3, 
        message: 'Location request temporarily disabled. Please try again later.' 
      });
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let settled = false;

    const clearAndReject = (err: GeolocationError) => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      
      // Track failure
      failedAttempts.set('last_fail', Date.now());
      failedAttempts.set('count', (failedAttempts.get('count') || 0) + 1);
      
      reject(err);
    };

    const clearAndResolve = (result: GeolocationResult) => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      
      // Reset failure count on success
      failedAttempts.set('count', 0);
      
      resolve(result);
    };

    // Reduced timeout for faster failure
    timeoutId = setTimeout(() => {
      clearAndReject({ code: 3, message: 'Location request timed out' });
    }, GEOLOCATION_TIMEOUT_MS);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        if (
          typeof latitude !== 'number' ||
          typeof longitude !== 'number' ||
          isNaN(latitude) ||
          isNaN(longitude) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          clearAndReject({ code: 2, message: 'Invalid coordinates received' });
          return;
        }
        clearAndResolve({ latitude, longitude, accuracy });
      },
      (error: GeolocationPositionError) => {
        const code = error?.code ?? 2;
        const message = error?.message ?? 'Location unavailable';
        clearAndReject({ code, message });
      },
      {
        enableHighAccuracy: false, // Faster, more reliable
        timeout: GEOLOCATION_TIMEOUT_MS,
        maximumAge: GEOLOCATION_MAX_AGE_MS,
      }
    );
  });
}

/** Check if geolocation error is retryable (timeout, position unavailable) */
export function isRetryableGeolocationError(code: number): boolean {
  return code === 2 || code === 3; // POSITION_UNAVAILABLE or TIMEOUT
}

/** Check if user explicitly denied (don't retry) */
export function isPermissionDenied(code: number): boolean {
  return code === 1;
}

/** Reset failure tracking (for manual retry button) */
export function resetGeolocationFailures(): void {
  failedAttempts.clear();
}

/** Check if geolocation is currently in cooldown */
export function isGeolocationInCooldown(): boolean {
  const now = Date.now();
  const lastFailTime = failedAttempts.get('last_fail') || 0;
  const failCount = failedAttempts.get('count') || 0;
  return failCount >= MAX_RETRIES && (now - lastFailTime) < RETRY_COOLDOWN_MS;
}
