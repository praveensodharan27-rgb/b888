/**
 * Setup Search System
 * Initializes Meilisearch and indexes all ads
 */

const { PrismaClient } = require('@prisma/client');
const { 
  checkMeilisearchConnection, 
  initializeIndex, 
  reindexAllAds 
} = require('../services/meilisearch');

const prisma = new PrismaClient();

async function setupSearchSystem() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('           SEARCH SYSTEM SETUP');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Step 1: Check Meilisearch connection
    console.log('📡 Step 1: Checking Meilisearch connection...');
    const isConnected = await checkMeilisearchConnection();
    
    if (!isConnected) {
      console.error('❌ Meilisearch is not available!');
      console.log('\n💡 To start Meilisearch:');
      console.log('   docker run -d -p 7700:7700 getmeili/meilisearch');
      console.log('\n   Or download from: https://www.meilisearch.com/\n');
      process.exit(1);
    }
    
    console.log('✅ Meilisearch is connected\n');

    // Step 2: Initialize index
    console.log('⚙️  Step 2: Initializing Meilisearch index...');
    const initialized = await initializeIndex();
    
    if (!initialized) {
      console.error('❌ Failed to initialize index');
      process.exit(1);
    }
    
    console.log('✅ Index initialized with settings\n');

    // Step 3: Count ads to index
    console.log('📊 Step 3: Counting ads to index...');
    const totalAds = await prisma.ad.count({
      where: { status: 'APPROVED' }
    });
    
    console.log(`✅ Found ${totalAds} APPROVED ads to index\n`);

    if (totalAds === 0) {
      console.log('⚠️  No ads to index. Create some ads first.\n');
      process.exit(0);
    }

    // Step 4: Reindex all ads
    console.log('🔄 Step 4: Indexing all ads...');
    console.log('   This may take a few minutes...\n');
    
    const indexed = await reindexAllAds(prisma);
    
    console.log(`✅ Successfully indexed ${indexed} ads\n`);

    // Step 5: Test search
    console.log('🧪 Step 5: Testing search functionality...');
    const { searchAds } = require('../services/meilisearch');
    
    const testResult = await searchAds('phone', { limit: 5 });
    console.log(`✅ Search test passed - Found ${testResult.total} results\n`);

    // Step 6: Test autocomplete
    console.log('🧪 Step 6: Testing autocomplete...');
    const { autocomplete } = require('../services/meilisearch');
    
    const suggestions = await autocomplete('phone', 5);
    console.log(`✅ Autocomplete test passed - ${suggestions.length} suggestions\n`);

    // Success summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('           SETUP COMPLETED SUCCESSFULLY! ✅');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('📝 Summary:');
    console.log(`   - Meilisearch: Connected`);
    console.log(`   - Index: Initialized`);
    console.log(`   - Ads indexed: ${indexed}`);
    console.log(`   - Search: Working`);
    console.log(`   - Autocomplete: Working\n`);
    console.log('🎉 Your search system is ready to use!\n');
    console.log('📚 Next steps:');
    console.log('   1. Visit /search-demo to test the UI');
    console.log('   2. Try queries like "iPhone in Kochi"');
    console.log('   3. Check SEARCH_SYSTEM_README.md for documentation\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run setup
if (require.main === module) {
  setupSearchSystem().catch(console.error);
}

module.exports = { setupSearchSystem };
