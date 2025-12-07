const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addDeactivationFields() {
  try {
    console.log('🔄 Adding deactivation fields to User table...');
    
    // Add isDeactivated column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "isDeactivated" BOOLEAN NOT NULL DEFAULT false;
    `);
    
    // Add deactivatedAt column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "deactivatedAt" TIMESTAMP;
    `);
    
    console.log('✅ Deactivation fields added successfully');
  } catch (error) {
    console.error('❌ Error adding deactivation fields:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addDeactivationFields()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

