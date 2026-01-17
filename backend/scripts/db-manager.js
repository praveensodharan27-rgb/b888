/**
 * Complete Database Manager
 * Full database management with all fields and details
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Database Statistics
async function showStatistics() {
  console.log('\n📊 Database Statistics\n');
  console.log('='.repeat(60));

  const stats = {
    users: await prisma.user.count(),
    categories: await prisma.category.count(),
    subcategories: await prisma.subcategory.count(),
    locations: await prisma.location.count(),
    ads: await prisma.ad.count(),
    favorites: await prisma.favorite.count(),
    premiumOrders: await prisma.premiumOrder.count(),
    adPostingOrders: await prisma.adPostingOrder.count(),
    chatRooms: await prisma.chatRoom.count(),
    chatMessages: await prisma.chatMessage.count(),
    notifications: await prisma.notification.count(),
    wallets: await prisma.wallet.count(),
    walletTransactions: await prisma.walletTransaction.count(),
    referrals: await prisma.referral.count(),
    businessPackages: await prisma.businessPackage.count(),
    extraAdSlots: await prisma.extraAdSlot.count(),
    otps: await prisma.otP.count(),
    banners: await prisma.banner.count(),
    interstitialAds: await prisma.interstitialAd.count(),
    pushSubscriptions: await prisma.pushSubscription.count(),
    premiumSettings: await prisma.premiumSettings.count(),
    searchQueries: await prisma.searchQuery.count(),
    searchAlertSettings: await prisma.searchAlertSettings.count(),
    authPageSettings: await prisma.authPageSettings.count(),
    follows: await prisma.follow.count(),
    contactRequests: await prisma.contactRequest.count(),
    blocks: await prisma.block.count(),
    auditLogs: await prisma.auditLog.count(),
    refreshTokens: await prisma.refreshToken.count(),
  };

  console.log('Collections:');
  console.log(`  👤 Users: ${stats.users}`);
  console.log(`  📁 Categories: ${stats.categories}`);
  console.log(`  📂 Subcategories: ${stats.subcategories}`);
  console.log(`  📍 Locations: ${stats.locations}`);
  console.log(`  📢 Ads: ${stats.ads}`);
  console.log(`  ⭐ Favorites: ${stats.favorites}`);
  console.log(`  💎 Premium Orders: ${stats.premiumOrders}`);
  console.log(`  📝 Ad Posting Orders: ${stats.adPostingOrders}`);
  console.log(`  💬 Chat Rooms: ${stats.chatRooms}`);
  console.log(`  💬 Chat Messages: ${stats.chatMessages}`);
  console.log(`  🔔 Notifications: ${stats.notifications}`);
  console.log(`  💰 Wallets: ${stats.wallets}`);
  console.log(`  💳 Wallet Transactions: ${stats.walletTransactions}`);
  console.log(`  🎁 Referrals: ${stats.referrals}`);
  console.log(`  📦 Business Packages: ${stats.businessPackages}`);
  console.log(`  🎫 Extra Ad Slots: ${stats.extraAdSlots}`);
  console.log(`  🔐 OTPs: ${stats.otps}`);
  console.log(`  🎨 Banners: ${stats.banners}`);
  console.log(`  📱 Interstitial Ads: ${stats.interstitialAds}`);
  console.log(`  🔔 Push Subscriptions: ${stats.pushSubscriptions}`);
  console.log(`  ⚙️  Premium Settings: ${stats.premiumSettings}`);
  console.log(`  🔍 Search Queries: ${stats.searchQueries}`);
  console.log(`  📧 Search Alert Settings: ${stats.searchAlertSettings}`);
  console.log(`  🔐 Auth Page Settings: ${stats.authPageSettings}`);
  console.log(`  👥 Follows: ${stats.follows}`);
  console.log(`  📞 Contact Requests: ${stats.contactRequests}`);
  console.log(`  🚫 Blocks: ${stats.blocks}`);
  console.log(`  📋 Audit Logs: ${stats.auditLogs}`);
  console.log(`  🔑 Refresh Tokens: ${stats.refreshTokens}`);

  console.log('\n' + '='.repeat(60));
}

// Initialize all default settings
async function initializeSettings() {
  console.log('\n⚙️  Initializing All Settings...\n');

  // Premium Settings
  const premiumSettings = [
    { key: 'PREMIUM_PRICE_TOP', value: '299', description: 'Top ad price (₹)' },
    { key: 'PREMIUM_PRICE_FEATURED', value: '199', description: 'Featured ad price (₹)' },
    { key: 'PREMIUM_PRICE_BUMP_UP', value: '99', description: 'Bump up ad price (₹)' },
    { key: 'PREMIUM_PRICE_URGENT', value: '49', description: 'Urgent ad price (₹)' },
    { key: 'PREMIUM_DURATION_TOP', value: '7', description: 'Top ad duration (days)' },
    { key: 'PREMIUM_DURATION_FEATURED', value: '14', description: 'Featured ad duration (days)' },
    { key: 'PREMIUM_DURATION_BUMP_UP', value: '1', description: 'Bump up ad duration (days)' },
    { key: 'PREMIUM_DURATION_URGENT', value: '7', description: 'Urgent ad duration (days)' },
    { key: 'AD_POSTING_PRICE', value: '49', description: 'Regular ad posting price (₹)' },
    { key: 'FREE_ADS_LIMIT', value: '2', description: 'Free ads per user' },
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
      console.log(`✅ Created: ${setting.key} = ${setting.value} (${setting.description})`);
    } else {
      await prisma.premiumSettings.update({
        where: { key: setting.key },
        data: { value: setting.value },
      });
      console.log(`✅ Updated: ${setting.key} = ${setting.value} (${setting.description})`);
    }
  }

  // Search Alert Settings
  const searchSettings = await prisma.searchAlertSettings.findFirst();
  if (!searchSettings) {
    await prisma.searchAlertSettings.create({
      data: {
        enabled: true,
        maxEmailsPerUser: 5,
        checkIntervalHours: 24,
        emailSubject: 'New products matching your search!',
        emailBody: '<p>Hi there!</p><p>We found some products matching your recent search: <strong>{{query}}</strong></p>{{products}}<p>Happy shopping!</p>',
      },
    });
    console.log('✅ Created Search Alert Settings');
  } else {
    console.log('✅ Search Alert Settings already exists');
  }

  // Auth Page Settings
  const authPages = [
    {
      page: 'login',
      title: 'Welcome Back',
      subtitle: 'Sign in to your account',
      tagline: 'Connect with buyers and sellers',
      backgroundColor: '#1e293b',
      stats: { users: '10K+', ads: '50K+', locations: '100+' },
      features: ['Secure Login', 'Quick Access', 'Save Favorites'],
    },
    {
      page: 'signup',
      title: 'Join SellIt',
      subtitle: 'Create your account today',
      tagline: 'Start selling in minutes',
      backgroundColor: '#1e293b',
      stats: { users: '10K+', ads: '50K+', locations: '100+' },
      features: ['Easy Registration', 'Free Listings', 'Instant Access'],
    },
  ];

  for (const authPage of authPages) {
    const existing = await prisma.authPageSettings.findUnique({
      where: { page: authPage.page },
    });

    if (!existing) {
      await prisma.authPageSettings.create({ data: authPage });
      console.log(`✅ Created Auth Page Settings: ${authPage.page}`);
    } else {
      await prisma.authPageSettings.update({
        where: { page: authPage.page },
        data: authPage,
      });
      console.log(`✅ Updated Auth Page Settings: ${authPage.page}`);
    }
  }

  console.log('\n✅ All settings initialized!\n');
}

// View collection details
async function viewCollectionDetails(collectionName) {
  console.log(`\n📋 ${collectionName} Details\n`);
  console.log('='.repeat(60));

  try {
    const modelMap = {
      users: prisma.user,
      categories: prisma.category,
      locations: prisma.location,
      ads: prisma.ad,
      'premium-settings': prisma.premiumSettings,
    };

    const model = modelMap[collectionName];
    if (!model) {
      console.log('❌ Collection not found');
      return;
    }

    const items = await model.findMany({ take: 10 });
    console.log(`Found ${items.length} items (showing first 10):\n`);

    items.forEach((item, index) => {
      console.log(`${index + 1}. ${JSON.stringify(item, null, 2)}`);
      console.log('-'.repeat(60));
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Show all field structures
async function showFieldStructures() {
  console.log('\n📐 Database Field Structures\n');
  console.log('='.repeat(60));

  const structures = {
    User: {
      id: 'String (ObjectId)',
      email: 'String? (unique)',
      phone: 'String? (unique)',
      password: 'String?',
      name: 'String',
      avatar: 'String?',
      bio: 'String?',
      tags: 'String[]',
      showPhone: 'Boolean',
      isVerified: 'Boolean',
      role: 'UserRole (USER/ADMIN)',
      freeAdsUsed: 'Int',
      createdAt: 'DateTime',
      updatedAt: 'DateTime',
      provider: 'String?',
      providerId: 'String?',
      referralCode: 'String?',
      referredBy: 'String? (ObjectId)',
      isDeactivated: 'Boolean',
      locationId: 'String? (ObjectId)',
    },
    Ad: {
      id: 'String (ObjectId)',
      title: 'String',
      description: 'String',
      price: 'Float',
      originalPrice: 'Float?',
      discount: 'Float?',
      condition: 'String?',
      images: 'String[]',
      status: 'AdStatus (PENDING/APPROVED/REJECTED/SOLD/EXPIRED)',
      isPremium: 'Boolean',
      premiumType: 'PremiumType? (TOP/FEATURED/BUMP_UP)',
      premiumExpiresAt: 'DateTime?',
      views: 'Int',
      featuredAt: 'DateTime?',
      bumpedAt: 'DateTime?',
      expiresAt: 'DateTime?',
      userId: 'String (ObjectId)',
      categoryId: 'String (ObjectId)',
      subcategoryId: 'String? (ObjectId)',
      locationId: 'String? (ObjectId)',
      isUrgent: 'Boolean',
      attributes: 'Json?',
      state: 'String?',
      city: 'String?',
      neighbourhood: 'String?',
      exactLocation: 'String?',
      moderationStatus: 'String?',
      moderationFlags: 'Json?',
      rejectionReason: 'String?',
      autoRejected: 'Boolean',
    },
    Category: {
      id: 'String (ObjectId)',
      name: 'String',
      slug: 'String (unique)',
      icon: 'String?',
      image: 'String?',
      description: 'String?',
      order: 'Int',
      isActive: 'Boolean',
      adPostingPrice: 'Float?',
      createdAt: 'DateTime',
      updatedAt: 'DateTime',
    },
    Location: {
      id: 'String (ObjectId)',
      name: 'String',
      slug: 'String (unique)',
      state: 'String?',
      city: 'String?',
      pincode: 'String?',
      latitude: 'Float?',
      longitude: 'Float?',
      isActive: 'Boolean',
      neighbourhood: 'String?',
      createdAt: 'DateTime',
      updatedAt: 'DateTime',
    },
  };

  Object.entries(structures).forEach(([model, fields]) => {
    console.log(`\n${model}:`);
    Object.entries(fields).forEach(([field, type]) => {
      console.log(`  ${field}: ${type}`);
    });
  });

  console.log('\n' + '='.repeat(60));
}

// Main menu
async function showMenu() {
  console.log('\n' + '='.repeat(60));
  console.log('🗄️  Database Manager - Full Management System');
  console.log('='.repeat(60));
  console.log('\nOptions:');
  console.log('  1. Show Database Statistics');
  console.log('  2. Initialize All Settings');
  console.log('  3. Show Field Structures');
  console.log('  4. View Collection Details');
  console.log('  5. Full Database Setup');
  console.log('  6. Exit');
  console.log('\n' + '='.repeat(60));
}

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to MongoDB\n');

    while (true) {
      await showMenu();
      const choice = await question('\nSelect option (1-6): ');

      switch (choice.trim()) {
        case '1':
          await showStatistics();
          break;
        case '2':
          await initializeSettings();
          break;
        case '3':
          await showFieldStructures();
          break;
        case '4':
          const collection = await question('Enter collection name (users/categories/locations/ads/premium-settings): ');
          await viewCollectionDetails(collection.trim());
          break;
        case '5':
          console.log('\n🚀 Running full database setup...\n');
          await initializeSettings();
          await showStatistics();
          console.log('\n✅ Full setup completed!');
          break;
        case '6':
          console.log('\n👋 Goodbye!\n');
          await prisma.$disconnect();
          rl.close();
          process.exit(0);
        default:
          console.log('\n❌ Invalid option. Please select 1-6.');
      }

      await question('\nPress Enter to continue...');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('connect')) {
      console.error('\n💡 Make sure:');
      console.error('   1. MongoDB connection string is correct');
      console.error('   2. MongoDB Atlas cluster is running');
      console.error('   3. Your IP is whitelisted\n');
    }
    await prisma.$disconnect();
    rl.close();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  showStatistics,
  initializeSettings,
  showFieldStructures,
  viewCollectionDetails,
};
