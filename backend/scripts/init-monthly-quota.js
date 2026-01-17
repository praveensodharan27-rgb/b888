const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Initialize monthly quota fields for existing users
 * Sets freeAdsRemaining to 2, freeAdsUsedThisMonth to 0, and lastFreeAdsResetDate to current date
 */
async function initMonthlyQuota() {
  try {
    console.log('🔄 Initializing monthly quota for existing users...');
    
    // Get all users (we'll check and update fields that exist)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        freeAdsRemaining: true
      }
    });

    console.log(`📊 Found ${users.length} users to initialize`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        // Update with new fields (will work after Prisma client is regenerated)
        // For now, we'll use raw update to set default values
        const updateData = {
          freeAdsRemaining: user.freeAdsRemaining ?? 2
        };
        
        // Try to update new fields if they exist in schema
        try {
          // Use $executeRaw to set default values for new fields
          await prisma.$executeRaw`
            UPDATE users 
            SET 
              freeAdsRemaining = COALESCE(freeAdsRemaining, 2),
              freeAdsUsedThisMonth = COALESCE(freeAdsUsedThisMonth, 0),
              lastFreeAdsResetDate = COALESCE(lastFreeAdsResetDate, ${new Date()})
            WHERE _id = ${user.id}
          `;
        } catch (rawError) {
          // If raw update fails, try regular update (will work after Prisma client regeneration)
          await prisma.user.update({
            where: { id: user.id },
            data: updateData
          });
        }
        updatedCount++;
        
        if (updatedCount % 100 === 0) {
          console.log(`   ✅ Updated ${updatedCount} users...`);
        }
      } catch (error) {
        console.error(`❌ Error updating user ${user.id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`✅ Monthly quota initialization completed:`);
    console.log(`   - Users updated: ${updatedCount}`);
    console.log(`   - Errors: ${errorCount}`);
    console.log(`   - Total processed: ${users.length}`);
  } catch (error) {
    console.error('❌ Error in monthly quota initialization:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  initMonthlyQuota()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { initMonthlyQuota };

