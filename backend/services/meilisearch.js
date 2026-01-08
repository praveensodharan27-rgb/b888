const { MeiliSearch } = require('meilisearch');

// Initialize Meilisearch client
const client = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_MASTER_KEY || 'masterKey',
});

const INDEX_NAME = 'ads';
let isMeilisearchAvailable = false;

// Check if Meilisearch is available
async function checkMeilisearchConnection() {
  try {
    await client.health();
    isMeilisearchAvailable = true;
    console.log('✅ Meilisearch connection successful');
    return true;
  } catch (error) {
    isMeilisearchAvailable = false;
    console.warn('⚠️ Meilisearch not available:', error.message);
    console.warn('⚠️ Search will fallback to database queries');
    return false;
  }
}

// Initialize index with settings
async function initializeIndex() {
  try {
    // Check connection first
    const isConnected = await checkMeilisearchConnection();
    if (!isConnected) {
      return false;
    }

    const index = client.index(INDEX_NAME);
    
    // Configure searchable attributes
    await index.updateSearchableAttributes([
      'title',
      'description',
      'category',
      'subcategory',
      'location',
      'condition',
    ]);

    // Configure filterable attributes
    await index.updateFilterableAttributes([
      'categoryId',
      'subcategoryId',
      'locationId',
      'status',
      'condition',
      'price',
      'isPremium',
      'userId',
      'createdAt',
    ]);

    // Configure sortable attributes
    await index.updateSortableAttributes([
      'createdAt',
      'price',
      'featuredAt',
      'bumpedAt',
    ]);

    // Configure ranking rules (premium ads first, then by relevance)
    await index.updateRankingRules([
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness',
    ]);

    console.log('✅ Meilisearch index initialized');
    return true;
  } catch (error) {
    console.error('❌ Error initializing Meilisearch index:', error.message);
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

    const index = client.index(INDEX_NAME);
    
    const document = {
      id: ad.id,
      title: ad.title,
      description: ad.description || '',
      categoryId: ad.categoryId,
      subcategoryId: ad.subcategoryId,
      locationId: ad.locationId,
      category: ad.category?.name || '',
      subcategory: ad.subcategory?.name || '',
      location: ad.location?.name || '',
      price: ad.price,
      condition: ad.condition,
      status: ad.status,
      isPremium: ad.isPremium || false,
      premiumType: ad.premiumType || null,
      userId: ad.userId,
      images: ad.images || [],
      createdAt: ad.createdAt?.toISOString() || new Date().toISOString(),
      featuredAt: ad.featuredAt?.toISOString() || null,
      bumpedAt: ad.bumpedAt?.toISOString() || null,
      expiresAt: ad.expiresAt?.toISOString() || null,
    };

    await index.addDocuments([document]);
    console.log(`✅ Indexed ad: ${ad.id}`);
  } catch (error) {
    console.error(`❌ Error indexing ad ${ad.id}:`, error.message);
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
    
    const index = client.index(INDEX_NAME);
    
    const documents = ads.map(ad => ({
      id: ad.id,
      title: ad.title,
      description: ad.description || '',
      categoryId: ad.categoryId,
      subcategoryId: ad.subcategoryId,
      locationId: ad.locationId,
      category: ad.category?.name || '',
      subcategory: ad.subcategory?.name || '',
      location: ad.location?.name || '',
      price: ad.price,
      condition: ad.condition,
      status: ad.status,
      isPremium: ad.isPremium || false,
      premiumType: ad.premiumType || null,
      userId: ad.userId,
      images: ad.images || [],
      createdAt: ad.createdAt?.toISOString() || new Date().toISOString(),
      featuredAt: ad.featuredAt?.toISOString() || null,
      bumpedAt: ad.bumpedAt?.toISOString() || null,
      expiresAt: ad.expiresAt?.toISOString() || null,
    }));

    await index.addDocuments(documents);
    console.log(`✅ Indexed ${documents.length} ads`);
  } catch (error) {
    console.error('❌ Error indexing ads:', error.message);
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
    console.log(`✅ Deleted ad from index: ${adId}`);
  } catch (error) {
    console.error(`❌ Error deleting ad ${adId} from index:`, error.message);
    isMeilisearchAvailable = false;
  }
}

// Search ads
async function searchAds(query, options = {}) {
  try {
    const {
      page = 1,
      limit = 20,
      categoryId,
      subcategoryId,
      locationId,
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
    filters.push(`status != "INACTIVE"`); // Explicitly exclude INACTIVE ads
    
    // Expired ads filter
    const now = new Date().toISOString();
    filters.push(`expiresAt = null OR expiresAt > "${now}"`);
    
    // IMPORTANT: If search query exists, ignore category/subcategory filters (search overrides category)
    const hasSearchQuery = query && query.trim();
    
    if (!hasSearchQuery && categoryId) {
      filters.push(`categoryId = "${categoryId}"`);
    }
    
    if (!hasSearchQuery && subcategoryId) {
      filters.push(`subcategoryId = "${subcategoryId}"`);
    }
    
    if (locationId) {
      filters.push(`locationId = "${locationId}"`);
    }
    
    if (condition) {
      filters.push(`condition = "${condition}"`);
    }
    
    if (minPrice !== undefined) {
      filters.push(`price >= ${minPrice}`);
    }
    
    if (maxPrice !== undefined) {
      filters.push(`price <= ${maxPrice}`);
    }
    
    // Build sort array
    let sortArray = [];
    switch (sort) {
      case 'oldest':
        sortArray = ['createdAt:asc'];
        break;
      case 'price_low':
        sortArray = ['price:asc', 'createdAt:desc'];
        break;
      case 'price_high':
        sortArray = ['price:desc', 'createdAt:desc'];
        break;
      case 'featured':
        sortArray = ['featuredAt:desc', 'createdAt:desc'];
        break;
      case 'bumped':
        sortArray = ['bumpedAt:desc', 'createdAt:desc'];
        break;
      default:
        sortArray = ['createdAt:desc'];
    }
    
    // Premium ads should appear first, so we'll handle that in post-processing
    // For now, we'll use a custom ranking
    
    const searchParams = {
      q: query || '',
      filter: filters.length > 0 ? filters.join(' AND ') : undefined,
      sort: sortArray,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    };
    
    const results = await index.search(query || '', searchParams);
    
    return {
      hits: results.hits || [],
      total: results.estimatedTotalHits || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil((results.estimatedTotalHits || 0) / parseInt(limit)),
    };
  } catch (error) {
    console.error('❌ Error searching ads:', error);
    throw error;
  }
}

// Autocomplete search (for search suggestions)
async function autocomplete(query, limit = 5) {
  try {
    if (!query || query.trim().length < 2) {
      return [];
    }

    // Check if Meilisearch is available
    if (!isMeilisearchAvailable) {
      // Try to reconnect
      try {
        const isConnected = await checkMeilisearchConnection();
        if (!isConnected) {
          return [];
        }
      } catch (connectionError) {
        console.warn('⚠️ Meilisearch connection failed in autocomplete:', connectionError.message);
        return [];
      }
    }

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
    console.error('❌ Error in autocomplete:', error.message);
    // Mark Meilisearch as unavailable
    isMeilisearchAvailable = false;
    // Return empty array instead of throwing
    return [];
  }
}

// Reindex all ads (for initial setup or full reindex)
async function reindexAllAds(prisma) {
  try {
    console.log('🔄 Starting full reindex of all ads...');
    
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
      
      console.log(`📊 Progress: ${totalIndexed} ads indexed...`);
    }
    
    console.log(`✅ Full reindex complete: ${totalIndexed} ads indexed`);
    return totalIndexed;
  } catch (error) {
    console.error('❌ Error during full reindex:', error);
    throw error;
  }
}

module.exports = {
  client,
  initializeIndex,
  checkMeilisearchConnection,
  indexAd,
  indexAds,
  deleteAd,
  searchAds,
  autocomplete,
  reindexAllAds,
};

