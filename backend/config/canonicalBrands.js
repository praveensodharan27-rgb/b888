/**
 * Canonical brand display names for filter-options API.
 * Keys are lowercase; values match frontend brandLogoDomains.ts keys exactly
 * so that logo lookup and display are consistent (BMW, Hyundai, Tata, etc.).
 */
const CANONICAL_BRANDS = {
  bmw: 'BMW',
  hyundai: 'Hyundai',
  kia: 'Kia',
  tata: 'Tata',
  'tata motors': 'Tata Motors',
  mahindra: 'Mahindra',
  honda: 'Honda',
  toyota: 'Toyota',
  suzuki: 'Suzuki',
  maruti: 'Maruti',
  'maruti suzuki': 'Maruti Suzuki',
  ford: 'Ford',
  volkswagen: 'Volkswagen',
  vw: 'VW',
  skoda: 'Skoda',
  mg: 'MG',
  renault: 'Renault',
  nissan: 'Nissan',
  jeep: 'Jeep',
  mercedes: 'Mercedes',
  'mercedes-benz': 'Mercedes-Benz',
  audi: 'Audi',
  volvo: 'Volvo',
  jaguar: 'Jaguar',
  'land rover': 'Land Rover',
  landrover: 'Land Rover',
  porsche: 'Porsche',
  lexus: 'Lexus',
  xiaomi: 'Xiaomi',
  mi: 'Xiaomi',
  samsung: 'Samsung',
  apple: 'Apple',
  oneplus: 'OnePlus',
  oppo: 'Oppo',
  vivo: 'Vivo',
  realme: 'Realme',
  motorola: 'Motorola',
  nokia: 'Nokia',
  google: 'Google',
  huawei: 'Huawei',
  sony: 'Sony',
  asus: 'Asus',
  lenovo: 'Lenovo',
  hp: 'HP',
  dell: 'Dell',
  acer: 'Acer',
  msi: 'MSI',
};

/**
 * @param {string} brandValue - Raw brand from ad (e.g. "bmw", "BMW", "Tata Motors")
 * @returns {string} Canonical display name for API/frontend (e.g. "BMW", "Tata Motors") or original if unknown
 */
function toCanonicalBrand(brandValue) {
  if (!brandValue || typeof brandValue !== 'string') return brandValue;
  const trimmed = brandValue.trim();
  if (!trimmed) return brandValue;
  const lower = trimmed.toLowerCase();
  return CANONICAL_BRANDS[lower] ?? trimmed;
}

module.exports = { CANONICAL_BRANDS, toCanonicalBrand };
