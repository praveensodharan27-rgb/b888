/**
 * Migration Script: Initialize freeAdsRemaining for existing users
 * 
 * This script sets freeAdsRemaining = FREE_ADS_LIMIT - freeAdsUsed for all users
 * 
 * Usage: node backend/scripts/init-free-ads-remaining.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const FREE_ADS_LIMIT = 2;

async function initFreeAdsRemaining() {
  try {
    console.log('🔄 Starting freeAdsRemaining initialization...');
    
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        freeAdsUsed: true,
        freeAdsRemaining: true
      }
    });
    
    console.log(`📊 Found ${users.length} users to process`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const user of users) {
      const freeAdsUsed = user.freeAdsUsed || 0;
      const currentFreeAdsRemaining = user.freeAdsRemaining ?? null;
      
      // Calculate expected freeAdsRemaining
      const expectedFreeAdsRemaining = Math.max(0, FREE_ADS_LIMIT - freeAdsUsed);
      
      // Only update if different or null
      if (currentFreeAdsRemaining === null || currentFreeAdsRemaining !== expectedFreeAdsRemaining) {
        await prisma.user.update({
          where: { id: user.id },
          data: { freeAdsRemaining: expectedFreeAdsRemaining }
        });
        
        updated++;
        console.log(`✅ Updated user ${user.id}: freeAdsRemaining = ${expectedFreeAdsRemaining} (freeAdsUsed: ${freeAdsUsed})`);
      } else {
        skipped++;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`   Total users: ${users.length}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped (already correct): ${skipped}`);
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
initFreeAdsRemaining()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

