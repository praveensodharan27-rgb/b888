'use client';

import { useEffect, useCallback, useRef } from 'react';

/**
 * Run an async function once on mount (with optional dependency refresh).
 * Best practice: pass a useCallback so the effect deps are correct and lint-clean.
 *
 * @example
 * const fetchProfile = useCallback(async () => {
 *   const res = await api.get('/user/profile');
 *   setData(res.data);
 * }, []);
 *
 * useRunOnce(fetchProfile);
 *
 * Or with deps (re-run if userId changes):
 * const fetchProfile = useCallback(async () => { ... }, [userId]);
 * useRunOnce(fetchProfile);
 */
export function useRunOnce(fn: () => void | Promise<void>) {
  useEffect(() => {
    void Promise.resolve(fn());
  }, [fn]);
}
