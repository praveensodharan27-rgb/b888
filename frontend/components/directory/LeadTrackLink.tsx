'use client';

import { useCallback } from 'react';

type Props = {
  href: string;
  children: React.ReactNode;
  type: 'call' | 'whatsapp' | 'contact';
  businessId: string;
  className?: string;
};

export function LeadTrackLink({ href, children, type, businessId, className }: Props) {
  const track = useCallback(() => {
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || '';
      fetch(`${api}/directory/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, businessId, metadata: { ts: new Date().toISOString() } }),
      }).catch(() => {});
    } catch (_) {}
  }, [type, businessId]);

  return (
    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined} className={className} onClick={track}>
      {children}
    </a>
  );
}
