import type { MetadataRoute } from 'next';
import { getBaseUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.NODE_ENV === 'production';
  const allowIndexing =
    isProduction && process.env.NEXT_PUBLIC_SEO_INDEXABLE !== 'false';

  if (!allowIndexing) {
    return {
      rules: { userAgent: '*', disallow: '/' },
    };
  }

  const baseUrl = getBaseUrl();
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/auth/callback'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
