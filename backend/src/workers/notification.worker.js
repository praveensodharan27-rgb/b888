require('dotenv').config();

const { Worker } = require('bullmq');
const { redisConnection } = require('../config/redis');
const { sendEmailImmediate, sendSMSImmediate } = require('../../utils/notifications');
const { logger } = require('../config/logger');

// Worker processing low-level notification jobs (email/SMS) with retry
const worker = new Worker(
  'notifications-low-level',
  async (job) => {
    logger.info({ jobId: job.id, name: job.name, attempt: job.attemptsMade + 1 }, 'Processing notification job');

    if (job.name === 'sendMail') {
      const { to, subject, html, text } = job.data;
      const result = await sendEmailImmediate(to, subject, html, text);
      if (!result?.success) throw new Error(result?.error || result?.message || 'Email send failed');
      return;
    }

    if (job.name === 'sendSMS') {
      const { phone, message } = job.data;
      const result = await sendSMSImmediate(phone, message);
      if (!result?.success) throw new Error(result?.error || result?.message || 'SMS send failed');
      return;
    }

    logger.warn({ jobId: job.id, name: job.name }, 'Unknown notification job name');
  },
  {
    connection: redisConnection,
    skipVersionCheck: true,
    concurrency: parseInt(process.env.OTP_WORKER_CONCURRENCY || '5', 10)
  }
);

let luaScriptErrorLogged = false;

worker.on('ready', () => logger.info('Notification worker ready'));
worker.on('completed', (job) =>
  logger.info({ jobId: job.id, name: job.name }, 'Notification job completed')
);
worker.on('failed', (job, err) =>
  logger.error({ jobId: job?.id, name: job?.name, err: err?.message }, 'Notification job failed')
);
worker.on('error', (err) => {
  const msg = err?.message || '';
  const isLuaError = msg.includes('Unknown Redis command') && msg.includes('Lua script');
  if (isLuaError && !luaScriptErrorLogged) {
    luaScriptErrorLogged = true;
    logger.warn(
      'Notification worker: Redis Lua script error (usually Redis 7+ or restricted Redis). ' +
      'Use Redis 6.x or a Redis build that supports all commands. Worker will keep running but jobs may fail.'
    );
    return;
  }
  if (!isLuaError) logger.error({ err: msg }, 'Notification worker error');
});

