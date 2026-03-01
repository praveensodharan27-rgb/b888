/**
 * Field definitions for specifications - maps field names to full spec objects
 * Used by categories.js to build specs from spec-config.json
 */

const CONDITION_OPTIONS = [
  { id: 'opt-new', value: 'NEW', label: 'New', order: 0 },
  { id: 'opt-like-new', value: 'LIKE_NEW', label: 'Like New', order: 1 },
  { id: 'opt-used', value: 'USED', label: 'Used', order: 2 },
  { id: 'opt-refurbished', value: 'REFURBISHED', label: 'Refurbished', order: 3 },
];

const FUEL_OPTIONS = [
  { id: 'opt-petrol', value: 'Petrol', label: 'Petrol', order: 0 },
  { id: 'opt-diesel', value: 'Diesel', label: 'Diesel', order: 1 },
  { id: 'opt-cng', value: 'CNG', label: 'CNG', order: 2 },
  { id: 'opt-electric', value: 'Electric', label: 'Electric', order: 3 },
  { id: 'opt-hybrid', value: 'Hybrid', label: 'Hybrid', order: 4 },
];

const TRANSMISSION_OPTIONS = [
  { id: 'opt-manual', value: 'Manual', label: 'Manual', order: 0 },
  { id: 'opt-automatic', value: 'Automatic', label: 'Automatic', order: 1 },
  { id: 'opt-amt', value: 'AMT', label: 'AMT', order: 2 },
  { id: 'opt-cvt', value: 'CVT', label: 'CVT', order: 3 },
  { id: 'opt-dct', value: 'DCT', label: 'DCT', order: 4 },
];

const OS_OPTIONS = [
  { id: 'opt-android', value: 'Android', label: 'Android', order: 0 },
  { id: 'opt-ios', value: 'iOS', label: 'iOS', order: 1 },
  { id: 'opt-windows', value: 'Windows', label: 'Windows', order: 2 },
  { id: 'opt-macos', value: 'macOS', label: 'macOS', order: 3 },
];

const FURNISHING_OPTIONS = [
  { id: 'opt-furnished', value: 'Furnished', label: 'Furnished', order: 0 },
  { id: 'opt-semi', value: 'Semi-Furnished', label: 'Semi-Furnished', order: 1 },
  { id: 'opt-unfurnished', value: 'Unfurnished', label: 'Unfurnished', order: 2 },
];

const GENDER_OPTIONS = [
  { id: 'opt-male', value: 'Male', label: 'Male', order: 0 },
  { id: 'opt-female', value: 'Female', label: 'Female', order: 1 },
];

const YES_NO_OPTIONS = [
  { id: 'opt-yes', value: 'Yes', label: 'Yes', order: 0 },
  { id: 'opt-no', value: 'No', label: 'No', order: 1 },
];

// RAM options (mobile, laptop, tablet)
const RAM_OPTIONS = [
  { id: 'opt-ram-2', value: '2 GB', label: '2 GB', order: 0 },
  { id: 'opt-ram-4', value: '4 GB', label: '4 GB', order: 1 },
  { id: 'opt-ram-6', value: '6 GB', label: '6 GB', order: 2 },
  { id: 'opt-ram-8', value: '8 GB', label: '8 GB', order: 3 },
  { id: 'opt-ram-12', value: '12 GB', label: '12 GB', order: 4 },
  { id: 'opt-ram-16', value: '16 GB', label: '16 GB', order: 5 },
  { id: 'opt-ram-32', value: '32 GB', label: '32 GB', order: 6 },
  { id: 'opt-ram-64', value: '64 GB', label: '64 GB', order: 7 },
];

// Laptop / PC: Processor options
const PROCESSOR_OPTIONS = [
  { id: 'opt-cpu-i3', value: 'Intel Core i3', label: 'Intel Core i3', order: 0 },
  { id: 'opt-cpu-i5', value: 'Intel Core i5', label: 'Intel Core i5', order: 1 },
  { id: 'opt-cpu-i7', value: 'Intel Core i7', label: 'Intel Core i7', order: 2 },
  { id: 'opt-cpu-i9', value: 'Intel Core i9', label: 'Intel Core i9', order: 3 },
  { id: 'opt-cpu-ryzen3', value: 'AMD Ryzen 3', label: 'AMD Ryzen 3', order: 4 },
  { id: 'opt-cpu-ryzen5', value: 'AMD Ryzen 5', label: 'AMD Ryzen 5', order: 5 },
  { id: 'opt-cpu-ryzen7', value: 'AMD Ryzen 7', label: 'AMD Ryzen 7', order: 6 },
  { id: 'opt-cpu-ryzen9', value: 'AMD Ryzen 9', label: 'AMD Ryzen 9', order: 7 },
  { id: 'opt-cpu-m1', value: 'Apple M1', label: 'Apple M1', order: 8 },
  { id: 'opt-cpu-m2', value: 'Apple M2', label: 'Apple M2', order: 9 },
  { id: 'opt-cpu-m3', value: 'Apple M3', label: 'Apple M3', order: 10 },
  { id: 'opt-cpu-m4', value: 'Apple M4', label: 'Apple M4', order: 11 },
];

// Laptop: Storage options (also used for mobile storage, gaming console)
const STORAGE_OPTIONS = [
  { id: 'opt-ssd-128', value: '128 GB SSD', label: '128 GB SSD', order: 0 },
  { id: 'opt-ssd-256', value: '256 GB SSD', label: '256 GB SSD', order: 1 },
  { id: 'opt-ssd-512', value: '512 GB SSD', label: '512 GB SSD', order: 2 },
  { id: 'opt-ssd-1tb', value: '1 TB SSD', label: '1 TB SSD', order: 3 },
  { id: 'opt-hdd-1tb', value: '1 TB HDD', label: '1 TB HDD', order: 4 },
  { id: 'opt-ssd-2tb', value: '2 TB SSD', label: '2 TB SSD', order: 5 },
];

// Screen size (TV, tablet, monitor)
const SCREEN_SIZE_OPTIONS = [
  { id: 'opt-scr-24', value: '24 inch', label: '24 inch', order: 0 },
  { id: 'opt-scr-32', value: '32 inch', label: '32 inch', order: 1 },
  { id: 'opt-scr-43', value: '43 inch', label: '43 inch', order: 2 },
  { id: 'opt-scr-55', value: '55 inch', label: '55 inch', order: 3 },
  { id: 'opt-scr-65', value: '65 inch', label: '65 inch', order: 4 },
  { id: 'opt-scr-75', value: '75 inch', label: '75 inch', order: 5 },
];

// Resolution (TV, monitor)
const RESOLUTION_OPTIONS = [
  { id: 'opt-res-hd', value: 'HD (1366x768)', label: 'HD (1366x768)', order: 0 },
  { id: 'opt-res-fhd', value: 'Full HD (1920x1080)', label: 'Full HD (1920x1080)', order: 1 },
  { id: 'opt-res-2k', value: '2K (2560x1440)', label: '2K (2560x1440)', order: 2 },
  { id: 'opt-res-4k', value: '4K (3840x2160)', label: '4K (3840x2160)', order: 3 },
  { id: 'opt-res-8k', value: '8K', label: '8K', order: 4 },
];

// Clothing / footwear size
const SIZE_OPTIONS = [
  { id: 'opt-size-xs', value: 'XS', label: 'XS', order: 0 },
  { id: 'opt-size-s', value: 'S', label: 'S', order: 1 },
  { id: 'opt-size-m', value: 'M', label: 'M', order: 2 },
  { id: 'opt-size-l', value: 'L', label: 'L', order: 3 },
  { id: 'opt-size-xl', value: 'XL', label: 'XL', order: 4 },
  { id: 'opt-size-xxl', value: 'XXL', label: 'XXL', order: 5 },
  { id: 'opt-size-36', value: '36', label: '36', order: 6 },
  { id: 'opt-size-38', value: '38', label: '38', order: 7 },
  { id: 'opt-size-40', value: '40', label: '40', order: 8 },
  { id: 'opt-size-42', value: '42', label: '42', order: 9 },
];

// Seater (sofa)
const SEATER_OPTIONS = [
  { id: 'opt-seat-2', value: '2 Seater', label: '2 Seater', order: 0 },
  { id: 'opt-seat-3', value: '3 Seater', label: '3 Seater', order: 1 },
  { id: 'opt-seat-4', value: '4 Seater', label: '4 Seater', order: 2 },
  { id: 'opt-seat-5', value: '5 Seater', label: '5 Seater', order: 3 },
  { id: 'opt-seat-6', value: '6 Seater', label: '6 Seater', order: 4 },
];

// Field definitions: name -> { label, type, required, options? }
// API name mapping: fuel -> fuel_type, km_driven stays, etc.
const FIELD_DEFINITIONS = {
  brand: { label: 'Brand', type: 'text', required: true },
  model: { label: 'Model', type: 'text', required: true },
  ram: { label: 'RAM', type: 'select', required: false, options: RAM_OPTIONS },
  storage: { label: 'Storage', type: 'select', required: false, options: STORAGE_OPTIONS },
  camera: { label: 'Camera', type: 'text', required: false },
  battery: { label: 'Battery', type: 'text', required: false },
  os: { label: 'OS', type: 'select', required: false, options: OS_OPTIONS },
  condition: { label: 'Condition', type: 'select', required: true, options: CONDITION_OPTIONS },
  type: { label: 'Type', type: 'text', required: false },
  compatible_with: { label: 'Compatible With', type: 'text', required: false },
  screen_size: { label: 'Screen Size', type: 'select', required: false, options: SCREEN_SIZE_OPTIONS },
  resolution: { label: 'Resolution', type: 'select', required: false, options: RESOLUTION_OPTIONS },
  smart_tv: { label: 'Smart TV', type: 'select', required: false, options: YES_NO_OPTIONS },
  processor: { label: 'Processor', type: 'select', required: false, options: PROCESSOR_OPTIONS },
  graphics: { label: 'Graphics', type: 'text', required: false },
  megapixel: { label: 'Megapixel', type: 'text', required: false },
  lens_type: { label: 'Lens Type', type: 'text', required: false },
  power: { label: 'Power', type: 'text', required: false },
  capacity: { label: 'Capacity', type: 'text', required: false },
  controllers: { label: 'Controllers', type: 'text', required: false },
  year: { label: 'Year', type: 'number', required: true },
  fuel: { label: 'Fuel Type', type: 'select', required: true, options: FUEL_OPTIONS },
  fuel_type: { label: 'Fuel Type', type: 'select', required: true, options: FUEL_OPTIONS },
  km_driven: { label: 'KM Driven', type: 'number', required: true },
  transmission: { label: 'Transmission', type: 'select', required: true, options: TRANSMISSION_OPTIONS },
  owners: { label: 'Owners', type: 'number', required: false },
  color: { label: 'Color', type: 'text', required: false },
  warranty: { label: 'Warranty', type: 'text', required: false },
  engine_cc: { label: 'Engine (CC)', type: 'number', required: false },
  gear: { label: 'Gears', type: 'text', required: false },
  part_name: { label: 'Part Name', type: 'text', required: true },
  vehicle_type: { label: 'Vehicle Type', type: 'text', required: false },
  compatible_model: { label: 'Compatible Model', type: 'text', required: false },
  bedrooms: { label: 'Bedrooms', type: 'number', required: false },
  bathrooms: { label: 'Bathrooms', type: 'number', required: false },
  area_sqft: { label: 'Area (Sq Ft)', type: 'number', required: true },
  furnishing: { label: 'Furnishing', type: 'select', required: false, options: FURNISHING_OPTIONS },
  price: { label: 'Price', type: 'number', required: true },
  facing: { label: 'Facing', type: 'text', required: false },
  approved: { label: 'Approved', type: 'select', required: false, options: YES_NO_OPTIONS },
  parking: { label: 'Parking', type: 'text', required: false },
  sharing: { label: 'Sharing', type: 'text', required: false },
  meals: { label: 'Meals', type: 'select', required: false, options: YES_NO_OPTIONS },
  rent: { label: 'Rent', type: 'number', required: false },
  deposit: { label: 'Deposit', type: 'number', required: false },
  material: { label: 'Material', type: 'text', required: false },
  seater: { label: 'Seater', type: 'text', required: false },
  doors: { label: 'Doors', type: 'number', required: false },
  wattage: { label: 'Wattage', type: 'text', required: false },
  size: { label: 'Size', type: 'select', required: false, options: SIZE_OPTIONS },
  seater: { label: 'Seater', type: 'select', required: false, options: SEATER_OPTIONS },
  age_group: { label: 'Age Group', type: 'text', required: false },
  weight: { label: 'Weight', type: 'text', required: false },
  title: { label: 'Title', type: 'text', required: false },
  author: { label: 'Author', type: 'text', required: false },
  publisher: { label: 'Publisher', type: 'text', required: false },
  edition: { label: 'Edition', type: 'text', required: false },
  language: { label: 'Language', type: 'text', required: false },
  sport: { label: 'Sport', type: 'text', required: false },
  name: { label: 'Name', type: 'text', required: false },
  rarity: { label: 'Rarity', type: 'text', required: false },
  breed: { label: 'Breed', type: 'text', required: false },
  age: { label: 'Age', type: 'text', required: false },
  gender: { label: 'Gender', type: 'select', required: false, options: GENDER_OPTIONS },
  vaccinated: { label: 'Vaccinated', type: 'select', required: false, options: YES_NO_OPTIONS },
  quantity: { label: 'Quantity', type: 'number', required: false },
  display: { label: 'Display', type: 'text', required: false },
  connectivity: { label: 'Connectivity', type: 'text', required: false },
  service_type: { label: 'Service Type', type: 'text', required: false },
  experience: { label: 'Experience', type: 'text', required: false },
  location: { label: 'Location', type: 'text', required: false },
  area: { label: 'Area', type: 'text', required: false },
  subject: { label: 'Subject', type: 'text', required: false },
  mode: { label: 'Mode', type: 'text', required: false },
  event_type: { label: 'Event Type', type: 'text', required: false },
  role: { label: 'Role', type: 'text', required: false },
  salary: { label: 'Salary', type: 'text', required: false },
  hours: { label: 'Hours', type: 'text', required: false },
  project_type: { label: 'Project Type', type: 'text', required: false },
  payment: { label: 'Payment', type: 'text', required: false },
  duration: { label: 'Duration', type: 'text', required: false },
  stipend: { label: 'Stipend', type: 'text', required: false },
  certified: { label: 'Certified', type: 'select', required: false, options: YES_NO_OPTIONS },
  expiry: { label: 'Expiry', type: 'text', required: false },
  origin: { label: 'Origin', type: 'text', required: false },
  details: { label: 'Details', type: 'text', required: false },
};

function buildSpecFromField(fieldName, order) {
  const def = FIELD_DEFINITIONS[fieldName] || {
    label: fieldName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    type: 'text',
    required: false,
  };
  const apiName = fieldName === 'fuel' ? 'fuel_type' : fieldName;
  return {
    id: `spec-${apiName}`,
    name: apiName,
    label: def.label,
    type: def.type || 'text',
    required: def.required !== false,
    order: order,
    options: def.options || [],
    customValues: [],
  };
}

module.exports = {
  FIELD_DEFINITIONS,
  buildSpecFromField,
};
