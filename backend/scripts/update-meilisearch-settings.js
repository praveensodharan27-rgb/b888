/**
 * Update MeiliSearch index settings to fix _geo sortable issue
 * Run this script to update the index settings without reindexing all ads
 */

const { MeiliSearch } = require('meilisearch');

const client = new MeiliSearch({
  host: process.env.MEILI_HOST || process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILI_API_KEY || process.env.MEILI_MASTER_KEY || process.env.MEILISEARCH_MASTER_KEY || 'masterKey',
});

const INDEX_NAME = process.env.MEILI_INDEX || process.env.MEILISEARCH_INDEX || 'ads';

async function updateSettings() {
  try {
    console.log('🔄 Updating MeiliSearch index settings...');
    
    const index = client.index(INDEX_NAME);
    
    // Update settings
    await index.updateSettings({
      // Searchable attributes - Priority order
      searchableAttributes: [
        'title',
        'brand',
        'model',
        'categoryName',
        'category',
        'tags',
        'city',
        'state',
        'neighbourhood',
        'location',
        'description',
        'specifications',
      ],
      
      // Filterable attributes - Including geo
      filterableAttributes: [
        'categoryId',
        'subcategoryId',
        'locationId',
        'status',
        'condition',
        'price',
        'isPremium',
        'userId',
        'createdAt',
        'planPriority',
        'isTopAdActive',
        'isFeaturedActive',
        'isBumpActive',
        'adExpiryDate',
        'categoryName',
        '_geo',  // For geo-location filtering
      ],

      // Sortable attributes - FIXED: Added _geo and other missing attributes
      sortableAttributes: [
        'createdAt',
        'price',
        'featuredAt',
        'bumpedAt',
        'rankingPriority',
        'planPriority',
        'isTopAdActive',
        'isFeaturedActive',
        'rankingScore',
        'isUrgent',
        'isBumpActive',
        'adExpiryDate',
        '_geo',  // For geo-distance sorting
      ],

      // Ranking rules - OLX-style
      rankingRules: [
        'typo',
        'words',
        'proximity',
        'attribute',
        'sort',
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

    console.log('✅ MeiliSearch index settings updated successfully!');
    console.log('');
    console.log('📋 Updated sortable attributes:');
    console.log('   - createdAt');
    console.log('   - price');
    console.log('   - featuredAt');
    console.log('   - bumpedAt');
    console.log('   - rankingPriority');
    console.log('   - planPriority');
    console.log('   - isTopAdActive');
    console.log('   - isFeaturedActive');
    console.log('   - rankingScore');
    console.log('   - isUrgent');
    console.log('   - isBumpActive');
    console.log('   - adExpiryDate');
    console.log('   - _geo (FIXED) ✅');
    console.log('');
    console.log('🎉 The _geo attribute is now sortable!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Restart your backend server');
    console.log('2. Test the home feed: curl http://localhost:5000/api/home-feed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating MeiliSearch settings:', error.message);
    console.error(error);
    process.exit(1);
  }
}

updateSettings();
