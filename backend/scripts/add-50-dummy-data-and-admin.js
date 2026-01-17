/**
 * Add 50 Dummy Data Entries + Create Admin User
 * Creates 50 dummy users, 50 dummy ads, and an admin user
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

// Extended dummy product data (50 items)
const dummyProducts = [
  // Electronics
  { title: 'iPhone 15 Pro 256GB', price: 95000, condition: 'NEW', description: 'Brand new iPhone 15 Pro, unopened box, 256GB storage, all accessories included.' },
  { title: 'Samsung Galaxy S24 Ultra', price: 85000, condition: 'LIKE_NEW', description: 'Like new Samsung Galaxy S24 Ultra, used for 1 month, excellent condition.' },
  { title: 'MacBook Air M3 13 inch', price: 110000, condition: 'NEW', description: 'Brand new MacBook Air with M3 chip, 13 inch display, 512GB SSD.' },
  { title: 'Sony WH-1000XM5 Headphones', price: 28000, condition: 'LIKE_NEW', description: 'Premium noise cancelling headphones, excellent condition.' },
  { title: 'iPad Pro 12.9 inch 256GB', price: 95000, condition: 'NEW', description: 'Brand new iPad Pro 12.9 inch, 256GB storage, WiFi + Cellular.' },
  { title: 'Dell XPS 15 Laptop', price: 95000, condition: 'USED', description: 'Dell XPS 15 laptop, 16GB RAM, 512GB SSD, good condition.' },
  { title: 'Canon EOS R6 Camera', price: 180000, condition: 'LIKE_NEW', description: 'Professional mirrorless camera, excellent condition, includes lens.' },
  { title: 'Apple Watch Series 9', price: 45000, condition: 'NEW', description: 'Brand new Apple Watch Series 9, GPS + Cellular, 45mm.' },
  { title: 'Samsung 55" 4K Smart TV', price: 55000, condition: 'LIKE_NEW', description: 'Samsung 55 inch 4K Smart TV, used for 3 months, excellent condition.' },
  { title: 'PlayStation 5 Console', price: 50000, condition: 'NEW', description: 'Brand new PlayStation 5 console, unopened box, includes controller.' },
  
  // Vehicles
  { title: 'Honda Activa 6G Scooter', price: 75000, condition: 'LIKE_NEW', description: 'Honda Activa 6G, 2023 model, excellent condition, low mileage.' },
  { title: 'Yamaha MT-15 Motorcycle', price: 180000, condition: 'USED', description: 'Yamaha MT-15, 2022 model, well maintained, all documents clear.' },
  { title: 'Hero Splendor Plus Bike', price: 65000, condition: 'USED', description: 'Hero Splendor Plus, good condition, regular service done.' },
  { title: 'Royal Enfield Classic 350', price: 200000, condition: 'LIKE_NEW', description: 'Royal Enfield Classic 350, 2023 model, showroom condition.' },
  { title: 'Bajaj Pulsar 150', price: 80000, condition: 'USED', description: 'Bajaj Pulsar 150, 2021 model, good running condition.' },
  
  // Furniture
  { title: 'Wooden Sofa Set 3+2', price: 45000, condition: 'USED', description: 'Beautiful wooden sofa set, 3 seater + 2 seater, good condition.' },
  { title: 'King Size Bed with Mattress', price: 35000, condition: 'USED', description: 'King size bed frame with memory foam mattress, excellent condition.' },
  { title: 'Dining Table 6 Seater', price: 25000, condition: 'USED', description: 'Wooden dining table with 6 chairs, good condition.' },
  { title: 'Office Desk and Chair', price: 12000, condition: 'USED', description: 'Ergonomic office desk with comfortable chair, perfect for work from home.' },
  { title: 'Wardrobe 4 Door', price: 20000, condition: 'USED', description: 'Large 4-door wardrobe, spacious, good condition.' },
  
  // Fashion
  { title: 'Nike Air Max 270 Shoes', price: 8000, condition: 'NEW', description: 'Brand new Nike Air Max 270, size 10, original box.' },
  { title: 'Levi\'s Jeans Men\'s 32x32', price: 2500, condition: 'NEW', description: 'Brand new Levi\'s jeans, original tags, never worn.' },
  { title: 'Ray-Ban Aviator Sunglasses', price: 12000, condition: 'LIKE_NEW', description: 'Original Ray-Ban Aviator sunglasses, excellent condition.' },
  { title: 'Fossil Watch Men\'s', price: 15000, condition: 'USED', description: 'Fossil men\'s watch, good condition, working perfectly.' },
  { title: 'Designer Handbag', price: 8000, condition: 'USED', description: 'Designer handbag, good condition, authentic.' },
  
  // Books & Sports
  { title: 'Complete Harry Potter Collection', price: 5000, condition: 'USED', description: 'All 7 Harry Potter books, good condition.' },
  { title: 'Cricket Bat MRF', price: 3000, condition: 'USED', description: 'MRF cricket bat, good condition, used professionally.' },
  { title: 'Yoga Mat Premium', price: 1500, condition: 'NEW', description: 'Premium yoga mat, brand new, unopened.' },
  { title: 'Guitar Acoustic', price: 12000, condition: 'USED', description: 'Acoustic guitar, good condition, includes case.' },
  { title: 'Bicycle Mountain Bike', price: 15000, condition: 'USED', description: 'Mountain bike, 21 gears, good condition.' },
  
  // Appliances
  { title: 'Washing Machine LG 7kg', price: 18000, condition: 'USED', description: 'LG washing machine 7kg, fully automatic, good condition.' },
  { title: 'Refrigerator Samsung 300L', price: 25000, condition: 'USED', description: 'Samsung refrigerator 300L, double door, excellent condition.' },
  { title: 'Microwave Oven LG', price: 6000, condition: 'USED', description: 'LG microwave oven, 20L capacity, working perfectly.' },
  { title: 'Air Conditioner 1.5 Ton', price: 30000, condition: 'USED', description: 'Split AC 1.5 ton, inverter, excellent cooling, well maintained.' },
  { title: 'Water Purifier RO', price: 12000, condition: 'USED', description: 'RO water purifier, 7 stage, good condition.' },
  
  // More items to reach 50
  { title: 'Gaming Chair Ergonomic', price: 8000, condition: 'USED', description: 'Ergonomic gaming chair, comfortable, good condition.' },
  { title: 'Mechanical Keyboard RGB', price: 5000, condition: 'NEW', description: 'RGB mechanical keyboard, brand new, unopened box.' },
  { title: 'Gaming Mouse Wireless', price: 3000, condition: 'NEW', description: 'Wireless gaming mouse, brand new, high DPI.' },
  { title: 'Monitor 27 inch 4K', price: 20000, condition: 'USED', description: '27 inch 4K monitor, excellent display, good condition.' },
  { title: 'Webcam HD 1080p', price: 2500, condition: 'NEW', description: 'HD webcam 1080p, brand new, perfect for video calls.' },
  { title: 'Bluetooth Speaker JBL', price: 4000, condition: 'USED', description: 'JBL Bluetooth speaker, excellent sound quality.' },
  { title: 'Power Bank 20000mAh', price: 2000, condition: 'NEW', description: 'High capacity power bank, brand new, fast charging.' },
  { title: 'Smart Watch Fitness', price: 6000, condition: 'USED', description: 'Fitness smartwatch, tracks steps, heart rate, good condition.' },
  { title: 'Laptop Stand Adjustable', price: 1500, condition: 'NEW', description: 'Adjustable laptop stand, ergonomic, brand new.' },
  { title: 'USB-C Hub Multiport', price: 2000, condition: 'NEW', description: 'USB-C hub with multiple ports, brand new.' },
  { title: 'External Hard Drive 1TB', price: 5000, condition: 'USED', description: '1TB external hard drive, good condition, working perfectly.' },
  { title: 'Printer HP Inkjet', price: 8000, condition: 'USED', description: 'HP inkjet printer, good condition, includes cartridges.' },
  { title: 'Scanner Document', price: 5000, condition: 'USED', description: 'Document scanner, good condition, working perfectly.' },
  { title: 'Projector HD 1080p', price: 25000, condition: 'USED', description: 'HD projector 1080p, excellent for presentations.' },
  { title: 'Drone DJI Mini', price: 60000, condition: 'LIKE_NEW', description: 'DJI Mini drone, like new, includes controller and case.' }
];

async function addDummyDataAndAdmin() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('📦 Adding 50 Dummy Data Entries + Creating Admin User');
    console.log('='.repeat(80) + '\n');

    await prisma.$connect();
    console.log('✅ Connected to MongoDB\n');

    // Get required data
    const [categories, locations] = await Promise.all([
      prisma.category.findMany({ include: { subcategories: true } }),
      prisma.location.findMany()
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
    // Step 1: Create Admin User
    // ============================================
    console.log('👑 Step 1: Creating admin user...\n');
    
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@sellit.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.ADMIN_NAME || 'Admin User';
    const adminPhone = process.env.ADMIN_PHONE || '+919999999999';

    // Check if admin already exists
    let admin = await prisma.user.findFirst({
      where: {
        OR: [
          { email: adminEmail },
          { role: 'ADMIN' }
        ]
      }
    });

    if (admin) {
      if (admin.role === 'ADMIN') {
        console.log(`   ⚠️  Admin user already exists: ${admin.email}`);
        // Update password
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        admin = await prisma.user.update({
          where: { id: admin.id },
          data: { password: hashedPassword, isVerified: true }
        });
        console.log('   ✅ Admin password updated');
      }
    } else {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      admin = await prisma.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          phone: adminPhone,
          password: hashedPassword,
          role: 'ADMIN',
          isVerified: true,
          showPhone: true,
          referralCode: 'ADMIN001'
        }
      });

      // Create wallet for admin
      await prisma.wallet.create({
        data: {
          userId: admin.id,
          balance: 0
        }
      });

      console.log(`   ✅ Admin user created: ${admin.email}`);
    }

    console.log(`\n📋 Admin Credentials:`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role: ${admin.role}\n`);

    // ============================================
    // Step 2: Create 50 Dummy Users
    // ============================================
    console.log('👤 Step 2: Creating 50 dummy users...\n');
    
    const users = [];
    for (let i = 1; i <= 50; i++) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const initials = `DU${i.toString().padStart(2, '0')}`;
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
        if (i % 10 === 0) {
          console.log(`   ✅ Created users ${i - 9} to ${i}...`);
        }
      } catch (err) {
        if (err.code === 'P2002') {
          // User already exists, find it
          const existingUser = await prisma.user.findFirst({
            where: { email: `dummy${i}@example.com` }
          });
          if (existingUser) {
            users.push(existingUser);
          }
        } else {
          console.error(`   ❌ Error creating user ${i}:`, err.message);
        }
      }
    }

    console.log(`\n✅ Created/found ${users.length} users\n`);

    // ============================================
    // Step 3: Create 50 Dummy Ads
    // ============================================
    console.log('📢 Step 3: Creating 50 dummy ads...\n');

    const ads = [];
    for (let i = 0; i < 50; i++) {
      const product = dummyProducts[i] || {
        title: `Product ${i + 1}`,
        price: Math.floor(Math.random() * 100000) + 1000,
        condition: ['NEW', 'LIKE_NEW', 'USED'][Math.floor(Math.random() * 3)],
        description: `Description for product ${i + 1}`
      };
      
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
        if ((i + 1) % 10 === 0) {
          console.log(`   ✅ Created ads ${i - 8} to ${i + 1}...`);
        }
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
    console.log(`   Admin user: ✅ (${admin.email})`);
    console.log(`   Users created: ${users.length}`);
    console.log(`   Ads created: ${ads.length}`);
    console.log(`   Approved ads: ${ads.filter(a => a.status === 'APPROVED').length}`);
    console.log(`   Pending ads: ${ads.filter(a => a.status === 'PENDING').length}`);
    console.log(`   Premium ads: ${ads.filter(a => a.isPremium).length}`);
    console.log('='.repeat(80) + '\n');

    console.log('✅ All dummy data and admin user created successfully!\n');

    console.log('📋 Login Credentials:');
    console.log('   Admin:');
    console.log(`     Email: ${admin.email}`);
    console.log(`     Password: ${adminPassword}`);
    console.log('');
    console.log('   Regular Users:');
    console.log('     Email: dummy1@example.com (through dummy50@example.com)');
    console.log('     Password: password123');
    console.log('');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('authentication failed')) {
      console.error('\n💡 MongoDB authentication failed!');
      console.error('   Fix: node fix-url-simple.js && npm run prisma:generate\n');
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
addDummyDataAndAdmin()
  .then(() => {
    console.log('✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
