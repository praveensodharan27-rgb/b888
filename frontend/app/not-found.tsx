import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', padding: '1rem' }}>
      <div style={{ maxWidth: '28rem', width: '100%', backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '4rem', fontWeight: 'bold', color: '#111827', marginBottom: '1rem' }}>404</h1>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Page Not Found</h2>
        <p style={{ color: '#4b5563', marginBottom: '1.5rem' }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', borderRadius: '0.5rem', textDecoration: 'none' }}
        >
          🏠 Go back home
        </Link>
      </div>
    </div>
  );
}

