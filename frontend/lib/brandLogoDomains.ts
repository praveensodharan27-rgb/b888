/**
 * Brand name → domain (for download) and local logo path.
 * Keys use canonical casing (BMW, Hyundai, Tata, Mahindra, etc.) to match
 * the filter-options API so major brands always resolve to a logo.
 * Logos are stored in public/images/brands/{slug}.png
 */
const BRAND_DOMAINS: Record<string, string> = {
  BMW: 'bmw.com',
  Hyundai: 'hyundai.com',
  Kia: 'kia.com',
  Tata: 'tatamotors.com',
  'Tata Motors': 'tatamotors.com',
  Mahindra: 'mahindra.com',
  Honda: 'honda.com',
  Toyota: 'toyota.com',
  Suzuki: 'suzuki.com',
  Maruti: 'marutisuzuki.com',
  'Maruti Suzuki': 'marutisuzuki.com',
  Ford: 'ford.com',
  Volkswagen: 'volkswagen.com',
  VW: 'volkswagen.com',
  Skoda: 'skoda-auto.com',
  MG: 'mg.co.uk',
  Renault: 'renault.com',
  Nissan: 'nissan.com',
  Jeep: 'jeep.com',
  Mercedes: 'mercedes-benz.com',
  'Mercedes-Benz': 'mercedes-benz.com',
  Audi: 'audi.com',
  Volvo: 'volvo.com',
  Jaguar: 'jaguar.com',
  'Land Rover': 'landrover.com',
  Porsche: 'porsche.com',
  Lexus: 'lexus.com',
  Xiaomi: 'mi.com',
  Samsung: 'samsung.com',
  Apple: 'apple.com',
  OnePlus: 'oneplus.com',
  Oppo: 'oppo.com',
  Vivo: 'vivo.com',
  Realme: 'realme.com',
  Motorola: 'motorola.com',
  Nokia: 'nokia.com',
  Google: 'google.com',
  Huawei: 'huawei.com',
  Sony: 'sony.com',
  Asus: 'asus.com',
  Lenovo: 'lenovo.com',
  HP: 'hp.com',
  Dell: 'dell.com',
  Acer: 'acer.com',
  MSI: 'msi.com',
};

const BRAND_DOMAINS_LOWER = Object.fromEntries(
  Object.entries(BRAND_DOMAINS).map(([k, v]) => [k.toLowerCase(), v])
);

/** Domain to filename slug: bmw.com → bmw, mercedes-benz.com → mercedes-benz */
function domainToSlug(domain: string): string {
  return domain.split('.')[0] ?? domain.replace(/\./g, '-');
}

/**
 * Returns local logo path for filter sidebar.
 * API returns canonical names (BMW, Hyundai, Tata, etc.); lookup is exact then case-insensitive
 * so major brands always get a logo. Unknown brands return null (sidebar shows first-letter fallback).
 * Run `npm run download-brand-logos` (from frontend) to populate public/images/brands/*.png
 */
export function getBrandLogoUrl(brandName: string | null | undefined): string | null {
  if (!brandName || typeof brandName !== 'string') return null;
  const trimmed = brandName.trim();
  if (!trimmed) return null;
  const domain = BRAND_DOMAINS[trimmed] ?? BRAND_DOMAINS_LOWER[trimmed.toLowerCase()];
  if (!domain) return null;
  const slug = domainToSlug(domain);
  return `/images/brands/${slug}.png`;
}

/** All unique domains for the download script */
export function getBrandDomainsForDownload(): string[] {
  return [...new Set(Object.values(BRAND_DOMAINS))];
}
