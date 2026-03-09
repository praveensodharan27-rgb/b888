const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { 
  sendAdExpiringSoonNotification, 
  sendAdExpiredNotification 
} = require('../services/notificationService');
const { logger } = require('../src/config/logger');

/**
 * Ad Expiry Cron Job
 * Runs daily to check for expiring and expired ads
 * - Sends reminder 2 days before expiry
 * - Sends reminder 1 day before expiry
 * - Marks ads as expired and notifies users
 */

// Check for expiring ads and send notifications
const checkExpiringAds = async () => {
  try {
    logger.info('🔍 Checking for expiring ads...');

    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    // Find ads expiring in 2 days
    const adsExpiringIn2Days = await prisma.ad.findMany({
      where: {
        status: 'APPROVED',
        adExpiryDate: {
          gte: now,
          lte: twoDaysFromNow
        },
        // Check if we haven't sent notification in last 12 hours
        OR: [
          { lastExpiryNotificationSent: null },
          {
            lastExpiryNotificationSent: {
              lte: new Date(now.getTime() - 12 * 60 * 60 * 1000)
            }
          }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    logger.info(`Found ${adsExpiringIn2Days.length} ads expiring in 2 days`);

    // Send notifications for ads expiring in 2 days
    for (const ad of adsExpiringIn2Days) {
      try {
        const daysLeft = Math.ceil((new Date(ad.adExpiryDate) - now) / (1000 * 60 * 60 * 24));
        
        await sendAdExpiringSoonNotification(ad.user, ad, daysLeft);
        
        // Update last notification sent time
        await prisma.ad.update({
          where: { id: ad.id },
          data: { lastExpiryNotificationSent: now }
        });

        logger.info(`✅ Sent expiry notification for ad: ${ad.title} (${daysLeft} days left)`);
      } catch (error) {
        logger.error(`❌ Failed to send expiry notification for ad ${ad.id}:`, error);
      }
    }

    // Find ads expiring in 1 day
    const adsExpiringIn1Day = await prisma.ad.findMany({
      where: {
        status: 'APPROVED',
        adExpiryDate: {
          gte: now,
          lte: oneDayFromNow
        },
        // Check if we haven't sent notification in last 6 hours
        OR: [
          { lastExpiryNotificationSent: null },
          {
            lastExpiryNotificationSent: {
              lte: new Date(now.getTime() - 6 * 60 * 60 * 1000)
            }
          }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    logger.info(`Found ${adsExpiringIn1Day.length} ads expiring in 1 day`);

    // Send notifications for ads expiring in 1 day
    for (const ad of adsExpiringIn1Day) {
      try {
        await sendAdExpiringSoonNotification(ad.user, ad, 1);
        
        // Update last notification sent time
        await prisma.ad.update({
          where: { id: ad.id },
          data: { lastExpiryNotificationSent: now }
        });

        logger.info(`✅ Sent expiry notification for ad: ${ad.title} (1 day left)`);
      } catch (error) {
        logger.error(`❌ Failed to send expiry notification for ad ${ad.id}:`, error);
      }
    }

    return {
      success: true,
      twoDaysCount: adsExpiringIn2Days.length,
      oneDayCount: adsExpiringIn1Day.length
    };
  } catch (error) {
    logger.error('❌ Error checking expiring ads:', error);
    return { success: false, error: error.message };
  }
};

// Check for expired ads and mark them as expired
const checkExpiredAds = async () => {
  try {
    logger.info('🔍 Checking for expired ads...');

    const now = new Date();

    // Find ads that have expired
    const expiredAds = await prisma.ad.findMany({
      where: {
        status: 'APPROVED',
        adExpiryDate: {
          lte: now
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    logger.info(`Found ${expiredAds.length} expired ads`);

    // Mark ads as expired and send notifications
    for (const ad of expiredAds) {
      try {
        // Mark ad as expired
        await prisma.ad.update({
          where: { id: ad.id },
          data: { 
            status: 'EXPIRED',
            isActive: false
          }
        });

        // Send expiry notification
        await sendAdExpiredNotification(ad.user, ad);

        logger.info(`✅ Marked ad as expired and sent notification: ${ad.title}`);
      } catch (error) {
        logger.error(`❌ Failed to process expired ad ${ad.id}:`, error);
      }
    }

    return {
      success: true,
      expiredCount: expiredAds.length
    };
  } catch (error) {
    logger.error('❌ Error checking expired ads:', error);
    return { success: false, error: error.message };
  }
};

// Combined function to run both checks
const runAdExpiryChecks = async () => {
  logger.info('⏰ Starting ad expiry checks...');
  
  const expiringResult = await checkExpiringAds();
  const expiredResult = await checkExpiredAds();

  logger.info('✅ Ad expiry checks completed:', {
    expiring: expiringResult,
    expired: expiredResult
  });

  return { expiringResult, expiredResult };
};

// Schedule cron job to run daily at 9 AM
const startAdExpiryCron = () => {
  // Run every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    logger.info('🕐 Running scheduled ad expiry check...');
    await runAdExpiryChecks();
  }, {
    timezone: 'Asia/Kolkata'
  });

  logger.info('✅ Ad expiry cron job scheduled (runs daily at 9:00 AM IST)');
};

// Manual trigger function for testing
const manualTriggerExpiryCheck = async () => {
  logger.info('🔧 Manual ad expiry check triggered');
  return await runAdExpiryChecks();
};

module.exports = {
  startAdExpiryCron,
  checkExpiringAds,
  checkExpiredAds,
  runAdExpiryChecks,
  manualTriggerExpiryCheck
};
