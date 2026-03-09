const { Queue, Worker } = require('bullmq');
const { redisConnection } = require('../src/config/redis');
const { logger } = require('../src/config/logger');
const notificationService = require('../services/notificationService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Notification Queue System using BullMQ
 * Handles background notification jobs for better performance
 */

// Create notification queue
const notificationQueue = new Queue('notifications', {
  connection: redisConnection,
  // Allow running on older/local Redis in dev; we already have direct fallback
  skipVersionCheck: true,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000
    },
    removeOnFail: {
      age: 7 * 24 * 3600 // Keep failed jobs for 7 days
    }
  }
});

// Shared processor used by both the BullMQ worker and the direct fallback (when Redis/BullMQ is not usable)
async function processNotificationJob(type, data) {
  let result;

  switch (type) {
    case 'ad_created':
      result = await notificationService.sendAdCreatedNotification(data.user, data.ad);
      break;

    case 'ad_approved':
      result = await notificationService.sendAdApprovedNotification(data.user, data.ad);
      break;

    case 'ad_rejected':
      result = await notificationService.sendAdRejectedNotification(data.user, data.ad, data.reason);
      break;

    case 'ad_expiring_soon':
      result = await notificationService.sendAdExpiringSoonNotification(data.user, data.ad, data.daysLeft);
      break;

    case 'ad_expired':
      result = await notificationService.sendAdExpiredNotification(data.user, data.ad);
      break;

    case 'package_purchased':
      result = await notificationService.sendAdPackagePurchasedNotification(
        data.user, 
        data.ad, 
        data.packageType, 
        data.order
      );
      break;

    case 'business_package_activated':
      result = await notificationService.sendBusinessPackageActivatedNotification(
        data.user,
        data.businessPackage,
        data.order
      );
      break;

    case 'payment_success':
      result = await notificationService.sendPaymentSuccessNotification(data.user, data.order);
      break;

    case 'invoice_generated':
      result = await notificationService.sendInvoiceGeneratedNotification(data.user, data.invoice);
      break;

    case 'offer_received':
      result = await notificationService.sendOfferReceivedNotification(
        data.seller, 
        data.buyer, 
        data.ad, 
        data.offer
      );
      break;

    case 'offer_response':
      result = await notificationService.sendOfferResponseNotification(
        data.buyer, 
        data.seller, 
        data.ad, 
        data.offer, 
        data.accepted
      );
      break;

    default:
      throw new Error(`Unknown notification type: ${type}`);
  }

  return result;
}

// Create worker to process notification jobs
const notificationWorker = new Worker('notifications', async (job) => {
  const { type, data } = job.data;
  
  logger.info(`Processing notification job: ${type}`, { jobId: job.id });

  try {
    const result = await processNotificationJob(type, data);
    logger.info(`✅ Notification job completed: ${type}`, { jobId: job.id, result });
    return result;

  } catch (error) {
    logger.error(`❌ Notification job failed: ${type}`, { 
      jobId: job.id, 
      error: error.message,
      stack: error.stack 
    });
    throw error;
  }
}, {
  connection: redisConnection,
  skipVersionCheck: true,
  concurrency: 5, // Process 5 jobs concurrently
  limiter: {
    max: 10, // Max 10 jobs
    duration: 1000 // Per second
  }
});

// Dedupe Redis Lua script errors to avoid log spam
let notificationWorkerLuaErrorLogged = false;

notificationWorker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed successfully`);
});

notificationWorker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed:`, err.message);
});

notificationWorker.on('error', (err) => {
  const msg = err?.message || String(err);
  const isLuaError = msg.includes('Unknown Redis command') && msg.includes('Lua script');
  if (isLuaError && !notificationWorkerLuaErrorLogged) {
    notificationWorkerLuaErrorLogged = true;
    logger.warn(
      'Notification worker: Redis Lua script error (use Redis 6.x or compatible Redis). Fallback to direct processing will be used when queue fails.'
    );
    return;
  }
  if (!isLuaError) logger.error('Worker error:', err);
});

// ============================================
// Queue Helper Functions
// ============================================

/**
 * Add notification job to queue
 */
const queueNotification = async (type, data, options = {}) => {
  try {
    const job = await notificationQueue.add(type, { type, data }, {
      priority: options.priority || 10,
      delay: options.delay || 0,
      ...options
    });

    logger.info(`Notification job queued: ${type}`, { jobId: job.id });
    return job;
  } catch (error) {
    logger.error(`Failed to queue notification: ${type}`, error);

    // Fallback: process notification immediately without queue (Redis < 5 or BullMQ unavailable)
    try {
      logger.warn(`Falling back to direct notification processing for type: ${type}`);
      const result = await processNotificationJob(type, data);
      logger.info(`✅ Direct notification processing completed: ${type}`, { result });
      return {
        id: `direct-${Date.now()}`,
        name: type,
        data,
        result
      };
    } catch (fallbackError) {
      logger.error(`❌ Direct notification processing failed for type: ${type}`, {
        error: fallbackError.message,
        stack: fallbackError.stack
      });
      throw fallbackError;
    }
  }
};

/**
 * Generic function to add notification to queue with custom data
 */
const addNotificationToQueue = async ({ type, data, options = {} }) => {
  return queueNotification(type, data, options);
};

/**
 * Queue ad created notification
 */
const queueAdCreatedNotification = async (userId, adId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const ad = await prisma.ad.findUnique({ where: { id: adId } });
  
  if (!user || !ad) {
    throw new Error('User or Ad not found');
  }

  return queueNotification('ad_created', { user, ad }, { priority: 5 });
};

/**
 * Queue ad approved notification
 */
const queueAdApprovedNotification = async (userId, adId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const ad = await prisma.ad.findUnique({ where: { id: adId } });
  
  if (!user || !ad) {
    throw new Error('User or Ad not found');
  }

  return queueNotification('ad_approved', { user, ad }, { priority: 3 });
};

/**
 * Queue ad rejected notification
 */
const queueAdRejectedNotification = async (userId, adId, reason) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const ad = await prisma.ad.findUnique({ where: { id: adId } });
  
  if (!user || !ad) {
    throw new Error('User or Ad not found');
  }

  return queueNotification('ad_rejected', { user, ad, reason }, { priority: 3 });
};

/**
 * Queue package purchased notification
 */
const queuePackagePurchasedNotification = async (userId, adId, packageType, orderId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const ad = await prisma.ad.findUnique({ where: { id: adId } });
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  
  if (!user || !ad || !order) {
    throw new Error('User, Ad, or Order not found');
  }

  return queueNotification('package_purchased', { user, ad, packageType, order }, { priority: 2 });
};

/**
 * Queue payment success notification
 */
const queuePaymentSuccessNotification = async (userId, orderId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  
  if (!user || !order) {
    throw new Error('User or Order not found');
  }

  return queueNotification('payment_success', { user, order }, { priority: 2 });
};

/**
 * Queue invoice generated notification
 */
const queueInvoiceGeneratedNotification = async (userId, invoiceId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  
  if (!user || !invoice) {
    throw new Error('User or Invoice not found');
  }

  return queueNotification('invoice_generated', { user, invoice }, { priority: 5 });
};

/**
 * Queue offer received notification
 */
const queueOfferReceivedNotification = async (sellerId, buyerId, adId, offerId) => {
  const seller = await prisma.user.findUnique({ where: { id: sellerId } });
  const buyer = await prisma.user.findUnique({ where: { id: buyerId } });
  const ad = await prisma.ad.findUnique({ where: { id: adId } });
  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  
  if (!seller || !buyer || !ad || !offer) {
    throw new Error('Seller, Buyer, Ad, or Offer not found');
  }

  return queueNotification('offer_received', { seller, buyer, ad, offer }, { priority: 4 });
};

/**
 * Queue offer response notification
 */
const queueOfferResponseNotification = async (buyerId, sellerId, adId, offerId, accepted) => {
  const buyer = await prisma.user.findUnique({ where: { id: buyerId } });
  const seller = await prisma.user.findUnique({ where: { id: sellerId } });
  const ad = await prisma.ad.findUnique({ where: { id: adId } });
  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  
  if (!buyer || !seller || !ad || !offer) {
    throw new Error('Buyer, Seller, Ad, or Offer not found');
  }

  return queueNotification('offer_response', { buyer, seller, ad, offer, accepted }, { priority: 3 });
};

/**
 * Get queue statistics
 */
const getQueueStats = async () => {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    notificationQueue.getWaitingCount(),
    notificationQueue.getActiveCount(),
    notificationQueue.getCompletedCount(),
    notificationQueue.getFailedCount(),
    notificationQueue.getDelayedCount()
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed
  };
};

/**
 * Clear failed jobs
 */
const clearFailedJobs = async () => {
  const failedJobs = await notificationQueue.getFailed();
  await Promise.all(failedJobs.map(job => job.remove()));
  return failedJobs.length;
};

/**
 * Retry failed jobs
 */
const retryFailedJobs = async () => {
  const failedJobs = await notificationQueue.getFailed();
  await Promise.all(failedJobs.map(job => job.retry()));
  return failedJobs.length;
};

module.exports = {
  notificationQueue,
  notificationWorker,
  queueNotification,
  addNotificationToQueue,
  queueAdCreatedNotification,
  queueAdApprovedNotification,
  queueAdRejectedNotification,
  queuePackagePurchasedNotification,
  queuePaymentSuccessNotification,
  queueInvoiceGeneratedNotification,
  queueOfferReceivedNotification,
  queueOfferResponseNotification,
  getQueueStats,
  clearFailedJobs,
  retryFailedJobs
};
