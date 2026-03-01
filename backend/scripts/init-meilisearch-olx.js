/**
 * Initialize Meilisearch with OLX-style settings
 * 
 * This script:
 * 1. Connects to Meilisearch
 * 2. Creates/updates the ads index
 * 3. Configures searchable attributes (priority order)
 * 4. Configures filterable attributes
 * 5. Configures sortable attributes
 * 6. Configures ranking rules
 * 7. Configures synonyms
 * 8. Configures typo tolerance
 * 
 * Usage: node scripts/init-meilisearch-olx.js
 */

require('dotenv').config();
const { MeiliSearch } = require('meilisearch');

const client = new MeiliSearch({
  host: process.env.MEILI_HOST || process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILI_API_KEY || process.env.MEILI_MASTER_KEY || process.env.MEILISEARCH_MASTER_KEY || 'masterKey',
});

const INDEX_NAME = process.env.MEILI_INDEX || process.env.MEILISEARCH_INDEX || 'ads';

async function initializeMeilisearch() {
  try {
    console.log('🔍 Initializing Meilisearch with OLX-style settings...\n');

    // Check connection
    console.log('1️⃣  Checking Meilisearch connection...');
    const health = await client.health();
    console.log('✅ Connected to Meilisearch:', health.status);

    // Get or create index
    console.log('\n2️⃣  Creating/updating ads index...');
    const index = client.index(INDEX_NAME);
    
    // Configure ALL settings in ONE call (Meilisearch v1 format)
    console.log('\n3️⃣  Configuring all index settings...');
    await index.updateSettings({
      // Searchable attributes - Priority order
      searchableAttributes: [
        'title',           // Highest priority
        'brand',
        'model',
        'categoryName',
        'tags',
        'location',
        'city',
        'state',
        'description',
        'specifications',  // Lowest priority
      ],
      
      // Filterable attributes
      filterableAttributes: [
        'planPriority',
        'isTopAdActive',
        'isFeaturedActive',
        'isBumpActive',
        'categoryName',
        'location',
        'city',
        'state',
        'adExpiryDate',
        'createdAt',
        'categoryId',
        'subcategoryId',
        'locationId',
        'status',
        'condition',
        'price',
        'isPremium',
        'userId',
        '_geo',  // For geo-location filtering
      ],
      
      // Sortable attributes
      sortableAttributes: [
        'planPriority',
        'isTopAdActive',
        'isFeaturedActive',
        'isBumpActive',
        'createdAt',
        'price',
        'adExpiryDate',
      ],
      
      // Ranking rules - OLX-style with geo support
      rankingRules: [
        'typo',        // Typo tolerance
        'words',       // Number of matched words
        'proximity',   // Proximity of matched words
        'attribute',   // Attribute ranking (searchable priority)
        'sort',        // Custom sort (Top Ads > Featured > Plan > Recency)
        'exactness',   // Exact matches first
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
        'job': ['work', 'employment'],
      },
      
      // Typo tolerance
      typoTolerance: {
        enabled: true,
        minWordSizeForTypos: {
          oneTypo: 4,   // Allow 1 typo for words >= 4 chars
          twoTypos: 8,  // Allow 2 typos for words >= 8 chars
        },
        disableOnWords: [],
        disableOnAttributes: [],
      },
      
      // Pagination
      pagination: {
        maxTotalHits: 10000,
      },
      
      // Distinct attribute (optional - prevents duplicate ads)
      distinctAttribute: null,
    });
    console.log('✅ All settings configured successfully');

    // Get index stats
    console.log('\n📊 Index Statistics:');
    const stats = await index.getStats();
    console.log(`   Documents: ${stats.numberOfDocuments}`);
    console.log(`   Index size: ${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`);

    console.log('\n✅ Meilisearch initialization complete!\n');
    console.log('📝 Next steps:');
    console.log('   1. Run: npm run reindex-meilisearch (to index all ads)');
    console.log('   2. Test search: GET /api/search?q=iphone');
    console.log('   3. Test autocomplete: GET /api/search/suggestions?q=iph\n');

  } catch (error) {
    console.error('❌ Error initializing Meilisearch:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run initialization
initializeMeilisearch();
