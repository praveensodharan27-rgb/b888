/**
 * Test MongoDB Connection
 * Simple script to test if MongoDB connection works
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('Testing MongoDB connection...\n');
    
    await prisma.$connect();
    console.log('✅✅✅ MongoDB Connected Successfully! ✅✅✅\n');
    
    // Test a simple query
    const userCount = await prisma.user.count();
    console.log(`📊 Users in database: ${userCount}\n`);
    
    console.log('✅ Connection test passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection Failed:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.error('\n💡 MongoDB Authentication Error!');
      console.error('   The password for user "b888" is incorrect.');
      console.error('   Fix it by running:');
      console.error('   powershell -ExecutionPolicy Bypass -File .\\update-mongodb-password.ps1\n');
    } else if (error.message.includes('connect') || error.message.includes('timeout')) {
      console.error('\n💡 Connection Error!');
      console.error('   Check:');
      console.error('   1. MongoDB Atlas cluster is running');
      console.error('   2. Connection string in .env is correct');
      console.error('   3. IP address is whitelisted in MongoDB Atlas\n');
    } else {
      console.error('\n💡 Error details:', error);
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
