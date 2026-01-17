/**
 * Fix Database URL - Ensure it starts with mongodb:// or mongodb+srv://
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(80));
console.log('🔧 Fixing Database URL');
console.log('='.repeat(80) + '\n');

const envPath = path.join(__dirname, '..', '.env');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!');
  process.exit(1);
}

let envContent = fs.readFileSync(envPath, 'utf8');

// Check current DATABASE_URL
let currentUrl = '';
if (envContent.match(/DATABASE_URL=(.*)/)) {
  currentUrl = envContent.match(/DATABASE_URL=(.*)/)[1].trim();
  // Remove quotes if present
  currentUrl = currentUrl.replace(/^["']|["']$/g, '');
}

console.log('Current DATABASE_URL:', currentUrl.substring(0, 50) + '...\n');

// Check if URL starts with mongodb:// or mongodb+srv://
if (!currentUrl.startsWith('mongodb://') && !currentUrl.startsWith('mongodb+srv://')) {
  console.log('❌ DATABASE_URL does not start with mongodb:// or mongodb+srv://');
  console.log('   Fixing...\n');
  
  // Try to fix common issues
  let fixedUrl = currentUrl;
  
  // If it's missing protocol entirely, add mongodb+srv://
  if (!fixedUrl.includes('://')) {
    // Check if it looks like MongoDB Atlas format
    if (fixedUrl.includes('@cluster') || fixedUrl.includes('.mongodb.net')) {
      fixedUrl = 'mongodb+srv://' + fixedUrl;
      console.log('   ✅ Added mongodb+srv:// protocol');
    } else {
      // Assume local MongoDB
      fixedUrl = 'mongodb://' + fixedUrl;
      console.log('   ✅ Added mongodb:// protocol');
    }
  }
  
  // Update DATABASE_URL
  envContent = envContent.replace(
    /DATABASE_URL=.*/g,
    `DATABASE_URL="${fixedUrl}"`
  );
  
  // Update MONGO_URI too
  if (envContent.includes('MONGO_URI=')) {
    envContent = envContent.replace(
      /MONGO_URI=.*/g,
      `MONGO_URI="${fixedUrl}"`
    );
  } else {
    envContent += `\nMONGO_URI="${fixedUrl}"\n`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log('   ✅ Updated DATABASE_URL and MONGO_URI\n');
  console.log('New DATABASE_URL:', fixedUrl.substring(0, 50) + '...\n');
} else {
  console.log('✅ DATABASE_URL already has correct protocol\n');
}

// Verify the fix
require('dotenv').config({ override: true });
const newUrl = process.env.DATABASE_URL || '';

if (newUrl.startsWith('mongodb://') || newUrl.startsWith('mongodb+srv://')) {
  console.log('✅ Database URL is now correct!');
  console.log('   Protocol:', newUrl.startsWith('mongodb+srv://') ? 'mongodb+srv://' : 'mongodb://');
  console.log('\n📋 Next Steps:');
  console.log('   1. Test connection: npm run test-mongodb');
  console.log('   2. Regenerate Prisma Client: npm run prisma:generate');
  console.log('   3. Add dummy data: npm run add-dummy-data\n');
} else {
  console.log('❌ DATABASE_URL is still incorrect');
  console.log('   Please check your .env file manually\n');
}
