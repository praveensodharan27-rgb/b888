const cron = require('node-cron');
const { deleteDeactivatedAccounts } = require('../scripts/delete-deactivated-accounts');
const { processSearchAlerts } = require('../services/searchAlerts');
const { autoApprovePendingAds } = require('../services/autoApproval');
const { resetMonthlyFreeAds } = require('../services/monthlyQuotaReset');
const { expireAds } = require('../scripts/expire-ads');
const { cleanupExpiredAds, refreshAllClusters, mergeLowVolumeClusters } = require('../services/clusterAutoUpdate');

/**
 * Setup cron jobs for scheduled tasks
 */
function setupCronJobs() {
  // Run daily at 2 AM to delete deactivated accounts
  cron.schedule('0 2 * * *', async () => {
    console.log('⏰ Running scheduled task: Delete deactivated accounts');
    try {
      await deleteDeactivatedAccounts();
    } catch (error) {
      console.error('❌ Error in scheduled task:', error);
    }
  });
  
  // Run search alerts processing every hour
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ Running scheduled task: Process search alerts');
    try {
      await processSearchAlerts();
    } catch (error) {
      console.error('❌ Error in search alerts task:', error);
    }
  });
  
  // Process pending moderation after 5 minutes (runs every 5 minutes)
  cron.schedule('*/5 * * * *', async () => {
    console.log('⏰ Running scheduled task: Process pending moderation');
    try {
      await autoApprovePendingAds(5); // Process ads after 5 minutes
    } catch (error) {
      console.error('❌ Error in moderation processing task:', error);
    }
  });

  // Reset monthly free ads quota on the 1st of every month at midnight
  cron.schedule('0 0 1 * *', async () => {
    console.log('⏰ Running scheduled task: Reset monthly free ads quota');
    try {
      await resetMonthlyFreeAds();
    } catch (error) {
      console.error('❌ Error in monthly quota reset task:', error);
    }
  });

  // Auto-expire ads that have passed their expiration date (runs every hour)
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ Running scheduled task: Auto-expire ads');
    try {
      await expireAds();
    } catch (error) {
      console.error('❌ Error in ad expiration task:', error);
    }
  });
  
  // Run search alerts on startup (after 30 seconds delay to allow server to fully initialize)
  setTimeout(async () => {
    console.log('⏰ Running initial search alerts check on startup...');
    try {
      await processSearchAlerts();
    } catch (error) {
      console.error('❌ Error in initial search alerts check:', error);
    }
  }, 30000);
  
  // Run moderation processing on startup (after 1 minute to allow server to fully initialize)
  setTimeout(async () => {
    console.log('⏰ Running initial moderation processing check on startup...');
    try {
      await autoApprovePendingAds(5);
    } catch (error) {
      console.error('❌ Error in initial moderation processing check:', error);
    }
  }, 60000);
  
  // Cleanup expired ads from clusters daily at 3:30 AM
  cron.schedule('30 3 * * *', async () => {
    console.log('⏰ Running scheduled task: Cleanup expired ads from clusters');
    try {
      const result = await cleanupExpiredAds();
      console.log(`✅ Cleaned up ${result.cleaned} expired ads from clusters`);
    } catch (error) {
      console.error('❌ Error in cluster cleanup task:', error);
    }
  });

  // Refresh all clusters daily at 4 AM
  cron.schedule('0 4 * * *', async () => {
    console.log('⏰ Running scheduled task: Refresh all clusters');
    try {
      const result = await refreshAllClusters();
      console.log(`✅ Refreshed ${result.updated} clusters, ${result.errors} errors`);
    } catch (error) {
      console.error('❌ Error in cluster refresh task:', error);
    }
  });

  // Merge low-volume clusters weekly on Sunday at 5 AM
  cron.schedule('0 5 * * 0', async () => {
    console.log('⏰ Running scheduled task: Merge low-volume clusters');
    try {
      const result = await mergeLowVolumeClusters(3);
      console.log(`✅ Merged ${result.merged} low-volume clusters`);
    } catch (error) {
      console.error('❌ Error in cluster merge task:', error);
    }
  });

  console.log('✅ Cron jobs scheduled:');
  console.log('   - Delete deactivated accounts: Daily at 2 AM');
  console.log('   - Process search alerts: Every hour');
  console.log('   - Process pending moderation: Every 5 minutes (approve/reject after review)');
  console.log('   - Reset monthly free ads quota: 1st of every month at midnight');
  console.log('   - Auto-expire ads: Every hour');
  console.log('   - Cleanup expired ads from clusters: Daily at 3:30 AM');
  console.log('   - Refresh all clusters: Daily at 4 AM');
  console.log('   - Merge low-volume clusters: Weekly on Sunday at 5 AM');
  console.log('   - Initial search alerts check: 30 seconds after startup');
  console.log('   - Initial moderation check: 1 minute after startup');
}

module.exports = { setupCronJobs };

