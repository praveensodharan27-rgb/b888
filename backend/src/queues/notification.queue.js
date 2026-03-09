const { Queue } = require('bullmq');
const { redisConnection } = require('../config/redis');

// Dedicated queue for low-level notification jobs (email/SMS)
// This is separate from the higher-level event queue in backend/queues/notificationQueue.js
const notificationQueue = new Queue('notifications-low-level', {
  connection: redisConnection,
  // Allow connecting even if Redis reports version < 5 (for local/dev)
  skipVersionCheck: true,
});

module.exports = { notificationQueue };

