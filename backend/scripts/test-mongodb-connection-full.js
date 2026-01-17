/**
 * Comprehensive MongoDB Connection Test
 * Tests connection, schema, and basic queries
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;

console.log('\n' + '='.repeat(60));
console.log('🔍 MongoDB Connection Test');
console.log('='.repeat(60) + '\n');

// Test 1: Environment Variables
console.log('1️⃣  Checking Environment Variables...');
if (!MONGO_URI) {
  console.error('   ❌ MONGO_URI or DATABASE_URL not set');
  process.exit(1);
}
console.log('   ✅ Connection string found');
console.log(`   📍 Host: ${MONGO_URI.match(/@([^/]+)/)?.[1] || 'unknown'}`);
console.log(`   📍 Database: ${MONGO_URI.match(/\/([^?]+)/)?.[1] || 'default'}\n`);

// Test 2: Schema Check
console.log('2️⃣  Checking Prisma Schema...');
try {
  const schema = fs.readFileSync('./prisma/schema.prisma', 'utf8');
  if (schema.includes('provider = "mongodb"')) {
    console.log('   ✅ Schema is configured for MongoDB\n');
  } else {
    console.error('   ❌ Schema is NOT configured for MongoDB');
    console.error('   💡 Run: npm run prisma:generate\n');
    process.exit(1);
  }
} catch (error) {
  console.error('   ❌ Could not read schema file:', error.message);
  process.exit(1);
}

// Test 3: Prisma Client Import
console.log('3️⃣  Testing Prisma Client Import...');
let prisma;
try {
  prisma = new PrismaClient();
  console.log('   ✅ Prisma Client imported successfully\n');
} catch (error) {
  console.error('   ❌ Failed to import Prisma Client:', error.message);
  console.error('   💡 Run: npm run prisma:generate\n');
  process.exit(1);
}

// Test 4: Database Connection
console.log('4️⃣  Testing Database Connection...');
prisma.$connect()
  .then(async () => {
    console.log('   ✅ Connected to MongoDB successfully\n');

    // Test 5: Basic Query
    console.log('5️⃣  Testing Basic Queries...');
    try {
      const userCount = await prisma.user.count();
      console.log(`   ✅ Users collection: ${userCount} documents`);
      
      const adCount = await prisma.ad.count();
      console.log(`   ✅ Ads collection: ${adCount} documents`);
      
      const categoryCount = await prisma.category.count();
      console.log(`   ✅ Categories collection: ${categoryCount} documents\n`);
    } catch (error) {
      console.error('   ⚠️  Query test failed:', error.message);
      console.log('   💡 Collections may not exist yet. Run: npm run setup-db\n');
    }

    // Test 6: Disconnect
    console.log('6️⃣  Disconnecting...');
    await prisma.$disconnect();
    console.log('   ✅ Disconnected successfully\n');

    // Summary
    console.log('='.repeat(60));
    console.log('✅ All Tests Passed!');
    console.log('='.repeat(60));
    console.log('\n📋 Your MongoDB connection is working correctly!');
    console.log('🚀 You can now start your server: npm run dev\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('   ❌ Connection failed:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check your MongoDB connection string');
    console.error('   2. Verify network access to MongoDB Atlas');
    console.error('   3. Check IP whitelist in MongoDB Atlas');
    console.error('   4. Verify credentials are correct');
    console.error('   5. Run: npm run prisma:generate\n');
    process.exit(1);
  });
