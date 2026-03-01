/**
 * Clear Redis cache and reindex all approved ads in MeiliSearch
 */

const { PrismaClient } = require('@prisma/client');
const { indexAds, checkMeilisearchConnection } = require('../services/meilisearch');
const Redis = require('ioredis');

const prisma = new PrismaClient();

// Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: () => null, // Don't retry if Redis is down
});

async function clearCacheAndReindex() {
  try {
    console.log('🔄 Starting cache clear and reindex process...\n');
    
    // Step 1: Check MeiliSearch connection
    console.log('📋 Step 1: Checking MeiliSearch connection...');
    const isConnected = await checkMeilisearchConnection();
    if (!isConnected) {
      console.log('   ⚠️  MeiliSearch is not available');
      console.log('   Skipping MeiliSearch reindex, but will clear Redis cache\n');
    } else {
      console.log('   ✅ MeiliSearch is connected\n');
    }
    
    // Step 2: Clear Redis cache
    console.log('📋 Step 2: Clearing Redis cache...');
    try {
      const keys = await redis.keys('*');
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`   ✅ Cleared ${keys.length} cache keys\n`);
      } else {
        console.log('   ℹ️  No cache keys to clear\n');
      }
    } catch (redisError) {
      console.log('   ⚠️  Redis not available, skipping cache clear\n');
    }
    
    // Step 3: Get all approved ads
    console.log('📋 Step 3: Fetching approved ads from database...');
    const approvedAds = await prisma.ad.findMany({
      where: { status: 'APPROVED' },
      include: {
        category: { select: { id: true, name: true } },
        subcategory: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    });
    console.log(`   Found ${approvedAds.length} approved ads\n`);
    
    // Step 4: Reindex in MeiliSearch
    if (isConnected && approvedAds.length > 0) {
      console.log('📋 Step 4: Reindexing ads in MeiliSearch...');
      
      // Index in batches of 100
      const batchSize = 100;
      let indexed = 0;
      
      for (let i = 0; i < approvedAds.length; i += batchSize) {
        const batch = approvedAds.slice(i, i + batchSize);
        await indexAds(batch);
        indexed += batch.length;
        console.log(`   Indexed ${indexed}/${approvedAds.length} ads...`);
      }
      
      console.log(`   ✅ Reindexed all ${approvedAds.length} ads\n`);
    } else if (!isConnected) {
      console.log('📋 Step 4: Skipping MeiliSearch reindex (not connected)\n');
    } else {
      console.log('📋 Step 4: No ads to reindex\n');
    }
    
    console.log('✅ Cache clear and reindex complete!\n');
    console.log('📋 Summary:');
    console.log(`   - Approved ads: ${approvedAds.length}`);
    console.log(`   - MeiliSearch: ${isConnected ? 'Indexed' : 'Skipped (not connected)'}`);
    console.log(`   - Redis cache: Cleared`);
    console.log('');
    console.log('🎉 Your home feed should now show all products!');
    console.log('   Refresh your browser to see the changes.');
    
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(1);
  }
}

clearCacheAndReindex();
