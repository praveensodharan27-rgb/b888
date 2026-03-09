/**
 * Clear Server Cache
 * Clears Redis cache: categories, locations, ads, search, filters, notifications, etc.
 * Usage: npm run clear-cache   or   node clear-cache.js
 * To clear everything: npm run clear-cache -- --all
 * To clear only home feed (after ranking fix): npm run clear-cache -- --home-feed
 */

require('dotenv').config();
const { deleteCacheByPattern, clearAllCache, PREFIXES, isAvailable, initRedis } = require('./config/redis');

const CLEAR_ALL = process.argv.includes('--all');
const HOME_FEED_ONLY = process.argv.includes('--home-feed');

async function clearCache() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🗑️  Clearing Server Cache');
    console.log('='.repeat(80) + '\n');

    // Ensure Redis is connected (when run as standalone script)
    await initRedis();
    await new Promise((r) => setTimeout(r, 500));

    if (!isAvailable()) {
      console.log('⚠️  Redis is not available. Cache may not be active.');
      console.log('   Start Redis (e.g. redis-server) and run again, or restart the backend server.');
      return;
    }

    if (CLEAR_ALL) {
      console.log('🔄 Clearing ALL cache (flush db)...\n');
      await clearAllCache();
      console.log('✅ All server cache cleared!\n');
      return;
    }

    if (HOME_FEED_ONLY) {
      console.log('🔄 Clearing home feed cache (home:ranked:*, homefeed)...\n');
      const homeRanked = await deleteCacheByPattern(`${PREFIXES.ADS}home:ranked:*`);
      const homefeed = await deleteCacheByPattern(`${PREFIXES.ADS}homefeed:*`);
      console.log(`✅ Home feed cache cleared: ${homeRanked + homefeed} keys deleted\n`);
      return;
    }

    console.log('🔄 Clearing cache by prefix...\n');

    const prefixes = [
      [PREFIXES.CATEGORIES, 'Categories'],
      [PREFIXES.LOCATIONS, 'Locations'],
      [PREFIXES.ADS, 'Ads'],
      [PREFIXES.SEARCH, 'Search'],
      [PREFIXES.FILTERS, 'Filters'],
      [PREFIXES.NOTIFICATIONS, 'Notifications'],
      [PREFIXES.USER, 'User'],
      ['api:', 'API responses'],
    ];

    let totalDeleted = 0;
    for (const [prefix, label] of prefixes) {
      const pattern = prefix.endsWith(':') ? `${prefix}*` : `${prefix}*`;
      const deleted = await deleteCacheByPattern(pattern);
      console.log(`✅ ${label} cache cleared: ${deleted} keys deleted`);
      totalDeleted += deleted;
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✅ Cache cleared successfully!`);
    console.log(`   Total keys deleted: ${totalDeleted}`);
    console.log('='.repeat(80));
    console.log('\n   To clear ALL cache (including session/rate-limit): npm run clear-cache -- --all\n');

  } catch (error) {
    console.error('\n❌ Error clearing cache:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  clearCache();
}

module.exports = { clearCache };
