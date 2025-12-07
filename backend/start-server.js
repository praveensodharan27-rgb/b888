// Simple server starter to check for errors
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function testAndStart() {
  try {
    console.log('Testing database connection...');
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log('✅ Database connected!');
    await prisma.$disconnect();
    
    console.log('Starting server...');
    require('./server.js');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testAndStart();

