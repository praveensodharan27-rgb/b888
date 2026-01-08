/**
 * Migration script to update existing ads with packageType
 * Based on user's active business package at the time of ad creation
 */

const { PrismaClient } = require('@prisma/client');
const { PACKAGE_TYPE_MAP, PACKAGE_PRIORITY } = require('../services/adRankingService');

const prisma = new PrismaClient();

async function updateAdsPackageType() {
  try {
    console.log('🔄 Starting migration: Update ads packageType...');

    const priorityToPackageType = (priority) => {
      switch (Number(priority)) {
        case 4: return 'SELLER_PRIME';
        case 3: return 'SELLER_PLUS';
        case 2: return 'MAX_VISIBILITY';
        case 1:
        default:
          return 'NORMAL';
      }
    };
    
    // Get all ads without packageType or with default packageType
    const ads = await prisma.ad.findMany({
      where: {
        OR: [
          { packageType: null },
          { packageType: 'NORMAL' } // Default normal (enum)
        ]
      },
      select: {
        id: true,
        userId: true,
        createdAt: true,
        packageType: true
      },
      take: 1000 // Process in batches
    });

    console.log(`📊 Found ${ads.length} ads to process`);

    let updated = 0;
    let skipped = 0;

    for (const ad of ads) {
      try {
        // Get user's active package at the time of ad creation
        const adDate = new Date(ad.createdAt);
        
        // Check UserBusinessPackage
        const userBusinessPackage = await prisma.userBusinessPackage.findFirst({
          where: {
            userId: ad.userId,
            purchaseTime: { lte: adDate },
            OR: [
              { expiresAt: null },
              { expiresAt: { gte: adDate } }
            ],
            status: 'active'
          },
          orderBy: { purchaseTime: 'desc' }
        });

        // Check BusinessPackage (backward compatibility)
        const businessPackage = await prisma.businessPackage.findFirst({
          where: {
            userId: ad.userId,
            createdAt: { lte: adDate },
            OR: [
              { expiresAt: null },
              { expiresAt: { gte: adDate } }
            ],
            status: { in: ['paid', 'verified'] }
          },
          orderBy: { createdAt: 'desc' }
        });

        let packagePriority = PACKAGE_PRIORITY.NORMAL;

        if (userBusinessPackage) {
          packagePriority = PACKAGE_TYPE_MAP[userBusinessPackage.packageType] || PACKAGE_PRIORITY.NORMAL;
        } else if (businessPackage) {
          packagePriority = PACKAGE_TYPE_MAP[businessPackage.packageType] || PACKAGE_PRIORITY.NORMAL;
        }

        const desiredPackageType = priorityToPackageType(packagePriority);

        // Update ad if packageType is different
        if (ad.packageType !== desiredPackageType) {
          await prisma.ad.update({
            where: { id: ad.id },
            data: { packageType: desiredPackageType }
          });
          updated++;
          if (updated % 100 === 0) {
            console.log(`   Updated ${updated} ads...`);
          }
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`   Error updating ad ${ad.id}:`, error.message);
        skipped++;
      }
    }

    console.log(`✅ Migration complete!`);
    console.log(`   Updated: ${updated} ads`);
    console.log(`   Skipped: ${skipped} ads`);
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
if (require.main === module) {
  updateAdsPackageType()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { updateAdsPackageType };

