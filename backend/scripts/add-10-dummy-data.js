/**
 * Add 10 Dummy Data Entries
 * Creates 10 dummy users and 10 dummy ads for testing
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

// Dummy product data
const dummyProducts = [
  { title: 'iPhone 15 Pro 256GB', price: 95000, condition: 'NEW', description: 'Brand new iPhone 15 Pro, unopened box, 256GB storage, all accessories included.' },
  { title: 'Samsung Galaxy S24 Ultra', price: 85000, condition: 'LIKE_NEW', description: 'Like new Samsung Galaxy S24 Ultra, used for 1 month, excellent condition.' },
  { title: 'MacBook Air M3 13 inch', price: 110000, condition: 'NEW', description: 'Brand new MacBook Air with M3 chip, 13 inch display, 512GB SSD.' },
  { title: 'Sony WH-1000XM5 Headphones', price: 28000, condition: 'LIKE_NEW', description: 'Premium noise cancelling headphones, excellent condition.' },
  { title: 'iPad Pro 12.9 inch 256GB', price: 95000, condition: 'NEW', description: 'Brand new iPad Pro 12.9 inch, 256GB storage, WiFi + Cellular.' },
  { title: 'Dell XPS 15 Laptop', price: 95000, condition: 'USED', description: 'Dell XPS 15 laptop, 16GB RAM, 512GB SSD, good condition.' },
  { title: 'Canon EOS R6 Camera', price: 180000, condition: 'LIKE_NEW', description: 'Professional mirrorless camera, excellent condition, includes lens.' },
  { title: 'Apple Watch Series 9', price: 45000, condition: 'NEW', description: 'Brand new Apple Watch Series 9, GPS + Cellular, 45mm.' },
  { title: 'Nike Air Max 270', price: 8000, condition: 'NEW', description: 'Brand new Nike Air Max 270, size 10, original box.' },
  { title: 'Samsung 55" 4K Smart TV', price: 55000, condition: 'LIKE_NEW', description: 'Samsung 55 inch 4K Smart TV, used for 3 months, excellent condition.' }
];

async function addDummyData() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('📦 Adding 10 Dummy Data Entries');
    console.log('='.repeat(80) + '\n');

    await prisma.$connect();
    console.log('✅ Connected to MongoDB\n');

    // Get required data
    const [categories, locations] = await Promise.all([
      prisma.category.findMany({ take: 5, include: { subcategories: true } }),
      prisma.location.findMany({ take: 5 })
    ]);

    if (categories.length === 0) {
      console.error('❌ No categories found. Please create categories first.');
      console.error('   Run: npm run seed-all-categories\n');
      process.exit(1);
    }

    if (locations.length === 0) {
      console.error('❌ No locations found. Please create locations first.');
      console.error('   Run: npm run seed-locations\n');
      process.exit(1);
    }

    // ============================================
    // Step 1: Create 10 Dummy Users
    // ============================================
    console.log('👤 Step 1: Creating 10 dummy users...\n');
    
    const users = [];
    for (let i = 1; i <= 10; i++) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const initials = `DU${i}`;
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const referralCode = `${initials}${random}`;

      try {
        const user = await prisma.user.create({
          data: {
            name: `Dummy User ${i}`,
            email: `dummy${i}@example.com`,
            phone: `+9198765432${i.toString().padStart(2, '0')}`,
            password: hashedPassword,
            role: 'USER',
            isVerified: true,
            showPhone: true,
            freeAdsUsed: 0,
            referralCode: referralCode,
            tags: ['dummy', 'test'],
            locationId: locations[Math.floor(Math.random() * locations.length)].id
          }
        });

        // Create wallet for user
        await prisma.wallet.create({
          data: {
            userId: user.id,
            balance: Math.floor(Math.random() * 10000) // Random balance 0-10000
          }
        });

        users.push(user);
        console.log(`   ✅ Created user ${i}: ${user.email}`);
      } catch (err) {
        if (err.code === 'P2002') {
          // User already exists, find it
          const existingUser = await prisma.user.findFirst({
            where: { email: `dummy${i}@example.com` }
          });
          if (existingUser) {
            users.push(existingUser);
            console.log(`   ⚠️  User ${i} already exists: ${existingUser.email}`);
          }
        } else {
          console.error(`   ❌ Error creating user ${i}:`, err.message);
        }
      }
    }

    console.log(`\n✅ Created/found ${users.length} users\n`);

    // ============================================
    // Step 2: Create 10 Dummy Ads
    // ============================================
    console.log('📢 Step 2: Creating 10 dummy ads...\n');

    const ads = [];
    for (let i = 0; i < 10; i++) {
      const product = dummyProducts[i];
      const user = users[Math.floor(Math.random() * users.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];
      const subcategories = category.subcategories || [];
      const subcategory = subcategories.length > 0 
        ? subcategories[Math.floor(Math.random() * subcategories.length)]
        : null;
      const location = locations[Math.floor(Math.random() * locations.length)];

      // Random status (70% APPROVED, 20% PENDING, 10% other)
      const statusRand = Math.random();
      let status = 'APPROVED';
      if (statusRand < 0.2) status = 'PENDING';
      else if (statusRand < 0.25) status = 'REJECTED';
      else if (statusRand < 0.3) status = 'SOLD';

      // Premium ads (20% chance)
      const isPremium = Math.random() < 0.2;
      const premiumType = isPremium 
        ? ['TOP', 'FEATURED', 'BUMP_UP'][Math.floor(Math.random() * 3)]
        : null;

      // Generate images (using placeholder)
      const imageCount = 1 + Math.floor(Math.random() * 3);
      const images = Array.from({ length: imageCount }, (_, idx) => 
        `https://picsum.photos/800/600?random=${Date.now() + i * 10 + idx}`
      );

      // Generate dates
      const now = new Date();
      const createdAt = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Random date in last 30 days
      const expiresAt = status === 'APPROVED' 
        ? new Date(createdAt.getTime() + (30 + Math.random() * 30) * 24 * 60 * 60 * 1000) // 30-60 days from creation
        : null;

      try {
        const ad = await prisma.ad.create({
          data: {
            title: product.title,
            description: product.description,
            price: product.price,
            originalPrice: product.originalPrice || null,
            discount: product.discount || null,
            condition: product.condition,
            images: images,
            status: status,
            isPremium: isPremium,
            premiumType: premiumType,
            isUrgent: Math.random() < 0.1, // 10% urgent
            views: Math.floor(Math.random() * 500),
            userId: user.id,
            categoryId: category.id,
            subcategoryId: subcategory?.id || null,
            locationId: location.id,
            createdAt: createdAt,
            expiresAt: expiresAt,
            featuredAt: isPremium && premiumType === 'FEATURED' ? createdAt : null,
            bumpedAt: isPremium && premiumType === 'BUMP_UP' ? createdAt : null,
            premiumExpiresAt: isPremium ? expiresAt : null,
            moderationStatus: 'approved',
            autoRejected: false
          }
        });

        ads.push(ad);
        console.log(`   ✅ Created ad ${i + 1}: ${ad.title} (${ad.status})`);
      } catch (err) {
        console.error(`   ❌ Error creating ad ${i + 1}:`, err.message);
      }
    }

    console.log(`\n✅ Created ${ads.length} ads\n`);

    // ============================================
    // Summary
    // ============================================
    console.log('='.repeat(80));
    console.log('📊 Summary');
    console.log('='.repeat(80));
    console.log(`   Users created: ${users.length}`);
    console.log(`   Ads created: ${ads.length}`);
    console.log(`   Approved ads: ${ads.filter(a => a.status === 'APPROVED').length}`);
    console.log(`   Pending ads: ${ads.filter(a => a.status === 'PENDING').length}`);
    console.log(`   Premium ads: ${ads.filter(a => a.isPremium).length}`);
    console.log('\n✅ Dummy data added successfully!\n');

    console.log('📋 Test Credentials:');
    console.log('   Email: dummy1@example.com');
    console.log('   Password: password123');
    console.log('   (Same for dummy2@example.com through dummy10@example.com)\n');

  } catch (error) {
    console.error('\n❌ Error adding dummy data:', error.message);
    if (error.message.includes('authentication failed')) {
      console.error('\n💡 MongoDB authentication failed!');
      console.error('   Fix: powershell -ExecutionPolicy Bypass -File .\\update-mongodb-password.ps1\n');
    } else if (error.message.includes('connect')) {
      console.error('\n💡 Cannot connect to MongoDB!');
      console.error('   Check your connection string in .env\n');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addDummyData()
  .then(() => {
    console.log('✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
