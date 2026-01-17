export const AUTH_QUOTES: string[] = [
  'Protect the earth today, so tomorrow can breathe.',
  'Saving nature is saving ourselves.',
  'Less pollution, more life.',
  'Heal the earth, secure the future.',
  'A cleaner planet begins with conscious choices.',
  'When pollution stops, life starts.',
  'Care for the earth — it’s the only home we have.',
  'Reduce pollution. Restore balance.',
  'A green earth is a living earth.',
  'Protect nature today, so life continues tomorrow.',
];

const SESSION_KEY = 'sellit_auth_quote_v1';

function safeGetSessionItem(key: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetSessionItem(key: string, value: string): void {
  try {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function getOrCreateSessionAuthQuote(): string {
  const existing = safeGetSessionItem(SESSION_KEY);
  if (existing && existing.trim()) return existing;

  const random = AUTH_QUOTES[Math.floor(Math.random() * AUTH_QUOTES.length)] || AUTH_QUOTES[0] || '';
  safeSetSessionItem(SESSION_KEY, random);
  return random;
}

