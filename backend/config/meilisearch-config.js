/**
 * Meilisearch Configuration
 * 
 * Centralized configuration for Meilisearch client and index settings
 */

module.exports = {
  // Connection settings
  connection: {
    host: process.env.MEILI_HOST || process.env.MEILISEARCH_HOST || 'http://localhost:7700',
    apiKey: process.env.MEILI_API_KEY || process.env.MEILI_MASTER_KEY || process.env.MEILISEARCH_MASTER_KEY || 'masterKey',
  },

  // Index settings
  index: {
    name: process.env.MEILI_INDEX || process.env.MEILISEARCH_INDEX || 'ads',
    primaryKey: 'id',
  },

  // Searchable attributes (priority order)
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

  // Ranking rules (order matters)
  rankingRules: [
    'typo',        // Typo tolerance
    'words',       // Number of matched words
    'proximity',   // Proximity of matched words
    'attribute',   // Attribute ranking (searchable priority)
    'sort',        // Custom sort (Top Ads > Featured > Plan > Recency)
    'exactness',   // Exact matches first
  ],

  // Synonyms configuration
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

  // Typo tolerance settings
  typoTolerance: {
    enabled: true,
    minWordSizeForTypos: {
      oneTypo: 4,   // Allow 1 typo for words >= 4 chars
      twoTypos: 8,  // Allow 2 typos for words >= 8 chars
    },
    disableOnWords: [],
    disableOnAttributes: [],
  },

  // Pagination settings
  pagination: {
    maxTotalHits: 10000,
  },

  // Plan priority mapping
  planPriority: {
    'enterprise': 4,
    'pro': 3,
    'basic': 2,
    'normal': 1,
  },

  // Search defaults
  searchDefaults: {
    limit: 20,
    page: 1,
    sort: 'newest',
    status: 'APPROVED',
  },

  // Sort options
  sortOptions: {
    newest: ['isTopAdActive:desc', 'isFeaturedActive:desc', 'planPriority:desc', 'createdAt:desc'],
    oldest: ['isTopAdActive:desc', 'isFeaturedActive:desc', 'planPriority:desc', 'createdAt:asc'],
    price_low: ['isTopAdActive:desc', 'isFeaturedActive:desc', 'planPriority:desc', 'price:asc', 'createdAt:desc'],
    price_high: ['isTopAdActive:desc', 'isFeaturedActive:desc', 'planPriority:desc', 'price:desc', 'createdAt:desc'],
    featured: ['isTopAdActive:desc', 'isFeaturedActive:desc', 'planPriority:desc', 'createdAt:desc'],
    bumped: ['isTopAdActive:desc', 'isFeaturedActive:desc', 'planPriority:desc', 'isBumpActive:desc', 'createdAt:desc'],
  },

  // Home page sort (no search query)
  homeSortDefault: ['isTopAdActive:desc', 'isFeaturedActive:desc', 'planPriority:desc', 'createdAt:desc'],

  // Health check settings
  healthCheck: {
    enabled: true,
    intervalMs: 60000, // 1 minute
  },

  // Batch settings
  batch: {
    size: 100,
    maxRetries: 3,
  },
};
