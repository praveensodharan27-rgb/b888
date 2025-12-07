const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Manually reject a specific ad
 */
async function rejectAd(adId, reason) {
  try {
    console.log(`🔍 Rejecting ad: ${adId}\n`);

    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!ad) {
      console.log('❌ Ad not found');
      return;
    }

    console.log(`📝 Ad Details:`);
    console.log(`   Title: ${ad.title}`);
    console.log(`   User: ${ad.user.name}`);
    console.log(`   Current Status: ${ad.status}`);

    // Update ad to REJECTED
    await prisma.ad.update({
      where: { id: adId },
      data: {
        status: 'REJECTED',
        moderationStatus: 'manually_rejected',
        rejectionReason: reason,
        autoRejected: false
      }
    });

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: ad.user.id,
        title: 'Ad Rejected',
        message: `Your ad "${ad.title}" has been rejected. Reason: ${reason}`,
        type: 'ad_rejected',
        link: `/ads/${ad.id}`
      }
    });

    console.log(`\n✅ Ad rejected successfully`);
    console.log(`   New Status: REJECTED`);
    console.log(`   Reason: ${reason}`);
    console.log(`   User notified: ${ad.user.name}`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const adId = args[0];
const reason = args.slice(1).join(' ') || 'Inappropriate content - content policy violation';

if (!adId) {
  console.log('Usage: node scripts/reject-ad.js <ad-id> [reason]');
  console.log('\nExample:');
  console.log('  node scripts/reject-ad.js cmipqbs3z0001wh6mb827gnp5 "Inappropriate images"');
  process.exit(0);
}

rejectAd(adId, reason)
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

