/**
 * Redis connection check
 * Run from backend folder only:
 *   cd backend
 *   npm run test-redis
 * Uses REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB from .env (defaults: localhost:6379)
 */

require('dotenv').config();
const { initRedis, isAvailable, getCacheStats } = require('../config/redis');

const host = process.env.REDIS_HOST || 'localhost';
const port = process.env.REDIS_PORT || '6379';

async function testRedis() {
  console.log('Redis check');
  console.log('  Connecting to', host + ':' + port, process.env.REDIS_PASSWORD ? '(with password)' : '');
  console.log('');

  try {
    await initRedis();
    await new Promise((r) => setTimeout(r, 2000));
    const available = isAvailable();

    if (available) {
      console.log('OK Redis is connected and ready');
      const stats = await getCacheStats();
      console.log('  Status:', stats.status || 'ready');
      const { setCache, getCache } = require('../config/redis');
      await setCache('test:', 'connection', { ok: true, at: new Date().toISOString() }, 60);
      const cached = await getCache('test:', 'connection');
      console.log('  Cache read/write:', cached?.ok ? 'OK' : 'failed');
      process.exit(0);
      return;
    }

    console.log('Redis is not available');
    console.log('');
    console.log('What to do:');
    console.log('  1. Start Redis:  npm run redis:start   (Docker)');
    console.log('     or:          redis-server          (local install)');
    console.log('  2. Test:        redis-cli ping        (expect PONG)');
    console.log('  3. Optional .env: REDIS_HOST=localhost REDIS_PORT=6379');
    console.log('  4. API check:   GET http://localhost:5000/api/redis/health');
    process.exit(1);
  } catch (error) {
    console.error('Redis check failed:', error.message);
    console.log('');
    console.log('  Ensure Redis is running on', host + ':' + port);
    console.log('  Then run: node scripts/test-redis.js');
    process.exit(1);
  }
}

// Run test
testRedis();
