'use client';

import Link from 'next/link';

interface InternalLinkingSectionProps {
  /** City for "View more X in {City}" */
  city: string | null;
  /** Category slug for listing URL */
  categorySlug?: string | null;
  /** Category display name (e.g. "Mobiles") */
  categoryName?: string | null;
  /** Brand for "Browse other {Brand} phones" */
  brand?: string | null;
  /** Category type for link text (e.g. "phones", "vehicles") */
  categoryType?: string | null;
}

export function InternalLinkingSection({
  city,
  categorySlug,
  categoryName,
  brand,
  categoryType = 'items',
}: InternalLinkingSectionProps) {
  const links: { href: string; label: string }[] = [];

  if (city && categorySlug) {
    const loc = city.toLowerCase().replace(/\s+/g, '-');
    links.push({
      href: `/ads?location=${encodeURIComponent(loc)}&category=${encodeURIComponent(categorySlug)}`,
      label: `View more ${categoryName || categoryType} in ${city}`,
    });
  }

  if (brand && categoryType) {
    const brandSlug = brand.toLowerCase().replace(/\s+/g, '-');
    links.push({
      href: `/ads?search=${encodeURIComponent(brand)}`,
      label: `Browse other ${brand} ${categoryType}`,
    });
  }

  links.push({
    href: '/ads',
    label: 'Similar items in this price range',
  });

  if (links.length === 0) return null;

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <h2 className="text-base font-bold text-gray-900 mb-4">Explore more</h2>
      <ul className="flex flex-wrap gap-3">
        {links.map((link, i) => (
          <li key={i}>
            <Link
              href={link.href}
              className="text-primary-600 font-medium hover:text-primary-700 hover:underline"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
