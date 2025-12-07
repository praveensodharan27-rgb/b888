const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Making referralCode column nullable...');
  
  try {
    // Make the column nullable
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" 
      ALTER COLUMN "referralCode" DROP NOT NULL;
    `);
    
    console.log('✅ Made referralCode nullable');
    
    // Drop the unique constraint temporarily if it exists (to allow nulls)
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "User" 
        DROP CONSTRAINT IF EXISTS "User_referralCode_key";
      `);
      console.log('✅ Dropped unique constraint temporarily');
    } catch (error) {
      console.log('⚠️  Could not drop unique constraint (may not exist):', error.message);
    }
    
    // Re-add unique constraint but allow nulls (PostgreSQL allows multiple nulls in unique columns)
    try {
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "User_referralCode_key" 
        ON "User" ("referralCode") 
        WHERE "referralCode" IS NOT NULL;
      `);
      console.log('✅ Re-added unique constraint (allowing nulls)');
    } catch (error) {
      console.log('⚠️  Could not create unique index:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error making column nullable:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

