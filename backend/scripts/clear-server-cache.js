require('dotenv').config();
const { clearCache } = require('../middleware/cache');
const { clearAllCache } = require('../config/redis');

async function clearServerCache() {
  try {
    console.log('\n🧹 Clearing server cache...\n');
    console.log('='.repeat(80));

    // Clear all cache patterns
    const patterns = [
      'ads',
      'categories',
      'locations',
      'search',
      'filters',
      'brands',
      'models',
      'specifications'
    ];

    console.log('📋 Clearing cache patterns...');
    for (const pattern of patterns) {
      try {
        await clearCache(pattern);
        console.log(`  ✅ Cleared cache for: ${pattern}`);
      } catch (error) {
        console.error(`  ❌ Error clearing ${pattern}:`, error.message);
      }
    }

    // Clear all Redis cache
    console.log('\n💾 Clearing all Redis cache...');
    try {
      await clearAllCache();
      console.log('  ✅ All Redis cache cleared');
    } catch (error) {
      console.error('  ❌ Error clearing Redis cache:', error.message);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Server cache cleared successfully!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error clearing server cache:', error);
    throw error;
  }
}

clearServerCache()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
