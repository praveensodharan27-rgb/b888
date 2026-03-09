import type { Metadata } from 'next';
import { getBaseUrl, getApiUrl, getApiBaseOrigin } from '@/lib/seo';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ userId: string }>;
};

async function fetchUser(userId: string) {
  const apiUrl = getApiUrl();
  try {
    const res = await fetch(`${apiUrl}/user/public/${encodeURIComponent(userId)}`, {
      next: { revalidate: 60 },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.success ? data.user : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { userId } = await params;
  const user = await fetchUser(userId);

  if (!user) {
    return {
      title: 'User Not Found | Sell Box',
      description: 'The requested user profile could not be found.',
    };
  }

  const baseUrl = getBaseUrl();
  const canonical = `${baseUrl}/user/${userId}`;
  const name = user.name || 'User';
  const bio = typeof user.bio === 'string' && user.bio.trim() ? user.bio.slice(0, 155) : `${name}'s profile on Sell Box - Buy and Sell Anything`;
  const adsCount = user._count?.ads ?? 0;
  const description = bio.length >= 50 ? bio : `${name} - ${adsCount} listing${adsCount !== 1 ? 's' : ''} on Sell Box.`;

  return {
    title: `${name} | Sell Box`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${name} | Sell Box`,
      description,
      type: 'profile',
      url: canonical,
      siteName: 'Sell Box',
      images: user.avatar
        ? [{ url: user.avatar.startsWith('http') ? user.avatar : `${getApiBaseOrigin()}${user.avatar.startsWith('/') ? '' : '/'}${user.avatar}`, width: 400, height: 400, alt: `${name} avatar` }]
        : undefined,
    },
    twitter: {
      card: 'summary',
      title: `${name} | Sell Box`,
      description,
    },
  };
}

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return children;
}
