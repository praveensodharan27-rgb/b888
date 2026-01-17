/**
 * Ensure DATABASE_URL has correct MongoDB protocol
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!');
  process.exit(1);
}

let envContent = fs.readFileSync(envPath, 'utf8');
let updated = false;

// Fix DATABASE_URL
if (envContent.includes('DATABASE_URL=')) {
  const match = envContent.match(/DATABASE_URL=(.*)/);
  if (match) {
    let url = match[1].trim();
    // Remove quotes
    url = url.replace(/^["']|["']$/g, '');
    
    // Check if it needs fixing
    if (!url.startsWith('mongodb://') && !url.startsWith('mongodb+srv://')) {
      console.log('❌ DATABASE_URL missing protocol');
      console.log('   Current:', url.substring(0, 50));
      
      // Add protocol
      if (url.includes('@cluster') || url.includes('.mongodb.net')) {
        url = 'mongodb+srv://' + url;
      } else {
        url = 'mongodb://' + url;
      }
      
      console.log('   Fixed:', url.substring(0, 50) + '...');
      
      // Update in content
      envContent = envContent.replace(
        /DATABASE_URL=.*/g,
        `DATABASE_URL="${url}"`
      );
      updated = true;
    }
  }
}

// Fix MONGO_URI
if (envContent.includes('MONGO_URI=')) {
  const match = envContent.match(/MONGO_URI=(.*)/);
  if (match) {
    let url = match[1].trim();
    url = url.replace(/^["']|["']$/g, '');
    
    if (!url.startsWith('mongodb://') && !url.startsWith('mongodb+srv://')) {
      if (url.includes('@cluster') || url.includes('.mongodb.net')) {
        url = 'mongodb+srv://' + url;
      } else {
        url = 'mongodb://' + url;
      }
      
      envContent = envContent.replace(
        /MONGO_URI=.*/g,
        `MONGO_URI="${url}"`
      );
      updated = true;
    }
  }
}

if (updated) {
  fs.writeFileSync(envPath, envContent);
  console.log('\n✅ .env file updated!');
} else {
  console.log('\n✅ DATABASE_URL already has correct protocol');
}

console.log('\n📋 Next: npm run prisma:generate && npm run add-dummy-data\n');
