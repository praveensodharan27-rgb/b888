/**
 * Test MongoDB Connection
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  console.log('\n🧪 Testing MongoDB Connection...\n');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 50) + '...' : 'NOT SET');
  console.log('');

  try {
    await prisma.$connect();
    console.log('✅ Successfully connected to MongoDB!\n');

    // Test a simple query
    const userCount = await prisma.user.count();
    console.log(`📊 Users in database: ${userCount}\n`);

    console.log('✅ Connection test passed!\n');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    if (error.message.includes('postgresql')) {
      console.error('\n💡 Issue: Prisma Client is still configured for PostgreSQL');
      console.error('   Solution: Run "npm run prisma:generate" again\n');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection().catch(console.error);
