/**
 * Text formatting utilities for consistent display across the app.
 */

/**
 * Capitalize the first letter of a string.
 * Safe for null/undefined/empty; other characters unchanged.
 * e.g. "iphone 14" → "Iphone 14", "john" → "John"
 */
export function capitalizeFirst(str: string | null | undefined): string {
  if (str == null || typeof str !== 'string') return '';
  const s = String(str).trim();
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Format ad title for display (capitalize first letter).
 */
export function formatAdTitle(title: string | null | undefined): string {
  return capitalizeFirst(title ?? '');
}
