'use client';

import Link from 'next/link';

type LinkItem = { href: string; label: string };

type Props = {
  city?: string | null;
  state?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  subcategorySlug?: string | null;
  subcategoryName?: string | null;
  brand?: string | null;
  condition?: string | null;
};

function slugify(s: string): string {
  return (s || '').toString().trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
}

export default function InternalLinkCards({
  city,
  state,
  categorySlug,
  categoryName,
  subcategorySlug,
  subcategoryName,
  brand,
  condition,
}: Props) {
  const links: LinkItem[] = [];
  const catName = categoryName || 'items';
  const subName = subcategoryName || '';
  const locCity = city || '';
  const locState = state || '';
  const citySlug = slugify(locCity);
  const stateSlug = slugify(locState);

  // Category in City (e.g. "Mobiles in Kozhikode")
  if (locCity && categorySlug) {
    links.push({
      href: `/ads?location=${encodeURIComponent(citySlug)}&category=${encodeURIComponent(categorySlug)}`,
      label: `${catName} in ${locCity}`,
    });
  }

  // Subcategory in City (e.g. "Wagon R in Kozhikode")
  if (locCity && subcategorySlug && subName && subName !== catName) {
    links.push({
      href: `/ads?location=${encodeURIComponent(citySlug)}&category=${encodeURIComponent(categorySlug || '')}&subcategory=${encodeURIComponent(subcategorySlug)}`,
      label: `${subName} in ${locCity}`,
    });
  }

  // Brand + Category in City (e.g. "Maruti Suzuki Cars in Kozhikode")
  if (brand && locCity && categorySlug) {
    links.push({
      href: `/ads?location=${encodeURIComponent(citySlug)}&category=${encodeURIComponent(categorySlug)}&search=${encodeURIComponent(brand)}`,
      label: `${brand} ${catName} in ${locCity}`,
    });
  }

  // Used + Category in City (e.g. "Used Cars in Kozhikode")
  if (locCity && categorySlug) {
    const cond = String(condition || '').toLowerCase();
    const isUsed = cond.includes('used') || cond.includes('pre-owned') || cond.includes('fair') || cond.includes('good');
    if (isUsed) {
      links.push({
        href: `/ads?location=${encodeURIComponent(citySlug)}&category=${encodeURIComponent(categorySlug)}`,
        label: `Used ${catName} in ${locCity}`,
      });
    }
  }

  // Category in State
  if (locState && categorySlug) {
    links.push({
      href: `/ads?location=${encodeURIComponent(stateSlug)}&category=${encodeURIComponent(categorySlug)}`,
      label: `${catName} in ${locState}`,
    });
  }

  // All listings in city
  if (locCity) {
    links.push({
      href: `/ads?location=${encodeURIComponent(citySlug)}`,
      label: `All listings in ${locCity}`,
    });
  }

  // Dedupe by label (e.g. "Used X in City" may match "X in City" - keep unique)
  const seen = new Set<string>();
  const uniqueLinks = links.filter((l) => {
    if (seen.has(l.label)) return false;
    seen.add(l.label);
    return true;
  }).slice(0, 3);

  if (uniqueLinks.length === 0) return null;

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200" aria-label="Explore related listings">
      <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
          <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </span>
        Explore more
      </h2>
      <nav aria-label="Internal links to related categories">
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {uniqueLinks.map((link, i) => (
            <li key={i}>
              <Link
                href={link.href}
                className="flex items-center justify-between gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:bg-primary-50 hover:border-primary-200 hover:shadow-sm transition-all duration-200 group"
              >
                <span className="text-sm font-medium text-gray-900 group-hover:text-primary-700 line-clamp-2 flex-1">
                  {link.label}
                </span>
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gray-100 group-hover:bg-primary-100 transition-colors">
                  <svg className="w-4 h-4 text-gray-500 group-hover:text-primary-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <p className="mt-5 pt-4 border-t border-gray-100 text-sm text-gray-500 leading-relaxed">
        Browse similar listings by category and location. Use these links to find more {catName.toLowerCase()} in your area.
      </p>
    </section>
  );
}
