/**
 * Navbar category chips config (no hardcoding in CategoryChips).
 * Update here when fixed chips or excluded slugs change.
 */

export interface NavbarChipItem {
  name: string;
  slug: string;
  icon: string;
  subcategorySlug?: string;
  subcategories?: unknown[];
  isDefault?: boolean;
}

/** Fixed chips shown in navbar on all pages (order matters – Services last) */
export const NAVBAR_FIXED_CHIPS: NavbarChipItem[] = [
  { name: 'Cars', slug: 'vehicles', icon: 'directions_car', subcategorySlug: 'cars', subcategories: [] },
  { name: 'Mobile Phones', slug: 'mobiles', icon: 'smartphone', subcategorySlug: 'mobile-phones', subcategories: [] },
  { name: 'Laptops', slug: 'electronics-appliances', icon: 'laptop_mac', subcategorySlug: 'laptops', subcategories: [] },
  { name: 'Motorcycles', slug: 'vehicles', icon: 'motorcycle', subcategorySlug: 'motorcycles', subcategories: [] },
  { name: 'Properties', slug: 'properties', icon: 'home', subcategorySlug: 'apartments', subcategories: [] },
  { name: 'Fashion', slug: 'fashion', icon: 'checkroom', subcategories: [] },
  { name: 'Jobs', slug: 'jobs', icon: 'work', subcategories: [] },
  { name: 'Services', slug: 'services', icon: 'build', subcategories: [] },
  { name: 'Books & Sports', slug: 'books-sports-hobbies', icon: 'menu_book', subcategories: [] },
  { name: 'Baby & Kids', slug: 'baby-kids', icon: 'child_care', subcategories: [] },
  { name: 'Beauty & Health', slug: 'beauty-health', icon: 'spa', subcategories: [] },
  { name: 'Free Stuff', slug: 'free-stuff', icon: 'card_giftcard', subcategories: [] },
  { name: 'Commercial', slug: 'commercial-industrial', icon: 'precision_manufacturing', subcategories: [] },
];

/** Category slugs that are already in fixed chips (don’t duplicate from API) */
export const NAVBAR_FIXED_SLUGS = new Set<string>([
  'vehicles',
  'mobiles',
  'electronics-appliances',
  'electronics',
  'services',
  'properties',
  'fashion',
  'jobs',
  'books-sports-hobbies',
  'baby-kids',
  'beauty-health',
  'free-stuff',
  'commercial-industrial',
  'pets',
  'books',
]);

/** Category slugs to exclude from dynamic “rest” chips in navbar */
export const NAVBAR_EXCLUDED_SLUGS = new Set<string>(['books']);

/** Category nav bar: All Categories + these 10 categories */
export const NAVBAR_CATEGORY_NAV_ITEMS: NavbarChipItem[] = [
  { name: 'Cars', slug: 'vehicles', icon: 'directions_car', subcategorySlug: 'cars', subcategories: [] },
  { name: 'Mobile Phones', slug: 'mobiles', icon: 'smartphone', subcategorySlug: 'mobile-phones', subcategories: [] },
  { name: 'Laptops', slug: 'electronics-appliances', icon: 'laptop_mac', subcategorySlug: 'laptops', subcategories: [] },
  { name: 'Motorcycles', slug: 'vehicles', icon: 'motorcycle', subcategorySlug: 'motorcycles', subcategories: [] },
  { name: 'Properties', slug: 'properties', icon: 'home', subcategorySlug: 'apartments', subcategories: [] },
  { name: 'Fashion', slug: 'fashion', icon: 'checkroom', subcategories: [] },
  { name: 'Jobs', slug: 'jobs', icon: 'work', subcategories: [] },
  { name: 'Services', slug: 'services', icon: 'build', subcategories: [] },
  { name: 'Pets', slug: 'pets', icon: 'pets', subcategories: [] },
  { name: 'Books', slug: 'books', icon: 'menu_book', subcategories: [] },
];
