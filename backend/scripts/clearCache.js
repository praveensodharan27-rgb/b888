/**
 * Clear All Server Caches
 * 
 * This script clears all in-memory caches used by the server
 */

const { clearCache, getCacheSize } = require('../middleware/cache');

// Clear all caches
console.log('🧹 Clearing all server caches...');

try {
  // Get cache size before clearing
  const sizeBefore = getCacheSize();
  console.log(`📊 Cache entries before: ${sizeBefore}`);
  
  // Clear all cache entries
  clearCache();
  
  // Verify cache is cleared
  const sizeAfter = getCacheSize();
  console.log(`📊 Cache entries after: ${sizeAfter}`);
  
  if (sizeAfter === 0) {
    console.log('✅ All server caches cleared successfully!');
  } else {
    console.log(`⚠️ Warning: ${sizeAfter} cache entries still remain`);
  }
  
  process.exit(0);
} catch (error) {
  console.error('❌ Error clearing cache:', error);
  process.exit(1);
}
