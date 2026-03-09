import { useRef, useCallback, useEffect } from 'react';

/**
 * Returns a stable callback that invokes the latest fn after delay ms.
 * Cancels pending invocation on unmount or when fn/delay change.
 * Use for search inputs, filter inputs, and other rapid user input to avoid excessive API calls.
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  const fnRef = useRef(fn);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastArgsRef = useRef<Parameters<T> | null>(null);

  fnRef.current = fn;

  const cancel = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    lastArgsRef.current = null;
  }, []);

  useEffect(() => {
    return cancel;
  }, [cancel]);

  return useCallback(
    (...args: Parameters<T>) => {
      lastArgsRef.current = args;
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        const args = lastArgsRef.current;
        lastArgsRef.current = null;
        if (args !== null) {
          fnRef.current(...args);
        }
      }, delay);
    },
    [delay]
  );
}
