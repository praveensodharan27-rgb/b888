require('dotenv').config();

// Shared Redis connection configuration for BullMQ
// Uses REDIS_URL so we always point to the correct Redis instance (Docker)
// maxRetriesPerRequest: null is required by BullMQ for reliable reconnects and Lua scripts
const redisConnection = {
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy(times) {
    const delay = Math.min(times * 500, 5000);
    return delay;
  },
};

module.exports = { redisConnection };

