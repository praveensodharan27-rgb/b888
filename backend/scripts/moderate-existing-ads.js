const { PrismaClient } = require('@prisma/client');
const { moderateAd, getModerationStatus } = require('../services/contentModeration');

const prisma = new PrismaClient();

/**
 * Re-moderate all existing ads that haven't been moderated yet
 */
async function moderateExistingAds() {
  try {
    console.log('🔍 Starting moderation of existing ads...\n');

    // Get ads without moderation status or with APPROVED status (old ads)
    const ads = await prisma.ad.findMany({
      where: {
        OR: [
          { moderationStatus: null },
          { moderationStatus: 'pending' },
          { status: 'APPROVED', moderationStatus: null }
        ]
      },
      select: {
        id: true,
        title: true,
        description: true,
        images: true,
        status: true,
        moderationStatus: true
      },
      take: 100 // Process 100 at a time
    });

    console.log(`📊 Found ${ads.length} ads to moderate\n`);

    if (ads.length === 0) {
      console.log('✅ No ads need moderation');
      return;
    }

    let approved = 0;
    let rejected = 0;
    let errors = 0;

    for (let i = 0; i < ads.length; i++) {
      const ad = ads[i];
      console.log(`\n[${i + 1}/${ads.length}] Moderating: ${ad.title.substring(0, 50)}...`);

      try {
        // Run AI moderation
        const moderationResult = await moderateAd(ad.title, ad.description, ad.images);
        const moderationStatus = getModerationStatus(moderationResult);

        // Update ad with moderation results
        await prisma.ad.update({
          where: { id: ad.id },
          data: {
            moderationStatus: moderationStatus.moderationStatus,
            autoRejected: moderationStatus.autoRejected,
            moderationFlags: moderationResult.moderationFlags,
            rejectionReason: moderationResult.rejectionReason || null,
            // Only change status if it should be rejected
            ...(moderationStatus.status === 'REJECTED' && { status: 'REJECTED' })
          }
        });

        if (moderationStatus.status === 'REJECTED') {
          console.log(`   ❌ REJECTED: ${moderationResult.rejectionReason}`);
          rejected++;

          // Create notification for user
          await prisma.notification.create({
            data: {
              userId: ad.userId,
              title: 'Ad Rejected',
              message: `Your ad "${ad.title}" was rejected during content review. Reason: ${moderationResult.rejectionReason}`,
              type: 'ad_rejected',
              link: `/ads/${ad.id}`
            }
          }).catch(err => console.error('   ⚠️ Failed to create notification:', err.message));
        } else {
          console.log(`   ✅ APPROVED - Clean content`);
          approved++;
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`   ❌ Error moderating ad:`, error.message);
        errors++;
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log('📊 Moderation Complete:');
    console.log(`   ✅ Approved: ${approved}`);
    console.log(`   ❌ Rejected: ${rejected}`);
    console.log(`   ⚠️ Errors: ${errors}`);
    console.log(`   📈 Total: ${ads.length}`);
    console.log(`${'='.repeat(50)}\n`);

  } catch (error) {
    console.error('❌ Error in moderation script:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Moderate a single ad by ID
 */
async function moderateSingleAd(adId) {
  try {
    console.log(`🔍 Moderating ad: ${adId}\n`);

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
    console.log(`   Status: ${ad.status}`);
    console.log(`   Images: ${ad.images.length}`);

    // Run AI moderation
    console.log(`\n🤖 Running AI moderation...`);
    const moderationResult = await moderateAd(ad.title, ad.description, ad.images);
    const moderationStatus = getModerationStatus(moderationResult);

    console.log(`\n📊 Moderation Result:`);
    console.log(`   Decision: ${moderationStatus.status}`);
    console.log(`   Should Reject: ${moderationResult.shouldReject}`);
    console.log(`   Should Auto-Approve: ${moderationResult.shouldAutoApprove}`);

    if (moderationResult.rejectionReason) {
      console.log(`   Reason: ${moderationResult.rejectionReason}`);
    }

    if (moderationResult.moderationFlags?.flaggedCategories) {
      console.log(`   Categories: ${moderationResult.moderationFlags.flaggedCategories.join(', ')}`);
    }

    // Update ad
    await prisma.ad.update({
      where: { id: adId },
      data: {
        status: moderationStatus.status,
        moderationStatus: moderationStatus.moderationStatus,
        autoRejected: moderationStatus.autoRejected,
        moderationFlags: moderationResult.moderationFlags,
        rejectionReason: moderationResult.rejectionReason || null
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: ad.user.id,
        title: moderationStatus.status === 'APPROVED' ? 'Ad Reviewed' : 'Ad Rejected',
        message: moderationStatus.status === 'APPROVED'
          ? `Your ad "${ad.title}" has been reviewed and approved.`
          : `Your ad "${ad.title}" has been rejected. Reason: ${moderationResult.rejectionReason}`,
        type: moderationStatus.status === 'APPROVED' ? 'ad_approved' : 'ad_rejected',
        link: `/ads/${ad.id}`
      }
    });

    console.log(`\n✅ Ad updated and user notified`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run based on command line arguments
const args = process.argv.slice(2);
const command = args[0];
const adId = args[1];

if (command === 'single' && adId) {
  moderateSingleAd(adId)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else if (command === 'all') {
  moderateExistingAds()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  console.log('Usage:');
  console.log('  node scripts/moderate-existing-ads.js all          - Moderate all unmoderated ads');
  console.log('  node scripts/moderate-existing-ads.js single <id>  - Moderate specific ad');
  console.log('\nExample:');
  console.log('  node scripts/moderate-existing-ads.js single cmipqbs3z0001wh6mb827gnp5');
  process.exit(0);
}

