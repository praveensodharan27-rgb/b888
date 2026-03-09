#!/usr/bin/env node

/**
 * DELETE ALL DATA EXCEPT ADMIN
 * Removes all users (except admins) and all posts/ads
 * 
 * SAFETY:
 * - Preserves users with role = ADMIN
 * - Preserves admin@sellit.com
 * - Shows preview before deletion
 * - Requires --confirm flag
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.DATABASE_URL || process.env.MONGO_URI;
const DB_NAME = 'olx_app';

// Admin protection
const ADMIN_EMAILS = ['admin@sellit.com', 'meetmee09@gmail.com'];
const ADMIN_ROLE = 'ADMIN';

async function connectDB() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('✅ Connected to MongoDB');
  return { client, db: client.db(DB_NAME) };
}

async function findAdminUsers(db) {
  const users = db.collection('users');
  const admins = await users.find({
    $or: [
      { role: ADMIN_ROLE },
      { email: { $in: ADMIN_EMAILS } }
    ]
  }, { projection: { _id: 1, email: 1, name: 1, role: 1 } }).toArray();

  console.log(`\n🛡️  Found ${admins.length} admin user(s) to preserve:`);
  admins.forEach(admin => {
    console.log(`   ✅ ${admin.email || 'No email'} - ${admin.name} [${admin.role}]`);
  });

  return admins.map(a => a._id);
}

async function previewDeletion(db, adminIds) {
  console.log('\n📊 PREVIEW: What will be deleted\n');
  console.log('='.repeat(70));

  // 1. Users to delete (non-admin)
  const usersToDelete = await db.collection('users').find({
    _id: { $nin: adminIds }
  }).toArray();

  console.log(`\n👥 USERS TO DELETE: ${usersToDelete.length}`);
  if (usersToDelete.length > 0) {
    console.log('Sample users:');
    usersToDelete.slice(0, 10).forEach(u => {
      console.log(`   - ${u.email || u.phone || 'No contact'} | ${u.name} | ${u.role}`);
    });
    if (usersToDelete.length > 10) {
      console.log(`   ... and ${usersToDelete.length - 10} more`);
    }
  }

  // 2. All ads
  const adsCount = await db.collection('ads').countDocuments();
  console.log(`\n📦 ADS TO DELETE: ${adsCount} (ALL ads)`);

  // 3. Related data counts
  const userIdsToDelete = usersToDelete.map(u => u._id);
  
  const favorites = await db.collection('favorites').countDocuments();
  const notifications = await db.collection('notifications').countDocuments();
  const chatRooms = await db.collection('chatrooms').countDocuments();
  const chatMessages = await db.collection('chatmessages').countDocuments();
  const orders = await db.collection('adpostingorders').countDocuments();
  const premiumOrders = await db.collection('premiumorders').countDocuments();

  console.log(`\n🔗 RELATED DATA TO DELETE:`);
  console.log(`   - ${favorites} favorites`);
  console.log(`   - ${notifications} notifications`);
  console.log(`   - ${chatRooms} chat rooms`);
  console.log(`   - ${chatMessages} chat messages`);
  console.log(`   - ${orders} ad posting orders`);
  console.log(`   - ${premiumOrders} premium orders`);

  const totalToDelete = 
    usersToDelete.length + 
    adsCount + 
    favorites + 
    notifications + 
    chatRooms + 
    chatMessages + 
    orders + 
    premiumOrders;

  console.log(`\n📊 TOTAL RECORDS TO DELETE: ${totalToDelete}`);
  console.log('\n' + '='.repeat(70));

  return {
    userIdsToDelete,
    counts: {
      users: usersToDelete.length,
      ads: adsCount,
      favorites,
      notifications,
      chatRooms,
      chatMessages,
      orders,
      premiumOrders,
      total: totalToDelete
    }
  };
}

async function deleteAllData(db, userIdsToDelete, adminIds) {
  console.log('\n🔥 DELETING ALL DATA (EXCEPT ADMINS)...\n');
  console.log('='.repeat(70));

  const results = {};

  try {
    // 1. Delete all ads (ALL ads, regardless of owner)
    console.log('\n1️⃣  Deleting ALL ads...');
    results.ads = await db.collection('ads').deleteMany({});
    console.log(`   ✅ Deleted ${results.ads.deletedCount} ads`);

    // 2. Delete all non-admin users
    console.log('\n2️⃣  Deleting non-admin users...');
    results.users = await db.collection('users').deleteMany({
      _id: { $nin: adminIds }
    });
    console.log(`   ✅ Deleted ${results.users.deletedCount} users`);

    // 3. Delete all favorites
    console.log('\n3️⃣  Deleting all favorites...');
    results.favorites = await db.collection('favorites').deleteMany({});
    console.log(`   ✅ Deleted ${results.favorites.deletedCount} favorites`);

    // 4. Delete all notifications
    console.log('\n4️⃣  Deleting all notifications...');
    results.notifications = await db.collection('notifications').deleteMany({});
    console.log(`   ✅ Deleted ${results.notifications.deletedCount} notifications`);

    // 5. Delete all chat rooms
    console.log('\n5️⃣  Deleting all chat rooms...');
    results.chatRooms = await db.collection('chatrooms').deleteMany({});
    console.log(`   ✅ Deleted ${results.chatRooms.deletedCount} chat rooms`);

    // 6. Delete all chat messages
    console.log('\n6️⃣  Deleting all chat messages...');
    results.chatMessages = await db.collection('chatmessages').deleteMany({});
    console.log(`   ✅ Deleted ${results.chatMessages.deletedCount} chat messages`);

    // 7. Delete all ad posting orders
    console.log('\n7️⃣  Deleting all ad posting orders...');
    results.orders = await db.collection('adpostingorders').deleteMany({});
    console.log(`   ✅ Deleted ${results.orders.deletedCount} orders`);

    // 8. Delete all premium orders
    console.log('\n8️⃣  Deleting all premium orders...');
    results.premiumOrders = await db.collection('premiumorders').deleteMany({});
    console.log(`   ✅ Deleted ${results.premiumOrders.deletedCount} premium orders`);

    // 9. Delete payment orders
    console.log('\n9️⃣  Deleting payment orders...');
    results.paymentOrders = await db.collection('paymentorders').deleteMany({});
    console.log(`   ✅ Deleted ${results.paymentOrders?.deletedCount || 0} payment orders`);

    // 10. Delete payment records
    console.log('\n🔟 Deleting payment records...');
    results.paymentRecords = await db.collection('paymentrecords').deleteMany({});
    console.log(`   ✅ Deleted ${results.paymentRecords?.deletedCount || 0} payment records`);

    // 11. Delete wallets
    console.log('\n1️⃣1️⃣  Deleting wallets...');
    results.wallets = await db.collection('wallets').deleteMany({
      userId: { $nin: adminIds }
    });
    console.log(`   ✅ Deleted ${results.wallets?.deletedCount || 0} wallets`);

    // 12. Delete credit transactions
    console.log('\n1️⃣2️⃣  Deleting credit transactions...');
    results.creditTransactions = await db.collection('credittransactions').deleteMany({});
    console.log(`   ✅ Deleted ${results.creditTransactions?.deletedCount || 0} credit transactions`);

    // 13. Delete OTP codes
    console.log('\n1️⃣3️⃣  Deleting OTP codes...');
    results.otpCodes = await db.collection('otps').deleteMany({});
    console.log(`   ✅ Deleted ${results.otpCodes?.deletedCount || 0} OTP codes`);

    // 14. Delete refresh tokens
    console.log('\n1️⃣4️⃣  Deleting refresh tokens...');
    results.refreshTokens = await db.collection('refreshtokens').deleteMany({
      userId: { $nin: adminIds }
    });
    console.log(`   ✅ Deleted ${results.refreshTokens?.deletedCount || 0} refresh tokens`);

    // 15. Delete push subscriptions
    console.log('\n1️⃣5️⃣  Deleting push subscriptions...');
    results.pushSubscriptions = await db.collection('pushsubscriptions').deleteMany({
      userId: { $nin: adminIds }
    });
    console.log(`   ✅ Deleted ${results.pushSubscriptions?.deletedCount || 0} push subscriptions`);

    // 16. Delete referrals
    console.log('\n1️⃣6️⃣  Deleting referrals...');
    results.referrals = await db.collection('referrals').deleteMany({});
    console.log(`   ✅ Deleted ${results.referrals?.deletedCount || 0} referrals`);

    // 17. Delete businesses
    console.log('\n1️⃣7️⃣  Deleting businesses...');
    results.businesses = await db.collection('businesses').deleteMany({
      userId: { $nin: adminIds }
    });
    console.log(`   ✅ Deleted ${results.businesses?.deletedCount || 0} businesses`);

    // 18. Delete contact requests
    console.log('\n1️⃣8️⃣  Deleting contact requests...');
    results.contactRequests = await db.collection('contactrequests').deleteMany({});
    console.log(`   ✅ Deleted ${results.contactRequests?.deletedCount || 0} contact requests`);

    // 19. Delete follows
    console.log('\n1️⃣9️⃣  Deleting follows...');
    results.follows = await db.collection('follows').deleteMany({});
    console.log(`   ✅ Deleted ${results.follows?.deletedCount || 0} follows`);

    // 20. Delete blocks
    console.log('\n2️⃣0️⃣  Deleting blocks...');
    results.blocks = await db.collection('blocks').deleteMany({});
    console.log(`   ✅ Deleted ${results.blocks?.deletedCount || 0} blocks`);

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ DELETION COMPLETE!\n');

    return results;
  } catch (error) {
    console.error('\n❌ ERROR during deletion:', error.message);
    throw error;
  }
}

async function clearMeilisearch() {
  console.log('\n🔍 Clearing Meilisearch index...');
  
  try {
    const { MeiliSearch } = require('meilisearch');
    const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || 'http://127.0.0.1:7700';
    const MEILISEARCH_KEY = process.env.MEILISEARCH_MASTER_KEY;

    const client = new MeiliSearch({
      host: MEILISEARCH_HOST,
      apiKey: MEILISEARCH_KEY,
    });

    // Delete all documents from ads index
    const index = client.index('ads');
    await index.deleteAllDocuments();
    
    console.log('   ✅ Meilisearch index cleared');
  } catch (error) {
    console.log('   ⚠️  Meilisearch not available or error:', error.message);
  }
}

async function showFinalStats(db) {
  console.log('\n📊 FINAL DATABASE STATE\n');
  console.log('='.repeat(70));

  const users = await db.collection('users').countDocuments();
  const admins = await db.collection('users').countDocuments({ role: ADMIN_ROLE });
  const ads = await db.collection('ads').countDocuments();
  const favorites = await db.collection('favorites').countDocuments();
  const notifications = await db.collection('notifications').countDocuments();
  const chatRooms = await db.collection('chatrooms').countDocuments();
  const chatMessages = await db.collection('chatmessages').countDocuments();

  console.log(`\n👥 Users:           ${users} (${admins} admins)`);
  console.log(`📦 Ads:             ${ads}`);
  console.log(`⭐ Favorites:       ${favorites}`);
  console.log(`🔔 Notifications:   ${notifications}`);
  console.log(`💬 Chat Rooms:      ${chatRooms}`);
  console.log(`💬 Chat Messages:   ${chatMessages}`);

  console.log('\n' + '='.repeat(70));
}

async function main() {
  console.log('\n');
  console.log('╔' + '═'.repeat(68) + '╗');
  console.log('║' + ' '.repeat(10) + '⚠️  DELETE ALL DATA (EXCEPT ADMIN) ⚠️' + ' '.repeat(18) + '║');
  console.log('╚' + '═'.repeat(68) + '╝');
  console.log('\n⚠️  WARNING: This will DELETE ALL users and posts!');
  console.log('✅ SAFE: Admin users will be preserved');
  console.log('\n' + '='.repeat(70));

  const { client, db } = await connectDB();

  try {
    // Find admin users to protect
    const adminIds = await findAdminUsers(db);

    if (adminIds.length === 0) {
      console.error('\n❌ ERROR: No admin users found!');
      console.error('Cannot proceed without at least one admin user.');
      await client.close();
      process.exit(1);
    }

    // Preview what will be deleted
    const { userIdsToDelete, counts } = await previewDeletion(db, adminIds);

    // Check for confirmation
    const confirmed = process.argv.includes('--confirm');

    if (!confirmed) {
      console.log('\n' + '='.repeat(70));
      console.log('⚠️  DRY RUN MODE (Preview Only)');
      console.log('='.repeat(70));
      console.log('\nNo data was deleted. This was a preview.');
      console.log('\n⚠️  TO DELETE ALL DATA, run:');
      console.log('  node scripts/delete-all-except-admin.js --confirm');
      console.log('\n⚠️  THIS CANNOT BE UNDONE!');
      console.log('⚠️  BACKUP YOUR DATABASE FIRST!');
      console.log('\nBackup command:');
      console.log('  mongodump --uri="' + MONGODB_URI.replace(/:[^:@]+@/, ':****@') + '"');
      console.log('');
      await client.close();
      return;
    }

    // Perform deletion
    const results = await deleteAllData(db, userIdsToDelete, adminIds);

    // Clear Meilisearch
    await clearMeilisearch();

    // Show final stats
    await showFinalStats(db);

    // Calculate total deleted
    const totalDeleted = 
      results.users.deletedCount +
      results.ads.deletedCount +
      results.favorites.deletedCount +
      results.notifications.deletedCount +
      results.chatRooms.deletedCount +
      results.chatMessages.deletedCount +
      results.orders.deletedCount +
      results.premiumOrders.deletedCount +
      (results.paymentOrders?.deletedCount || 0) +
      (results.paymentRecords?.deletedCount || 0) +
      (results.wallets?.deletedCount || 0) +
      (results.creditTransactions?.deletedCount || 0) +
      (results.otpCodes?.deletedCount || 0) +
      (results.refreshTokens?.deletedCount || 0) +
      (results.pushSubscriptions?.deletedCount || 0) +
      (results.referrals?.deletedCount || 0) +
      (results.businesses?.deletedCount || 0) +
      (results.contactRequests?.deletedCount || 0) +
      (results.follows?.deletedCount || 0) +
      (results.blocks?.deletedCount || 0);

    // Final summary
    console.log('\n✨ DELETION SUMMARY');
    console.log('='.repeat(70));
    console.log(`\n✅ Total records deleted: ${totalDeleted}`);
    console.log(`✅ Admin users preserved: ${adminIds.length}`);
    console.log(`✅ Meilisearch index cleared`);
    console.log(`✅ Database cleaned`);
    console.log('\n' + '='.repeat(70));

  } catch (error) {
    console.error('\n❌ DELETION FAILED:', error);
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
      console.log('✅ Script completed successfully\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { main };
