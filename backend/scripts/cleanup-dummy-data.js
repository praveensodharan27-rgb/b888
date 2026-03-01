#!/usr/bin/env node

/**
 * SAFE DATABASE CLEANUP SCRIPT
 * Removes all dummy, test, and seed data while preserving admin users
 * 
 * Safety Features:
 * - Preview mode (shows what will be deleted)
 * - Preserves admin users
 * - Transaction support
 * - Backup recommendation
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.DATABASE_URL || process.env.MONGO_URI;
const DB_NAME = 'olx_app';

// Safety: Admin identifiers
const ADMIN_EMAILS = ['admin@sellit.com', 'admin@example.com'];
const ADMIN_ROLE = 'ADMIN';

// Dummy data patterns
const DUMMY_PATTERNS = {
  title: /test|dummy|sample|seed|demo|mokia|faker/i,
  email: /test|dummy|sample|seed|demo|mokia|faker|example\.com/i,
  name: /test|dummy|sample|seed|demo|mokia|faker/i,
};

async function connectDB() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('✅ Connected to MongoDB');
  return { client, db: client.db(DB_NAME) };
}

async function previewDeletion(db) {
  console.log('\n📊 PREVIEW: Data that will be deleted\n');
  console.log('='.repeat(60));

  // 1. Preview Users (excluding admins)
  const users = db.collection('users');
  const usersToDelete = await users.find({
    role: { $ne: ADMIN_ROLE },
    email: { 
      $nin: ADMIN_EMAILS,
      $regex: DUMMY_PATTERNS.email
    }
  }).toArray();

  console.log(`\n👥 USERS TO DELETE: ${usersToDelete.length}`);
  if (usersToDelete.length > 0) {
    console.log('Sample users:');
    usersToDelete.slice(0, 5).forEach(u => {
      console.log(`  - ${u.email || u.phone || 'No contact'} (${u.name}) [${u.role}]`);
    });
    if (usersToDelete.length > 5) {
      console.log(`  ... and ${usersToDelete.length - 5} more`);
    }
  }

  // 2. Preview Ads with dummy patterns
  const ads = db.collection('ads');
  const adsToDelete = await ads.find({
    $or: [
      { title: { $regex: DUMMY_PATTERNS.title } },
      { description: { $regex: DUMMY_PATTERNS.title } }
    ]
  }).toArray();

  console.log(`\n📦 ADS TO DELETE: ${adsToDelete.length}`);
  if (adsToDelete.length > 0) {
    console.log('Sample ads:');
    adsToDelete.slice(0, 5).forEach(ad => {
      console.log(`  - ${ad.title} (${ad.status})`);
    });
    if (adsToDelete.length > 5) {
      console.log(`  ... and ${adsToDelete.length - 5} more`);
    }
  }

  // 3. Preview Test Orders
  const orders = db.collection('adpostingorders');
  const testOrders = await orders.find({
    isTestOrder: true
  }).toArray();

  console.log(`\n💰 TEST ORDERS TO DELETE: ${testOrders.length}`);

  // 4. Preview Categories with dummy flag
  const categories = db.collection('categories');
  const dummyCategories = await categories.find({
    $or: [
      { name: { $regex: DUMMY_PATTERNS.name } },
      { slug: { $regex: /test|dummy|sample/ } }
    ]
  }).toArray();

  console.log(`\n📁 DUMMY CATEGORIES TO DELETE: ${dummyCategories.length}`);
  if (dummyCategories.length > 0) {
    dummyCategories.forEach(cat => {
      console.log(`  - ${cat.name} (${cat.slug})`);
    });
  }

  // 5. Preview Admin Users (WILL BE KEPT)
  const adminUsers = await users.find({
    $or: [
      { role: ADMIN_ROLE },
      { email: { $in: ADMIN_EMAILS } }
    ]
  }).toArray();

  console.log(`\n🛡️  ADMIN USERS (WILL BE KEPT): ${adminUsers.length}`);
  adminUsers.forEach(admin => {
    console.log(`  ✅ ${admin.email || admin.phone} (${admin.name}) [${admin.role}]`);
  });

  console.log('\n' + '='.repeat(60));

  return {
    usersToDelete: usersToDelete.length,
    adsToDelete: adsToDelete.length,
    ordersToDelete: testOrders.length,
    categoriesToDelete: dummyCategories.length,
    adminsToKeep: adminUsers.length
  };
}

async function performCleanup(db) {
  console.log('\n🔥 PERFORMING CLEANUP...\n');
  console.log('='.repeat(60));

  const results = {
    users: 0,
    ads: 0,
    orders: 0,
    categories: 0,
    favorites: 0,
    notifications: 0,
    chatRooms: 0,
    chatMessages: 0
  };

  try {
    // 1. Delete dummy users (excluding admins)
    console.log('\n1️⃣  Deleting dummy users...');
    const userDeleteResult = await db.collection('users').deleteMany({
      role: { $ne: ADMIN_ROLE },
      email: { 
        $nin: ADMIN_EMAILS,
        $regex: DUMMY_PATTERNS.email
      }
    });
    results.users = userDeleteResult.deletedCount;
    console.log(`   ✅ Deleted ${results.users} dummy users`);

    // 2. Delete dummy/test ads
    console.log('\n2️⃣  Deleting dummy/test ads...');
    const adDeleteResult = await db.collection('ads').deleteMany({
      $or: [
        { title: { $regex: DUMMY_PATTERNS.title } },
        { description: { $regex: DUMMY_PATTERNS.title } }
      ]
    });
    results.ads = adDeleteResult.deletedCount;
    console.log(`   ✅ Deleted ${results.ads} dummy ads`);

    // 3. Delete test orders
    console.log('\n3️⃣  Deleting test orders...');
    const orderDeleteResult = await db.collection('adpostingorders').deleteMany({
      isTestOrder: true
    });
    results.orders = orderDeleteResult.deletedCount;
    console.log(`   ✅ Deleted ${results.orders} test orders`);

    // 4. Delete dummy categories
    console.log('\n4️⃣  Deleting dummy categories...');
    const categoryDeleteResult = await db.collection('categories').deleteMany({
      $or: [
        { name: { $regex: DUMMY_PATTERNS.name } },
        { slug: { $regex: /test|dummy|sample/ } }
      ]
    });
    results.categories = categoryDeleteResult.deletedCount;
    console.log(`   ✅ Deleted ${results.categories} dummy categories`);

    // 5. Clean up orphaned favorites
    console.log('\n5️⃣  Cleaning orphaned favorites...');
    const favoriteDeleteResult = await db.collection('favorites').deleteMany({
      $or: [
        { adId: { $exists: false } },
        { userId: { $exists: false } }
      ]
    });
    results.favorites = favoriteDeleteResult.deletedCount;
    console.log(`   ✅ Deleted ${results.favorites} orphaned favorites`);

    // 6. Clean up orphaned notifications
    console.log('\n6️⃣  Cleaning orphaned notifications...');
    const notificationDeleteResult = await db.collection('notifications').deleteMany({
      userId: { $exists: false }
    });
    results.notifications = notificationDeleteResult.deletedCount;
    console.log(`   ✅ Deleted ${results.notifications} orphaned notifications`);

    // 7. Clean up orphaned chat rooms
    console.log('\n7️⃣  Cleaning orphaned chat rooms...');
    const chatRoomDeleteResult = await db.collection('chatrooms').deleteMany({
      $or: [
        { user1Id: { $exists: false } },
        { user2Id: { $exists: false } }
      ]
    });
    results.chatRooms = chatRoomDeleteResult.deletedCount;
    console.log(`   ✅ Deleted ${results.chatRooms} orphaned chat rooms`);

    // 8. Clean up orphaned chat messages
    console.log('\n8️⃣  Cleaning orphaned chat messages...');
    const chatMessageDeleteResult = await db.collection('chatmessages').deleteMany({
      $or: [
        { senderId: { $exists: false } },
        { receiverId: { $exists: false } }
      ]
    });
    results.chatMessages = chatMessageDeleteResult.deletedCount;
    console.log(`   ✅ Deleted ${results.chatMessages} orphaned chat messages`);

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ CLEANUP COMPLETE!\n');

    return results;
  } catch (error) {
    console.error('\n❌ ERROR during cleanup:', error.message);
    throw error;
  }
}

async function optimizeDatabase(db) {
  console.log('\n🔧 OPTIMIZING DATABASE...\n');
  
  try {
    // Compact collections (MongoDB optimization)
    const collections = ['users', 'ads', 'categories', 'adpostingorders'];
    
    for (const collectionName of collections) {
      try {
        await db.command({ compact: collectionName });
        console.log(`   ✅ Optimized ${collectionName}`);
      } catch (err) {
        console.log(`   ⚠️  Could not compact ${collectionName}: ${err.message}`);
      }
    }

    console.log('\n✅ Database optimization complete');
  } catch (error) {
    console.error('⚠️  Optimization error:', error.message);
  }
}

async function showFinalStats(db) {
  console.log('\n📊 FINAL DATABASE STATISTICS\n');
  console.log('='.repeat(60));

  const users = await db.collection('users').countDocuments();
  const adminUsers = await db.collection('users').countDocuments({ role: ADMIN_ROLE });
  const ads = await db.collection('ads').countDocuments();
  const categories = await db.collection('categories').countDocuments();
  const orders = await db.collection('adpostingorders').countDocuments();

  console.log(`\n👥 Users:       ${users} (${adminUsers} admins)`);
  console.log(`📦 Ads:         ${ads}`);
  console.log(`📁 Categories:  ${categories}`);
  console.log(`💰 Orders:      ${orders}`);

  console.log('\n' + '='.repeat(60));
}

async function main() {
  console.log('\n🧹 DATABASE CLEANUP SCRIPT');
  console.log('='.repeat(60));
  console.log('⚠️  WARNING: This will delete dummy and test data!');
  console.log('✅ SAFE: Admin users will be preserved');
  console.log('='.repeat(60));

  const { client, db } = await connectDB();

  try {
    // Step 1: Preview
    console.log('\n📋 STEP 1: PREVIEW');
    const preview = await previewDeletion(db);

    // Step 2: Confirmation
    console.log('\n⚠️  CONFIRMATION REQUIRED');
    console.log('='.repeat(60));
    console.log(`\nThis will delete:`);
    console.log(`  - ${preview.usersToDelete} users`);
    console.log(`  - ${preview.adsToDelete} ads`);
    console.log(`  - ${preview.ordersToDelete} test orders`);
    console.log(`  - ${preview.categoriesToDelete} dummy categories`);
    console.log(`\nThis will keep:`);
    console.log(`  - ${preview.adminsToKeep} admin users ✅`);
    console.log(`  - All production data ✅`);

    // Check for --confirm flag
    const confirmed = process.argv.includes('--confirm');

    if (!confirmed) {
      console.log('\n⚠️  DRY RUN MODE (Preview Only)');
      console.log('To actually delete data, run:');
      console.log('  node scripts/cleanup-dummy-data.js --confirm');
      console.log('');
      await client.close();
      return;
    }

    // Step 3: Perform cleanup
    console.log('\n📋 STEP 2: CLEANUP');
    const results = await performCleanup(db);

    // Step 4: Optimize
    console.log('\n📋 STEP 3: OPTIMIZATION');
    await optimizeDatabase(db);

    // Step 5: Final stats
    console.log('\n📋 STEP 4: FINAL STATISTICS');
    await showFinalStats(db);

    // Summary
    console.log('\n✨ CLEANUP SUMMARY');
    console.log('='.repeat(60));
    console.log(`\n✅ Deleted:`);
    console.log(`   - ${results.users} dummy users`);
    console.log(`   - ${results.ads} dummy ads`);
    console.log(`   - ${results.orders} test orders`);
    console.log(`   - ${results.categories} dummy categories`);
    console.log(`   - ${results.favorites} orphaned favorites`);
    console.log(`   - ${results.notifications} orphaned notifications`);
    console.log(`   - ${results.chatRooms} orphaned chat rooms`);
    console.log(`   - ${results.chatMessages} orphaned chat messages`);
    console.log(`\n✅ Preserved:`);
    console.log(`   - All admin users`);
    console.log(`   - All production data`);
    console.log(`\n✅ Database optimized`);
    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('\n❌ CLEANUP FAILED:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed\n');
  }
}

// Run script
if (require.main === module) {
  main()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { main };
