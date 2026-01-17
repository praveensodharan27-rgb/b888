/**
 * Update All Database Fields and Collections
 * Comprehensive script to update/initialize all database collections and fields
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateAllFields() {
  console.log('\n' + '='.repeat(70));
  console.log('🔄 Updating All Database Fields and Collections');
  console.log('='.repeat(70) + '\n');

  try {
    // Connect to database
    await prisma.$connect();
    console.log('✅ Connected to MongoDB\n');

    // ============================================
    // 1. SEARCH ALERT SETTINGS
    // ============================================
    console.log('📋 1. Updating Search Alert Settings...');
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
      console.log('   ✅ Created SearchAlertSettings');
    } else {
      await prisma.searchAlertSettings.updateMany({
        data: {
          enabled: true,
          maxEmailsPerUser: 5,
          checkIntervalHours: 24,
          emailSubject: 'New products matching your search!',
          emailBody: '<p>Hi there!</p><p>We found some products matching your recent search: <strong>{{query}}</strong></p>{{products}}<p>Happy shopping!</p>',
        },
      });
      console.log('   ✅ Updated SearchAlertSettings');
    }

    // ============================================
    // 2. PREMIUM SETTINGS
    // ============================================
    console.log('\n📋 2. Updating Premium Settings...');
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
        console.log(`   ✅ Created: ${setting.key} = ${setting.value}`);
      } else {
        await prisma.premiumSettings.update({
          where: { key: setting.key },
          data: { value: setting.value },
        });
        console.log(`   ✅ Updated: ${setting.key} = ${setting.value}`);
      }
    }

    // ============================================
    // 3. AUTH PAGE SETTINGS
    // ============================================
    console.log('\n📋 3. Updating Auth Page Settings...');
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
        console.log(`   ✅ Created AuthPageSettings: ${authPage.page}`);
      } else {
        await prisma.authPageSettings.update({
          where: { page: authPage.page },
          data: authPage,
        });
        console.log(`   ✅ Updated AuthPageSettings: ${authPage.page}`);
      }
    }

    // ============================================
    // 4. UPDATE USER FIELDS (Set defaults for missing fields)
    // ============================================
    console.log('\n📋 4. Updating User Fields...');
    const usersToUpdate = await prisma.user.findMany({
      where: {
        OR: [
          { showPhone: null },
          { isVerified: null },
          { role: null },
          { freeAdsUsed: null },
          { tags: null },
        ],
      },
    });

    if (usersToUpdate.length > 0) {
      for (const user of usersToUpdate) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            showPhone: user.showPhone ?? true,
            isVerified: user.isVerified ?? false,
            role: user.role ?? 'USER',
            freeAdsUsed: user.freeAdsUsed ?? 0,
            tags: user.tags ?? [],
          },
        });
      }
      console.log(`   ✅ Updated ${usersToUpdate.length} user(s) with default fields`);
    } else {
      console.log('   ✅ All users have required fields');
    }

    // ============================================
    // 5. UPDATE AD FIELDS (Set defaults for missing fields)
    // ============================================
    console.log('\n📋 5. Updating Ad Fields...');
    const adsToUpdate = await prisma.ad.findMany({
      where: {
        OR: [
          { status: null },
          { isPremium: null },
          { views: null },
          { isUrgent: null },
          { moderationStatus: null },
          { autoRejected: null },
        ],
      },
    });

    if (adsToUpdate.length > 0) {
      for (const ad of adsToUpdate) {
        await prisma.ad.update({
          where: { id: ad.id },
          data: {
            status: ad.status ?? 'PENDING',
            isPremium: ad.isPremium ?? false,
            views: ad.views ?? 0,
            isUrgent: ad.isUrgent ?? false,
            moderationStatus: ad.moderationStatus ?? 'pending',
            autoRejected: ad.autoRejected ?? false,
          },
        });
      }
      console.log(`   ✅ Updated ${adsToUpdate.length} ad(s) with default fields`);
    } else {
      console.log('   ✅ All ads have required fields');
    }

    // ============================================
    // 6. UPDATE CATEGORY FIELDS
    // ============================================
    console.log('\n📋 6. Updating Category Fields...');
    const categoriesToUpdate = await prisma.category.findMany({
      where: {
        OR: [
          { order: null },
          { isActive: null },
        ],
      },
    });

    if (categoriesToUpdate.length > 0) {
      for (const category of categoriesToUpdate) {
        await prisma.category.update({
          where: { id: category.id },
          data: {
            order: category.order ?? 0,
            isActive: category.isActive ?? true,
          },
        });
      }
      console.log(`   ✅ Updated ${categoriesToUpdate.length} category(ies) with default fields`);
    } else {
      console.log('   ✅ All categories have required fields');
    }

    // ============================================
    // 7. UPDATE LOCATION FIELDS
    // ============================================
    console.log('\n📋 7. Updating Location Fields...');
    const locationsToUpdate = await prisma.location.findMany({
      where: {
        isActive: null,
      },
    });

    if (locationsToUpdate.length > 0) {
      await prisma.location.updateMany({
        where: { isActive: null },
        data: { isActive: true },
      });
      console.log(`   ✅ Updated ${locationsToUpdate.length} location(s) with default fields`);
    } else {
      console.log('   ✅ All locations have required fields');
    }

    // ============================================
    // 8. UPDATE WALLET FIELDS
    // ============================================
    console.log('\n📋 8. Updating Wallet Fields...');
    const walletsToUpdate = await prisma.wallet.findMany({
      where: {
        balance: null,
      },
    });

    if (walletsToUpdate.length > 0) {
      await prisma.wallet.updateMany({
        where: { balance: null },
        data: { balance: 0 },
      });
      console.log(`   ✅ Updated ${walletsToUpdate.length} wallet(s) with default balance`);
    } else {
      console.log('   ✅ All wallets have required fields');
    }

    // ============================================
    // 9. UPDATE NOTIFICATION FIELDS
    // ============================================
    console.log('\n📋 9. Updating Notification Fields...');
    const notificationsToUpdate = await prisma.notification.findMany({
      where: {
        isRead: null,
      },
    });

    if (notificationsToUpdate.length > 0) {
      await prisma.notification.updateMany({
        where: { isRead: null },
        data: { isRead: false },
      });
      console.log(`   ✅ Updated ${notificationsToUpdate.length} notification(s) with default fields`);
    } else {
      console.log('   ✅ All notifications have required fields');
    }

    // ============================================
    // 10. UPDATE CHAT MESSAGE FIELDS
    // ============================================
    console.log('\n📋 10. Updating Chat Message Fields...');
    const messagesToUpdate = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { isRead: null },
          { type: null },
        ],
      },
    });

    if (messagesToUpdate.length > 0) {
      for (const message of messagesToUpdate) {
        await prisma.chatMessage.update({
          where: { id: message.id },
          data: {
            isRead: message.isRead ?? false,
            type: message.type ?? 'TEXT',
          },
        });
      }
      console.log(`   ✅ Updated ${messagesToUpdate.length} message(s) with default fields`);
    } else {
      console.log('   ✅ All messages have required fields');
    }

    // ============================================
    // 11. DATABASE STATISTICS
    // ============================================
    console.log('\n' + '='.repeat(70));
    console.log('📊 Database Statistics');
    console.log('='.repeat(70));

    const stats = {
      users: await prisma.user.count(),
      categories: await prisma.category.count(),
      subcategories: await prisma.subcategory.count(),
      locations: await prisma.location.count(),
      ads: await prisma.ad.count(),
      favorites: await prisma.favorite.count(),
      chatRooms: await prisma.chatRoom.count(),
      chatMessages: await prisma.chatMessage.count(),
      notifications: await prisma.notification.count(),
      wallets: await prisma.wallet.count(),
      premiumOrders: await prisma.premiumOrder.count(),
      premiumSettings: await prisma.premiumSettings.count(),
      searchAlertSettings: await prisma.searchAlertSettings.count(),
      authPageSettings: await prisma.authPageSettings.count(),
      follows: await prisma.follow.count(),
      contactRequests: await prisma.contactRequest.count(),
      blocks: await prisma.block.count(),
      auditLogs: await prisma.auditLog.count(),
      refreshTokens: await prisma.refreshToken.count(),
    };

    console.log(`\n   Users:                ${stats.users}`);
    console.log(`   Categories:           ${stats.categories}`);
    console.log(`   Subcategories:        ${stats.subcategories}`);
    console.log(`   Locations:            ${stats.locations}`);
    console.log(`   Ads:                  ${stats.ads}`);
    console.log(`   Favorites:            ${stats.favorites}`);
    console.log(`   Chat Rooms:           ${stats.chatRooms}`);
    console.log(`   Chat Messages:        ${stats.chatMessages}`);
    console.log(`   Notifications:        ${stats.notifications}`);
    console.log(`   Wallets:              ${stats.wallets}`);
    console.log(`   Premium Orders:       ${stats.premiumOrders}`);
    console.log(`   Premium Settings:     ${stats.premiumSettings}`);
    console.log(`   Search Alert Settings: ${stats.searchAlertSettings}`);
    console.log(`   Auth Page Settings:   ${stats.authPageSettings}`);
    console.log(`   Follows:              ${stats.follows}`);
    console.log(`   Contact Requests:    ${stats.contactRequests}`);
    console.log(`   Blocks:               ${stats.blocks}`);
    console.log(`   Audit Logs:           ${stats.auditLogs}`);
    console.log(`   Refresh Tokens:       ${stats.refreshTokens}`);

    console.log('\n' + '='.repeat(70));
    console.log('✅ All Database Fields Updated Successfully!');
    console.log('='.repeat(70));
    console.log('\n📋 Next Steps:');
    console.log('   1. Verify data: npm run db-manager');
    console.log('   2. Seed categories: npm run seed-all-categories');
    console.log('   3. Seed locations: npm run seed-locations');
    console.log('   4. Start server: npm run dev\n');

  } catch (error) {
    console.error('\n❌ Error updating database:', error.message);
    if (error.message.includes('connect') || error.message.includes('timeout')) {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Check MongoDB connection string in .env');
      console.error('   2. Verify MongoDB Atlas cluster is running');
      console.error('   3. Check IP whitelist in MongoDB Atlas');
      console.error('   4. Run: npm run prisma:generate\n');
    } else {
      console.error('\n💡 Error details:', error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('✅ Disconnected from database\n');
  }
}

// Run update
if (require.main === module) {
  updateAllFields().catch(console.error);
}

module.exports = { updateAllFields };
