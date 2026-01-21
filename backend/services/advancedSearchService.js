/**
 * Advanced Search Service
 * 
 * Implements multi-parameter search with:
 * - Keyword matching (with synonyms and fuzzy matching)
 * - Location hierarchy: Neighborhood → City → District → State
 * - Category & Meta Category mapping
 * - Pincode support (optional)
 */

const { PrismaClient } = require('@prisma/client');
const { searchAds } = require('./meilisearch');
const prisma = new PrismaClient();

// Keyword synonyms for better matching
const KEYWORD_SYNONYMS = {
  'mobile': ['phone', 'smartphone', 'cell phone', 'android', 'iphone'],
  'car': ['automobile', 'vehicle', 'auto'],
  'bike': ['bicycle', 'motorcycle', 'two-wheeler'],
  'laptop': ['notebook', 'computer'],
  'house': ['home', 'property', 'residence'],
  'apartment': ['flat', 'unit'],
};

/**
 * Normalize keyword and expand with synonyms
 */
function expandKeywords(keyword) {
  if (!keyword || typeof keyword !== 'string') return [];
  
  const normalized = keyword.toLowerCase().trim();
  const keywords = [normalized];
  
  // Add synonyms if available
  if (KEYWORD_SYNONYMS[normalized]) {
    keywords.push(...KEYWORD_SYNONYMS[normalized]);
  }
  
  // Also check reverse mapping
  for (const [key, synonyms] of Object.entries(KEYWORD_SYNONYMS)) {
    if (synonyms.includes(normalized)) {
      keywords.push(key);
      keywords.push(...synonyms);
    }
  }
  
  // Remove duplicates
  return [...new Set(keywords)];
}

/**
 * Extract location components from query or parameters
 */
async function extractLocationComponents(params) {
  const {
    place,
    district,
    city,
    neighbourhood,
    pincode,
    state
  } = params;
  
  const location = {
    neighbourhood: neighbourhood || null,
    city: city || null,
    district: district || null,
    state: state || null,
    pincode: pincode || null,
  };
  
  // If place is provided, try to resolve it to location components
  if (place && !city && !neighbourhood) {
    try {
      const locationRecord = await prisma.location.findFirst({
        where: {
          OR: [
            { name: { contains: place, mode: 'insensitive' } },
            { slug: { contains: place, mode: 'insensitive' } },
            { city: { contains: place, mode: 'insensitive' } },
            { neighbourhood: { contains: place, mode: 'insensitive' } }
          ],
          isActive: true
        },
        select: {
          city: true,
          state: true,
          neighbourhood: true,
          pincode: true
        }
      });
      
      if (locationRecord) {
        location.city = location.city || locationRecord.city;
        location.state = location.state || locationRecord.state;
        location.neighbourhood = location.neighbourhood || locationRecord.neighbourhood;
        location.pincode = location.pincode || locationRecord.pincode;
      }
    } catch (error) {
      console.error('Error resolving place:', error);
    }
  }
  
  return location;
}

/**
 * Build location hierarchy filter for Prisma
 */
function buildLocationHierarchyFilter(location) {
  const filters = [];
  
  // Priority: Neighborhood → City → District → State
  if (location.neighbourhood) {
    filters.push({ neighbourhood: { contains: location.neighbourhood, mode: 'insensitive' } });
  }
  
  if (location.city) {
    filters.push({ city: { contains: location.city, mode: 'insensitive' } });
  }
  
  if (location.district) {
    // District is often same as city, but can be different
    filters.push({ city: { contains: location.district, mode: 'insensitive' } });
  }
  
  if (location.state) {
    filters.push({ state: { contains: location.state, mode: 'insensitive' } });
  }
  
  if (location.pincode) {
    // Try to find location by pincode first
    filters.push({ 
      OR: [
        { neighbourhood: { contains: location.pincode, mode: 'insensitive' } },
        { city: { contains: location.pincode, mode: 'insensitive' } }
      ]
    });
  }
  
  return filters.length > 0 ? { OR: filters } : null;
}

/**
 * Advanced multi-parameter search
 */
async function advancedSearch(params) {
  try {
    const {
      keyword = '',
      category,
      subcategory,
      place,
      district,
      city,
      neighbourhood,
      pincode,
      state,
      minPrice,
      maxPrice,
      condition,
      sort = 'newest',
      page = 1,
      limit = 20,
    } = params;
    
    // Step 1: Expand keywords with synonyms
    const expandedKeywords = expandKeywords(keyword);
    const searchQuery = expandedKeywords.join(' ') || keyword;
    
    // Step 2: Extract location components
    const locationComponents = await extractLocationComponents({
      place,
      district,
      city,
      neighbourhood,
      pincode,
      state
    });
    
    // Step 3: Resolve category if provided
    let categoryObj = null;
    let subcategoryObj = null;
    
    if (category) {
      categoryObj = await prisma.category.findUnique({
        where: { slug: category },
        select: { id: true, name: true, slug: true }
      });
    }
    
    if (subcategory && categoryObj) {
      subcategoryObj = await prisma.subcategory.findFirst({
        where: {
          slug: subcategory,
          categoryId: categoryObj.id
        },
        select: { id: true, name: true, slug: true }
      });
    }
    
    // Step 4: Use Meilisearch for initial keyword matching
    const meilisearchResults = await searchAds(searchQuery, {
      page: 1,
      limit: 500, // Fetch more to allow location filtering
      categoryId: categoryObj?.id,
      subcategoryId: subcategoryObj?.id,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      condition,
      sort,
      status: 'APPROVED',
    });
    
    const allAdIds = meilisearchResults.hits.map(hit => hit.id);
    
    if (allAdIds.length === 0) {
      return {
        ads: [],
        total: 0,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: 0
      };
    }
    
    // Step 5: Apply location hierarchy filtering
    const now = new Date();
    
    let ads = [];
    
    // Priority 1: Neighborhood match
    if (locationComponents.neighbourhood) {
      const neighbourhoodAds = await prisma.ad.findMany({
        where: {
          id: { in: allAdIds },
          status: 'APPROVED',
          neighbourhood: { contains: locationComponents.neighbourhood, mode: 'insensitive' },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } }
          ]
        },
        take: 100
      });
      
      if (neighbourhoodAds.length > 0) {
        ads = neighbourhoodAds;
        console.log(`📍 Advanced Search: Found ${neighbourhoodAds.length} ads in neighbourhood: ${locationComponents.neighbourhood}`);
      }
    }
    
    // Priority 2: City match (if neighbourhood results low)
    if (ads.length < 10 && locationComponents.city) {
      const cityAdIds = new Set(ads.map(ad => ad.id));
      const cityAds = await prisma.ad.findMany({
        where: {
          id: { in: allAdIds.filter(id => !cityAdIds.has(id)) },
          status: 'APPROVED',
          city: { contains: locationComponents.city, mode: 'insensitive' },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } }
          ]
        },
        take: 100
      });
      
      if (cityAds.length > 0) {
        ads = [...ads, ...cityAds];
        console.log(`📍 Advanced Search: Found ${cityAds.length} additional ads in city: ${locationComponents.city}`);
      }
    }
    
    // Priority 3: State match (if city results low)
    if (ads.length < 10 && locationComponents.state) {
      const existingAdIds = new Set(ads.map(ad => ad.id));
      const stateAds = await prisma.ad.findMany({
        where: {
          id: { in: allAdIds.filter(id => !existingAdIds.has(id)) },
          status: 'APPROVED',
          state: { contains: locationComponents.state, mode: 'insensitive' },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } }
          ]
        },
        take: 50
      });
      
      if (stateAds.length > 0) {
        ads = [...ads, ...stateAds];
        console.log(`📍 Advanced Search: Found ${stateAds.length} additional ads in state: ${locationComponents.state}`);
      }
    }
    
    // If no location-based results, use all search results
    if (ads.length === 0) {
      ads = await prisma.ad.findMany({
        where: {
          id: { in: allAdIds.slice(0, 100) },
          status: 'APPROVED',
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } }
          ]
        },
        take: 100
      });
    }
    
    // Step 6: Select required fields for response
    const adSelectFields = {
      id: true,
      title: true,
      description: true,
      price: true,
      originalPrice: true,
      discount: true,
      condition: true,
      images: true,
      status: true,
      isPremium: true,
      premiumType: true,
      isUrgent: true,
      views: true,
      expiresAt: true,
      createdAt: true,
      postedAt: true,
      packageType: true,
      lastShownAt: true,
      userId: true,
      city: true,
      state: true,
      neighbourhood: true,
      slug: true,
      category: { select: { id: true, name: true, slug: true } },
      subcategory: { select: { id: true, name: true, slug: true } },
      location: { select: { id: true, name: true, slug: true, latitude: true, longitude: true, city: true, state: true } },
      user: { select: { id: true, name: true, avatar: true } }
    };
    
    // Fetch full ad details
    const adIds = ads.map(ad => ad.id);
    const fullAds = await prisma.ad.findMany({
      where: { id: { in: adIds } },
      select: adSelectFields
    });
    
    // Maintain order from location hierarchy
    const adsMap = new Map(fullAds.map(ad => [ad.id, ad]));
    const orderedAds = adIds.map(id => adsMap.get(id)).filter(Boolean);
    
    return {
      ads: orderedAds,
      total: orderedAds.length,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(orderedAds.length / parseInt(limit))
    };
    
  } catch (error) {
    console.error('Advanced search error:', error);
    throw error;
  }
}

module.exports = {
  advancedSearch,
  expandKeywords,
  extractLocationComponents,
  buildLocationHierarchyFilter
};
