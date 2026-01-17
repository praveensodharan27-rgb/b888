/**
 * Complete Database Setup
 * 1. Updates .env file with MongoDB connection
 * 2. Creates database structure
 * 3. Seeds initial data
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const MONGO_URI = 'mongodb+srv://b888:NQEbkx2JWyBNJz7Z@cluster0.cj9oi8t.mongodb.net/olx_app?retryWrites=true&w=majority&appName=Cluster0';

async function completeSetup() {
  console.log('🚀 Complete Database Setup\n');
  console.log('='.repeat(60));

  // Step 1: Update .env file
  console.log('\n📝 Step 1: Updating .env file...\n');
  const envPath = path.join(__dirname, '..', '.env');

  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');

    // Update DATABASE_URL
    if (envContent.includes('DATABASE_URL=')) {
      envContent = envContent.replace(
        /DATABASE_URL=.*/g,
        `DATABASE_URL=${MONGO_URI}`
      );
      console.log('✅ Updated DATABASE_URL');
    } else {
      envContent = `DATABASE_URL=${MONGO_URI}\n${envContent}`;
      console.log('✅ Added DATABASE_URL');
    }

    // Update MONGO_URI
    if (envContent.includes('MONGO_URI=')) {
      envContent = envContent.replace(
        /MONGO_URI=.*/g,
        `MONGO_URI=${MONGO_URI}`
      );
      console.log('✅ Updated MONGO_URI');
    } else {
      envContent += `\nMONGO_URI=${MONGO_URI}\n`;
      console.log('✅ Added MONGO_URI');
    }

    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file updated\n');
  } else {
    console.log('⚠️  .env file not found, creating new one...');
    const newEnv = `DATABASE_URL=${MONGO_URI}
MONGO_URI=${MONGO_URI}
NODE_ENV=development
PORT=5000
`;
    fs.writeFileSync(envPath, newEnv);
    console.log('✅ Created .env file\n');
  }

  // Reload environment
  delete require.cache[require.resolve('dotenv')];
  require('dotenv').config();

  // Step 2: Connect and setup database
  console.log('📦 Step 2: Setting up database structure...\n');
  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    console.log('✅ Connected to MongoDB\n');

    // Create Search Alert Settings
    const existingSearchSettings = await prisma.searchAlertSettings.findFirst();
    if (!existingSearchSettings) {
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

    // Create Premium Settings
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
        await prisma.premiumSettings.create({ data: setting });
        console.log(`✅ Created PremiumSetting: ${setting.key}`);
      } else {
        // Update if exists
        await prisma.premiumSettings.update({
          where: { key: setting.key },
          data: { value: setting.value },
        });
        console.log(`✅ Updated PremiumSetting: ${setting.key}`);
      }
    }

    // Create Auth Page Settings
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
        await prisma.authPageSettings.create({ data: authPage });
        console.log(`✅ Created AuthPageSettings: ${authPage.page}`);
      } else {
        await prisma.authPageSettings.update({
          where: { page: authPage.page },
          data: authPage,
        });
        console.log(`✅ Updated AuthPageSettings: ${authPage.page}`);
      }
    }

    // Verify collections
    console.log('\n📊 Database Statistics:');
    const stats = {
      users: await prisma.user.count(),
      categories: await prisma.category.count(),
      subcategories: await prisma.subcategory.count(),
      locations: await prisma.location.count(),
      ads: await prisma.ad.count(),
      premiumSettings: await prisma.premiumSettings.count(),
      searchAlertSettings: await prisma.searchAlertSettings.count(),
      authPageSettings: await prisma.authPageSettings.count(),
    };

    console.log(`   Users: ${stats.users}`);
    console.log(`   Categories: ${stats.categories}`);
    console.log(`   Subcategories: ${stats.subcategories}`);
    console.log(`   Locations: ${stats.locations}`);
    console.log(`   Ads: ${stats.ads}`);
    console.log(`   Premium Settings: ${stats.premiumSettings}`);
    console.log(`   Search Alert Settings: ${stats.searchAlertSettings}`);
    console.log(`   Auth Page Settings: ${stats.authPageSettings}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Database setup completed successfully!');
    console.log('='.repeat(60));
    console.log('\n📋 Next steps:');
    console.log('   1. Seed categories: npm run seed-all-categories');
    console.log('   2. Seed locations: npm run seed-locations');
    console.log('   3. Create admin: npm run create-admin');
    console.log('   4. Start server: npm run dev\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('connect') || error.message.includes('timeout')) {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Check MongoDB connection string in .env');
      console.error('   2. Verify MongoDB Atlas cluster is running');
      console.error('   3. Check IP whitelist in MongoDB Atlas');
      console.error('   4. Verify network connection\n');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run complete setup
if (require.main === module) {
  completeSetup().catch(console.error);
}

module.exports = { completeSetup };
