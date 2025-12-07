const { PrismaClient } = require('@prisma/client');
const { moderateAd } = require('../services/contentModeration');

const prisma = new PrismaClient();

/**
 * Check all existing APPROVED ads and flag/reject inappropriate ones
 */
async function checkExistingAds() {
  try {
    console.log('🔍 Checking all existing APPROVED ads for inappropriate content...\n');
    console.log('═'.repeat(70));

    // Get all APPROVED ads (these bypassed moderation)
    const ads = await prisma.ad.findMany({
      where: {
        status: 'APPROVED',
        OR: [
          { moderationStatus: null },
          { moderationStatus: 'pending_review' }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`\n📊 Found ${ads.length} existing ads to check\n`);

    if (ads.length === 0) {
      console.log('✅ No ads need checking');
      return;
    }

    let safeCount = 0;
    let flaggedCount = 0;
    let rejectedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < ads.length; i++) {
      const ad = ads[i];
      
      console.log(`\n[${ i + 1}/${ads.length}] Checking: "${ad.title.substring(0, 50)}"`);
      console.log(`   ID: ${ad.id}`);
      console.log(`   User: ${ad.user.name}`);
      console.log(`   Images: ${ad.images.length}`);

      try {
        // Run AI moderation
        console.log('   🤖 Running AI moderation...');
        const moderationResult = await moderateAd(ad.title, ad.description, ad.images);

        if (moderationResult.shouldReject) {
          // REJECT the ad
          console.log(`   ❌ INAPPROPRIATE CONTENT DETECTED!`);
          console.log(`   📝 Reason: ${moderationResult.rejectionReason}`);
          
          if (moderationResult.moderationFlags?.flaggedCategories) {
            console.log(`   🚩 Categories: ${moderationResult.moderationFlags.flaggedCategories.join(', ')}`);
          }

          // Update ad to REJECTED
          await prisma.ad.update({
            where: { id: ad.id },
            data: {
              status: 'REJECTED',
              moderationStatus: 'rejected_on_review',
              rejectionReason: moderationResult.rejectionReason,
              autoRejected: true,
              moderationFlags: moderationResult.moderationFlags
            }
          });

          // Notify user
          await prisma.notification.create({
            data: {
              userId: ad.user.id,
              title: 'Ad Rejected',
              message: `Your ad "${ad.title}" has been rejected. ${moderationResult.rejectionReason}`,
              type: 'ad_rejected',
              link: `/ads/${ad.id}`
            }
          });

          console.log(`   ✅ Ad REJECTED and user notified`);
          rejectedCount++;

        } else {
          // Ad is safe
          console.log(`   ✅ SAFE - Content is appropriate`);
          
          // Update moderation status
          await prisma.ad.update({
            where: { id: ad.id },
            data: {
              moderationStatus: 'reviewed_safe',
              moderationFlags: moderationResult.moderationFlags
            }
          });

          safeCount++;
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`   ❌ Error checking ad:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '═'.repeat(70));
    console.log('\n📊 FINAL RESULTS:');
    console.log(`   ✅ Safe ads: ${safeCount}`);
    console.log(`   ❌ Rejected ads: ${rejectedCount}`);
    console.log(`   ⚠️  Errors: ${errorCount}`);
    console.log(`   📈 Total processed: ${safeCount + rejectedCount + errorCount}`);
    console.log('\n' + '═'.repeat(70));

    if (rejectedCount > 0) {
      console.log(`\n🚨 ${rejectedCount} inappropriate ads have been removed!`);
      console.log('   Users have been notified.');
      console.log('   Ads are no longer visible in listings.\n');
    }

  } catch (error) {
    console.error('❌ Error in checking script:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
console.log('\n🛡️  CONTENT MODERATION - EXISTING ADS CHECK');
console.log('═'.repeat(70));
console.log('\nThis will check all existing APPROVED ads for inappropriate content.');
console.log('Inappropriate ads will be automatically rejected.\n');

checkExistingAds()
  .then(() => {
    console.log('✅ Check complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });

