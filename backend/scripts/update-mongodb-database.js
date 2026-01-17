/**
 * Complete MongoDB Database Update
 * 1. Updates MongoDB connection string
 * 2. Generates Prisma Client
 * 3. Updates all database fields and collections
 * 4. Verifies connection and structure
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const MONGO_URI = 'mongodb+srv://b888:NQEbkx2JWyBNJz7Z@cluster0.cj9oi8t.mongodb.net/olx_app?retryWrites=true&w=majority&appName=Cluster0';

async function updateMongoDBDatabase() {
  console.log('\n' + '='.repeat(70));
  console.log('🔄 Complete MongoDB Database Update');
  console.log('='.repeat(70) + '\n');

  // ============================================
  // STEP 1: Update .env file
  // ============================================
  console.log('📝 Step 1: Updating .env file with MongoDB connection...\n');
  const envPath = path.join(__dirname, '..', '.env');

  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');

    // Update DATABASE_URL
    if (envContent.includes('DATABASE_URL=')) {
      envContent = envContent.replace(
        /DATABASE_URL=.*/g,
        `DATABASE_URL=${MONGO_URI}`
      );
      console.log('   ✅ Updated DATABASE_URL');
    } else {
      envContent = `DATABASE_URL=${MONGO_URI}\n${envContent}`;
      console.log('   ✅ Added DATABASE_URL');
    }

    // Update MONGO_URI
    if (envContent.includes('MONGO_URI=')) {
      envContent = envContent.replace(
        /MONGO_URI=.*/g,
        `MONGO_URI=${MONGO_URI}`
      );
      console.log('   ✅ Updated MONGO_URI');
    } else {
      envContent += `\nMONGO_URI=${MONGO_URI}\n`;
      console.log('   ✅ Added MONGO_URI');
    }

    fs.writeFileSync(envPath, envContent);
    console.log('   ✅ .env file updated\n');
  } else {
    console.log('   ⚠️  .env file not found, creating new one...');
    const newEnv = `DATABASE_URL=${MONGO_URI}
MONGO_URI=${MONGO_URI}
NODE_ENV=development
PORT=5000
`;
    fs.writeFileSync(envPath, newEnv);
    console.log('   ✅ Created .env file\n');
  }

  // Reload environment
  delete require.cache[require.resolve('dotenv')];
  require('dotenv').config();

  // ============================================
  // STEP 2: Generate Prisma Client
  // ============================================
  console.log('🔧 Step 2: Generating Prisma Client...\n');
  try {
    // Clear Prisma cache
    const prismaCachePath = path.join(__dirname, '..', 'node_modules', '.prisma');
    if (fs.existsSync(prismaCachePath)) {
      fs.rmSync(prismaCachePath, { recursive: true, force: true });
      console.log('   ✅ Cleared Prisma cache');
    }

    // Generate Prisma Client
    execSync('npm run prisma:generate', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });
    console.log('   ✅ Prisma Client generated\n');
  } catch (error) {
    console.error('   ❌ Error generating Prisma Client:', error.message);
    console.log('   💡 Trying alternative method...\n');
    try {
      execSync('npx prisma generate', {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit'
      });
      console.log('   ✅ Prisma Client generated\n');
    } catch (err) {
      console.error('   ❌ Failed to generate Prisma Client');
      console.error('   💡 Please run manually: npm run prisma:generate\n');
      process.exit(1);
    }
  }

  // Wait a moment for files to be written
  await new Promise(resolve => setTimeout(resolve, 2000));

  // ============================================
  // STEP 3: Test Connection
  // ============================================
  console.log('🧪 Step 3: Testing MongoDB connection...\n');
  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    console.log('   ✅ Connected to MongoDB successfully\n');
  } catch (error) {
    console.error('   ❌ Connection failed:', error.message);
    console.error('\n   💡 Troubleshooting:');
    console.error('      1. Check MongoDB connection string');
    console.error('      2. Verify MongoDB Atlas cluster is running');
    console.error('      3. Check IP whitelist in MongoDB Atlas');
    console.error('      4. Verify credentials are correct\n');
    process.exit(1);
  }

  // ============================================
  // STEP 4: Update Database Fields
  // ============================================
  console.log('📋 Step 4: Updating database fields and collections...\n');

  try {
    // 4.1. Search Alert Settings
    console.log('   📋 Updating Search Alert Settings...');
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
      console.log('      ✅ Created SearchAlertSettings');
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
      console.log('      ✅ Updated SearchAlertSettings');
    }

    // 4.2. Premium Settings
    console.log('   📋 Updating Premium Settings...');
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
        console.log(`      ✅ Created: ${setting.key} = ${setting.value}`);
      } else {
        await prisma.premiumSettings.update({
          where: { key: setting.key },
          data: { value: setting.value },
        });
        console.log(`      ✅ Updated: ${setting.key} = ${setting.value}`);
      }
    }

    // 4.3. Auth Page Settings
    console.log('   📋 Updating Auth Page Settings...');
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
        console.log(`      ✅ Created AuthPageSettings: ${authPage.page}`);
      } else {
        await prisma.authPageSettings.update({
          where: { page: authPage.page },
          data: authPage,
        });
        console.log(`      ✅ Updated AuthPageSettings: ${authPage.page}`);
      }
    }

    // 4.4. Update User Fields (set defaults)
    console.log('   📋 Updating User Fields...');
    // Use MongoDB raw update commands to handle null checks safely
    const userFieldUpdates = [
      { field: 'showPhone', value: true },
      { field: 'isVerified', value: false },
      { field: 'role', value: 'USER' },
      { field: 'freeAdsUsed', value: 0 },
      { field: 'tags', value: [] },
    ];

    let userUpdatesCount = 0;
    for (const { field, value } of userFieldUpdates) {
      const result = await prisma.$runCommandRaw({
        update: 'users',
        updates: [
          {
            q: { [field]: { $eq: null } },
            u: { $set: { [field]: value } },
            multi: true,
          },
        ],
      });
      // result.nModified is usually returned by Mongo update command
      userUpdatesCount += result?.nModified || 0;
    }
    console.log(`      ✅ Updated ${userUpdatesCount} user field entries`);

    // 4.5. Update Ad Fields (set defaults) using Mongo raw updates
    console.log('   📋 Updating Ad Fields...');
    const adFieldUpdates = [
      { field: 'status', value: 'PENDING' },
      { field: 'isPremium', value: false },
      { field: 'views', value: 0 },
      { field: 'isUrgent', value: false },
      { field: 'moderationStatus', value: 'pending' },
      { field: 'autoRejected', value: false },
    ];

    let adUpdatesCount = 0;
    for (const { field, value } of adFieldUpdates) {
      const result = await prisma.$runCommandRaw({
        update: 'ads',
        updates: [
          {
            q: { [field]: { $eq: null } },
            u: { $set: { [field]: value } },
            multi: true,
          },
        ],
      });
      adUpdatesCount += result?.nModified || 0;
    }
    console.log(`      ✅ Updated ${adUpdatesCount} ad field entries`);

    // ============================================
    // STEP 5: Database Statistics
    // ============================================
    console.log('\n📊 Step 5: Database Statistics\n');

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

    console.log('   Collection Counts:');
    console.log(`      Users:                ${stats.users}`);
    console.log(`      Categories:           ${stats.categories}`);
    console.log(`      Subcategories:        ${stats.subcategories}`);
    console.log(`      Locations:            ${stats.locations}`);
    console.log(`      Ads:                  ${stats.ads}`);
    console.log(`      Favorites:            ${stats.favorites}`);
    console.log(`      Chat Rooms:           ${stats.chatRooms}`);
    console.log(`      Chat Messages:        ${stats.chatMessages}`);
    console.log(`      Notifications:        ${stats.notifications}`);
    console.log(`      Wallets:              ${stats.wallets}`);
    console.log(`      Premium Orders:       ${stats.premiumOrders}`);
    console.log(`      Premium Settings:     ${stats.premiumSettings}`);
    console.log(`      Search Alert Settings: ${stats.searchAlertSettings}`);
    console.log(`      Auth Page Settings:   ${stats.authPageSettings}`);
    console.log(`      Follows:              ${stats.follows}`);
    console.log(`      Contact Requests:     ${stats.contactRequests}`);
    console.log(`      Blocks:                ${stats.blocks}`);
    console.log(`      Audit Logs:           ${stats.auditLogs}`);
    console.log(`      Refresh Tokens:        ${stats.refreshTokens}`);

    console.log('\n' + '='.repeat(70));
    console.log('✅ MongoDB Database Update Completed Successfully!');
    console.log('='.repeat(70));
    console.log('\n📋 Next Steps:');
    console.log('   1. Seed categories: npm run seed-all-categories');
    console.log('   2. Seed locations: npm run seed-locations');
    console.log('   3. Create admin: npm run create-admin');
    console.log('   4. Start server: npm run dev');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error updating database:', error.message);
    if (error.message.includes('connect') || error.message.includes('timeout')) {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Check MongoDB connection string in .env');
      console.error('   2. Verify MongoDB Atlas cluster is running');
      console.error('   3. Check IP whitelist in MongoDB Atlas');
      console.error('   4. Verify credentials are correct\n');
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
  updateMongoDBDatabase().catch(console.error);
}

module.exports = { updateMongoDBDatabase };
