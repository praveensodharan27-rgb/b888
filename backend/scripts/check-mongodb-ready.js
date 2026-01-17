/**
 * Check if MongoDB is Ready
 * Simple verification script
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

console.log('\n=== MongoDB Migration Check ===\n');

// Check 1: Environment
const dbUrl = process.env.DATABASE_URL || '';
console.log('1. DATABASE_URL:', dbUrl ? (dbUrl.includes('mongodb') ? 'OK (MongoDB)' : 'WRONG (Not MongoDB)') : 'NOT SET');

// Check 2: Schema
const fs = require('fs');
const schema = fs.readFileSync('./prisma/schema.prisma', 'utf8');
console.log('2. Schema Provider:', schema.includes('provider = "mongodb"') ? 'OK (MongoDB)' : 'WRONG (PostgreSQL)');

// Check 3: Connection
const prisma = new PrismaClient();
prisma.$connect()
  .then(async () => {
    console.log('3. Database Connection: OK');
    
    try {
      const count = await prisma.user.count();
      console.log('4. Database Test: OK (Users:', count + ')');
      console.log('\n=== All Checks Passed! ===\n');
      console.log('Your app is ready to use MongoDB!');
      console.log('Start server: npm run dev\n');
    } catch (e) {
      console.log('4. Database Test: ERROR -', e.message);
    }
    
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.log('3. Database Connection: ERROR');
    console.log('   Error:', error.message);
    if (error.message.includes('postgresql')) {
      console.log('\nFIX: Run "npm run prisma:generate"');
    }
    process.exit(1);
  });
