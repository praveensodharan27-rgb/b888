const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');

console.log('Checking .env file...\n');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!');
  process.exit(1);
}

let content = fs.readFileSync(envPath, 'utf8');
let changed = false;

// Fix DATABASE_URL
const urlMatch = content.match(/^DATABASE_URL=(.*)$/m);
if (urlMatch) {
  let url = urlMatch[1].trim().replace(/^["']|["']$/g, '');
  
  if (!url.startsWith('mongodb://') && !url.startsWith('mongodb+srv://')) {
    console.log('❌ DATABASE_URL missing protocol');
    console.log('   Current:', url.substring(0, 50));
    
    if (url.includes('@cluster') || url.includes('.mongodb.net')) {
      url = 'mongodb+srv://' + url;
    } else {
      url = 'mongodb://' + url;
    }
    
    content = content.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${url}"`);
    changed = true;
    console.log('   Fixed:', url.substring(0, 50) + '...\n');
  } else {
    console.log('✅ DATABASE_URL has correct protocol\n');
  }
} else {
  console.log('❌ DATABASE_URL not found in .env');
  const defaultUrl = 'mongodb+srv://b888:Ponkunnam4433!@cluster0.zfcaepv.mongodb.net/olx_app?retryWrites=true&w=majority&appName=Cluster0';
  content += `\nDATABASE_URL="${defaultUrl}"\n`;
  content += `MONGO_URI="${defaultUrl}"\n`;
  changed = true;
  console.log('   Added DATABASE_URL\n');
}

if (changed) {
  fs.writeFileSync(envPath, content);
  console.log('✅ .env file updated!\n');
}

console.log('Next: npm run prisma:generate && npm run seed-all-db\n');
