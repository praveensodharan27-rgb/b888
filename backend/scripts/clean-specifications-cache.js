#!/usr/bin/env node
/**
 * Clean Specifications Cache
 *
 * Run this after fixing category-specification mapping to clear any cached
 * wrong/mixed specification data (e.g. Car showing Phone specs).
 *
 * Clears:
 * - Redis cache for categories (includes /api/categories/specifications)
 * - Ensures fresh specs on next request
 *
 * Usage: node scripts/clean-specifications-cache.js
 */

require('dotenv').config();
const { deleteCacheByPattern, isAvailable, initRedis } = require('../config/redis');

async function cleanSpecificationsCache() {
  try {
    console.log('\n🧹 Cleaning specifications cache...\n');

    await initRedis();
    if (!isAvailable()) {
      console.log('⚠️  Redis not available - no server cache to clear.');
      console.log('   Frontend React Query cache will refresh on next page load (or after 5 min).');
      console.log('\n✅ Done.');
      return;
    }

    // Clear categories cache (includes specifications endpoint)
    const patterns = ['categories:*', 'categories'];
    for (const pattern of patterns) {
      try {
        const deleted = await deleteCacheByPattern(pattern);
        console.log(`  ✅ Cleared ${pattern}: ${deleted || 0} keys`);
      } catch (err) {
        console.warn(`  ⚠️  ${pattern}:`, err.message);
      }
    }

    console.log('\n✅ Specifications cache cleaned!');
    console.log('   Users will get correct category-specific specs on next request.');
    console.log('   (Frontend: refresh page or wait ~5 min for React Query cache)\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

cleanSpecificationsCache()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
