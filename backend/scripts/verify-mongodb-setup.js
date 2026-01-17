/**
 * Verify MongoDB Setup
 * Checks that all collections, fields, and settings are properly configured
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifySetup() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 Verifying MongoDB Setup');
  console.log('='.repeat(80) + '\n');

  try {
    // Test connection
    console.log('1. Testing MongoDB Connection...');
    await prisma.$connect();
    console.log('   ✅ Connected to MongoDB\n');

    // Check collections
    console.log('2. Verifying Collections...');
    const collections = [
      'users', 'otps', 'categories', 'subcategories', 'locations', 'ads',
      'favorites', 'premium_orders', 'ad_posting_orders', 'chat_rooms',
      'chat_messages', 'premium_settings', 'banners', 'notifications',
      'interstitial_ads', 'push_subscriptions', 'wallets', 'wallet_transactions',
      'referrals', 'business_packages', 'extra_ad_slots', 'search_queries',
      'search_alert_settings', 'auth_page_settings', 'follows', 'contact_requests',
      'blocks', 'audit_logs', 'refresh_tokens'
    ];

    let allCollectionsExist = true;
    for (const collection of collections) {
      try {
        const count = await prisma.$runCommandRaw({ count: collection });
        console.log(`   ✅ ${collection}: ${count.n} documents`);
      } catch (err) {
        console.log(`   ⚠️  ${collection}: Not accessible`);
        allCollectionsExist = false;
      }
    }

    if (allCollectionsExist) {
      console.log('   ✅ All collections verified\n');
    } else {
      console.log('   ⚠️  Some collections may need to be created\n');
    }

    // Check settings
    console.log('3. Verifying Settings...');
    
    const searchSettings = await prisma.searchAlertSettings.findFirst();
    if (searchSettings) {
      console.log('   ✅ Search Alert Settings: Configured');
    } else {
      console.log('   ⚠️  Search Alert Settings: Missing');
    }

    const premiumSettingsCount = await prisma.premiumSettings.count();
    if (premiumSettingsCount >= 9) {
      console.log(`   ✅ Premium Settings: ${premiumSettingsCount} settings`);
    } else {
      console.log(`   ⚠️  Premium Settings: Only ${premiumSettingsCount} settings (expected 9+)`);
    }

    const authPagesCount = await prisma.authPageSettings.count();
    if (authPagesCount >= 2) {
      console.log(`   ✅ Auth Page Settings: ${authPagesCount} pages`);
    } else {
      console.log(`   ⚠️  Auth Page Settings: Only ${authPagesCount} pages (expected 2)`);
    }

    // Check data integrity
    console.log('\n4. Checking Data Integrity...');
    
    const users = await prisma.user.count();
    const usersWithWallets = await prisma.user.findMany({
      where: { wallet: { isNot: null } },
    });
    
    console.log(`   Users: ${users}`);
    console.log(`   Users with wallets: ${usersWithWallets.length}`);
    
    if (users > 0 && usersWithWallets.length < users) {
      console.log(`   ⚠️  ${users - usersWithWallets.length} users missing wallets`);
    } else {
      console.log('   ✅ All users have wallets');
    }

    const ads = await prisma.ad.count();
    const adsWithStatus = await prisma.ad.count({
      where: { status: { not: null } },
    });
    
    console.log(`   Ads: ${ads}`);
    console.log(`   Ads with status: ${adsWithStatus}`);
    
    if (ads > 0 && adsWithStatus < ads) {
      console.log(`   ⚠️  ${ads - adsWithStatus} ads missing status`);
    } else {
      console.log('   ✅ All ads have status');
    }

    // Database statistics
    console.log('\n5. Database Statistics...');
    const stats = {
      users: await prisma.user.count(),
      categories: await prisma.category.count(),
      locations: await prisma.location.count(),
      ads: await prisma.ad.count(),
      wallets: await prisma.wallet.count(),
      premiumSettings: await prisma.premiumSettings.count(),
    };

    console.log(`   Users: ${stats.users}`);
    console.log(`   Categories: ${stats.categories}`);
    console.log(`   Locations: ${stats.locations}`);
    console.log(`   Ads: ${stats.ads}`);
    console.log(`   Wallets: ${stats.wallets}`);
    console.log(`   Premium Settings: ${stats.premiumSettings}`);

    // Final summary
    console.log('\n' + '='.repeat(80));
    if (allCollectionsExist && premiumSettingsCount >= 9 && authPagesCount >= 2) {
      console.log('✅ MongoDB Setup Verified Successfully!');
    } else {
      console.log('⚠️  MongoDB Setup Needs Attention');
      console.log('   Run: npm run setup-mongodb-complete');
    }
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    if (error.message.includes('connect')) {
      console.error('\n💡 Check MongoDB connection string in .env');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  verifySetup().catch(console.error);
}

module.exports = { verifySetup };
