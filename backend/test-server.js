// Test server startup
console.log('Testing server startup...');

try {
  console.log('1. Loading dotenv...');
  require('dotenv').config();
  console.log('✅ dotenv loaded');
  
  console.log('2. Testing Prisma...');
  const { PrismaClient } = require('@prisma/client');
  console.log('✅ Prisma imported');
  
  console.log('3. Testing Express...');
  const express = require('express');
  console.log('✅ Express imported');
  
  console.log('4. Testing routes...');
  try {
    require('./routes/auth');
    require('./routes/locations');
    console.log('✅ Routes imported');
  } catch (err) {
    console.error('❌ Route import error:', err.message);
  }
  
  console.log('5. Starting server...');
  require('./server.js');
  console.log('✅ Server file loaded');
  
} catch (error) {
  console.error('❌ ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
}

