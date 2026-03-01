/**
 * Manual MongoDB Update - Add Ranking Fields
 * 
 * This script directly updates MongoDB without requiring Prisma regeneration.
 * Use this if your backend server is running and you can't stop it.
 * 
 * Usage: node scripts/manual-add-ranking-fields.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

// Plan priority mapping
const PLAN_PRIORITY = {
  ENTERPRISE: 100,
  PROFESSIONAL: 80,
  STARTER: 60,
  FREE: 10,
};

// Feature boost values
const FEATURE_BOOST = {
  TOP_AD: 40,
  FEATURED: 30,
  URGENT: 20,
  BUMP: 15,
};

function calculateRankingScore(ad) {
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

  // Determine feature flags
  const isTopAdActive = ad.isPremium && ad.premiumType === 'TOP';
  const isFeaturedActive = ad.isPremium && ad.premiumType === 'FEATURED';
  const isBumpActive = ad.isPremium && ad.premiumType === 'BUMP_UP';
  const isUrgent = ad.isUrgent || false;

  // Calculate score
  let score = planPriority;
  
  if (isTopAdActive) score += FEATURE_BOOST.TOP_AD;
  if (isFeaturedActive) score += FEATURE_BOOST.FEATURED;
  if (isUrgent) score += FEATURE_BOOST.URGENT;
  if (isBumpActive) score += FEATURE_BOOST.BUMP;

  // Freshness bonus (ads < 7 days old)
  const daysSinceCreated = (Date.now() - new Date(ad.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceCreated < 7) {
    score += Math.floor((7 - daysSinceCreated) * 2);
  }

  return {
    score,
    planType,
    planPriority,
    isTopAdActive,
    isFeaturedActive,
    isBumpActive,
  };
}

async function updateRankingFields() {
  const mongoUrl = process.env.MONGODB_URL || process.env.DATABASE_URL;
  
  if (!mongoUrl) {
    console.error('❌ Error: MONGODB_URL or DATABASE_URL not found in .env');
    process.exit(1);
  }

  console.log('🔄 Connecting to MongoDB...\n');
  
  const client = new MongoClient(mongoUrl);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();
    const adsCollection = db.collection('ads');

    // Get all ads
    const ads = await adsCollection.find({}).toArray();
    console.log(`📊 Found ${ads.length} ads\n`);
    console.log('⚙️  Calculating and updating fields...\n');

    let updated = 0;
    let errors = 0;

    for (const ad of ads) {
      try {
        const ranking = calculateRankingScore(ad);

        // Set adExpiryDate if not present (30 days from creation)
        let adExpiryDate = ad.adExpiryDate;
        if (!adExpiryDate && ad.createdAt) {
          const expiryDate = new Date(ad.createdAt);
          expiryDate.setDate(expiryDate.getDate() + 30);
          adExpiryDate = expiryDate;
        }

        // Update the ad
        await adsCollection.updateOne(
          { _id: ad._id },
          {
            $set: {
              rankingScore: ranking.score,
              planType: ranking.planType,
              planPriority: ranking.planPriority,
              isTopAdActive: ranking.isTopAdActive,
              isFeaturedActive: ranking.isFeaturedActive,
              isBumpActive: ranking.isBumpActive,
              adExpiryDate: adExpiryDate,
            },
          }
        );

        updated++;

        if (updated % 10 === 0) {
          console.log(`   Progress: ${updated}/${ads.length} updated...`);
        }
      } catch (error) {
        console.error(`   ❌ Error updating ad ${ad._id}:`, error.message);
        errors++;
      }
    }

    console.log(`\n✅ Successfully updated ${updated} ads!\n`);

    if (errors > 0) {
      console.log(`⚠️  ${errors} ads had errors\n`);
    }

    // Show distribution
    console.log('📊 Ranking Score Distribution:');
    
    const distribution = await adsCollection.aggregate([
      {
        $group: {
          _id: null,
          high: { $sum: { $cond: [{ $gte: ['$rankingScore', 100] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $and: [{ $gte: ['$rankingScore', 50] }, { $lt: ['$rankingScore', 100] }] }, 1, 0] } },
          low: { $sum: { $cond: [{ $lt: ['$rankingScore', 50] }, 1, 0] } },
        },
      },
    ]).toArray();

    if (distribution.length > 0) {
      const stats = distribution[0];
      console.log(`   High (100+): ${stats.high || 0} ads`);
      console.log(`   Medium (50-99): ${stats.medium || 0} ads`);
      console.log(`   Low (0-49): ${stats.low || 0} ads`);
    }

    console.log('\n✅ Migration complete!\n');
    console.log('📝 Next steps:');
    console.log('   1. Restart your backend server (to load new schema)');
    console.log('   2. Run: npm run init-ranking');
    console.log('   3. Run: npm run reindex-meilisearch');
    console.log('   4. Test: curl http://localhost:5000/api/home-feed\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

updateRankingFields();
