/**
 * Quick MongoDB Setup Script
 * 
 * This script helps you quickly set up MongoDB migration:
 * 1. Updates .env file with MongoDB connection
 * 2. Generates Prisma Client for MongoDB
 * 3. Tests the connection
 * 
 * Usage: node scripts/setup-mongodb.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://b888:NQEbkx2JWyBNJz7Z@cluster0.cj9oi8t.mongodb.net/olx_app?retryWrites=true&w=majority&appName=Cluster0';

async function setupMongoDB() {
  console.log('🚀 Setting up MongoDB for SellIt Application\n');
  
  // Step 1: Update .env file
  console.log('📝 Step 1: Updating .env file...');
  const envPath = path.join(__dirname, '..', '.env');
  
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update or add DATABASE_URL
    if (envContent.includes('DATABASE_URL=')) {
      envContent = envContent.replace(
        /DATABASE_URL=.*/,
        `DATABASE_URL=${MONGO_URI}`
      );
    } else {
      envContent += `\nDATABASE_URL=${MONGO_URI}\n`;
    }
    
    // Update or add MONGO_URI
    if (envContent.includes('MONGO_URI=')) {
      envContent = envContent.replace(
        /MONGO_URI=.*/,
        `MONGO_URI=${MONGO_URI}`
      );
    } else {
      envContent += `MONGO_URI=${MONGO_URI}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('   ✅ .env file updated\n');
  } else {
    console.log('   ⚠️  .env file not found. Creating new one...');
    const newEnvContent = `# MongoDB Configuration
DATABASE_URL=${MONGO_URI}
MONGO_URI=${MONGO_URI}

# Other environment variables...
NODE_ENV=development
PORT=5000
`;
    fs.writeFileSync(envPath, newEnvContent);
    console.log('   ✅ .env file created\n');
  }
  
  // Step 2: Generate Prisma Client
  console.log('🔧 Step 2: Generating Prisma Client for MongoDB...');
  const { execSync } = require('child_process');
  
  try {
    execSync('npm run prisma:generate', { 
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });
    console.log('   ✅ Prisma Client generated\n');
  } catch (error) {
    console.error('   ❌ Error generating Prisma Client:', error.message);
    console.log('   💡 Try running manually: npm run prisma:generate\n');
  }
  
  // Step 3: Test connection
  console.log('🧪 Step 3: Testing MongoDB connection...');
  
  try {
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log('   ✅ Successfully connected to MongoDB!\n');
    
    // Test a simple query
    const userCount = await prisma.user.count();
    console.log(`   📊 Found ${userCount} users in database\n`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('   ❌ Connection failed:', error.message);
    console.log('\n   💡 Troubleshooting:');
    console.log('      1. Check your MongoDB connection string');
    console.log('      2. Verify network access to MongoDB Atlas');
    console.log('      3. Check IP whitelist in MongoDB Atlas');
    console.log('      4. Verify credentials are correct\n');
    process.exit(1);
  }
  
  console.log('='.repeat(50));
  console.log('✅ MongoDB setup completed successfully!');
  console.log('='.repeat(50));
  console.log('\n📋 Next steps:');
  console.log('   1. If you have PostgreSQL data, run: npm run migrate-to-mongodb');
  console.log('   2. Start your server: npm run dev');
  console.log('   3. Test your API endpoints');
  console.log('\n📖 For detailed instructions, see: MONGODB_MIGRATION_GUIDE.md\n');
}

// Run setup
setupMongoDB().catch(console.error);
