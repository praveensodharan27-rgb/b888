const { MeiliSearch } = require('meilisearch');
const { logger } = require('../src/config/logger');
const { createRateLimitedLogger } = require('../utils/rateLimitedLog');
const { calculateRankingScore, getPlanPriority } = require('../utils/adRankingScore');

const rlLog = createRateLimitedLogger(logger, 60 * 1000); // once per minute

// Prefer MEILI_* so local (e.g. MEILI_HOST=http://127.0.0.1:7700) overrides Cloud when both set
const client = new MeiliSearch({
  host: process.env.MEILI_HOST || process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILI_API_KEY || process.env.MEILI_MASTER_KEY || process.env.MEILISEARCH_MASTER_KEY || 'masterKey',
});

const INDEX_NAME = process.env.MEILI_INDEX || process.env.MEILISEARCH_INDEX || 'ads';
let isMeilisearchAvailable = false;
let backgroundHealthCheckStarted = false;
const HEALTH_CHECK_INTERVAL_MS = 60 * 1000;
let healthCheckTimer = null;

// Plan types mapping for OLX-style ranking
const PLAN_PRIORITY_MAP = {
  'enterprise': 4,
  'pro': 3,
  'basic': 2,
  'normal': 1
};

/**
 * Calculate plan priority based on planType
 * Priority: Enterprise (4) > Pro (3) > Basic (2) > Normal (1)
 */
function calculatePlanPriority(ad) {
  const planType = (ad.planType || 'normal').toLowerCase();
  return PLAN_PRIORITY_MAP[planType] || 1;
}

/**
 * Calculate ranking priority for an ad (legacy support)
 * Priority: Premium (3) > Business (2) > Free (1)
 */
function calculateRankingPriority(ad) {
  // If planType exists, use new system
  if (ad.planType) {
    return calculatePlanPriority(ad);
  }
  
  // Legacy: Premium
  if (ad.isPremium === true) {
    return 3;
  }
  
  // Legacy: Business packages
  const BUSINESS_PACKAGE_TYPES = ['SELLER_PRIME', 'SELLER_PLUS', 'MAX_VISIBILITY'];
  if (ad.packageType && BUSINESS_PACKAGE_TYPES.includes(ad.packageType)) {
    return 2;
  }
  
  return 1;
}

// Check if Meilisearch is available (graceful health check)
async function checkMeilisearchConnection() {
  try {
    await client.health();
    isMeilisearchAvailable = true;
    return true;
  } catch (error) {
    isMeilisearchAvailable = false;
    rlLog.warn('meilisearch_unavailable', { err: error.message }, 'Meilisearch not available; search will fallback to database');
    return false;
  }
}

/** Call from server boot; starts background health check and optional reconnect */
function startBackgroundHealthCheck() {
  if (backgroundHealthCheckStarted) return;
  backgroundHealthCheckStarted = true;
  checkMeilisearchConnection().then((ok) => {
    if (ok) logger.info('Meilisearch connected');
    scheduleNextHealthCheck();
  }).catch(() => scheduleNextHealthCheck());
}

function scheduleNextHealthCheck() {
  if (healthCheckTimer) clearTimeout(healthCheckTimer);
  healthCheckTimer = setTimeout(async () => {
    const wasDown = !isMeilisearchAvailable;
    const ok = await checkMeilisearchConnection();
    if (ok) {
      if (wasDown) {
        logger.info('Meilisearch reconnected');
        setImmediate(() => {
          initializeIndex().then((initialized) => {
            if (initialized) logger.info('Meilisearch index ready after reconnect');
          }).catch(() => {});
        });
      }
    }
    scheduleNextHealthCheck();
  }, HEALTH_CHECK_INTERVAL_MS);
}

function getIsMeilisearchAvailable() {
  return isMeilisearchAvailable;
}

// Initialize index with settings (Meilisearch v1 format)
async function initializeIndex() {
  try {
    // Check connection first
    const isConnected = await checkMeilisearchConnection();
    if (!isConnected) {
      return false;
    }

    const index = client.index(INDEX_NAME);
    
    // Configure ALL settings in ONE call (v1 format)
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

      // Sortable attributes
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

    logger.info('Meilisearch index initialized with v1 settings');
    return true;
  } catch (error) {
    rlLog.error('meilisearch_init', { err: error.message }, 'Error initializing Meilisearch index');
    isMeilisearchAvailable = false;
    return false;
  }
}

// Index a single ad
async function indexAd(ad) {
  try {
    if (!isMeilisearchAvailable) {
      return; // Silently skip if Meilisearch is not available
    }
    
    // Only index APPROVED ads - DISABLED, REJECTED, PENDING ads should not appear in search
    if (ad.status !== 'APPROVED') {
      logger.debug({ adId: ad.id, status: ad.status }, 'Skipping indexing (only APPROVED ads indexed)');
      return;
    }

    const index = client.index(INDEX_NAME);
    
    // Build geo-location object if coordinates exist
    const _geo = (ad.latitude && ad.longitude) || (ad.location?.latitude && ad.location?.longitude)
      ? {
          lat: ad.latitude || ad.location?.latitude,
          lng: ad.longitude || ad.location?.longitude,
        }
      : null;

    // Calculate ranking score for optimal sorting
    const rankingScore = calculateRankingScore(ad);

    const document = {
      id: ad.id,
      title: ad.title,
      description: ad.description || '',
      categoryId: ad.categoryId,
      subcategoryId: ad.subcategoryId,
      locationId: ad.locationId,
      category: ad.category?.name || '',
      categoryName: ad.category?.name || '',
      categorySlug: ad.category?.slug || '',
      subcategory: ad.subcategory?.name || '',
      subcategorySlug: ad.subcategory?.slug || '',
      location: ad.location?.name || '',
      city: ad.city || '',
      state: ad.state || '',
      neighbourhood: ad.neighbourhood || '',
      exactLocation: ad.exactLocation || '',
      tags: (ad.tags && Array.isArray(ad.tags)) ? ad.tags.join(' ') : '',
      
      // Geo-location for proximity search
      _geo,
      
      // OLX-style fields
      brand: ad.brand || '',
      model: ad.model || '',
      specifications: ad.specifications ? JSON.stringify(ad.specifications) : '',
      
      // Plan and promotion fields
      planType: ad.planType || 'normal',
      planPriority: getPlanPriority(ad.planType),
      rankingScore,                              // Precomputed ranking score
      isTopAdActive: ad.isTopAdActive || false,
      isFeaturedActive: ad.isFeaturedActive || false,
      isUrgent: ad.isUrgent || false,            // Urgent ad flag
      isBumpActive: ad.isBumpActive || false,
      
      // Timestamps
      createdAt: ad.createdAt?.toISOString() || new Date().toISOString(),
      adExpiryDate: ad.expiresAt?.toISOString() || ad.adExpiryDate?.toISOString() || null,
      
      // Other fields
      price: ad.price,
      condition: ad.condition,
      status: ad.status,
      isPremium: ad.isPremium || false,
      premiumType: ad.premiumType || null,
      packageType: ad.packageType || 'NORMAL',
      rankingPriority: calculateRankingPriority(ad),
      userId: ad.userId,
      images: ad.images || [],
      featuredAt: ad.featuredAt?.toISOString() || null,
      bumpedAt: ad.bumpedAt?.toISOString() || null,
      expiresAt: ad.expiresAt?.toISOString() || null,
      // For home feed card specs (categorySlug + attributes)
      attributes: ad.attributes && typeof ad.attributes === 'object' ? ad.attributes : {},
    };

    await index.addDocuments([document]);
    logger.debug({ adId: ad.id }, 'Indexed ad');
  } catch (error) {
    rlLog.error('meilisearch_index_ad', { adId: ad.id, err: error.message }, 'Error indexing ad');
    isMeilisearchAvailable = false;
  }
}

// Index multiple ads
async function indexAds(ads) {
  try {
    if (!ads || ads.length === 0) return;
    
    if (!isMeilisearchAvailable) {
      return; // Silently skip if Meilisearch is not available
    }
    
    // Filter out non-APPROVED ads - only index APPROVED ads
    const approvedAds = ads.filter(ad => ad.status === 'APPROVED');
    if (approvedAds.length === 0) {
      logger.debug('No APPROVED ads to index');
      return;
    }
    if (approvedAds.length < ads.length) {
      logger.debug({ filtered: ads.length - approvedAds.length }, 'Filtered non-APPROVED ads');
    }
    
    const index = client.index(INDEX_NAME);
    
    const documents = approvedAds.map(ad => {
      // Build geo-location object if coordinates exist
      const _geo = (ad.latitude && ad.longitude) || (ad.location?.latitude && ad.location?.longitude)
        ? {
            lat: ad.latitude || ad.location?.latitude,
            lng: ad.longitude || ad.location?.longitude,
          }
        : null;

      // Calculate ranking score
      const rankingScore = calculateRankingScore(ad);

      return {
        id: ad.id,
        title: ad.title,
        description: ad.description || '',
        categoryId: ad.categoryId,
        subcategoryId: ad.subcategoryId,
        locationId: ad.locationId,
        category: ad.category?.name || '',
        categoryName: ad.category?.name || '',
        categorySlug: ad.category?.slug || '',
        subcategory: ad.subcategory?.name || '',
        subcategorySlug: ad.subcategory?.slug || '',
        location: ad.location?.name || '',
        city: ad.city || '',
        state: ad.state || '',
        neighbourhood: ad.neighbourhood || '',
        exactLocation: ad.exactLocation || '',
        tags: (ad.tags && Array.isArray(ad.tags)) ? ad.tags.join(' ') : '',
        
        // Geo-location for proximity search
        _geo,
        
        // OLX-style fields
        brand: ad.brand || '',
        model: ad.model || '',
        specifications: ad.specifications ? JSON.stringify(ad.specifications) : '',
        
        // Plan and promotion fields
        planType: ad.planType || 'normal',
        planPriority: getPlanPriority(ad.planType),
        rankingScore,
        isTopAdActive: ad.isTopAdActive || false,
        isFeaturedActive: ad.isFeaturedActive || false,
        isUrgent: ad.isUrgent || false,
        isBumpActive: ad.isBumpActive || false,
        
        // Timestamps
        createdAt: ad.createdAt?.toISOString() || new Date().toISOString(),
        adExpiryDate: ad.expiresAt?.toISOString() || ad.adExpiryDate?.toISOString() || null,
        
        // Other fields
        price: ad.price,
        condition: ad.condition,
        status: ad.status,
        isPremium: ad.isPremium || false,
        premiumType: ad.premiumType || null,
        packageType: ad.packageType || 'NORMAL',
        rankingPriority: calculateRankingPriority(ad),
        userId: ad.userId,
        images: ad.images || [],
        featuredAt: ad.featuredAt?.toISOString() || null,
        bumpedAt: ad.bumpedAt?.toISOString() || null,
        expiresAt: ad.expiresAt?.toISOString() || null,
        attributes: ad.attributes && typeof ad.attributes === 'object' ? ad.attributes : {},
      };
    });

    await index.addDocuments(documents);
    logger.info({ count: documents.length }, 'Indexed ads');
  } catch (error) {
    rlLog.error('meilisearch_index_ads', { err: error.message }, 'Error indexing ads');
    isMeilisearchAvailable = false;
  }
}

// Delete an ad from index
async function deleteAd(adId) {
  try {
    if (!isMeilisearchAvailable) {
      return; // Silently skip if Meilisearch is not available
    }

    const index = client.index(INDEX_NAME);
    await index.deleteDocument(adId);
    logger.debug({ adId }, 'Deleted ad from index');
  } catch (error) {
    rlLog.error('meilisearch_delete', { adId, err: error.message }, 'Error deleting ad from index');
    isMeilisearchAvailable = false;
  }
}

// Search ads with keyword-based OR logic. When Meilisearch is offline, throws so caller can fallback to DB.
async function searchAds(query, options = {}) {
  try {
    if (!isMeilisearchAvailable) {
      throw new Error('MEILISEARCH_UNAVAILABLE');
    }

    const {
      page = 1,
      limit = 20,
      categoryId,
      subcategoryId,
      locationId,
      city,
      state,
      minPrice,
      maxPrice,
      condition,
      sort = 'newest',
      status = 'APPROVED',
    } = options;

    const index = client.index(INDEX_NAME);
    
    // Build filter string
    const filters = [];
    
    // Status filter (always filter by status and exclude INACTIVE)
    filters.push(`status = "${status}"`);
    filters.push(`status != "INACTIVE"`);
    
    // Expired ads filter - OLX-style: hide expired ads
    const now = new Date().toISOString();
    filters.push(`(adExpiryDate IS NULL OR adExpiryDate > ${Date.now()})`);
    
    const hasSearchQuery = query && query.trim();

    // Apply category/subcategory/location when provided (search within category/location)
    if (categoryId) {
      filters.push(`categoryId = "${categoryId}"`);
    }
    if (subcategoryId) {
      filters.push(`subcategoryId = "${subcategoryId}"`);
    }
    if (locationId) {
      filters.push(`locationId = "${locationId}"`);
    }
    // When hasSearchQuery is true, locationId filter is NOT applied
    // This ensures location never blocks search results
    
    if (condition) {
      filters.push(`condition = "${condition}"`);
    }
    
    if (minPrice !== undefined) {
      filters.push(`price >= ${minPrice}`);
    }
    
    if (maxPrice !== undefined) {
      filters.push(`price <= ${maxPrice}`);
    }
    
    // Build sort array - OLX-style: Top Ads > Featured > Plan Priority > Recency
    let sortArray = [];
    
    if (!hasSearchQuery) {
      // Home page / category page: Show promoted ads first
      sortArray = [
        'isTopAdActive:desc',
        'isFeaturedActive:desc',
        'planPriority:desc',
        'createdAt:desc'
      ];
    } else {
      // Search results: Relevance + promotions
      switch (sort) {
        case 'oldest':
          sortArray = ['isTopAdActive:desc', 'isFeaturedActive:desc', 'planPriority:desc', 'createdAt:asc'];
          break;
        case 'price_low':
          sortArray = ['isTopAdActive:desc', 'isFeaturedActive:desc', 'planPriority:desc', 'price:asc', 'createdAt:desc'];
          break;
        case 'price_high':
          sortArray = ['isTopAdActive:desc', 'isFeaturedActive:desc', 'planPriority:desc', 'price:desc', 'createdAt:desc'];
          break;
        case 'featured':
          sortArray = ['isTopAdActive:desc', 'isFeaturedActive:desc', 'planPriority:desc', 'createdAt:desc'];
          break;
        case 'bumped':
          sortArray = ['isTopAdActive:desc', 'isFeaturedActive:desc', 'planPriority:desc', 'isBumpActive:desc', 'createdAt:desc'];
          break;
        default:
          // Default 'newest': Top > Featured > Plan > Newest
          sortArray = ['isTopAdActive:desc', 'isFeaturedActive:desc', 'planPriority:desc', 'createdAt:desc'];
      }
    }
    
    // For search queries, prepend rankingPriority to existing sort as tiebreaker after relevance
    // Note: Meilisearch will apply relevance first (via ranking rules), then sort for tiebreaking
    // However, when sort is provided, it can override relevance. For search queries, we want relevance + priority tiebreaker.
    // Meilisearch 'sort' ranking rule handles this - it applies sort after relevance.
    
    // KEYWORD-BASED OR SEARCH: Split query into keywords
    // Meilisearch by default uses OR logic for multiple words
    // Each keyword will match against: title, description, category, location, tags
    // Fuzzy matching is enabled via typo tolerance
    let searchQuery = query || '';
    if (hasSearchQuery) {
      // Split into keywords and ensure OR logic
      // Meilisearch treats space-separated words as OR by default
      // But we can make it explicit by using quotes for exact phrases
      const keywords = query.trim().split(/\s+/).filter(k => k.length > 0);
      logger.debug({ keywordCount: keywords.length }, 'Search keywords');
      
      // Meilisearch will automatically match each keyword against all searchable attributes
      // with OR logic (any keyword matching returns the ad)
      // Fuzzy matching is handled by typo tolerance settings
      searchQuery = query.trim();
    }
    
    const searchParams = {
      q: searchQuery,
      filter: filters.length > 0 ? filters.join(' AND ') : undefined,
      sort: sortArray,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      // Enable fuzzy matching (typo tolerance is configured at index level)
      // Meilisearch will match keywords against: title, description, category, location, tags
      // with OR logic (any keyword matching returns the ad)
    };
    
    const results = await index.search(searchQuery, searchParams);
    logger.debug({ query: searchQuery, total: results.estimatedTotalHits || 0 }, 'Search results');
    return {
      hits: results.hits || [],
      total: results.estimatedTotalHits || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil((results.estimatedTotalHits || 0) / parseInt(limit)),
    };
  } catch (error) {
    if (error.message !== 'MEILISEARCH_UNAVAILABLE') {
      rlLog.error('meilisearch_search', { err: error.message, query }, 'Error searching ads');
      isMeilisearchAvailable = false;
    }
    throw error;
  }
}

// Autocomplete search (for search suggestions). When Meilisearch is offline, returns [] (no log spam).
async function autocomplete(query, limit = 5) {
  try {
    if (!query || query.trim().length < 2) return [];
    if (!isMeilisearchAvailable) return [];

    const index = client.index(INDEX_NAME);
    
    // Search with minimal results for autocomplete
    const results = await index.search(query.trim(), {
      limit: limit,
      attributesToRetrieve: ['id', 'title', 'category', 'subcategory', 'location'],
      filter: 'status = "APPROVED" AND status != "INACTIVE"', // Exclude INACTIVE ads
    });

    // Extract unique suggestions from results
    const suggestions = [];
    const seenTitles = new Set();
    
    if (results && results.hits) {
      results.hits.forEach(hit => {
        if (hit.title && !seenTitles.has(hit.title.toLowerCase())) {
          suggestions.push({
            title: hit.title,
            category: hit.category || '',
            subcategory: hit.subcategory || '',
            location: hit.location || '',
          });
          seenTitles.add(hit.title.toLowerCase());
        }
      });
    }

    return suggestions.slice(0, limit);
  } catch (error) {
    rlLog.error('meilisearch_autocomplete', { err: error.message }, 'Error in autocomplete');
    isMeilisearchAvailable = false;
    return [];
  }
}

// Reindex all ads (for initial setup or full reindex)
async function reindexAllAds(prisma) {
  try {
    logger.info('Starting full reindex of all ads');
    
    const batchSize = 100;
    let skip = 0;
    let hasMore = true;
    let totalIndexed = 0;
    
    while (hasMore) {
      const ads = await prisma.ad.findMany({
        where: {
          // Only show APPROVED ads (excludes INACTIVE)
          status: 'APPROVED'
        },
        include: {
          category: { select: { id: true, name: true } },
          subcategory: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
        },
        skip,
        take: batchSize,
      });
      
      if (ads.length === 0) {
        hasMore = false;
        break;
      }
      
      await indexAds(ads);
      totalIndexed += ads.length;
      skip += batchSize;
      
      logger.info({ totalIndexed }, 'Reindex progress');
    }
    logger.info({ totalIndexed }, 'Full reindex complete');
    return totalIndexed;
  } catch (error) {
    rlLog.error('meilisearch_reindex', { err: error.message }, 'Error during full reindex');
    throw error;
  }
}

/**
 * Bump up an ad - updates createdAt and re-indexes
 * @param {string} adId - The ad ID to bump
 * @param {object} prisma - Prisma client instance
 */
async function bumpAd(adId, prisma) {
  try {
    if (!isMeilisearchAvailable) {
      logger.warn('Meilisearch unavailable, skipping bump reindex');
      return false;
    }

    // Update ad in database with new createdAt
    const updatedAd = await prisma.ad.update({
      where: { id: adId },
      data: {
        createdAt: new Date(),
        isBumpActive: true,
        bumpedAt: new Date(),
      },
      include: {
        category: { select: { id: true, name: true } },
        subcategory: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    });

    // Re-index the ad
    await indexAd(updatedAd);
    
    logger.info({ adId }, 'Ad bumped and re-indexed');
    return true;
  } catch (error) {
    rlLog.error('meilisearch_bump', { adId, err: error.message }, 'Error bumping ad');
    return false;
  }
}

/**
 * Sync ad to Meilisearch (for create, update, plan purchase, bump, expiry)
 * @param {object} ad - The ad object to sync
 */
async function syncAdToMeilisearch(ad) {
  try {
    if (!isMeilisearchAvailable) {
      logger.debug('Meilisearch unavailable, skipping sync');
      return false;
    }

    // If ad is not approved, delete from index
    if (ad.status !== 'APPROVED') {
      await deleteAd(ad.id);
      return true;
    }

    // Index or update the ad
    await indexAd(ad);
    return true;
  } catch (error) {
    rlLog.error('meilisearch_sync', { adId: ad.id, err: error.message }, 'Error syncing ad');
    return false;
  }
}

/**
 * Get search suggestions for autocomplete
 * @param {string} query - Search query
 * @param {number} limit - Number of suggestions
 */
async function getSearchSuggestions(query, limit = 8) {
  try {
    if (!query || query.trim().length < 2) return [];
    if (!isMeilisearchAvailable) return [];

    const index = client.index(INDEX_NAME);
    
    const now = new Date().toISOString();
    const results = await index.search(query.trim(), {
      limit: limit,
      attributesToRetrieve: ['id', 'title', 'category', 'categoryName', 'city', 'price', 'images'],
      filter: `status = "APPROVED" AND status != "INACTIVE" AND (adExpiryDate IS NULL OR adExpiryDate > ${Date.now()})`,
      sort: ['isTopAdActive:desc', 'isFeaturedActive:desc', 'planPriority:desc', 'createdAt:desc'],
    });

    return results.hits || [];
  } catch (error) {
    rlLog.error('meilisearch_suggestions', { err: error.message }, 'Error getting suggestions');
    return [];
  }
}

/**
 * Get home feed ads with geo-location support (OLX-style)
 * @param {object} options - Search options
 * @returns {Promise<object>} - Categorized results
 */
async function getHomeFeedWithGeo(options = {}) {
  try {
    if (!isMeilisearchAvailable) {
      throw new Error('MEILISEARCH_UNAVAILABLE');
    }

    const {
      userLat,
      userLng,
      city,
      limit = 20,
      radiusInMeters = 50000, // 50km default
    } = options;

    const index = client.index(INDEX_NAME);
    const now = new Date().toISOString();
    
    // Base filters
    const baseFilters = [
      'status = "APPROVED"',
      'status != "INACTIVE"',
      `(adExpiryDate IS NULL OR adExpiryDate > ${Date.now()})`,
    ];

    const results = {
      nearYou: [],
      moreInYourCity: [],
      topAds: [],
      featured: [],
      latest: [],
    };

    // If user location is available
    if (userLat && userLng) {
      // 1. Near you (within radius, sorted by distance)
      const nearResults = await index.search('', {
        filter: baseFilters.join(' AND '),
        sort: [
          '_geoDistance(lat, lng):asc',
          'isTopAdActive:desc',
          'isFeaturedActive:desc',
          'planPriority:desc',
          'createdAt:desc',
        ],
        limit,
        _geoRadius: {
          lat: userLat,
          lng: userLng,
          radiusInMeters,
        },
      });
      results.nearYou = nearResults.hits || [];

      // 2. More in your city (same city, not in near you)
      if (city) {
        const cityResults = await index.search('', {
          filter: [...baseFilters, `city = "${city}"`].join(' AND '),
          sort: [
            'isTopAdActive:desc',
            'isFeaturedActive:desc',
            'planPriority:desc',
            'createdAt:desc',
          ],
          limit,
        });
        
        // Filter out ads already in nearYou
        const nearYouIds = new Set(results.nearYou.map(ad => ad.id));
        results.moreInYourCity = (cityResults.hits || []).filter(ad => !nearYouIds.has(ad.id));
      }
    }

    // 3. Top Ads (promoted ads)
    const topResults = await index.search('', {
      filter: [...baseFilters, 'isTopAdActive = true'].join(' AND '),
      sort: ['planPriority:desc', 'createdAt:desc'],
      limit: 10,
    });
    results.topAds = topResults.hits || [];

    // 4. Featured Ads
    const featuredResults = await index.search('', {
      filter: [...baseFilters, 'isFeaturedActive = true'].join(' AND '),
      sort: ['planPriority:desc', 'createdAt:desc'],
      limit: 10,
    });
    results.featured = featuredResults.hits || [];

    // 5. Latest Ads
    const latestResults = await index.search('', {
      filter: baseFilters.join(' AND '),
      sort: ['createdAt:desc'],
      limit,
    });
    results.latest = latestResults.hits || [];

    return results;
  } catch (error) {
    rlLog.error('meilisearch_home_feed', { err: error.message }, 'Error getting home feed');
    throw error;
  }
}

module.exports = {
  client,
  initializeIndex,
  checkMeilisearchConnection,
  startBackgroundHealthCheck,
  getIsMeilisearchAvailable,
  indexAd,
  indexAds,
  deleteAd,
  searchAds,
  autocomplete,
  reindexAllAds,
  bumpAd,
  syncAdToMeilisearch,
  getSearchSuggestions,
  getHomeFeedWithGeo,
};

