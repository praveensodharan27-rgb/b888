'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', padding: '1rem' }}>
      <div style={{ maxWidth: '28rem', width: '100%', backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '2rem', textAlign: 'center' }}>
        <div style={{ width: '4rem', height: '4rem', color: '#ef4444', margin: '0 auto 1rem', fontSize: '4rem' }}>⚠️</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>Something went wrong!</h1>
        <p style={{ color: '#4b5563', marginBottom: '1.5rem' }}>
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{ padding: '0.5rem 1.5rem', backgroundColor: '#2563eb', color: 'white', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}
          >
            Try again
          </button>
          <Link
            href="/"
            style={{ padding: '0.5rem 1.5rem', backgroundColor: '#e5e7eb', color: '#374151', borderRadius: '0.5rem', textDecoration: 'none', display: 'inline-block' }}
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

