'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const DEFAULT_COOLDOWN_SECONDS = 60;

/**
 * Countdown timer for OTP resend cooldown.
 * Call start() when OTP is sent; secondsLeft counts down from initialSeconds.
 */
export function useOTPTimer(initialSeconds: number = DEFAULT_COOLDOWN_SECONDS) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clearTimer();
    setSecondsLeft(initialSeconds);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [initialSeconds, clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setSecondsLeft(0);
  }, [clearTimer]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const formatted = secondsLeft > 0
    ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`
    : '';

  return {
    secondsLeft,
    formatted,
    isActive: secondsLeft > 0,
    start,
    reset,
  };
}
