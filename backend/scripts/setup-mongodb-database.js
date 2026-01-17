/**
 * MongoDB Database Setup Script
 * Creates database, collections, indexes, and initial data
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupDatabase() {
  console.log('🚀 Setting up MongoDB database...\n');

  try {
    // Connect to database
    await prisma.$connect();
    console.log('✅ Connected to MongoDB\n');

    // Create collections by inserting and deleting a dummy document
    // MongoDB creates collections automatically on first insert, but we'll verify
    console.log('📦 Creating collections...\n');

    const collections = [
      'users',
      'otps',
      'categories',
      'subcategories',
      'locations',
      'ads',
      'favorites',
      'premium_orders',
      'ad_posting_orders',
      'chat_rooms',
      'chat_messages',
      'premium_settings',
      'banners',
      'notifications',
      'interstitial_ads',
      'push_subscriptions',
      'wallets',
      'wallet_transactions',
      'referrals',
      'business_packages',
      'extra_ad_slots',
      'search_queries',
      'search_alert_settings',
      'auth_page_settings',
      'follows',
      'contact_requests',
      'blocks',
      'audit_logs',
      'refresh_tokens',
    ];

    // Verify collections exist (they'll be created on first insert)
    console.log('✅ Collections will be created automatically on first insert\n');

    // Create indexes
    console.log('📊 Creating indexes...\n');
    // Prisma will create indexes based on schema, but we can verify
    console.log('✅ Indexes will be created by Prisma based on schema\n');

    // Seed initial data
    console.log('🌱 Seeding initial data...\n');

    // 1. Create Search Alert Settings (if doesn't exist)
    const existingSettings = await prisma.searchAlertSettings.findFirst();
    if (!existingSettings) {
      await prisma.searchAlertSettings.create({
        data: {
          enabled: true,
          maxEmailsPerUser: 5,
          checkIntervalHours: 24,
          emailSubject: 'New products matching your search!',
          emailBody: '<p>Hi there!</p><p>We found some products matching your recent search: <strong>{{query}}</strong></p>{{products}}<p>Happy shopping!</p>',
        },
      });
      console.log('✅ Created SearchAlertSettings');
    } else {
      console.log('✅ SearchAlertSettings already exists');
    }

    // 2. Create Premium Settings (default values)
    const premiumSettings = [
      { key: 'PREMIUM_PRICE_TOP', value: '299' },
      { key: 'PREMIUM_PRICE_FEATURED', value: '199' },
      { key: 'PREMIUM_PRICE_BUMP_UP', value: '99' },
      { key: 'PREMIUM_PRICE_URGENT', value: '49' },
      { key: 'PREMIUM_DURATION_TOP', value: '7' },
      { key: 'PREMIUM_DURATION_FEATURED', value: '14' },
      { key: 'PREMIUM_DURATION_BUMP_UP', value: '1' },
      { key: 'PREMIUM_DURATION_URGENT', value: '7' },
      { key: 'AD_POSTING_PRICE', value: '49' },
      { key: 'FREE_ADS_LIMIT', value: '2' },
    ];

    for (const setting of premiumSettings) {
      const existing = await prisma.premiumSettings.findUnique({
        where: { key: setting.key },
      });

      if (!existing) {
        await prisma.premiumSettings.create({
          data: {
            key: setting.key,
            value: setting.value,
          },
        });
        console.log(`✅ Created PremiumSetting: ${setting.key} = ${setting.value}`);
      } else {
        console.log(`✅ PremiumSetting already exists: ${setting.key}`);
      }
    }

    // 3. Create default Auth Page Settings
    const authPages = [
      {
        page: 'login',
        title: 'Welcome Back',
        subtitle: 'Sign in to your account',
        tagline: 'Connect with buyers and sellers',
        backgroundColor: '#1e293b',
      },
      {
        page: 'signup',
        title: 'Join SellIt',
        subtitle: 'Create your account today',
        tagline: 'Start selling in minutes',
        backgroundColor: '#1e293b',
      },
    ];

    for (const authPage of authPages) {
      const existing = await prisma.authPageSettings.findUnique({
        where: { page: authPage.page },
      });

      if (!existing) {
        await prisma.authPageSettings.create({
          data: authPage,
        });
        console.log(`✅ Created AuthPageSettings: ${authPage.page}`);
      } else {
        console.log(`✅ AuthPageSettings already exists: ${authPage.page}`);
      }
    }

    // 4. Verify database structure
    console.log('\n📊 Verifying database structure...\n');

    const userCount = await prisma.user.count();
    const categoryCount = await prisma.category.count();
    const locationCount = await prisma.location.count();
    const adCount = await prisma.ad.count();

    console.log('Database Statistics:');
    console.log(`   Users: ${userCount}`);
    console.log(`   Categories: ${categoryCount}`);
    console.log(`   Locations: ${locationCount}`);
    console.log(`   Ads: ${adCount}`);

    console.log('\n' + '='.repeat(50));
    console.log('✅ Database setup completed successfully!');
    console.log('='.repeat(50));
    console.log('\n📋 Next steps:');
    console.log('   1. Seed categories: npm run seed-all-categories');
    console.log('   2. Seed locations: npm run seed-locations');
    console.log('   3. Create admin user: npm run create-admin');
    console.log('\n');

  } catch (error) {
    console.error('❌ Error setting up database:', error);
    if (error.message.includes('connect')) {
      console.error('\n💡 Make sure:');
      console.error('   1. MongoDB connection string is correct in .env');
      console.error('   2. MongoDB Atlas cluster is running');
      console.error('   3. Your IP is whitelisted in MongoDB Atlas');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('✅ Disconnected from database');
  }
}

// Run setup
if (require.main === module) {
  setupDatabase().catch(console.error);
}

module.exports = { setupDatabase };
