const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Reset monthly free ads quota for all users
 * Runs on the 1st of every month at midnight
 */
async function resetMonthlyFreeAds() {
  try {
    console.log('🔄 Starting monthly free ads reset...');
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Find all users who need reset
    // Reset if lastFreeAdsResetDate is null or before the first day of current month
    const usersToReset = await prisma.user.findMany({
      where: {
        OR: [
          { lastFreeAdsResetDate: null },
          { lastFreeAdsResetDate: { lt: firstDayOfMonth } }
        ]
      },
      select: {
        id: true,
        email: true,
        freeAdsRemaining: true,
        freeAdsUsedThisMonth: true,
        lastFreeAdsResetDate: true
      }
    });

    console.log(`📊 Found ${usersToReset.length} users to reset`);

    let resetCount = 0;
    let errorCount = 0;

    for (const user of usersToReset) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            freeAdsRemaining: 2, // Reset to 2 free ads per month
            freeAdsUsedThisMonth: 0, // Reset monthly usage counter
            lastFreeAdsResetDate: now // Update reset date
          }
        });
        resetCount++;
        
        if (resetCount % 100 === 0) {
          console.log(`   ✅ Reset ${resetCount} users...`);
        }
      } catch (error) {
        console.error(`❌ Error resetting user ${user.id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`✅ Monthly free ads reset completed:`);
    console.log(`   - Users reset: ${resetCount}`);
    console.log(`   - Errors: ${errorCount}`);
    console.log(`   - Total processed: ${usersToReset.length}`);

    return {
      success: true,
      resetCount,
      errorCount,
      totalUsers: usersToReset.length
    };
  } catch (error) {
    console.error('❌ Error in monthly free ads reset:', error);
    throw error;
  }
}

/**
 * Check and reset monthly quota for a single user if needed
 * Called when user tries to post an ad
 */
async function checkAndResetUserQuota(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        freeAdsRemaining: true,
        freeAdsUsedThisMonth: true,
        lastFreeAdsResetDate: true
      }
    });

    if (!user) {
      return { needsReset: false };
    }

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Check if reset is needed
    const needsReset = 
      !user.lastFreeAdsResetDate || 
      user.lastFreeAdsResetDate < firstDayOfMonth;

    if (needsReset) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          freeAdsRemaining: 2,
          freeAdsUsedThisMonth: 0,
          lastFreeAdsResetDate: now
        }
      });

      console.log(`🔄 Reset monthly quota for user ${userId}`);
      return { needsReset: true, reset: true };
    }

    return { needsReset: false };
  } catch (error) {
    console.error(`❌ Error checking/resetting quota for user ${userId}:`, error);
    return { needsReset: false, error: error.message };
  }
}

module.exports = {
  resetMonthlyFreeAds,
  checkAndResetUserQuota
};

