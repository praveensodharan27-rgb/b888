/**
 * Shared image constants for the app.
 * Use local fallback to avoid external requests (e.g. via.placeholder.com) and ERR_NAME_NOT_RESOLVED.
 */
export const PLACEHOLDER_IMAGE = '/placeholder.svg';

/** Treat these as invalid – never pass to next/image (unconfigured host / 500). */
export function isInvalidImageSrc(src: string | null | undefined): boolean {
  if (!src || typeof src !== 'string') return true;
  const s = src.trim();
  return s === '' || s.includes('via.placeholder.com');
}
