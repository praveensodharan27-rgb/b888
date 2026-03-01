/**
 * Generate Realistic Demo Ads for OLX-style Marketplace
 * Includes: Mobile Phones, Vehicles, Properties, Electronics
 * Features: Real brand names, Indian pricing, Indian locations, royalty-free images, detailed specifications
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

// Indian cities and states
const INDIAN_LOCATIONS = [
  { city: 'Mumbai', state: 'Maharashtra', neighbourhood: 'Andheri' },
  { city: 'Mumbai', state: 'Maharashtra', neighbourhood: 'Bandra' },
  { city: 'Mumbai', state: 'Maharashtra', neighbourhood: 'Powai' },
  { city: 'Delhi', state: 'Delhi', neighbourhood: 'Connaught Place' },
  { city: 'Delhi', state: 'Delhi', neighbourhood: 'Gurgaon' },
  { city: 'Delhi', state: 'Delhi', neighbourhood: 'Noida' },
  { city: 'Bangalore', state: 'Karnataka', neighbourhood: 'Koramangala' },
  { city: 'Bangalore', state: 'Karnataka', neighbourhood: 'Whitefield' },
  { city: 'Hyderabad', state: 'Telangana', neighbourhood: 'Hitech City' },
  { city: 'Chennai', state: 'Tamil Nadu', neighbourhood: 'Anna Nagar' },
  { city: 'Pune', state: 'Maharashtra', neighbourhood: 'Hinjewadi' },
  { city: 'Kolkata', state: 'West Bengal', neighbourhood: 'Salt Lake' },
  { city: 'Ahmedabad', state: 'Gujarat', neighbourhood: 'Satellite' },
  { city: 'Jaipur', state: 'Rajasthan', neighbourhood: 'Malviya Nagar' },
];

// Royalty-free image URLs using Picsum Photos (reliable placeholder service)
// For production, replace with actual product images from your CDN or image hosting
const getImageUrl = (seed) => {
  return `https://picsum.photos/seed/${seed}/800/600`;
};

// Realistic Mobile Phone Ads
const MOBILE_PHONES = [
  {
    title: 'iPhone 15 Pro Max 256GB - Deep Purple',
    price: 129900,
    originalPrice: 139900,
    condition: 'NEW',
    description: 'Brand new iPhone 15 Pro Max in Deep Purple, 256GB storage. Unopened box with all original accessories including charger, cable, and documentation. Purchased from authorized Apple store. Bill and warranty available. Perfect for photography enthusiasts with ProRAW and ProRes video capabilities.',
    images: [
      getImageUrl('iphone15-1'),
      getImageUrl('iphone15-2'),
    ],
    attributes: {
      brand: 'Apple',
      model: 'iPhone 15 Pro Max',
      storage: '256GB',
      ram: '8GB',
      color: 'Deep Purple',
      display: '6.7" Super Retina XDR OLED',
      processor: 'A17 Pro Chip',
      camera: '48MP Main + 12MP Ultra Wide + 12MP Telephoto',
      battery: '4422 mAh',
      os: 'iOS 17',
      warranty: '1 Year Apple Warranty',
      box: 'Yes',
      charger: 'USB-C Cable Included',
      bill: 'Available',
    },
  },
  {
    title: 'Samsung Galaxy S24 Ultra 512GB - Titanium Black',
    price: 124999,
    originalPrice: 134999,
    condition: 'LIKE_NEW',
    description: 'Samsung Galaxy S24 Ultra in Titanium Black, 512GB storage. Used for only 2 months, excellent condition with screen protector and case applied from day one. All original accessories included. S Pen included. Perfect condition, no scratches. Bill and warranty available.',
    images: [
      getImageUrl('samsung-s24-1'),
      getImageUrl('samsung-s24-2'),
    ],
    attributes: {
      brand: 'Samsung',
      model: 'Galaxy S24 Ultra',
      storage: '512GB',
      ram: '12GB',
      color: 'Titanium Black',
      display: '6.8" Dynamic AMOLED 2X',
      processor: 'Snapdragon 8 Gen 3',
      camera: '200MP Main + 50MP Periscope + 12MP Ultra Wide + 10MP Telephoto',
      battery: '5000 mAh',
      os: 'Android 14 (One UI 6.1)',
      sPen: 'Yes',
      warranty: '1 Year Samsung Warranty',
      box: 'Yes',
      charger: '45W Fast Charger Included',
      bill: 'Available',
    },
  },
  {
    title: 'OnePlus 12 256GB - Silky Black',
    price: 64999,
    originalPrice: 69999,
    condition: 'NEW',
    description: 'Brand new OnePlus 12 in Silky Black, 256GB storage. Unopened sealed box. Latest flagship with Snapdragon 8 Gen 3, 100W fast charging, and 50W wireless charging. Perfect for gaming and photography. Bill and warranty available.',
    images: [
      getImageUrl('oneplus12-1'),
    ],
    attributes: {
      brand: 'OnePlus',
      model: 'OnePlus 12',
      storage: '256GB',
      ram: '12GB',
      color: 'Silky Black',
      display: '6.82" LTPO AMOLED',
      processor: 'Snapdragon 8 Gen 3',
      camera: '50MP Main + 64MP Periscope + 48MP Ultra Wide',
      battery: '5400 mAh',
      charging: '100W SuperVOOC + 50W Wireless',
      os: 'OxygenOS 14 (Android 14)',
      warranty: '1 Year OnePlus Warranty',
      box: 'Yes',
      charger: '100W Charger Included',
      bill: 'Available',
    },
  },
  {
    title: 'Xiaomi 14 Pro 512GB - Black',
    price: 79999,
    originalPrice: 84999,
    condition: 'LIKE_NEW',
    description: 'Xiaomi 14 Pro in Black, 512GB storage. Used for 1 month, excellent condition. Leica camera system with exceptional photography capabilities. 120W fast charging. All accessories included. Bill available.',
    images: [
      getImageUrl('xiaomi14-1'),
    ],
    attributes: {
      brand: 'Xiaomi',
      model: 'Xiaomi 14 Pro',
      storage: '512GB',
      ram: '16GB',
      color: 'Black',
      display: '6.73" LTPO AMOLED',
      processor: 'Snapdragon 8 Gen 3',
      camera: '50MP Leica Main + 50MP Telephoto + 50MP Ultra Wide',
      battery: '4880 mAh',
      charging: '120W Wired + 50W Wireless',
      os: 'MIUI 15 (Android 14)',
      warranty: '1 Year Xiaomi Warranty',
      box: 'Yes',
      charger: '120W Charger Included',
      bill: 'Available',
    },
  },
  {
    title: 'Vivo X100 Pro 256GB - Blue',
    price: 89999,
    originalPrice: 94999,
    condition: 'NEW',
    description: 'Brand new Vivo X100 Pro in Blue, 256GB storage. Unopened box. ZEISS camera system with exceptional low-light photography. MediaTek Dimensity 9300 processor. Perfect for content creators.',
    images: [
      getImageUrl('vivo-x100-1'),
    ],
    attributes: {
      brand: 'Vivo',
      model: 'X100 Pro',
      storage: '256GB',
      ram: '12GB',
      color: 'Blue',
      display: '6.78" LTPO AMOLED',
      processor: 'MediaTek Dimensity 9300',
      camera: '50MP ZEISS Main + 50MP Periscope + 50MP Ultra Wide',
      battery: '5400 mAh',
      charging: '100W FlashCharge + 50W Wireless',
      os: 'Funtouch OS 14 (Android 14)',
      warranty: '1 Year Vivo Warranty',
      box: 'Yes',
      charger: '100W Charger Included',
      bill: 'Available',
    },
  },
  {
    title: 'Realme GT 5 Pro 256GB - Orange',
    price: 44999,
    originalPrice: 49999,
    condition: 'USED',
    description: 'Realme GT 5 Pro in Orange, 256GB storage. Used for 6 months, good condition with minor wear. Snapdragon 8 Gen 3, excellent gaming performance. All accessories included. Bill available.',
    images: [
      getImageUrl('oneplus12-1'),
    ],
    attributes: {
      brand: 'Realme',
      model: 'GT 5 Pro',
      storage: '256GB',
      ram: '12GB',
      color: 'Orange',
      display: '6.78" LTPO AMOLED',
      processor: 'Snapdragon 8 Gen 3',
      camera: '50MP Main + 8MP Ultra Wide + 2MP Macro',
      battery: '5400 mAh',
      charging: '100W SuperVOOC',
      os: 'Realme UI 5.0 (Android 14)',
      warranty: 'Remaining Warranty',
      box: 'Yes',
      charger: '100W Charger Included',
      bill: 'Available',
    },
  },
];

// Realistic Vehicle Ads
const VEHICLES = [
  {
    title: 'Honda City VX CVT 2023 - White',
    price: 1450000,
    originalPrice: 1650000,
    condition: 'USED',
    description: 'Honda City VX CVT 2023 model in White. Single owner, well maintained with regular service at authorized Honda service center. 18,000 km driven. All documents clear including RC, insurance, and PUC. Excellent condition, no accidents. Perfect for family use.',
    images: [
      getImageUrl('honda-city-1'),
      getImageUrl('honda-city-2'),
    ],
    attributes: {
      brand: 'Honda',
      model: 'City VX',
      year: '2023',
      fuel: 'Petrol',
      transmission: 'CVT (Automatic)',
      mileage: '18000 km',
      color: 'White',
      owner: '1st Owner',
      insurance: 'Valid till Dec 2024',
      rto: 'MH-01',
      serviceHistory: 'All service records available',
      accidents: 'No',
      documents: 'All Clear',
      features: 'Sunroof, Touchscreen, Rear Camera, Push Start, Keyless Entry',
    },
  },
  {
    title: 'Yamaha MT-15 V2 2024 - Cyan',
    price: 195000,
    originalPrice: 210000,
    condition: 'LIKE_NEW',
    description: 'Yamaha MT-15 V2 2024 model in Cyan color. Used for only 3 months, 2,500 km driven. Showroom condition with no scratches. All accessories included. First service done. Perfect for city commuting and weekend rides.',
    images: [
      getImageUrl('yamaha-mt15-1'),
      getImageUrl('yamaha-mt15-2'),
    ],
    attributes: {
      brand: 'Yamaha',
      model: 'MT-15 V2',
      year: '2024',
      fuel: 'Petrol',
      transmission: 'Manual',
      mileage: '2500 km',
      color: 'Cyan',
      owner: '1st Owner',
      insurance: 'Valid till Mar 2025',
      rto: 'DL-01',
      serviceHistory: 'First service done',
      accidents: 'No',
      documents: 'All Clear',
      engine: '155cc Liquid Cooled',
      features: 'LED Headlight, Digital Display, ABS, Traction Control',
    },
  },
  {
    title: 'Maruti Swift VDI 2022 - Red',
    price: 650000,
    originalPrice: 750000,
    condition: 'USED',
    description: 'Maruti Swift VDI 2022 model in Red. Well maintained, 35,000 km driven. Regular service done. Single owner. All documents ready. Perfect condition, no major issues. Great fuel economy.',
    images: [
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=600&fit=crop',
    ],
    attributes: {
      brand: 'Maruti Suzuki',
      model: 'Swift VDI',
      year: '2022',
      fuel: 'Diesel',
      transmission: 'Manual',
      mileage: '35000 km',
      color: 'Red',
      owner: '1st Owner',
      insurance: 'Valid till Nov 2024',
      rto: 'KA-03',
      serviceHistory: 'Regular service done',
      accidents: 'No',
      documents: 'All Clear',
      features: 'Touchscreen, Rear Camera, ABS, Airbags',
    },
  },
  {
    title: 'Royal Enfield Classic 350 2023 - Gunmetal Grey',
    price: 225000,
    originalPrice: 245000,
    condition: 'USED',
    description: 'Royal Enfield Classic 350 2023 model in Gunmetal Grey. 8,500 km driven. Well maintained with custom accessories. Single owner. All documents clear. Perfect for long rides and city use.',
    images: [
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&h=600&fit=crop',
    ],
    attributes: {
      brand: 'Royal Enfield',
      model: 'Classic 350',
      year: '2023',
      fuel: 'Petrol',
      transmission: 'Manual',
      mileage: '8500 km',
      color: 'Gunmetal Grey',
      owner: '1st Owner',
      insurance: 'Valid till Feb 2025',
      rto: 'MH-12',
      serviceHistory: 'Regular service done',
      accidents: 'No',
      documents: 'All Clear',
      engine: '349cc Single Cylinder',
      features: 'LED Headlight, Digital Display, ABS, Custom Exhaust',
    },
  },
  {
    title: 'Hyundai Creta SX 2021 - White',
    price: 1250000,
    originalPrice: 1450000,
    condition: 'USED',
    description: 'Hyundai Creta SX 2021 model in White. Single owner, 42,000 km driven. Well maintained with all service records. All documents clear. Excellent condition. Perfect for family.',
    images: [
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=600&fit=crop',
    ],
    attributes: {
      brand: 'Hyundai',
      model: 'Creta SX',
      year: '2021',
      fuel: 'Petrol',
      transmission: 'Manual',
      mileage: '42000 km',
      color: 'White',
      owner: '1st Owner',
      insurance: 'Valid till Oct 2024',
      rto: 'DL-03',
      serviceHistory: 'All service records available',
      accidents: 'No',
      documents: 'All Clear',
      features: 'Sunroof, Touchscreen, Rear Camera, Push Start, Keyless Entry, ABS, Airbags',
    },
  },
];

// Realistic Property Ads
const PROPERTIES = [
  {
    title: '2 BHK Flat for Sale in Koramangala, Bangalore',
    price: 8500000,
    originalPrice: null,
    condition: 'NEW',
    description: 'Beautiful 2 BHK flat in prime location Koramangala, Bangalore. 1200 sqft carpet area. Fully furnished with modern amenities. 3rd floor, good ventilation. Gated community with 24/7 security, parking, lift, and power backup. Near schools, hospitals, and metro station. Ready to move in.',
    images: [
      getImageUrl('apartment-koramangala-1'),
      getImageUrl('apartment-koramangala-2'),
    ],
    attributes: {
      type: 'Flat',
      bedrooms: '2 BHK',
      bathrooms: '2',
      area: '1200 sqft',
      carpetArea: '1200 sqft',
      floor: '3rd Floor',
      totalFloors: '8',
      furnishing: 'Fully Furnished',
      facing: 'East',
      age: 'New Construction',
      parking: '1 Car Parking',
      lift: 'Yes',
      powerBackup: 'Yes',
      security: '24/7 Security',
      amenities: 'Gym, Clubhouse, Swimming Pool, Garden',
      location: 'Koramangala',
      city: 'Bangalore',
      state: 'Karnataka',
      nearby: 'Schools, Hospitals, Metro Station',
    },
  },
  {
    title: '3 BHK Independent House in Whitefield, Bangalore',
    price: 12500000,
    originalPrice: null,
    condition: 'USED',
    description: 'Spacious 3 BHK independent house in Whitefield, Bangalore. 2400 sqft built-up area. Well maintained, 5 years old. 3 bedrooms, 3 bathrooms, kitchen, living room, and study room. Large garden area. Gated community with security. Near IT parks and schools.',
    images: [
      getImageUrl('house-whitefield-1'),
      getImageUrl('house-whitefield-2'),
    ],
    attributes: {
      type: 'Independent House',
      bedrooms: '3 BHK',
      bathrooms: '3',
      area: '2400 sqft',
      builtUpArea: '2400 sqft',
      plotArea: '3000 sqft',
      floors: '2 Floors',
      furnishing: 'Semi-Furnished',
      facing: 'North',
      age: '5 Years',
      parking: '2 Car Parking',
      garden: 'Yes',
      security: '24/7 Security',
      amenities: 'Gym, Clubhouse, Swimming Pool',
      location: 'Whitefield',
      city: 'Bangalore',
      state: 'Karnataka',
      nearby: 'IT Parks, Schools, Hospitals',
    },
  },
  {
    title: '1 BHK Studio Apartment in Andheri, Mumbai',
    price: 5500000,
    originalPrice: null,
    condition: 'NEW',
    description: 'Compact 1 BHK studio apartment in Andheri West, Mumbai. 650 sqft carpet area. Modern design, fully furnished. 12th floor with sea view. Gated society with all amenities. Near metro station and shopping malls. Perfect for working professionals.',
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop',
    ],
    attributes: {
      type: 'Studio Apartment',
      bedrooms: '1 BHK',
      bathrooms: '1',
      area: '650 sqft',
      carpetArea: '650 sqft',
      floor: '12th Floor',
      totalFloors: '15',
      furnishing: 'Fully Furnished',
      facing: 'West (Sea View)',
      age: 'New Construction',
      parking: '1 Car Parking',
      lift: 'Yes',
      powerBackup: 'Yes',
      security: '24/7 Security',
      amenities: 'Gym, Swimming Pool, Garden',
      location: 'Andheri West',
      city: 'Mumbai',
      state: 'Maharashtra',
      nearby: 'Metro Station, Shopping Malls',
    },
  },
];

// Realistic Electronics Ads
const ELECTRONICS = [
  {
    title: 'MacBook Pro 16" M3 Pro 1TB - Space Grey',
    price: 249900,
    originalPrice: 269900,
    condition: 'NEW',
    description: 'Brand new MacBook Pro 16" with M3 Pro chip, 1TB SSD storage, 18GB unified memory. Unopened sealed box. Perfect for professional work, video editing, and development. All original accessories included. Bill and warranty available.',
    images: [
      getImageUrl('macbook-pro-1'),
      getImageUrl('macbook-pro-2'),
    ],
    attributes: {
      brand: 'Apple',
      model: 'MacBook Pro 16"',
      processor: 'M3 Pro Chip',
      ram: '18GB Unified Memory',
      storage: '1TB SSD',
      display: '16.2" Liquid Retina XDR',
      graphics: '18-Core GPU',
      color: 'Space Grey',
      os: 'macOS Sonoma',
      warranty: '1 Year Apple Warranty',
      box: 'Yes',
      charger: '140W USB-C Power Adapter Included',
      bill: 'Available',
    },
  },
  {
    title: 'Samsung 55" QLED 4K Smart TV - QA55Q80C',
    price: 125000,
    originalPrice: 145000,
    condition: 'LIKE_NEW',
    description: 'Samsung 55" QLED 4K Smart TV, used for 4 months. Excellent condition, no scratches. Perfect picture quality with Quantum Dot technology. All original accessories and remote included. Bill and warranty available.',
    images: [
      getImageUrl('samsung-tv-1'),
    ],
    attributes: {
      brand: 'Samsung',
      model: 'QA55Q80C',
      size: '55 inch',
      display: 'QLED 4K UHD',
      resolution: '3840 x 2160',
      smartTV: 'Yes (Tizen OS)',
      hdr: 'HDR10+',
      refreshRate: '120Hz',
      ports: '4x HDMI, 2x USB, Ethernet, Optical Audio',
      warranty: '1 Year Samsung Warranty',
      box: 'Yes',
      remote: 'Smart Remote Included',
      bill: 'Available',
    },
  },
  {
    title: 'Sony WH-1000XM5 Noise Cancelling Headphones',
    price: 28999,
    originalPrice: 32999,
    condition: 'LIKE_NEW',
    description: 'Sony WH-1000XM5 premium noise cancelling headphones. Used for 2 months, excellent condition. Industry-leading noise cancellation, 30-hour battery life. All original accessories and case included. Perfect for travel and work.',
    images: [
      getImageUrl('sony-headphones-1'),
    ],
    attributes: {
      brand: 'Sony',
      model: 'WH-1000XM5',
      type: 'Over-Ear Wireless',
      noiseCancellation: 'Industry-Leading ANC',
      battery: '30 Hours (ANC On)',
      charging: 'USB-C, Quick Charge (3 min = 3 hours)',
      connectivity: 'Bluetooth 5.2, NFC, 3.5mm Jack',
      codec: 'LDAC, AAC, SBC',
      warranty: '1 Year Sony Warranty',
      box: 'Yes',
      accessories: 'Carrying Case, USB-C Cable, 3.5mm Cable',
      bill: 'Available',
    },
  },
  {
    title: 'Canon EOS R6 Mark II Mirrorless Camera with 24-105mm Lens',
    price: 245000,
    originalPrice: 275000,
    condition: 'USED',
    description: 'Canon EOS R6 Mark II professional mirrorless camera with RF 24-105mm f/4L IS USM lens. Used for 1 year, excellent condition. Perfect for photography and videography. All original accessories, 2 batteries, charger, and camera bag included. Bill available.',
    images: [
      getImageUrl('canon-camera-1'),
    ],
    attributes: {
      brand: 'Canon',
      model: 'EOS R6 Mark II',
      sensor: '24.2MP Full-Frame CMOS',
      lens: 'RF 24-105mm f/4L IS USM',
      iso: '100-102400 (Expandable to 204800)',
      video: '4K 60fps, Full HD 180fps',
      autofocus: 'Dual Pixel CMOS AF II',
      stabilization: 'In-Body Image Stabilization (IBIS)',
      battery: 'LP-E6NH (2 Batteries Included)',
      warranty: 'Remaining Warranty',
      box: 'Yes',
      accessories: 'Charger, Camera Bag, Memory Card (64GB)',
      bill: 'Available',
    },
  },
  {
    title: 'iPad Pro 12.9" M2 256GB WiFi + Cellular - Space Grey',
    price: 119999,
    originalPrice: 129999,
    condition: 'NEW',
    description: 'Brand new iPad Pro 12.9" with M2 chip, 256GB storage, WiFi + Cellular. Unopened sealed box. Perfect for professionals, artists, and content creators. All original accessories included. Bill and warranty available.',
    images: [
      getImageUrl('ipad-pro-1'),
    ],
    attributes: {
      brand: 'Apple',
      model: 'iPad Pro 12.9"',
      processor: 'M2 Chip',
      storage: '256GB',
      display: '12.9" Liquid Retina XDR',
      connectivity: 'WiFi + Cellular (5G)',
      color: 'Space Grey',
      os: 'iPadOS 17',
      warranty: '1 Year Apple Warranty',
      box: 'Yes',
      charger: 'USB-C Cable Included',
      bill: 'Available',
    },
  },
  {
    title: 'PlayStation 5 Console with 2 Controllers and 5 Games',
    price: 54999,
    originalPrice: 64999,
    condition: 'LIKE_NEW',
    description: 'PlayStation 5 console with 2 DualSense controllers. Used for 3 months, excellent condition. Includes 5 games: Spider-Man 2, God of War Ragnarok, Horizon Forbidden West, Gran Turismo 7, and Ratchet & Clank. All original accessories and box included.',
    images: [
      getImageUrl('ps5-console-1'),
    ],
    attributes: {
      brand: 'Sony',
      model: 'PlayStation 5',
      storage: '825GB SSD',
      controllers: '2x DualSense Controllers',
      games: '5 Games Included',
      resolution: '4K UHD, 120fps Support',
      rayTracing: 'Yes',
      warranty: 'Remaining Warranty',
      box: 'Yes',
      accessories: 'HDMI Cable, Power Cable, USB Cable',
      bill: 'Available',
    },
  },
];

// Combine all ads
const ALL_ADS = [
  ...MOBILE_PHONES,
  ...VEHICLES,
  ...PROPERTIES,
  ...ELECTRONICS,
];

async function generateRealisticDemoAds() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('📦 Generating Realistic Demo Ads for OLX Marketplace');
    console.log('='.repeat(80) + '\n');

    // Get required data
    const [users, categories, locations] = await Promise.all([
      prisma.user.findMany({ take: 20 }),
      prisma.category.findMany({ include: { subcategories: true } }),
      prisma.location.findMany({ take: 50 }),
    ]);

    if (users.length === 0) {
      console.error('❌ No users found. Please create at least one user first.');
      process.exit(1);
    }

    if (categories.length === 0) {
      console.error('❌ No categories found. Please create categories first.');
      process.exit(1);
    }

    if (locations.length === 0) {
      console.error('❌ No locations found. Please create locations first.');
      process.exit(1);
    }

    console.log(`✅ Found ${users.length} users, ${categories.length} categories, ${locations.length} locations\n`);

    // Map ads to categories
    const categoryMap = {
      'mobile': ['mobile', 'phone', 'smartphone'],
      'vehicle': ['vehicle', 'car', 'bike', 'motorcycle', 'scooter'],
      'property': ['property', 'real-estate', 'flat', 'house', 'apartment'],
      'electronics': ['electronics', 'laptop', 'tv', 'camera', 'headphone', 'tablet', 'gaming'],
    };

    const adsToCreate = [];

    for (const adData of ALL_ADS) {
      // Determine category
      let category = null;
      let subcategory = null;

      if (adData.title.toLowerCase().includes('phone') || adData.title.toLowerCase().includes('iphone') || 
          adData.title.toLowerCase().includes('samsung galaxy') || adData.title.toLowerCase().includes('oneplus') ||
          adData.title.toLowerCase().includes('xiaomi') || adData.title.toLowerCase().includes('vivo') ||
          adData.title.toLowerCase().includes('realme')) {
        category = categories.find(c => c.slug?.toLowerCase().includes('mobile') || c.name?.toLowerCase().includes('mobile'));
      } else if (adData.title.toLowerCase().includes('car') || adData.title.toLowerCase().includes('bike') ||
                 adData.title.toLowerCase().includes('motorcycle') || adData.title.toLowerCase().includes('scooter') ||
                 adData.title.toLowerCase().includes('honda') || adData.title.toLowerCase().includes('yamaha') ||
                 adData.title.toLowerCase().includes('royal enfield') || adData.title.toLowerCase().includes('maruti') ||
                 adData.title.toLowerCase().includes('hyundai')) {
        category = categories.find(c => c.slug?.toLowerCase().includes('vehicle') || c.name?.toLowerCase().includes('vehicle') || 
                                       c.slug?.toLowerCase().includes('car') || c.name?.toLowerCase().includes('car'));
      } else if (adData.title.toLowerCase().includes('flat') || adData.title.toLowerCase().includes('house') ||
                 adData.title.toLowerCase().includes('apartment') || adData.title.toLowerCase().includes('bhk') ||
                 adData.title.toLowerCase().includes('property')) {
        category = categories.find(c => c.slug?.toLowerCase().includes('property') || c.name?.toLowerCase().includes('property') ||
                                       c.slug?.toLowerCase().includes('real') || c.name?.toLowerCase().includes('real'));
      } else {
        category = categories.find(c => c.slug?.toLowerCase().includes('electronics') || c.name?.toLowerCase().includes('electronics') ||
                                       c.slug?.toLowerCase().includes('laptop') || c.name?.toLowerCase().includes('laptop') ||
                                       c.slug?.toLowerCase().includes('tv') || c.name?.toLowerCase().includes('tv'));
      }

      if (!category) {
        category = categories[0]; // Fallback to first category
      }

      // Get subcategory if available
      const subcategories = category.subcategories || [];
      if (subcategories.length > 0) {
        subcategory = subcategories[Math.floor(Math.random() * subcategories.length)];
      }

      // Random user and location
      const user = users[Math.floor(Math.random() * users.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];

      // Get location details
      const locData = INDIAN_LOCATIONS[Math.floor(Math.random() * INDIAN_LOCATIONS.length)];

      // Random status (85% APPROVED, 10% PENDING, 5% other)
      const statusRand = Math.random();
      let status = 'APPROVED';
      if (statusRand < 0.10) status = 'PENDING';
      else if (statusRand < 0.12) status = 'REJECTED';
      else if (statusRand < 0.15) status = 'SOLD';

      // Premium ads (25% chance)
      const isPremium = Math.random() < 0.25;
      const premiumType = isPremium 
        ? ['TOP', 'FEATURED', 'BUMP_UP'][Math.floor(Math.random() * 3)]
        : null;

      // Generate dates
      const now = new Date();
      const createdAt = new Date(now.getTime() - Math.random() * 60 * 24 * 60 * 60 * 1000); // Random date in last 60 days
      const expiresAt = status === 'APPROVED' 
        ? new Date(createdAt.getTime() + (30 + Math.random() * 30) * 24 * 60 * 60 * 1000) // 30-60 days from creation
        : null;

      const ad = {
        title: adData.title,
        description: adData.description,
        price: adData.price,
        originalPrice: adData.originalPrice || null,
        discount: adData.originalPrice ? Math.round(((adData.originalPrice - adData.price) / adData.originalPrice) * 100) : null,
        condition: adData.condition,
        images: adData.images,
        status,
        isPremium,
        premiumType,
        isUrgent: Math.random() < 0.15, // 15% urgent
        views: Math.floor(Math.random() * 500),
        userId: user.id,
        categoryId: category.id,
        subcategoryId: subcategory?.id || null,
        locationId: location.id,
        state: locData.state,
        city: locData.city,
        neighbourhood: locData.neighbourhood,
        attributes: adData.attributes,
        createdAt,
        expiresAt,
        featuredAt: isPremium && premiumType === 'FEATURED' ? createdAt : null,
        bumpedAt: isPremium && premiumType === 'BUMP_UP' ? createdAt : null,
        premiumExpiresAt: isPremium ? expiresAt : null,
        moderationStatus: status === 'APPROVED' ? 'approved' : status === 'PENDING' ? 'pending' : 'rejected',
      };

      adsToCreate.push(ad);
    }

    // Insert ads
    console.log('📝 Inserting ads into database...\n');
    const batchSize = 5;
    let inserted = 0;

    for (let i = 0; i < adsToCreate.length; i += batchSize) {
      const batch = adsToCreate.slice(i, i + batchSize);
      for (const ad of batch) {
        try {
          await prisma.ad.create({ data: ad });
          inserted++;
          console.log(`✅ Inserted ${inserted}/${adsToCreate.length}: ${ad.title.substring(0, 50)}...`);
        } catch (error) {
          console.error(`❌ Error inserting ad "${ad.title}":`, error.message);
        }
      }
    }

    console.log(`\n🎉 Successfully generated ${inserted} realistic demo ads!`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Mobile Phones: ${MOBILE_PHONES.length}`);
    console.log(`   - Vehicles: ${VEHICLES.length}`);
    console.log(`   - Properties: ${PROPERTIES.length}`);
    console.log(`   - Electronics: ${ELECTRONICS.length}`);
    console.log(`   - Total: ${inserted} ads`);
    console.log(`   - Approved: ${adsToCreate.filter(a => a.status === 'APPROVED').length}`);
    console.log(`   - Premium: ${adsToCreate.filter(a => a.isPremium).length}`);

  } catch (error) {
    console.error('❌ Error generating demo ads:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
generateRealisticDemoAds()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
