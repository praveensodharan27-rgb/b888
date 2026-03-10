/**
 * Central SEO config. Use these in metadata, sitemap, robots, and JSON-LD.
 * Set NEXT_PUBLIC_BASE_URL in production (e.g. https://yoursite.com).
 */

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_BASE_URL || 'http://148.230.67.118:3000';
  return trimTrailingSlash(String(url).trim());
}

export function getApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://148.230.67.118:5000/api';
  const trimmed = String(url).trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

/** Base URL for API server (no /api) - used for image URLs from API */
export function getApiBaseOrigin(): string {
  const apiUrl = getApiUrl();
  return apiUrl.replace(/\/api\/?$/, '');
}
