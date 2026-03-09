/**
 * Service categories for JustDial-style routing (category = subcategory slug under "services").
 * Keep in sync with ServiceButtons and backend services category.
 */
export const SERVICE_CATEGORY_SLUG = 'services';

export const SERVICE_CATEGORIES = [
  { id: 'all', label: 'All Services', slug: undefined as string | undefined, subSlug: undefined },
  { id: 'plumbers', label: 'Plumbers', slug: 'plumbing', subSlug: 'plumbing' },
  { id: 'electricians', label: 'Electricians', slug: 'electrician', subSlug: 'electrician' },
  { id: 'cleaning', label: 'Cleaning', slug: 'cleaning', subSlug: 'cleaning' },
  { id: 'pest-control', label: 'Pest Control', slug: 'pest-control', subSlug: 'pest-control' },
  { id: 'painters', label: 'Painters', slug: 'painters', subSlug: 'painters' },
  { id: 'ac-repair', label: 'AC Repair', slug: 'ac_repair', subSlug: 'ac_repair' },
  { id: 'carpenters', label: 'Carpenters', slug: 'carpenters', subSlug: 'carpenters' },
  { id: 'appliance-repair', label: 'Appliance Repair', slug: 'appliance-repair', subSlug: 'appliance-repair' },
  { id: 'salon', label: 'Salon & Beauty', slug: 'salon-beauty', subSlug: 'salon-beauty' },
  { id: 'photography', label: 'Photography', slug: 'photography', subSlug: 'photography' },
] as const;

export function getServiceCategoryBySlug(slug: string | undefined) {
  if (!slug) return SERVICE_CATEGORIES[0];
  return SERVICE_CATEGORIES.find((c) => c.slug === slug || c.subSlug === slug) ?? { id: 'all', label: 'Services', slug: undefined, subSlug: undefined };
}
