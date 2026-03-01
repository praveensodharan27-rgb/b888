/**
 * Database connection check - works with MongoDB (Prisma)
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.DEBUG_PRISMA === 'true' ? ['query', 'error', 'warn'] : ['error'],
});

async function testConnection() {
  console.log('🔍 Checking database connection...\n');

  const dbUrl = process.env.DATABASE_URL || process.env.MONGO_URI;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL or MONGO_URI not set in .env');
    console.log('\nAdd to backend/.env:');
    console.log('  DATABASE_URL="mongodb://localhost:27017/sellit"');
    console.log('  # Or MongoDB Atlas:');
    console.log('  DATABASE_URL="mongodb+srv://user:pass@cluster.mongodb.net/dbname"');
    process.exit(1);
  }

  // Mask password in URL for display
  const safeUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
  console.log('📌 DATABASE_URL:', safeUrl);
  console.log('');

  try {
    await prisma.$connect();
    console.log('✅ Prisma connected to MongoDB\n');

    // Test queries - MongoDB/Prisma
    const [userCount, adCount, categoryCount] = await Promise.all([
      prisma.user.count().catch(() => -1),
      prisma.ad.count().catch(() => -1),
      prisma.category.count().catch(() => -1),
    ]);

    console.log('📊 Collection counts:');
    console.log('   Users:', userCount >= 0 ? userCount : '❌ error');
    console.log('   Ads:', adCount >= 0 ? adCount : '❌ error');
    console.log('   Categories:', categoryCount >= 0 ? categoryCount : '❌ error');
    console.log('');

    if (categoryCount === 0) {
      console.log('⚠️  No categories found. Run: npm run seed-all-categories');
    }
    if (userCount === 0 && adCount === 0) {
      console.log('⚠️  Database is empty. Consider: npm run seed-all-db');
    }

    console.log('✅ Database connection OK');
  } catch (error) {
    console.error('❌ Database connection failed!\n');
    console.error('Error:', error.message);

    if (error.code === 'P1001') {
      console.log('\n💡 MongoDB unreachable. Check:');
      console.log('   1. MongoDB is running (local) or Atlas cluster is up');
      console.log('   2. DATABASE_URL in .env is correct');
      console.log('   3. Network/firewall allows connection');
      console.log('   4. IP whitelist (Atlas): Add 0.0.0.0/0 for testing');
    } else if (error.message?.includes('authentication')) {
      console.log('\n💡 Authentication failed. Check:');
      console.log('   1. Username and password in DATABASE_URL');
      console.log('   2. Database user has read/write permissions');
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
