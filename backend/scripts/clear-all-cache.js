/**
 * Clear all Redis cache to apply performance optimizations
 */

const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: () => null,
});

async function clearCache() {
  try {
    console.log('🧹 Clearing all Redis cache...\n');
    
    const keys = await redis.keys('*');
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`✅ Cleared ${keys.length} cache keys\n`);
    } else {
      console.log('ℹ️  No cache keys to clear\n');
    }
    
    console.log('🎉 Cache cleared! New optimized queries will be cached.');
    
    redis.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    redis.disconnect();
    process.exit(1);
  }
}

clearCache();
