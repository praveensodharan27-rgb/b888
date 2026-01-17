// Quick test to see what's missing
console.log('Testing Prisma Client import...\n');

try {
  console.log('1. Attempting to require @prisma/client...');
  const { PrismaClient } = require('@prisma/client');
  console.log('✅ PrismaClient imported successfully');
  
  console.log('\n2. Creating PrismaClient instance...');
  const prisma = new PrismaClient();
  console.log('✅ PrismaClient instance created');
  
  console.log('\n3. Testing connection...');
  prisma.$connect()
    .then(() => {
      console.log('✅ Connected to database successfully');
      return prisma.$disconnect();
    })
    .then(() => {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Connection error:', error.message);
      process.exit(1);
    });
} catch (error) {
  console.error('❌ Import error:', error.message);
  console.error('Error code:', error.code);
  console.error('Error stack:', error.stack);
  process.exit(1);
}
