/**
 * Recalculate Ranking Scores for All Ads
 * 
 * Updates rankingScore field for all ads in database and Meilisearch
 * 
 * Usage: node scripts/recalculate-ranking-scores.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { calculateRankingScore } = require('../utils/adRankingScore');
const { syncAdToMeilisearch } = require('../services/meilisearch');

const prisma = new PrismaClient();

async function recalculateAllScores() {
  try {
    console.log('🔄 Recalculating ranking scores for all ads...\n');

    // Get all approved ads
    const ads = await prisma.ad.findMany({
      where: { status: 'APPROVED' },
      include: {
        category: { select: { id: true, name: true } },
        subcategory: { select: { id: true, name: true } },
        location: { select: { id: true, name: true, latitude: true, longitude: true } },
      },
    });

    console.log(`📊 Found ${ads.length} approved ads\n`);

    let updated = 0;
    let unchanged = 0;
    let errors = 0;

    for (let i = 0; i < ads.length; i++) {
      const ad = ads[i];
      
      try {
        // Calculate new score
        const newScore = calculateRankingScore(ad);
        
        // Update if score changed
        if (ad.rankingScore !== newScore) {
          await prisma.ad.update({
            where: { id: ad.id },
            data: { rankingScore: newScore },
          });
          
          // Re-index in Meilisearch
          await syncAdToMeilisearch({ ...ad, rankingScore: newScore });
          
          updated++;
          
          if (updated % 10 === 0) {
            console.log(`   Progress: ${updated}/${ads.length} updated...`);
          }
        } else {
          unchanged++;
        }
      } catch (error) {
        console.error(`   ❌ Error updating ad ${ad.id}:`, error.message);
        errors++;
      }
    }

    console.log('\n✅ Recalculation complete!\n');
    console.log('📊 Summary:');
    console.log(`   Total ads: ${ads.length}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Unchanged: ${unchanged}`);
    console.log(`   Errors: ${errors}\n`);

    // Show score distribution
    const allAds = await prisma.ad.findMany({
      where: { status: 'APPROVED' },
      select: { rankingScore: true },
    });

    const distribution = {
      '150+': allAds.filter(ad => ad.rankingScore >= 150).length,
      '100-149': allAds.filter(ad => ad.rankingScore >= 100 && ad.rankingScore < 150).length,
      '50-99': allAds.filter(ad => ad.rankingScore >= 50 && ad.rankingScore < 100).length,
      '0-49': allAds.filter(ad => ad.rankingScore < 50).length,
    };

    console.log('📊 Score Distribution:');
    console.log(`   150+ points: ${distribution['150+']} ads (Premium)`);
    console.log(`   100-149 points: ${distribution['100-149']} ads (High)`);
    console.log(`   50-99 points: ${distribution['50-99']} ads (Medium)`);
    console.log(`   0-49 points: ${distribution['0-49']} ads (Low)\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

recalculateAllScores();
