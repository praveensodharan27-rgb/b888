/**
 * Add Ranking System Fields to Existing Ads
 * 
 * Adds the following fields to all ads in MongoDB:
 * - rankingScore (Int, default: 10)
 * - planType (String, default: "FREE")
 * - planPriority (Int, default: 10)
 * - isTopAdActive (Boolean, default: false)
 * - isFeaturedActive (Boolean, default: false)
 * - isBumpActive (Boolean, default: false)
 * - latitude (Float, optional)
 * - longitude (Float, optional)
 * - adExpiryDate (DateTime, optional)
 * 
 * Usage: node scripts/add-ranking-fields.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { calculateRankingScore, getPlanPriority } = require('../utils/adRankingScore');

const prisma = new PrismaClient();

async function addRankingFields() {
  try {
    console.log('🔄 Adding ranking system fields to all ads...\n');

    // Get all ads
    const ads = await prisma.ad.findMany({
      select: {
        id: true,
        packageType: true,
        isPremium: true,
        premiumType: true,
        createdAt: true,
        isUrgent: true,
      },
    });

    console.log(`📊 Found ${ads.length} ads\n`);
    console.log('⚙️  Calculating and updating fields...\n');

    let updated = 0;

    for (const ad of ads) {
      try {
        // Map packageType to planType
        let planType = 'FREE';
        let planPriority = 10;
        
        if (ad.packageType === 'SELLER_PRIME') {
          planType = 'ENTERPRISE';
          planPriority = 100;
        } else if (ad.packageType === 'SELLER_PLUS') {
          planType = 'PROFESSIONAL';
          planPriority = 80;
        } else if (ad.packageType === 'MAX_VISIBILITY') {
          planType = 'STARTER';
          planPriority = 60;
        }

        // Determine feature flags from existing data
        const isTopAdActive = ad.isPremium && ad.premiumType === 'TOP';
        const isFeaturedActive = ad.isPremium && ad.premiumType === 'FEATURED';
        const isBumpActive = ad.isPremium && ad.premiumType === 'BUMP_UP';

        // Calculate ranking score
        const adData = {
          planType,
          isTopAdActive,
          isFeaturedActive,
          isUrgent: ad.isUrgent || false,
          isBumpActive,
          createdAt: ad.createdAt,
        };
        
        const rankingScore = calculateRankingScore(adData);

        // Update ad using raw MongoDB query (Prisma doesn't support adding new fields easily)
        await prisma.$runCommandRaw({
          update: 'ads',
          updates: [
            {
              q: { _id: { $oid: ad.id } },
              u: {
                $set: {
                  rankingScore,
                  planType,
                  planPriority,
                  isTopAdActive,
                  isFeaturedActive,
                  isBumpActive,
                },
              },
            },
          ],
        });

        updated++;

        if (updated % 10 === 0) {
          console.log(`   Progress: ${updated}/${ads.length} updated...`);
        }
      } catch (error) {
        console.error(`   ❌ Error updating ad ${ad.id}:`, error.message);
      }
    }

    console.log(`\n✅ Successfully updated ${updated} ads!\n`);

    // Show distribution
    console.log('📊 Ranking Score Distribution:');
    
    const distribution = await prisma.$runCommandRaw({
      aggregate: 'ads',
      pipeline: [
        {
          $group: {
            _id: null,
            high: { $sum: { $cond: [{ $gte: ['$rankingScore', 100] }, 1, 0] } },
            medium: { $sum: { $cond: [{ $and: [{ $gte: ['$rankingScore', 50] }, { $lt: ['$rankingScore', 100] }] }, 1, 0] } },
            low: { $sum: { $cond: [{ $lt: ['$rankingScore', 50] }, 1, 0] } },
          },
        },
      ],
      cursor: {},
    });

    if (distribution.cursor && distribution.cursor.firstBatch && distribution.cursor.firstBatch[0]) {
      const stats = distribution.cursor.firstBatch[0];
      console.log(`   High (100+): ${stats.high || 0} ads`);
      console.log(`   Medium (50-99): ${stats.medium || 0} ads`);
      console.log(`   Low (0-49): ${stats.low || 0} ads`);
    }

    console.log('\n✅ Migration complete!\n');
    console.log('📝 Next steps:');
    console.log('   1. Run: npx prisma generate');
    console.log('   2. Run: npm run reindex-meilisearch');
    console.log('   3. Test: curl http://localhost:5000/api/home-feed\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addRankingFields();
