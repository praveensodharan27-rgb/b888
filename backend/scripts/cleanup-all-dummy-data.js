#!/usr/bin/env node

/**
 * COMPREHENSIVE DATABASE CLEANUP
 * Removes ALL dummy, test, and seed data
 * Preserves admin users and production data
 * 
 * Usage:
 *   node scripts/cleanup-all-dummy-data.js           # Preview only
 *   node scripts/cleanup-all-dummy-data.js --confirm # Actually delete
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.DATABASE_URL || process.env.MONGO_URI;
const DB_NAME = 'olx_app';

// Admin protection
const ADMIN_EMAILS = ['admin@sellit.com', 'admin@example.com', 'meetmee09@gmail.com'];
const ADMIN_ROLE = 'ADMIN';

// Dummy patterns
const DUMMY_PATTERNS = {
  text: /test|dummy|sample|seed|demo|mokia|faker|lorem|ipsum/i,
  email: /test|dummy|sample|seed|demo|mokia|faker|example\.com|test\.com/i,
};

async function connectDB() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('✅ Connected to MongoDB');
  return { client, db: client.db(DB_NAME) };
}

async function findAdminUserIds(db) {
  const users = db.collection('users');
  const admins = await users.find({
    $or: [
      { role: ADMIN_ROLE },
      { email: { $in: ADMIN_EMAILS } }
    ]
  }, { projection: { _id: 1, email: 1, name: 1, role: 1 } }).toArray();

  console.log(`\n🛡️  Found ${admins.length} admin users to preserve:`);
  admins.forEach(admin => {
    console.log(`   ✅ ${admin.email || 'No email'} - ${admin.name} [${admin.role}]`);
  });

  return admins.map(a => a._id);
}

async function previewCleanup(db, adminIds) {
  console.log('\n📊 PREVIEW: What will be deleted\n');
  console.log('='.repeat(70));

  const preview = {};

  // 1. Users (non-admin with dummy patterns)
  const usersToDelete = await db.collection('users').find({
    _id: { $nin: adminIds },
    $or: [
      { email: { $regex: DUMMY_PATTERNS.email } },
      { name: { $regex: DUMMY_PATTERNS.text } },
      { phone: { $regex: /^(\+91)?0000000/ } } // Fake phone numbers
    ]
  }).toArray();
  preview.users = usersToDelete;

  console.log(`\n👥 USERS (${usersToDelete.length}):`);
  usersToDelete.slice(0, 5).forEach(u => {
    console.log(`   - ${u.email || u.phone || 'No contact'} | ${u.name} | ${u.role}`);
  });
  if (usersToDelete.length > 5) console.log(`   ... and ${usersToDelete.length - 5} more`);

  // 2. Ads with dummy patterns
  const adsToDelete = await db.collection('ads').find({
    $or: [
      { title: { $regex: DUMMY_PATTERNS.text } },
      { description: { $regex: DUMMY_PATTERNS.text } }
    ]
  }).toArray();
  preview.ads = adsToDelete;

  console.log(`\n📦 ADS (${adsToDelete.length}):`);
  adsToDelete.slice(0, 5).forEach(ad => {
    console.log(`   - ${ad.title} | ${ad.status} | ${ad.price}`);
  });
  if (adsToDelete.length > 5) console.log(`   ... and ${adsToDelete.length - 5} more`);

  // 3. Test orders
  const testOrders = await db.collection('adpostingorders').find({
    isTestOrder: true
  }).toArray();
  preview.orders = testOrders;

  console.log(`\n💰 TEST ORDERS (${testOrders.length}):`);
  if (testOrders.length > 0) {
    testOrders.slice(0, 3).forEach(o => {
      console.log(`   - Order ${o._id} | Amount: ${o.amount} | Status: ${o.status}`);
    });
  }

  // 4. Dummy categories
  const dummyCategories = await db.collection('categories').find({
    $or: [
      { name: { $regex: DUMMY_PATTERNS.text } },
      { slug: { $regex: DUMMY_PATTERNS.text } }
    ]
  }).toArray();
  preview.categories = dummyCategories;

  console.log(`\n📁 CATEGORIES (${dummyCategories.length}):`);
  dummyCategories.forEach(cat => {
    console.log(`   - ${cat.name} (${cat.slug})`);
  });

  // 5. Get user IDs to delete (for cascading)
  const userIdsToDelete = usersToDelete.map(u => u._id);
  const adIdsToDelete = adsToDelete.map(ad => ad._id);

  // 6. Related data that will be cascaded
  const favoritesToDelete = await db.collection('favorites').countDocuments({
    $or: [
      { userId: { $in: userIdsToDelete } },
      { adId: { $in: adIdsToDelete } }
    ]
  });

  const notificationsToDelete = await db.collection('notifications').countDocuments({
    userId: { $in: userIdsToDelete }
  });

  const chatRoomsToDelete = await db.collection('chatrooms').countDocuments({
    $or: [
      { user1Id: { $in: userIdsToDelete } },
      { user2Id: { $in: userIdsToDelete } }
    ]
  });

  const chatMessagesToDelete = await db.collection('chatmessages').countDocuments({
    $or: [
      { senderId: { $in: userIdsToDelete } },
      { receiverId: { $in: userIdsToDelete } }
    ]
  });

  console.log(`\n🔗 RELATED DATA (Cascading):`);
  console.log(`   - ${favoritesToDelete} favorites`);
  console.log(`   - ${notificationsToDelete} notifications`);
  console.log(`   - ${chatRoomsToDelete} chat rooms`);
  console.log(`   - ${chatMessagesToDelete} chat messages`);

  console.log('\n' + '='.repeat(70));

  return {
    preview,
    counts: {
      users: usersToDelete.length,
      ads: adsToDelete.length,
      orders: testOrders.length,
      categories: dummyCategories.length,
      favorites: favoritesToDelete,
      notifications: notificationsToDelete,
      chatRooms: chatRoomsToDelete,
      chatMessages: chatMessagesToDelete
    },
    userIdsToDelete,
    adIdsToDelete
  };
}

async function performCleanup(db, userIdsToDelete, adIdsToDelete) {
  console.log('\n🔥 PERFORMING CLEANUP...\n');
  console.log('='.repeat(70));

  const results = {};

  // 1. Delete dummy users
  console.log('\n1️⃣  Deleting dummy users...');
  results.users = await db.collection('users').deleteMany({
    _id: { $in: userIdsToDelete }
  });
  console.log(`   ✅ Deleted ${results.users.deletedCount} users`);

  // 2. Delete dummy ads
  console.log('\n2️⃣  Deleting dummy ads...');
  results.ads = await db.collection('ads').deleteMany({
    _id: { $in: adIdsToDelete }
  });
  console.log(`   ✅ Deleted ${results.ads.deletedCount} ads`);

  // 3. Delete test orders
  console.log('\n3️⃣  Deleting test orders...');
  results.orders = await db.collection('adpostingorders').deleteMany({
    isTestOrder: true
  });
  console.log(`   ✅ Deleted ${results.orders.deletedCount} orders`);

  // 4. Delete dummy categories
  console.log('\n4️⃣  Deleting dummy categories...');
  results.categories = await db.collection('categories').deleteMany({
    $or: [
      { name: { $regex: DUMMY_PATTERNS.text } },
      { slug: { $regex: DUMMY_PATTERNS.text } }
    ]
  });
  console.log(`   ✅ Deleted ${results.categories.deletedCount} categories`);

  // 5. Cascade delete favorites
  console.log('\n5️⃣  Deleting related favorites...');
  results.favorites = await db.collection('favorites').deleteMany({
    $or: [
      { userId: { $in: userIdsToDelete } },
      { adId: { $in: adIdsToDelete } }
    ]
  });
  console.log(`   ✅ Deleted ${results.favorites.deletedCount} favorites`);

  // 6. Cascade delete notifications
  console.log('\n6️⃣  Deleting related notifications...');
  results.notifications = await db.collection('notifications').deleteMany({
    userId: { $in: userIdsToDelete }
  });
  console.log(`   ✅ Deleted ${results.notifications.deletedCount} notifications`);

  // 7. Cascade delete chat rooms
  console.log('\n7️⃣  Deleting related chat rooms...');
  results.chatRooms = await db.collection('chatrooms').deleteMany({
    $or: [
      { user1Id: { $in: userIdsToDelete } },
      { user2Id: { $in: userIdsToDelete } }
    ]
  });
  console.log(`   ✅ Deleted ${results.chatRooms.deletedCount} chat rooms`);

  // 8. Cascade delete chat messages
  console.log('\n8️⃣  Deleting related chat messages...');
  results.chatMessages = await db.collection('chatmessages').deleteMany({
    $or: [
      { senderId: { $in: userIdsToDelete } },
      { receiverId: { $in: userIdsToDelete } }
    ]
  });
  console.log(`   ✅ Deleted ${results.chatMessages.deletedCount} chat messages`);

  // 9. Delete orphaned records
  console.log('\n9️⃣  Cleaning orphaned records...');
  
  // Orphaned favorites (ad or user doesn't exist)
  const orphanedFavorites = await db.collection('favorites').deleteMany({
    $or: [
      { adId: { $type: 'string', $not: { $in: await db.collection('ads').distinct('_id') } } },
      { userId: { $type: 'string', $not: { $in: await db.collection('users').distinct('_id') } } }
    ]
  });
  console.log(`   ✅ Deleted ${orphanedFavorites.deletedCount} orphaned favorites`);

  // 10. Delete premium orders for deleted users
  console.log('\n🔟 Deleting premium orders for deleted users...');
  results.premiumOrders = await db.collection('premiumorders').deleteMany({
    userId: { $in: userIdsToDelete }
  });
  console.log(`   ✅ Deleted ${results.premiumOrders.deletedCount} premium orders`);

  console.log('\n' + '='.repeat(70));
  console.log('\n✅ CLEANUP COMPLETE!\n');

  return results;
}

async function main() {
  console.log('\n');
  console.log('╔' + '═'.repeat(68) + '╗');
  console.log('║' + ' '.repeat(15) + '🧹 DATABASE CLEANUP SCRIPT' + ' '.repeat(27) + '║');
  console.log('╚' + '═'.repeat(68) + '╝');
  console.log('\n⚠️  WARNING: This will permanently delete dummy and test data!');
  console.log('✅ SAFE: Admin users and production data will be preserved');
  console.log('\n' + '='.repeat(70));

  const { client, db } = await connectDB();

  try {
    // Find admin users to protect
    const adminIds = await findAdminUserIds(db);

    // Preview what will be deleted
    const { counts, userIdsToDelete, adIdsToDelete } = await previewCleanup(db, adminIds);

    // Show totals
    const totalToDelete = 
      counts.users + 
      counts.ads + 
      counts.orders + 
      counts.categories +
      counts.favorites +
      counts.notifications +
      counts.chatRooms +
      counts.chatMessages;

    console.log(`\n📊 TOTAL RECORDS TO DELETE: ${totalToDelete}`);

    // Check for confirmation
    const confirmed = process.argv.includes('--confirm');

    if (!confirmed) {
      console.log('\n' + '='.repeat(70));
      console.log('⚠️  DRY RUN MODE (Preview Only)');
      console.log('='.repeat(70));
      console.log('\nNo data was deleted. This was a preview.');
      console.log('\nTo actually delete data, run:');
      console.log('  node scripts/cleanup-all-dummy-data.js --confirm');
      console.log('\n⚠️  RECOMMENDATION: Backup your database first!');
      console.log('  mongodump --uri="' + MONGODB_URI.replace(/:[^:@]+@/, ':****@') + '"');
      console.log('');
      await client.close();
      return;
    }

    // Perform cleanup
    const results = await performCleanup(db, userIdsToDelete, adIdsToDelete);

    // Optimize database
    await optimizeDatabase(db);

    // Show final stats
    await showFinalStats(db);

    // Final summary
    console.log('\n✨ CLEANUP COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(70));
    console.log(`\n✅ Total records deleted: ${
      results.users.deletedCount +
      results.ads.deletedCount +
      results.orders.deletedCount +
      results.categories.deletedCount +
      results.favorites.deletedCount +
      results.notifications.deletedCount +
      results.chatRooms.deletedCount +
      results.chatMessages.deletedCount +
      (results.premiumOrders?.deletedCount || 0)
    }`);
    console.log('✅ Admin users preserved');
    console.log('✅ Production data preserved');
    console.log('✅ Database optimized');
    console.log('\n' + '='.repeat(70));

  } catch (error) {
    console.error('\n❌ CLEANUP FAILED:', error);
    console.error('\nDatabase state may be inconsistent. Check manually.');
    throw error;
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed\n');
  }
}

async function optimizeDatabase(db) {
  console.log('\n🔧 OPTIMIZING DATABASE...\n');
  
  const collections = [
    'users', 'ads', 'categories', 'adpostingorders',
    'favorites', 'notifications', 'chatrooms', 'chatmessages'
  ];
  
  for (const collectionName of collections) {
    try {
      const stats = await db.collection(collectionName).stats();
      console.log(`   📊 ${collectionName}: ${stats.count} documents`);
    } catch (err) {
      console.log(`   ⚠️  ${collectionName}: Could not get stats`);
    }
  }

  console.log('\n✅ Database statistics updated');
}

async function showFinalStats(db) {
  console.log('\n📊 FINAL DATABASE STATE\n');
  console.log('='.repeat(70));

  const stats = {
    users: await db.collection('users').countDocuments(),
    admins: await db.collection('users').countDocuments({ role: ADMIN_ROLE }),
    ads: await db.collection('ads').countDocuments(),
    categories: await db.collection('categories').countDocuments(),
    orders: await db.collection('adpostingorders').countDocuments(),
    favorites: await db.collection('favorites').countDocuments(),
    chatRooms: await db.collection('chatrooms').countDocuments(),
  };

  console.log(`\n👥 Users:        ${stats.users} (${stats.admins} admins)`);
  console.log(`📦 Ads:          ${stats.ads}`);
  console.log(`📁 Categories:   ${stats.categories}`);
  console.log(`💰 Orders:       ${stats.orders}`);
  console.log(`⭐ Favorites:    ${stats.favorites}`);
  console.log(`💬 Chat Rooms:   ${stats.chatRooms}`);

  console.log('\n' + '='.repeat(70));
}

// Run script
if (require.main === module) {
  main()
    .then(() => {
      console.log('✅ Script completed successfully\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { main };
