/**
 * Quick Fix: Update .env to use MongoDB
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const MONGO_URI = 'mongodb+srv://b888:Ponkunnam4433!@cluster0.zfcaepv.mongodb.net/olx_app?retryWrites=true&w=majority&appName=Cluster0';
const envPath = path.join(__dirname, '..', '.env');

console.log('🔧 Updating .env file to use MongoDB...\n');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found at:', envPath);
  process.exit(1);
}

let envContent = fs.readFileSync(envPath, 'utf8');

// Replace DATABASE_URL with MongoDB connection
if (envContent.includes('DATABASE_URL=')) {
  envContent = envContent.replace(
    /DATABASE_URL=.*/,
    `DATABASE_URL=${MONGO_URI}`
  );
  console.log('✅ Updated DATABASE_URL');
} else {
  envContent += `\nDATABASE_URL=${MONGO_URI}\n`;
  console.log('✅ Added DATABASE_URL');
}

// Add or update MONGO_URI
if (envContent.includes('MONGO_URI=')) {
  envContent = envContent.replace(
    /MONGO_URI=.*/,
    `MONGO_URI=${MONGO_URI}`
  );
  console.log('✅ Updated MONGO_URI');
} else {
  envContent += `MONGO_URI=${MONGO_URI}\n`;
  console.log('✅ Added MONGO_URI');
}

fs.writeFileSync(envPath, envContent);

console.log('\n✅ .env file updated successfully!');
console.log('\n📋 Next steps:');
console.log('   1. Restart your server');
console.log('   2. The connection errors should be resolved');
console.log('\n💡 MongoDB URI:', MONGO_URI.substring(0, 50) + '...');
