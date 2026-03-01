const cron = require('node-cron');
const { deleteDeactivatedAccounts } = require('../scripts/delete-deactivated-accounts');
const { processSearchAlerts } = require('../services/searchAlerts');
const { autoApprovePendingAds } = require('../services/autoApproval');
const { resetMonthlyFreeAds } = require('../services/monthlyQuotaReset');
const { expireAds } = require('../scripts/expire-ads');
const { cleanupExpiredAds, refreshAllClusters, mergeLowVolumeClusters } = require('../services/clusterAutoUpdate');
const { runRotationCycle } = require('../services/adRotationService');
const { expireFeaturedAds, expireBumpAds, expireTopAds } = require('../services/promotionService');
const { logger } = require('../src/config/logger');

// Job lock: prevent duplicate runs when a job overruns its schedule
const runningJobs = new Map();
const JOB_LOCK_TTL_MS = 30 * 60 * 1000; // 30 min max run; then lock expires

function withJobLock(name, fn) {
  return async () => {
    if (runningJobs.get(name)) {
      logger.warn({ job: name }, 'Cron job skipped (already running)');
      return;
    }
    runningJobs.set(name, Date.now());
    try {
      await fn();
    } catch (error) {
      logger.error({ err: error.message, job: name }, 'Cron job failed');
    } finally {
      runningJobs.delete(name);
    }
  };
}

// Startup delays (avoid blocking server; spread load)
const STARTUP_DELAY_SEARCH_ALERTS_MS = 2 * 60 * 1000;   // 2 min
const STARTUP_DELAY_MODERATION_MS = 3 * 60 * 1000;      // 3 min

/**
 * Setup cron jobs: spread heavy jobs across time, job locking, structured logging
 */
function setupCronJobs() {
  // Daily 2 AM - delete deactivated accounts
  cron.schedule('0 2 * * *', withJobLock('delete_deactivated', async () => {
    logger.info({ job: 'delete_deactivated' }, 'Cron: running');
    await deleteDeactivatedAccounts();
    logger.info({ job: 'delete_deactivated' }, 'Cron: done');
  }));

  // Hourly at :05 - search alerts (was :00; moved to avoid overlap)
  cron.schedule('5 * * * *', withJobLock('search_alerts', async () => {
    logger.info({ job: 'search_alerts' }, 'Cron: running');
    await processSearchAlerts();
    logger.info({ job: 'search_alerts' }, 'Cron: done');
  }));

  // Every 5 min at :02 and :07 (spread) - moderation (approve ads pending 3+ minutes)
  cron.schedule('2,7,12,17,22,27,32,37,42,47,52,57 * * * *', withJobLock('moderation', async () => {
    await autoApprovePendingAds(3);
  }));

  // 1st of month midnight - reset monthly quota
  cron.schedule('0 0 1 * *', withJobLock('reset_monthly_quota', async () => {
    logger.info({ job: 'reset_monthly_quota' }, 'Cron: running');
    await resetMonthlyFreeAds();
    logger.info({ job: 'reset_monthly_quota' }, 'Cron: done');
  }));

  // Hourly at :25 - auto-expire ads (was :00)
  cron.schedule('25 * * * *', withJobLock('expire_ads', async () => {
    logger.info({ job: 'expire_ads' }, 'Cron: running');
    await expireAds();
    logger.info({ job: 'expire_ads' }, 'Cron: done');
  }));

  // Daily 3:45 AM - cluster cleanup (was 3:30)
  cron.schedule('45 3 * * *', withJobLock('cluster_cleanup', async () => {
    logger.info({ job: 'cluster_cleanup' }, 'Cron: running');
    const result = await cleanupExpiredAds();
    logger.info({ job: 'cluster_cleanup', cleaned: result.cleaned }, 'Cron: done');
  }));

  // Daily 4:15 AM - refresh clusters (was 4:00)
  cron.schedule('15 4 * * *', withJobLock('cluster_refresh', async () => {
    logger.info({ job: 'cluster_refresh' }, 'Cron: running');
    const result = await refreshAllClusters();
    logger.info({ job: 'cluster_refresh', updated: result.updated, errors: result.errors }, 'Cron: done');
  }));

  // Sunday 5:30 AM - merge low-volume clusters (was 5:00)
  cron.schedule('30 5 * * 0', withJobLock('cluster_merge', async () => {
    logger.info({ job: 'cluster_merge' }, 'Cron: running');
    const result = await mergeLowVolumeClusters(3);
    logger.info({ job: 'cluster_merge', merged: result.merged }, 'Cron: done');
  }));

  // Every 4 hours at :10 - clear home feed cache
  cron.schedule('10 */4 * * *', withJobLock('home_feed_cache', async () => {
    const { clearCache } = require('../middleware/cache');
    await clearCache('ads:homefeed:*').catch(() => {});
    logger.info({ job: 'home_feed_cache' }, 'Cron: home feed cache cleared');
  }));

  // Hourly at :18 - expire Featured/TOP
  cron.schedule('18 * * * *', withJobLock('expire_promoted', async () => {
    const [f, t] = await Promise.all([expireFeaturedAds(), expireTopAds()]);
    if (f > 0 || t > 0) logger.info({ job: 'expire_promoted', featured: f, top: t }, 'Cron: done');
  }));

  // Hourly at :48 - expire Bump (was :45)
  cron.schedule('48 * * * *', withJobLock('expire_bump', async () => {
    const b = await expireBumpAds();
    if (b > 0) logger.info({ job: 'expire_bump', count: b }, 'Cron: done');
  }));

  // Ad rotation every ~2.5h (spread: :00 and :30 on same hours)
  cron.schedule('0 0,3,6,9,12,15,18,21 * * *', withJobLock('ad_rotation', async () => {
    const result = await runRotationCycle();
    logger.info({ job: 'ad_rotation', rotated: result.rotated }, 'Cron: done');
  }));
  cron.schedule('30 2,5,8,11,14,17,20,23 * * *', withJobLock('ad_rotation', async () => {
    const result = await runRotationCycle();
    logger.info({ job: 'ad_rotation', rotated: result.rotated }, 'Cron: done');
  }));

  // Delayed startup: non-critical jobs after server is up
  setTimeout(() => {
    withJobLock('search_alerts_startup', () => processSearchAlerts())()
      .catch((err) => logger.warn({ err: err.message, job: 'search_alerts_startup' }, 'Cron startup job failed'));
  }, STARTUP_DELAY_SEARCH_ALERTS_MS);

  setTimeout(() => {
    withJobLock('moderation_startup', () => autoApprovePendingAds(3))()
      .catch((err) => logger.warn({ err: err.message, job: 'moderation_startup' }, 'Cron startup job failed'));
  }, STARTUP_DELAY_MODERATION_MS);

  logger.info({
    cron: true,
    jobs: [
      'delete_deactivated(0 2 * * *)',
      'search_alerts(5 * * * *)',
      'moderation(2,7..57 * * * *)',
      'reset_monthly_quota(0 0 1 * *)',
      'expire_ads(25 * * * *)',
      'cluster_cleanup(45 3 * * *)',
      'cluster_refresh(15 4 * * *)',
      'cluster_merge(30 5 * * 0)',
      'home_feed_cache(10 */4 * * *)',
      'expire_promoted(18 * * * *)',
      'expire_bump(48 * * * *)',
      'ad_rotation(0,30 various)',
    ],
    startupDelays: { searchAlerts: '2m', moderation: '3m' },
  }, 'Cron jobs scheduled (with job lock)');
}

module.exports = { setupCronJobs };
