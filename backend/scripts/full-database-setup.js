/**
 * Full Database Setup - Complete initialization
 * Creates database, collections, indexes, and seeds all initial data
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { setupDatabase } = require('./setup-mongodb-database');

const prisma = new PrismaClient();

async function fullSetup() {
  console.log('🚀 Starting Full Database Setup\n');
  console.log('='.repeat(60));
  console.log('This will:');
  console.log('  1. Connect to MongoDB');
  console.log('  2. Create all collections');
  console.log('  3. Set up indexes');
  console.log('  4. Create default settings');
  console.log('  5. Seed categories and locations');
  console.log('='.repeat(60) + '\n');

  try {
    // Step 1: Basic database setup
    console.log('📦 Step 1: Setting up database structure...\n');
    await setupDatabase();

    // Step 2: Seed categories
    console.log('\n📦 Step 2: Seeding categories...\n');
    try {
      const { execSync } = require('child_process');
      execSync('npm run seed-all-categories', {
        cwd: require('path').join(__dirname, '..'),
        stdio: 'inherit',
      });
      console.log('✅ Categories seeded');
    } catch (error) {
      console.log('⚠️  Category seeding skipped or failed:', error.message);
    }

    // Step 3: Seed locations
    console.log('\n📦 Step 3: Seeding locations...\n');
    try {
      const { execSync } = require('child_process');
      execSync('npm run seed-locations', {
        cwd: require('path').join(__dirname, '..'),
        stdio: 'inherit',
      });
      console.log('✅ Locations seeded');
    } catch (error) {
      console.log('⚠️  Location seeding skipped or failed:', error.message);
    }

    // Step 4: Final verification
    console.log('\n📊 Step 4: Final verification...\n');
    await prisma.$connect();

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

    console.log('Database Statistics:');
    console.log('  Users:', stats.users);
    console.log('  Categories:', stats.categories);
    console.log('  Subcategories:', stats.subcategories);
    console.log('  Locations:', stats.locations);
    console.log('  Ads:', stats.ads);
    console.log('  Premium Settings:', stats.premiumSettings);
    console.log('  Search Alert Settings:', stats.searchAlertSettings);
    console.log('  Auth Page Settings:', stats.authPageSettings);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Full database setup completed!');
    console.log('='.repeat(60));
    console.log('\n📋 Next steps:');
    console.log('   - Create admin user: npm run create-admin');
    console.log('   - Start your server: npm run dev');
    console.log('   - Access admin panel: http://localhost:3000/admin\n');

  } catch (error) {
    console.error('\n❌ Error during full setup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run full setup
if (require.main === module) {
  fullSetup().catch(console.error);
}

module.exports = { fullSetup };
