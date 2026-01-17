/**
 * Script to mark expired ads as EXPIRED
 * Run this script periodically (e.g., every hour via cron) to mark ads that have passed their expiration date
 * 
 * Usage:
 *   node scripts/expire-ads.js
 * 
 * Or add to cron:
 *   0 * * * * cd /path/to/backend && node scripts/expire-ads.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Helper to safely emit notification (only if socket.io is available)
const emitNotification = (userId, notification) => {
  try {
    const { emitNotification: emit } = require('../socket/socket');
    emit(userId, notification);
  } catch (error) {
    // Socket.IO not available (script running standalone)
    // This is fine - notifications are still created in database
    console.log('ℹ️ Socket.IO not available, skipping real-time notification');
  }
};

async function expireAds() {
  try {
    const now = new Date();
    console.log(`\n🕐 Checking for expired ads at ${now.toISOString()}`);

    // Find all approved ads that have expired
    const expiredAds = await prisma.ad.findMany({
      where: {
        status: 'APPROVED',
        expiresAt: {
          lte: now // expiresAt is less than or equal to now
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (expiredAds.length === 0) {
      console.log('✅ No expired ads found');
      return;
    }

    console.log(`📋 Found ${expiredAds.length} expired ad(s):`);
    expiredAds.forEach(ad => {
      console.log(`   - ${ad.id}: "${ad.title}" (expired: ${ad.expiresAt?.toISOString()})`);
    });

    // Mark all expired ads as INACTIVE and create notifications
    for (const ad of expiredAds) {
      // Update ad status to INACTIVE
      await prisma.ad.update({
        where: { id: ad.id },
        data: { status: 'INACTIVE' }
      });

      // Create notification for ad owner
      const notification = await prisma.notification.create({
        data: {
          userId: ad.userId,
          title: 'Ad Expired',
          message: `Your ad "${ad.title}" has expired. You can repost it to keep it active.`,
          type: 'ad_expired',
          link: `/ads/${ad.id}`
        }
      });

      // Emit real-time notification via Socket.IO
      emitNotification(ad.userId, {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        link: notification.link,
        isRead: false,
        createdAt: notification.createdAt
      });
    }

    console.log(`✅ Marked ${expiredAds.length} ad(s) as INACTIVE and sent notifications`);
    console.log(`\n✨ Expiration check complete!\n`);
    
    return {
      success: true,
      expired: expiredAds.length,
      message: `Expired ${expiredAds.length} ad(s)`
    };
  } catch (error) {
    console.error('❌ Error expiring ads:', error);
    throw error; // Re-throw for cron to handle
  }
}

// Export function for use in cron jobs
module.exports = { expireAds };

// Run the script if called directly
if (require.main === module) {
  expireAds().then(() => {
    prisma.$disconnect();
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
}

