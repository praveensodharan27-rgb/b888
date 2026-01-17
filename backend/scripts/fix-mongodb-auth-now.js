/**
 * Fix MongoDB Authentication - Update Connection String
 * This script updates the .env file with the correct MongoDB Atlas connection
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// MongoDB Atlas connection string with admin user (b888)
const MONGO_URI = 'mongodb+srv://b888:Ponkunnam4433!@cluster0.zfcaepv.mongodb.net/olx_app?retryWrites=true&w=majority&appName=Cluster0';

console.log('\n' + '='.repeat(80));
console.log('🔧 Fixing MongoDB Authentication');
console.log('='.repeat(80) + '\n');

const envPath = path.join(__dirname, '..', '.env');

// Read or create .env file
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('✅ Found .env file\n');
} else {
  console.log('⚠️  .env file not found, creating new one...\n');
  envContent = '';
}

// Update DATABASE_URL
if (envContent.includes('DATABASE_URL=')) {
  envContent = envContent.replace(
    /DATABASE_URL=.*/g,
    `DATABASE_URL=${MONGO_URI}`
  );
  console.log('✅ Updated DATABASE_URL');
} else {
  envContent = `DATABASE_URL=${MONGO_URI}\n${envContent}`;
  console.log('✅ Added DATABASE_URL');
}

// Update MONGO_URI
if (envContent.includes('MONGO_URI=')) {
  envContent = envContent.replace(
    /MONGO_URI=.*/g,
    `MONGO_URI=${MONGO_URI}`
  );
  console.log('✅ Updated MONGO_URI');
} else {
  envContent += `\nMONGO_URI=${MONGO_URI}\n`;
  console.log('✅ Added MONGO_URI');
}

// Ensure other required variables exist
if (!envContent.includes('NODE_ENV=')) {
  envContent += 'NODE_ENV=development\n';
}
if (!envContent.includes('PORT=')) {
  envContent += 'PORT=5000\n';
}
if (!envContent.includes('JWT_SECRET=')) {
  envContent += 'JWT_SECRET=your-secret-key-change-in-production\n';
}

// Write updated .env
fs.writeFileSync(envPath, envContent);
console.log('\n✅ .env file updated with MongoDB Atlas connection');
console.log('   User: b888');
console.log('   Database: olx_app');
console.log('   Cluster: cluster0.zfcaepv.mongodb.net\n');

console.log('📋 Next Steps:');
console.log('   1. Verify MongoDB Atlas user "b888" exists and password is correct');
console.log('   2. Check IP whitelist in MongoDB Atlas → Network Access');
console.log('   3. Regenerate Prisma Client: npm run prisma:generate');
console.log('   4. Test connection: node -e "const {PrismaClient} = require(\'@prisma/client\'); const p = new PrismaClient(); p.$connect().then(() => console.log(\'✅ Connected\')).catch(e => console.error(\'❌\', e.message));"');
console.log('   5. Start server: npm run dev\n');

console.log('⚠️  If authentication still fails:');
console.log('   - Check password in MongoDB Atlas for user "b888"');
console.log('   - URL-encode special characters in password (if any)');
console.log('   - Verify user has database access permissions\n');
