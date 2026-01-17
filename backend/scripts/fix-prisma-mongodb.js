/**
 * Fix Prisma MongoDB Configuration
 * Ensures schema is set to MongoDB and regenerates client
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

console.log('🔧 Fixing Prisma MongoDB Configuration...\n');

// Read schema
let schema = fs.readFileSync(schemaPath, 'utf8');

// Check current provider
if (schema.includes('provider = "postgresql"')) {
  console.log('❌ Found PostgreSQL provider, fixing...');
  schema = schema.replace(
    /provider\s*=\s*"postgresql"/g,
    'provider = "mongodb"'
  );
  fs.writeFileSync(schemaPath, schema);
  console.log('✅ Updated schema to MongoDB\n');
} else if (schema.includes('provider = "mongodb"')) {
  console.log('✅ Schema already set to MongoDB\n');
} else {
  console.log('⚠️  Could not find provider in schema\n');
}

// Verify schema
const updatedSchema = fs.readFileSync(schemaPath, 'utf8');
if (updatedSchema.includes('provider = "mongodb"')) {
  console.log('✅ Schema verified: MongoDB\n');
} else {
  console.log('❌ Schema verification failed!\n');
  process.exit(1);
}

// Regenerate Prisma Client
console.log('🔄 Regenerating Prisma Client...\n');
try {
  execSync('npm run prisma:generate', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });
  console.log('\n✅ Prisma Client regenerated successfully!\n');
} catch (error) {
  console.error('\n❌ Error regenerating Prisma Client:', error.message);
  process.exit(1);
}

// Test connection
console.log('🧪 Testing connection...\n');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.$connect()
  .then(() => {
    console.log('✅ Successfully connected to MongoDB!\n');
    return prisma.$disconnect();
  })
  .then(() => {
    console.log('✅ All fixes applied successfully!\n');
    console.log('📋 Next steps:');
    console.log('   1. Run: npm run db-full');
    console.log('   2. Start server: npm run dev\n');
  })
  .catch((error) => {
    console.error('❌ Connection test failed:', error.message);
    if (error.message.includes('postgresql')) {
      console.error('\n💡 Prisma Client still thinks it\'s PostgreSQL');
      console.error('   Try: Delete node_modules/.prisma and run npm run prisma:generate\n');
    }
    process.exit(1);
  });
