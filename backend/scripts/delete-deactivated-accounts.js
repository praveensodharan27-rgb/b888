const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Delete accounts that have been deactivated for more than 7 days
 * This script should be run daily via cron job
 */
async function deleteDeactivatedAccounts() {
  try {
    console.log('🔄 Starting deletion of deactivated accounts...');
    
    // Calculate date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Find all deactivated accounts older than 7 days
    const accountsToDelete = await prisma.user.findMany({
      where: {
        isDeactivated: true,
        deactivatedAt: {
          lte: sevenDaysAgo
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        deactivatedAt: true
      }
    });
    
    console.log(`Found ${accountsToDelete.length} accounts to delete`);
    
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const account of accountsToDelete) {
      try {
        // Delete user (cascade will handle related records)
        await prisma.user.delete({
          where: { id: account.id }
        });
        
        deletedCount++;
        console.log(`✅ Deleted account: ${account.name} (${account.email || 'no email'})`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error deleting account ${account.id}:`, error.message);
      }
    }
    
    console.log(`\n✅ Deletion complete:`);
    console.log(`   - Deleted: ${deletedCount}`);
    console.log(`   - Errors: ${errorCount}`);
    
    return {
      success: true,
      deleted: deletedCount,
      errors: errorCount
    };
  } catch (error) {
    console.error('❌ Error in deleteDeactivatedAccounts:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  deleteDeactivatedAccounts()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { deleteDeactivatedAccounts };

