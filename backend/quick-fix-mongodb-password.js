/**
 * Quick Fix MongoDB Password
 * Updates .env file with correct MongoDB password
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function updatePassword() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 Fix MongoDB Password');
  console.log('='.repeat(80) + '\n');
  
  console.log('Enter the CORRECT password for MongoDB user "b888":');
  console.log('(Get this from MongoDB Atlas → Database Access)\n');
  
  const password = await question('Password: ');
  
  if (!password || password.trim() === '') {
    console.log('\n❌ Password cannot be empty!');
    rl.close();
    process.exit(1);
  }
  
  // URL-encode the password
  const encodedPassword = encodeURIComponent(password);
  
  // Build connection string
  const connectionString = `mongodb+srv://b888:${encodedPassword}@cluster0.zfcaepv.mongodb.net/olx_app?retryWrites=true&w=majority&appName=Cluster0`;
  
  // Update .env file
  const envPath = path.join(__dirname, '.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Update DATABASE_URL
  if (envContent.includes('DATABASE_URL=')) {
    envContent = envContent.replace(
      /DATABASE_URL=.*/g,
      `DATABASE_URL=${connectionString}`
    );
    console.log('✅ Updated DATABASE_URL');
  } else {
    envContent = `DATABASE_URL=${connectionString}\n${envContent}`;
    console.log('✅ Added DATABASE_URL');
  }
  
  // Update MONGO_URI
  if (envContent.includes('MONGO_URI=')) {
    envContent = envContent.replace(
      /MONGO_URI=.*/g,
      `MONGO_URI=${connectionString}`
    );
    console.log('✅ Updated MONGO_URI');
  } else {
    envContent += `\nMONGO_URI=${connectionString}\n`;
    console.log('✅ Added MONGO_URI');
  }
  
  // Write updated .env
  fs.writeFileSync(envPath, envContent);
  
  console.log('\n✅ .env file updated!');
  console.log('   User: b888');
  console.log('   Database: olx_app');
  console.log('   Password: ' + '*'.repeat(password.length) + '\n');
  
  console.log('📋 Next Steps:');
  console.log('   1. Test connection: npm run test-mongodb');
  console.log('   2. Regenerate Prisma Client: npm run prisma:generate');
  console.log('   3. Start server: npm run dev\n');
  
  rl.close();
}

updatePassword().catch(console.error);
