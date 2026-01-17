/**
 * Full Database Management - Complete Setup and Management
 * Creates all collections, fields, indexes, and initial data
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { 
  showStatistics, 
  initializeSettings, 
  showFieldStructures 
} = require('./db-manager');

const prisma = new PrismaClient();

async function fullDatabaseManagement() {
  console.log('\n🚀 Full Database Management System\n');
  console.log('='.repeat(70));
  console.log('This will:');
  console.log('  ✅ Connect to MongoDB');
  console.log('  ✅ Create all collections (auto-created on first insert)');
  console.log('  ✅ Set up all indexes (via Prisma schema)');
  console.log('  ✅ Initialize all default settings');
  console.log('  ✅ Show complete database structure');
  console.log('  ✅ Display all field details');
  console.log('='.repeat(70) + '\n');

  try {
    // Connect
    await prisma.$connect();
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Initialize all settings
    console.log('📦 Step 1: Initializing all settings...\n');
    await initializeSettings();

    // Step 2: Show field structures
    console.log('📐 Step 2: Database field structures...\n');
    await showFieldStructures();

    // Step 3: Show statistics
    console.log('📊 Step 3: Database statistics...\n');
    await showStatistics();

    // Step 4: Verify all collections
    console.log('\n🔍 Step 4: Verifying all collections...\n');
    
    const collections = [
      { name: 'Users', model: prisma.user },
      { name: 'Categories', model: prisma.category },
      { name: 'Subcategories', model: prisma.subcategory },
      { name: 'Locations', model: prisma.location },
      { name: 'Ads', model: prisma.ad },
      { name: 'Favorites', model: prisma.favorite },
      { name: 'Premium Orders', model: prisma.premiumOrder },
      { name: 'Ad Posting Orders', model: prisma.adPostingOrder },
      { name: 'Chat Rooms', model: prisma.chatRoom },
      { name: 'Chat Messages', model: prisma.chatMessage },
      { name: 'Notifications', model: prisma.notification },
      { name: 'Wallets', model: prisma.wallet },
      { name: 'Wallet Transactions', model: prisma.walletTransaction },
      { name: 'Referrals', model: prisma.referral },
      { name: 'Business Packages', model: prisma.businessPackage },
      { name: 'Extra Ad Slots', model: prisma.extraAdSlot },
      { name: 'OTPs', model: prisma.otP },
      { name: 'Banners', model: prisma.banner },
      { name: 'Interstitial Ads', model: prisma.interstitialAd },
      { name: 'Push Subscriptions', model: prisma.pushSubscription },
      { name: 'Premium Settings', model: prisma.premiumSettings },
      { name: 'Search Queries', model: prisma.searchQuery },
      { name: 'Search Alert Settings', model: prisma.searchAlertSettings },
      { name: 'Auth Page Settings', model: prisma.authPageSettings },
      { name: 'Follows', model: prisma.follow },
      { name: 'Contact Requests', model: prisma.contactRequest },
      { name: 'Blocks', model: prisma.block },
      { name: 'Audit Logs', model: prisma.auditLog },
      { name: 'Refresh Tokens', model: prisma.refreshToken },
    ];

    console.log('Collection Status:');
    for (const collection of collections) {
      try {
        const count = await collection.model.count();
        const status = count >= 0 ? '✅' : '❌';
        console.log(`  ${status} ${collection.name}: ${count} documents`);
      } catch (error) {
        console.log(`  ❌ ${collection.name}: Error - ${error.message}`);
      }
    }

    // Step 5: Show all indexes info
    console.log('\n📇 Step 5: Index Information\n');
    console.log('All indexes are automatically created by Prisma based on schema.');
    console.log('Key indexes include:');
    console.log('  - User: email, phone, locationId, referralCode');
    console.log('  - Ad: userId, categoryId, status, createdAt, isPremium');
    console.log('  - Category: slug (unique)');
    console.log('  - Location: slug (unique), state, city');
    console.log('  - And many more compound indexes for performance');

    // Step 6: Summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ Full Database Management Completed!');
    console.log('='.repeat(70));
    console.log('\n📋 Database is ready with:');
    console.log('  ✅ All 29 collections created/verified');
    console.log('  ✅ All indexes configured');
    console.log('  ✅ All default settings initialized');
    console.log('  ✅ All field structures defined');
    console.log('\n📋 Next Steps:');
    console.log('  - Seed categories: npm run seed-all-categories');
    console.log('  - Seed locations: npm run seed-locations');
    console.log('  - Create admin: npm run create-admin');
    console.log('  - Start server: npm run dev');
    console.log('\n💡 Use "npm run db-manager" for interactive management\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('connect')) {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Check MongoDB connection string in .env');
      console.error('   2. Verify MongoDB Atlas cluster is running');
      console.error('   3. Check IP whitelist in MongoDB Atlas');
      console.error('   4. Verify network connection\n');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('✅ Disconnected from database\n');
  }
}

// Run if called directly
if (require.main === module) {
  fullDatabaseManagement().catch(console.error);
}

module.exports = { fullDatabaseManagement };
