const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Process ads that have been pending moderation for the specified time
 * Approves clean ads, rejects inappropriate ones based on moderation flags
 */
async function processPendingModeration(minutesThreshold = 5) {
  try {
    console.log(`🔍 Processing ads pending moderation for ${minutesThreshold}+ minutes...`);
    
    // Calculate cutoff time
    const cutoffTime = new Date(Date.now() - minutesThreshold * 60 * 1000);
    
    // Find pending ads older than threshold
    const pendingAds = await prisma.ad.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          lt: cutoffTime
        }
      },
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

    console.log(`📊 Found ${pendingAds.length} ads to process after moderation delay`);

    if (pendingAds.length === 0) {
      return {
        success: true,
        approved: 0,
        rejected: 0,
        message: 'No pending ads to process'
      };
    }

    let approved = 0;
    let rejected = 0;
    let errors = 0;

    for (const ad of pendingAds) {
      try {
        // Check moderation flags to determine action
        const shouldReject = ad.moderationFlags?.textModeration?.flagged || 
                           ad.moderationFlags?.imageModeration?.some(img => !img.safe) ||
                           ad.autoRejected;

        if (shouldReject) {
          // REJECT ad based on moderation results
          const rejectionReason = ad.rejectionReason || 
                                 'Your ad contains inappropriate content (nudity, sexual content, or policy violations). Please review our content policy and resubmit with appropriate content.';

          await prisma.ad.update({
            where: { id: ad.id },
            data: {
              status: 'REJECTED',
              moderationStatus: 'rejected_after_review',
              rejectionReason: rejectionReason
            }
          });

          // Create notification for user
          await prisma.notification.create({
            data: {
              userId: ad.user.id,
              title: 'Ad Rejected',
              message: `Your ad "${ad.title}" was rejected. ${rejectionReason}`,
              type: 'ad_rejected',
              link: `/ads/${ad.id}`
            }
          });

          console.log(`❌ Rejected: ${ad.title} (ID: ${ad.id})`);
          rejected++;

        } else {
          // APPROVE ad - moderation passed
          // Set postedAt when ad is approved (goes live)
          const now = new Date();
          const updatedAd = await prisma.ad.update({
            where: { id: ad.id },
            data: {
              status: 'APPROVED',
              moderationStatus: 'approved_after_review',
              postedAt: now // Set postedAt when ad goes live
            },
            include: {
              category: { select: { id: true, name: true } },
              subcategory: { select: { id: true, name: true } },
              location: { select: { id: true, name: true } },
            }
          });

          // Index approved ad in Meilisearch (sync with database)
          try {
            const { indexAd } = require('./meilisearch');
            await indexAd(updatedAd);
            console.log(`✅ Indexed approved ad in Meilisearch: ${updatedAd.id}`);
          } catch (indexError) {
            console.error(`⚠️ Error indexing approved ad ${updatedAd.id} in Meilisearch:`, indexError);
          }

        // Create notification for user
        await prisma.notification.create({
          data: {
            userId: ad.user.id,
            title: 'Ad Approved',
            message: `Your ad "${ad.title}" has been approved and is now live!`,
            type: 'ad_approved',
            link: `/ads/${ad.id}`
          }
        });

        // Emit socket event for new approved ad
        try {
          const { getIO } = require('../socket/socket');
          const io = getIO();
          if (io) {
            const fullAd = await prisma.ad.findUnique({
              where: { id: ad.id },
              include: {
                category: { select: { id: true, name: true, slug: true } },
                subcategory: { select: { id: true, name: true, slug: true } },
                location: { select: { id: true, name: true, slug: true, latitude: true, longitude: true } },
                user: { select: { id: true, name: true, avatar: true } }
              }
            });
            
            io.emit('ad_approved', fullAd);
            io.emit('new_ad', fullAd);
          }

          // Index ad in Meilisearch
          try {
            const { indexAd } = require('../services/meilisearch');
            const fullAd = await prisma.ad.findUnique({
              where: { id: ad.id },
              include: {
                category: true,
                subcategory: true,
                location: true,
                user: { select: { id: true, name: true } }
              }
            });
            await indexAd(fullAd);
          } catch (indexError) {
            console.error('⚠️ Error indexing ad in Meilisearch:', indexError.message);
          }
        } catch (socketError) {
          console.error('⚠️ Error emitting socket event:', socketError.message);
        }

          // Create notification for user
          await prisma.notification.create({
            data: {
              userId: ad.user.id,
              title: 'Ad Approved',
              message: `Your ad "${ad.title}" has passed moderation and is now live!`,
              type: 'ad_approved',
              link: `/ads/${ad.id}`
            }
          });

          console.log(`✅ Approved: ${ad.title} (ID: ${ad.id})`);
          approved++;
        }

      } catch (error) {
        console.error(`❌ Error processing ad ${ad.id}:`, error.message);
        errors++;
      }
    }

    console.log(`\n📊 Moderation processing complete: ${approved} approved, ${rejected} rejected, ${errors} errors`);

    return {
      success: true,
      approved: approved,
      rejected: rejected,
      errors: errors,
      message: `Processed ${approved + rejected} ads`
    };

  } catch (error) {
    console.error('❌ Error in auto-approval service:', error);
    return {
      success: false,
      count: 0,
      message: error.message
    };
  }
}

module.exports = {
  autoApprovePendingAds: processPendingModeration, // Renamed function
  processPendingModeration
};

