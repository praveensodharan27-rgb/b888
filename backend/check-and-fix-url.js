/**
 * Check and Fix DATABASE_URL - with detailed output
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');

console.log('\n' + '='.repeat(80));
console.log('🔍 Checking DATABASE_URL');
console.log('='.repeat(80) + '\n');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found at:', envPath);
  process.exit(1);
}

let envContent = fs.readFileSync(envPath, 'utf8');
let lines = envContent.split('\n');

console.log('📄 Reading .env file...\n');

// Find DATABASE_URL line
let dbUrlLine = -1;
let dbUrlValue = '';
let needsFix = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line.startsWith('DATABASE_URL=')) {
    dbUrlLine = i;
    dbUrlValue = line.substring('DATABASE_URL='.length).trim();
    // Remove quotes
    dbUrlValue = dbUrlValue.replace(/^["']|["']$/g, '');
    console.log('Found DATABASE_URL at line', i + 1);
    console.log('Current value:', dbUrlValue.substring(0, 60) + '...\n');
    break;
  }
}

if (dbUrlLine === -1) {
  console.log('❌ DATABASE_URL not found in .env');
  console.log('   Adding it now...\n');
  
  // Add default MongoDB Atlas URL
  const defaultUrl = 'mongodb+srv://b888:Ponkunnam4433!@cluster0.zfcaepv.mongodb.net/olx_app?retryWrites=true&w=majority&appName=Cluster0';
  envContent += `\nDATABASE_URL="${defaultUrl}"\n`;
  envContent += `MONGO_URI="${defaultUrl}"\n`;
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Added DATABASE_URL to .env\n');
  process.exit(0);
}

// Check if URL has correct protocol
if (!dbUrlValue.startsWith('mongodb://') && !dbUrlValue.startsWith('mongodb+srv://')) {
  console.log('❌ DATABASE_URL is missing protocol (mongodb:// or mongodb+srv://)');
  needsFix = true;
  
  // Determine which protocol to use
  let fixedUrl = dbUrlValue;
  if (fixedUrl.includes('@cluster') || fixedUrl.includes('.mongodb.net')) {
    fixedUrl = 'mongodb+srv://' + fixedUrl;
    console.log('   Adding mongodb+srv:// protocol (MongoDB Atlas)\n');
  } else {
    fixedUrl = 'mongodb://' + fixedUrl;
    console.log('   Adding mongodb:// protocol (Local MongoDB)\n');
  }
  
  // Update the line
  lines[dbUrlLine] = `DATABASE_URL="${fixedUrl}"`;
  
  // Also update MONGO_URI if it exists
  let mongoUriLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('MONGO_URI=')) {
      mongoUriLine = i;
      lines[i] = `MONGO_URI="${fixedUrl}"`;
      break;
    }
  }
  
  if (mongoUriLine === -1) {
    lines.push(`MONGO_URI="${fixedUrl}"`);
  }
  
  // Write back to file
  fs.writeFileSync(envPath, lines.join('\n'));
  console.log('✅ Fixed DATABASE_URL!');
  console.log('   New value:', fixedUrl.substring(0, 60) + '...\n');
} else {
  console.log('✅ DATABASE_URL already has correct protocol\n');
}

// Verify by reading it back
require('dotenv').config({ path: envPath, override: true });
const verifiedUrl = process.env.DATABASE_URL || '';

if (verifiedUrl.startsWith('mongodb://') || verifiedUrl.startsWith('mongodb+srv://')) {
  console.log('✅ Verification successful!');
  console.log('   Protocol:', verifiedUrl.startsWith('mongodb+srv://') ? 'mongodb+srv://' : 'mongodb://');
  console.log('   Database:', verifiedUrl.split('/').pop()?.split('?')[0] || 'unknown');
} else {
  console.log('❌ Verification failed - URL still incorrect');
}

console.log('\n' + '='.repeat(80));
console.log('📋 Next Steps:');
console.log('='.repeat(80));
console.log('   1. npm run prisma:generate');
console.log('   2. npm run add-dummy-data');
console.log('='.repeat(80) + '\n');
