/**
 * Initialize Meilisearch with Advanced Ranking System
 * 
 * Features:
 * - Precomputed ranking scores
 * - Plan priority
 * - Feature boosts
 * - Geo-location support
 * - Expired ads filtering
 */

require('dotenv').config();
const { MeiliSearch } = require('meilisearch');

const client = new MeiliSearch({
  host: process.env.MEILI_HOST || process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILI_API_KEY || process.env.MEILI_MASTER_KEY || process.env.MEILISEARCH_MASTER_KEY || 'masterKey',
});

const INDEX_NAME = process.env.MEILI_INDEX || process.env.MEILISEARCH_INDEX || 'ads';

async function initializeRankingSystem() {
  try {
    console.log('🎯 Initializing Meilisearch with Advanced Ranking System...\n');

    // Check connection
    console.log('1️⃣  Checking Meilisearch connection...');
    const health = await client.health();
    console.log('✅ Connected to Meilisearch:', health.status);

    // Get or create index
    console.log('\n2️⃣  Configuring ads index with ranking system...');
    const index = client.index(INDEX_NAME);
    
    // Configure ALL settings in ONE call (Meilisearch v1)
    await index.updateSettings({
      // Searchable attributes
      searchableAttributes: [
        'title',
        'brand',
        'model',
        'categoryName',
        'tags',
        'location',
        'city',
        'state',
        'description',
        'specifications',
      ],
      
      // Filterable attributes
      filterableAttributes: [
        'planPriority',
        'rankingScore',        // Precomputed score
        'isTopAdActive',
        'isFeaturedActive',
        'isUrgent',
        'isBumpActive',
        'categoryName',
        'location',
        'city',
        'state',
        'adExpiryDate',
        'createdAt',
        'categoryId',
        'subcategoryId',
        'status',
        'condition',
        'price',
        '_geo',
      ],
      
      // Sortable attributes
      sortableAttributes: [
        'rankingScore',        // Primary sort field
        'planPriority',
        'isTopAdActive',
        'isFeaturedActive',
        'isUrgent',
        'isBumpActive',
        'createdAt',
        'price',
        'adExpiryDate',
      ],
      
      // Ranking rules - Use precomputed score for optimal performance
      rankingRules: [
        'sort',        // Use sort order (rankingScore:desc)
        'typo',
        'words',
        'proximity',
        'attribute',
        'exactness',
      ],
      
      // Synonyms
      synonyms: {
        'car': ['vehicle', 'automobile'],
        'bike': ['motorcycle', 'motorbike'],
        'mobile': ['phone', 'smartphone', 'cellphone'],
        'laptop': ['notebook', 'computer'],
        'tv': ['television'],
        'ac': ['air conditioner', 'airconditioner'],
        'fridge': ['refrigerator'],
        'house': ['home', 'property'],
        'flat': ['apartment'],
      },
      
      // Typo tolerance
      typoTolerance: {
        enabled: true,
        minWordSizeForTypos: {
          oneTypo: 4,
          twoTypos: 8,
        },
      },
      
      // Pagination
      pagination: {
        maxTotalHits: 10000,
      },
    });

    console.log('✅ Ranking system configured successfully');

    // Display ranking formula
    console.log('\n📊 Ranking Formula:');
    console.log('   rankingScore = planPriority + featureBoosts + freshnessBonus');
    console.log('\n   Plan Priority:');
    console.log('   - ENTERPRISE: 100');
    console.log('   - PROFESSIONAL: 80');
    console.log('   - STARTER: 60');
    console.log('   - FREE: 10');
    console.log('\n   Feature Boosts:');
    console.log('   - Top Ad: +40');
    console.log('   - Featured: +30');
    console.log('   - Urgent: +20');
    console.log('   - Bump: +15');
    console.log('\n   Freshness Bonus:');
    console.log('   - < 1 hour: +10');
    console.log('   - < 24 hours: +5');
    console.log('   - < 7 days: +2');

    // Display example rankings
    console.log('\n🏆 Example Rankings:');
    console.log('   1. Enterprise Top Ad: 150 points');
    console.log('   2. Professional Top + Featured: 160 points');
    console.log('   3. Starter Featured + Urgent: 120 points');
    console.log('   4. Free Top Ad: 60 points');
    console.log('   5. Free Normal: 15 points');

    // Get index stats
    console.log('\n📈 Index Statistics:');
    const stats = await index.getStats();
    console.log(`   Documents: ${stats.numberOfDocuments}`);
    console.log(`   Index size: ${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`);

    console.log('\n✅ Ranking system initialization complete!\n');
    console.log('📝 Next steps:');
    console.log('   1. Reindex ads with ranking scores');
    console.log('   2. Test home feed API');
    console.log('   3. Verify ad order\n');

  } catch (error) {
    console.error('❌ Error initializing ranking system:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run initialization
initializeRankingSystem();
