/**
 * MongoDB Connection Diagnostics
 * Helps diagnose MongoDB Atlas connection issues
 */

require('dotenv').config();

console.log('🔍 MongoDB Connection Diagnostics\n');
console.log('=' .repeat(50));

// Check if DATABASE_URL is set
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL is not set in .env file!');
  process.exit(1);
}

console.log('✅ DATABASE_URL is set');

// Parse connection string (safely, without showing password)
try {
  const url = new URL(databaseUrl.replace('mongodb+srv://', 'https://'));
  const username = url.username;
  const hostname = url.hostname;
  const pathname = url.pathname;
  
  console.log(`\n📋 Connection Details:`);
  console.log(`   Username: ${username}`);
  console.log(`   Host: ${hostname}`);
  console.log(`   Database: ${pathname.replace('/', '') || '(default)'}`);
  console.log(`   Protocol: ${databaseUrl.startsWith('mongodb+srv://') ? 'mongodb+srv' : 'mongodb'}`);
  
  // Check for special characters in password
  const passwordMatch = databaseUrl.match(/mongodb\+srv:\/\/[^:]+:([^@]+)@/);
  if (passwordMatch) {
    const password = passwordMatch[1];
    const hasSpecialChars = /[@#\$%&+\=]/.test(password);
    if (hasSpecialChars && !password.includes('%')) {
      console.warn(`\n⚠️  Password contains special characters that may need URL encoding:`);
      console.warn(`   Special chars found but not URL-encoded!`);
      console.warn(`   Example: @ should be %40, # should be %23, etc.`);
    }
  }
} catch (error) {
  console.error('❌ Error parsing DATABASE_URL:', error.message);
}

// Test connection
console.log('\n🔌 Testing MongoDB connection...');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ MongoDB connection successful!');
    
    // Test a simple query
    try {
      const userCount = await prisma.user.count();
      console.log(`✅ Database query successful! Users in database: ${userCount}`);
    } catch (queryError) {
      console.warn('⚠️  Connection works but queries fail:', queryError.message);
    }
    
    await prisma.$disconnect();
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.error('\n💡 Authentication Error:');
      console.error('   - Check username and password in DATABASE_URL');
      console.error('   - Verify user exists in MongoDB Atlas → Database Access');
    } else if (error.message.includes('timeout') || error.message.includes('Server selection')) {
      console.error('\n💡 Connection Timeout:');
      console.error('   - Check MongoDB Atlas cluster is running (not paused)');
      console.error('   - Verify your IP is whitelisted in MongoDB Atlas → Network Access');
      console.error('   - Check your internet connection');
      console.error('   - MongoDB Atlas may be temporarily unavailable');
    } else if (error.message.includes('InternalError') || error.message.includes('fatal alert')) {
      console.error('\n💡 SSL/TLS Error:');
      console.error('   - This is usually a MongoDB Atlas infrastructure issue');
      console.error('   - Check MongoDB Atlas status: https://status.mongodb.com/');
      console.error('   - Wait a few minutes and retry');
      console.error('   - Contact MongoDB Atlas support if issue persists');
    }
    
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
}

testConnection();




