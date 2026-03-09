'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ServicesHomeClient from './ServicesHomeClient';

export default function ServicesPageClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('selected_location') : null;
      if (raw) {
        const loc = JSON.parse(raw);
        if (loc?.slug && loc.slug.trim()) {
          const slug = String(loc.slug).trim().toLowerCase();
          if (slug && slug !== 'india' && slug !== 'all-india') {
            router.replace(`/${slug}/services`);
            return;
          }
        }
      }
    } catch {
      // ignore
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }
  return <ServicesHomeClient />;
}
