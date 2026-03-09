import { Metadata } from 'next';
import { getApiUrl } from '@/lib/seo';
import PublicBusinessPageClient from './PublicBusinessPageClient';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!slug) return { title: 'Business' };
  try {
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/business/public/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { title: 'Business' };
    const json = await res.json();
    const b = json?.data;
    if (!b?.businessName) return { title: 'Business' };
    const title = `Best ${b.category} in ${b.city || 'your city'} – ${b.businessName}`;
    const description =
      (b.description && b.description.slice(0, 160)) ||
      `${b.businessName} – ${b.category}${b.city ? ` in ${b.city}` : ''}. Contact: ${b.phone || ''}`.slice(0, 160);
    const image = b.coverImage || b.logo;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        ...(image && { images: [{ url: image, width: 1200, height: 630, alt: b.businessName }] }),
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    };
  } catch {
    return { title: 'Business' };
  }
}

export default async function PublicBusinessPage({ params }: Props) {
  const { slug } = await params;
  return <PublicBusinessPageClient slug={slug} />;
}
