const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

// Dummy product data
const productTemplates = [
  // Electronics
  { title: 'iPhone 14 Pro Max 256GB', category: 'electronics', price: 85000, condition: 'NEW', description: 'Brand new iPhone 14 Pro Max, unopened box, 256GB storage, all accessories included.' },
  { title: 'Samsung Galaxy S23 Ultra', category: 'electronics', price: 75000, condition: 'LIKE_NEW', description: 'Like new Samsung Galaxy S23 Ultra, used for 2 months, excellent condition, all original accessories.' },
  { title: 'MacBook Pro M2 13 inch', category: 'electronics', price: 120000, condition: 'NEW', description: 'Brand new MacBook Pro with M2 chip, 13 inch display, 512GB SSD, sealed box.' },
  { title: 'Sony WH-1000XM5 Headphones', category: 'electronics', price: 28000, condition: 'LIKE_NEW', description: 'Premium noise cancelling headphones, used for 3 months, excellent condition.' },
  { title: 'iPad Air 5th Gen 256GB', category: 'electronics', price: 55000, condition: 'NEW', description: 'Brand new iPad Air 5th generation, 256GB storage, WiFi + Cellular, unopened.' },
  { title: 'Dell XPS 15 Laptop', category: 'electronics', price: 95000, condition: 'USED', description: 'Dell XPS 15 laptop, 16GB RAM, 512GB SSD, used for 1 year, good condition.' },
  { title: 'Canon EOS R6 Camera', category: 'electronics', price: 180000, condition: 'LIKE_NEW', description: 'Professional mirrorless camera, used for 6 months, excellent condition, includes lens.' },
  { title: 'Apple Watch Series 9', category: 'electronics', price: 45000, condition: 'NEW', description: 'Brand new Apple Watch Series 9, GPS + Cellular, 45mm, sealed box.' },
  
  // Vehicles
  { title: 'Honda City 2022', category: 'vehicles', price: 1200000, condition: 'USED', description: 'Honda City 2022 model, well maintained, single owner, 25000 km driven, excellent condition.' },
  { title: 'Yamaha R15 V4', category: 'vehicles', price: 180000, condition: 'LIKE_NEW', description: 'Yamaha R15 V4, 2023 model, 5000 km driven, excellent condition, all service records available.' },
  { title: 'Maruti Swift 2021', category: 'vehicles', price: 550000, condition: 'USED', description: 'Maruti Swift 2021, well maintained, 30000 km, single owner, all documents ready.' },
  { title: 'Royal Enfield Classic 350', category: 'vehicles', price: 200000, condition: 'LIKE_NEW', description: 'Royal Enfield Classic 350, 2023 model, 8000 km, excellent condition, custom accessories.' },
  
  // Furniture
  { title: 'Modern Sofa Set 3+2', category: 'furniture', price: 45000, condition: 'LIKE_NEW', description: 'Modern 3+2 sofa set, used for 1 year, excellent condition, premium fabric.' },
  { title: 'King Size Bed with Storage', category: 'furniture', price: 35000, condition: 'USED', description: 'King size bed with storage, wooden frame, used for 2 years, good condition.' },
  { title: 'Dining Table 6 Seater', category: 'furniture', price: 25000, condition: 'LIKE_NEW', description: 'Dining table with 6 chairs, modern design, used for 6 months, excellent condition.' },
  { title: 'Office Desk with Chair', category: 'furniture', price: 12000, condition: 'USED', description: 'Office desk with ergonomic chair, good condition, perfect for home office.' },
  
  // Fashion
  { title: 'Nike Air Max 270', category: 'fashion', price: 8000, condition: 'NEW', description: 'Brand new Nike Air Max 270, size 10, original box, never worn.' },
  { title: 'Levi\'s Jeans 501', category: 'fashion', price: 2500, condition: 'LIKE_NEW', description: 'Levi\'s 501 jeans, size 32, worn few times, excellent condition.' },
  { title: 'Gucci Handbag', category: 'fashion', price: 45000, condition: 'LIKE_NEW', description: 'Authentic Gucci handbag, used for 1 year, excellent condition, original box included.' },
  { title: 'Rolex Watch', category: 'fashion', price: 250000, condition: 'USED', description: 'Authentic Rolex watch, used for 3 years, good condition, all papers available.' },
  
  // Home & Garden
  { title: 'Washing Machine LG 8kg', category: 'home-garden', price: 22000, condition: 'LIKE_NEW', description: 'LG washing machine 8kg capacity, used for 1 year, excellent condition, warranty available.' },
  { title: 'Refrigerator Samsung 300L', category: 'home-garden', price: 28000, condition: 'USED', description: 'Samsung refrigerator 300L, used for 2 years, good working condition.' },
  { title: 'Air Conditioner 1.5 Ton', category: 'home-garden', price: 35000, condition: 'LIKE_NEW', description: 'Split AC 1.5 ton, used for 6 months, excellent condition, installation included.' },
  { title: 'Microwave Oven Samsung', category: 'home-garden', price: 8000, condition: 'USED', description: 'Samsung microwave oven, used for 1 year, good working condition.' },
  
  // Books & Media
  { title: 'Complete Harry Potter Collection', category: 'books-media', price: 3000, condition: 'LIKE_NEW', description: 'Complete Harry Potter book collection, hardcover, excellent condition.' },
  { title: 'Guitar Acoustic Yamaha', category: 'books-media', price: 12000, condition: 'USED', description: 'Yamaha acoustic guitar, used for 2 years, good condition, includes case.' },
  { title: 'PS5 Console with Games', category: 'books-media', price: 45000, condition: 'LIKE_NEW', description: 'PlayStation 5 console with 5 games, used for 3 months, excellent condition.' },
  
  // Sports & Outdoors
  { title: 'Treadmill ProForm', category: 'sports-outdoors', price: 35000, condition: 'LIKE_NEW', description: 'ProForm treadmill, used for 6 months, excellent condition, all features working.' },
  { title: 'Cycling Bike Trek', category: 'sports-outdoors', price: 25000, condition: 'USED', description: 'Trek cycling bike, used for 1 year, good condition, well maintained.' },
  { title: 'Dumbbell Set 50kg', category: 'sports-outdoors', price: 8000, condition: 'LIKE_NEW', description: 'Adjustable dumbbell set 50kg, used for 3 months, excellent condition.' },
  
  // Toys & Games
  { title: 'LEGO Star Wars Set', category: 'toys-games', price: 5000, condition: 'NEW', description: 'Brand new LEGO Star Wars set, sealed box, perfect for collectors.' },
  { title: 'Nintendo Switch Console', category: 'toys-games', price: 28000, condition: 'LIKE_NEW', description: 'Nintendo Switch console with games, used for 1 year, excellent condition.' },
];

// Generate more variations
const generateVariations = () => {
  const variations = [];
  const brands = ['Apple', 'Samsung', 'Sony', 'LG', 'Nike', 'Adidas', 'Canon', 'Nikon', 'Dell', 'HP', 'Lenovo'];
  const conditions = ['NEW', 'LIKE_NEW', 'USED', 'REFURBISHED'];
  const categories = ['electronics', 'vehicles', 'furniture', 'fashion', 'home-garden', 'books-media', 'sports-outdoors', 'toys-games'];
  
  for (let i = 0; i < 100; i++) {
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    
    // Generate price based on category
    let basePrice = 1000;
    if (category === 'electronics') basePrice = 5000 + Math.random() * 200000;
    else if (category === 'vehicles') basePrice = 100000 + Math.random() * 2000000;
    else if (category === 'furniture') basePrice = 5000 + Math.random() * 50000;
    else if (category === 'fashion') basePrice = 500 + Math.random() * 50000;
    else if (category === 'home-garden') basePrice = 2000 + Math.random() * 50000;
    else basePrice = 500 + Math.random() * 50000;
    
    const price = Math.round(basePrice);
    const originalPrice = condition === 'NEW' ? null : Math.round(price * (1.1 + Math.random() * 0.2));
    const discount = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : null;
    
    variations.push({
      title: `${brand} Product ${i + 1}`,
      category,
      price,
      originalPrice,
      discount,
      condition,
      description: `High quality ${brand} product in ${condition.toLowerCase()} condition. Great value for money!`
    });
  }
  
  return variations;
};

async function generateDummyAds() {
  try {
    console.log('🚀 Starting to generate 100 dummy ads...\n');

    // Get existing data
    const [users, categories, locations] = await Promise.all([
      prisma.user.findMany({ take: 10 }),
      prisma.category.findMany({ include: { subcategories: true } }),
      prisma.location.findMany({ take: 10 })
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

    // Generate ad data
    const allTemplates = [...productTemplates, ...generateVariations()].slice(0, 100);
    const ads = [];

    for (let i = 0; i < 100; i++) {
      const template = allTemplates[i];
      
      // Find matching category
      let category = categories.find(c => c.slug === template.category || c.name.toLowerCase().includes(template.category));
      if (!category) {
        category = categories[Math.floor(Math.random() * categories.length)];
      }

      // Get subcategory if available
      const subcategories = category.subcategories || [];
      const subcategory = subcategories.length > 0 
        ? subcategories[Math.floor(Math.random() * subcategories.length)]
        : null;

      // Random user and location
      const user = users[Math.floor(Math.random() * users.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];

      // Random status (80% APPROVED, 15% PENDING, 5% other)
      const statusRand = Math.random();
      let status = 'APPROVED';
      if (statusRand < 0.15) status = 'PENDING';
      else if (statusRand < 0.18) status = 'REJECTED';
      else if (statusRand < 0.20) status = 'SOLD';

      // Premium ads (20% chance)
      const isPremium = Math.random() < 0.2;
      const premiumType = isPremium 
        ? ['TOP', 'FEATURED', 'BUMP_UP'][Math.floor(Math.random() * 3)]
        : null;

      // Generate images (using placeholder)
      const imageCount = 1 + Math.floor(Math.random() * 4);
      const images = Array.from({ length: imageCount }, (_, idx) => 
        `https://picsum.photos/800/600?random=${i * 10 + idx}`
      );

      // Generate dates
      const now = new Date();
      const createdAt = new Date(now.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000); // Random date in last 90 days
      const expiresAt = status === 'APPROVED' 
        ? new Date(createdAt.getTime() + (30 + Math.random() * 60) * 24 * 60 * 60 * 1000) // 30-90 days from creation
        : null;

      const ad = {
        title: template.title,
        description: template.description,
        price: template.price,
        originalPrice: template.originalPrice,
        discount: template.discount,
        condition: template.condition,
        images,
        status,
        isPremium,
        premiumType,
        isUrgent: Math.random() < 0.1, // 10% urgent
        views: Math.floor(Math.random() * 1000),
        userId: user.id,
        categoryId: category.id,
        subcategoryId: subcategory?.id || null,
        locationId: location.id,
        createdAt,
        expiresAt,
        featuredAt: isPremium && premiumType === 'FEATURED' ? createdAt : null,
        bumpedAt: isPremium && premiumType === 'BUMP_UP' ? createdAt : null,
        premiumExpiresAt: isPremium ? expiresAt : null
      };

      ads.push(ad);
    }

    // Insert ads in batches
    console.log('📝 Inserting ads into database...\n');
    const batchSize = 10;
    let inserted = 0;

    for (let i = 0; i < ads.length; i += batchSize) {
      const batch = ads.slice(i, i + batchSize);
      await prisma.ad.createMany({
        data: batch,
        skipDuplicates: true
      });
      inserted += batch.length;
      console.log(`✅ Inserted ${inserted}/100 ads...`);
    }

    console.log(`\n🎉 Successfully generated ${inserted} dummy ads!`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Approved: ${ads.filter(a => a.status === 'APPROVED').length}`);
    console.log(`   - Pending: ${ads.filter(a => a.status === 'PENDING').length}`);
    console.log(`   - Premium: ${ads.filter(a => a.isPremium).length}`);
    console.log(`   - Regular: ${ads.filter(a => !a.isPremium).length}`);

  } catch (error) {
    console.error('❌ Error generating dummy ads:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
generateDummyAds()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

