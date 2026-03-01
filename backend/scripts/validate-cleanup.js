#!/usr/bin/env node

/**
 * VALIDATION SCRIPT
 * Tests database connection and validates cleanup script prerequisites
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.DATABASE_URL || process.env.MONGO_URI;
const DB_NAME = 'olx_app';

async function validateConnection() {
  console.log('\n🔍 Validating Database Connection...\n');
  console.log('='.repeat(60));

  if (!MONGODB_URI) {
    console.error('\n❌ ERROR: DATABASE_URL not found in .env file');
    console.error('Please set DATABASE_URL in backend/.env');
    return false;
  }

  // Mask password in URI for display
  const maskedUri = MONGODB_URI.replace(/:[^:@]+@/, ':****@');
  console.log(`\n📡 Connecting to: ${maskedUri}`);

  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connection successful!');

    const db = client.db(DB_NAME);

    // Check collections exist
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    console.log(`\n📊 Found ${collections.length} collections:`);
    const requiredCollections = ['users', 'ads', 'categories', 'adpostingorders'];
    
    for (const required of requiredCollections) {
      if (collectionNames.includes(required)) {
        const count = await db.collection(required).countDocuments();
        console.log(`   ✅ ${required}: ${count} documents`);
      } else {
        console.log(`   ⚠️  ${required}: NOT FOUND`);
      }
    }

    // Check for admin users
    console.log('\n🛡️  Checking Admin Users:');
    const adminUsers = await db.collection('users').find({
      $or: [
        { role: 'ADMIN' },
        { email: 'admin@sellit.com' },
        { email: 'meetmee09@gmail.com' }
      ]
    }).toArray();

    if (adminUsers.length === 0) {
      console.log('   ⚠️  WARNING: No admin users found!');
      console.log('   You may want to create an admin user before cleanup.');
    } else {
      console.log(`   ✅ Found ${adminUsers.length} admin user(s):`);
      adminUsers.forEach(admin => {
        console.log(`      - ${admin.email || admin.phone || 'No contact'} [${admin.role}]`);
      });
    }

    // Check for dummy data
    console.log('\n🔍 Checking for Dummy Data:');
    
    const dummyUsers = await db.collection('users').countDocuments({
      email: { $regex: /test|dummy|sample|seed|demo|mokia|faker|example\.com/i }
    });
    console.log(`   📊 Dummy users: ${dummyUsers}`);

    const dummyAds = await db.collection('ads').countDocuments({
      $or: [
        { title: { $regex: /test|dummy|sample|seed|demo|lorem|ipsum/i } },
        { description: { $regex: /test|dummy|sample|seed|demo|lorem|ipsum/i } }
      ]
    });
    console.log(`   📊 Dummy ads: ${dummyAds}`);

    const testOrders = await db.collection('adpostingorders').countDocuments({
      isTestOrder: true
    });
    console.log(`   📊 Test orders: ${testOrders}`);

    const totalDummy = dummyUsers + dummyAds + testOrders;
    
    if (totalDummy === 0) {
      console.log('\n   ✅ No dummy data found! Database is clean.');
    } else {
      console.log(`\n   📊 Total dummy records: ${totalDummy}`);
      console.log('   💡 Run cleanup script to remove them.');
    }

    await client.close();
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Validation Complete!\n');
    
    return true;

  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    console.error('\nPossible issues:');
    console.error('  - Check DATABASE_URL in .env file');
    console.error('  - Verify network connection');
    console.error('  - Check MongoDB Atlas whitelist');
    return false;
  }
}

async function main() {
  console.log('\n╔' + '═'.repeat(58) + '╗');
  console.log('║' + ' '.repeat(15) + '🔍 CLEANUP VALIDATION' + ' '.repeat(22) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');

  const isValid = await validateConnection();

  if (isValid) {
    console.log('✅ All checks passed!');
    console.log('\nYou can now run:');
    console.log('  node scripts/cleanup-all-dummy-data.js          # Preview');
    console.log('  node scripts/cleanup-all-dummy-data.js --confirm # Execute');
    console.log('');
    process.exit(0);
  } else {
    console.log('❌ Validation failed. Fix issues before running cleanup.');
    console.log('');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateConnection };
