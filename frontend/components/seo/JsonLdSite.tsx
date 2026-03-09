import { getBaseUrl } from '@/lib/seo';

/**
 * WebSite + Organization JSON-LD for the root layout.
 * Renders in <head> or <body>; search engines accept both.
 */
export default function JsonLdSite() {
  const baseUrl = getBaseUrl();

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${baseUrl}/#organization`,
    name: 'Sell Box',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    description: 'Buy and sell anything in your local area. Post free classified ads.',
  };

  const webSite = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Sell Box',
    url: baseUrl,
    description: 'Buy and sell anything in your local area. Post free classified ads.',
    publisher: { '@id': `${baseUrl}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${baseUrl}/ads?search={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSite) }}
      />
    </>
  );
}
