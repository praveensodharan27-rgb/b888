/**
 * Clear Server Cache
 * Clears Redis cache, especially categories cache
 */

require('dotenv').config();
const { deleteCacheByPattern, clearAllCache, PREFIXES, isAvailable } = require('./config/redis');

async function clearCache() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🗑️  Clearing Server Cache');
    console.log('='.repeat(80) + '\n');

    if (!isAvailable()) {
      console.log('⚠️  Redis is not available. Cache may not be active.');
      console.log('   If you want to clear categories cache, restart the backend server.');
      return;
    }

    console.log('🔄 Clearing cache...\n');

    // Clear categories cache specifically
    const categoriesDeleted = await deleteCacheByPattern('categories:*');
    console.log(`✅ Categories cache cleared: ${categoriesDeleted} keys deleted`);

    // Clear locations cache
    const locationsDeleted = await deleteCacheByPattern('locations:*');
    console.log(`✅ Locations cache cleared: ${locationsDeleted} keys deleted`);

    // Clear ads cache
    const adsDeleted = await deleteCacheByPattern('ads:*');
    console.log(`✅ Ads cache cleared: ${adsDeleted} keys deleted`);

    // Clear search cache
    const searchDeleted = await deleteCacheByPattern('search:*');
    console.log(`✅ Search cache cleared: ${searchDeleted} keys deleted`);

    // Clear filters cache
    const filtersDeleted = await deleteCacheByPattern('filters:*');
    console.log(`✅ Filters cache cleared: ${filtersDeleted} keys deleted`);

    const totalDeleted = categoriesDeleted + locationsDeleted + adsDeleted + searchDeleted + filtersDeleted;

    console.log('\n' + '='.repeat(80));
    console.log(`✅ Cache cleared successfully!`);
    console.log(`   Total keys deleted: ${totalDeleted}`);
    console.log('='.repeat(80) + '\n');

    // Option to clear ALL cache (uncomment if needed)
    // console.log('🗑️  Clearing ALL cache...');
    // await clearAllCache();
    // console.log('✅ All cache cleared!');

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
