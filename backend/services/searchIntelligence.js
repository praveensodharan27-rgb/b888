/**
 * Indian Search Intelligence & Query Parser
 * Handles Indian-style search queries with spelling mistakes, mixed language, and intent detection
 */

const prisma = require('../prisma/client');

// Indian city/state names (common variations and spellings)
const INDIAN_LOCATIONS = {
  states: [
    'kerala', 'tamil nadu', 'karnataka', 'andhra pradesh', 'telangana',
    'maharashtra', 'gujarat', 'rajasthan', 'punjab', 'haryana',
    'delhi', 'west bengal', 'odisha', 'bihar', 'uttar pradesh',
    'madhya pradesh', 'himachal pradesh', 'uttarakhand', 'assam',
    'jammu and kashmir', 'j&k', 'jk'
  ],
  cities: [
    'kochi', 'cochin', 'trivandrum', 'thiruvananthapuram', 'calicut', 'kozhikode',
    'bangalore', 'bengaluru', 'mumbai', 'bombay', 'delhi', 'new delhi',
    'chennai', 'madras', 'hyderabad', 'pune', 'ahmedabad', 'surat',
    'jaipur', 'lucknow', 'kanpur', 'nagpur', 'indore', 'thane',
    'bhopal', 'visakhapatnam', 'patna', 'vadodara', 'ghaziabad',
    'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut', 'rajkot',
    'varanasi', 'srinagar', 'amritsar', 'raipur', 'allahabad', 'howrah',
    'coimbatore', 'jabalpur', 'gwalior', 'vijayawada', 'jodhpur', 'madurai'
  ]
};

// Price intent keywords (English + common Indian variations)
const PRICE_INTENT_KEYWORDS = {
  under: ['under', 'below', 'upto', 'up to', 'max', 'maximum', 'less than', 'within'],
  cheap: ['cheap', 'affordable', 'budget', 'low price', 'low cost', 'economical', 'sasta', 'saste'],
  range: ['between', 'from', 'to', 'range'],
  lakh: ['lakh', 'lac', 'l', 'lacs', 'lakhs'],
  crore: ['crore', 'cr', 'crores'],
  thousand: ['thousand', 'k', 'thou']
};

// Common spelling variations and corrections
const SPELLING_CORRECTIONS = {
  'mobail': 'mobile',
  'mobyle': 'mobile',
  'moblie': 'mobile',
  'mobiel': 'mobile',
  'bike': 'bike',
  'byke': 'bike',
  'bicycle': 'bicycle',
  'car': 'car',
  'kar': 'car',
  'second hand': 'second hand',
  'secondhand': 'second hand',
  'second-hand': 'second hand',
  'used': 'used',
  'pre owned': 'pre owned',
  'preowned': 'pre owned',
  'pre-owned': 'pre owned',
  'near me': 'near me',
  'nearme': 'near me',
  'nearby': 'near me'
};

/**
 * Parse Indian search query and extract intent
 * @param {string} query - Raw search query
 * @returns {Object} Parsed query with intent, category, location, price, etc.
 */
function parseIndianQuery(query) {
  if (!query || typeof query !== 'string') {
    return {
      originalQuery: query || '',
      normalizedQuery: '',
      category: null,
      location: null,
      priceIntent: null,
      minPrice: null,
      maxPrice: null,
      condition: null,
      intent: 'buy',
      keywords: []
    };
  }

  const originalQuery = query.trim().toLowerCase();
  let normalizedQuery = originalQuery;

  // Step 1: Fix common spelling mistakes
  Object.keys(SPELLING_CORRECTIONS).forEach(wrong => {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    normalizedQuery = normalizedQuery.replace(regex, SPELLING_CORRECTIONS[wrong]);
  });

  // Step 2: Extract price intent
  const priceIntent = extractPriceIntent(normalizedQuery);
  
  // Step 3: Extract location
  const location = extractLocation(normalizedQuery);
  
  // Step 4: Extract condition (new, used, second hand)
  const condition = extractCondition(normalizedQuery);
  
  // Step 5: Extract category/product keywords
  const categoryKeywords = extractCategoryKeywords(normalizedQuery);
  
  // Step 6: Determine user intent
  const intent = determineIntent(normalizedQuery);

  return {
    originalQuery,
    normalizedQuery,
    category: categoryKeywords.category,
    categoryKeywords: categoryKeywords.keywords,
    location: location.location,
    state: location.state,
    city: location.city,
    priceIntent: priceIntent.type,
    minPrice: priceIntent.minPrice,
    maxPrice: priceIntent.maxPrice,
    condition,
    intent,
    keywords: extractKeywords(normalizedQuery)
  };
}

/**
 * Extract price intent from query
 */
function extractPriceIntent(query) {
  const result = {
    type: null,
    minPrice: null,
    maxPrice: null
  };

  // Check for "under X" or "below X"
  for (const keyword of PRICE_INTENT_KEYWORDS.under) {
    const regex = new RegExp(`\\b${keyword}\\s+(\\d+(?:\\.\\d+)?)\\s*(lakh|lac|l|crore|cr|thousand|k)?`, 'i');
    const match = query.match(regex);
    if (match) {
      result.type = 'under';
      let amount = parseFloat(match[1]);
      const unit = match[2] ? match[2].toLowerCase() : '';
      
      // Convert to rupees
      if (unit === 'lakh' || unit === 'lac' || unit === 'l') {
        amount = amount * 100000;
      } else if (unit === 'crore' || unit === 'cr') {
        amount = amount * 10000000;
      } else if (unit === 'thousand' || unit === 'k') {
        amount = amount * 1000;
      }
      
      result.maxPrice = amount;
      return result;
    }
  }

  // Check for "cheap" or "affordable"
  for (const keyword of PRICE_INTENT_KEYWORDS.cheap) {
    if (query.includes(keyword)) {
      result.type = 'cheap';
      // Set a reasonable max price based on category (can be enhanced)
      result.maxPrice = 50000; // Default affordable price
      return result;
    }
  }

  // Check for price range "between X and Y" or "X to Y"
  const rangeRegex = /(?:between|from)\s+(\d+(?:\.\d+)?)\s*(?:lakh|lac|l|crore|cr|thousand|k)?\s*(?:and|to)\s+(\d+(?:\.\d+)?)\s*(?:lakh|lac|l|crore|cr|thousand|k)?/i;
  const rangeMatch = query.match(rangeRegex);
  if (rangeMatch) {
    result.type = 'range';
    let min = parseFloat(rangeMatch[1]);
    let max = parseFloat(rangeMatch[2]);
    
    // Check for units in the match
    const fullMatch = query.substring(query.indexOf(rangeMatch[0]));
    if (fullMatch.includes('lakh') || fullMatch.includes('lac') || fullMatch.includes(' lakh') || fullMatch.includes(' lac')) {
      min = min * 100000;
      max = max * 100000;
    } else if (fullMatch.includes('crore') || fullMatch.includes('cr')) {
      min = min * 10000000;
      max = max * 10000000;
    } else if (fullMatch.includes('thousand') || fullMatch.includes('k')) {
      min = min * 1000;
      max = max * 1000;
    }
    
    result.minPrice = min;
    result.maxPrice = max;
    return result;
  }

  return result;
}

/**
 * Extract location from query
 */
function extractLocation(query) {
  const result = {
    location: null,
    state: null,
    city: null,
    isNearMe: false
  };

  // Check for "near me"
  if (query.includes('near me') || query.includes('nearby')) {
    result.isNearMe = true;
    result.location = 'near me';
    return result;
  }

  // Check for cities
  for (const city of INDIAN_LOCATIONS.cities) {
    if (query.includes(city)) {
      result.city = city;
      result.location = city;
      return result;
    }
  }

  // Check for states
  for (const state of INDIAN_LOCATIONS.states) {
    if (query.includes(state)) {
      result.state = state;
      result.location = state;
      return result;
    }
  }

  // Check for "in [location]" pattern
  const inLocationRegex = /\bin\s+([a-z\s]+?)(?:\s|$)/i;
  const inMatch = query.match(inLocationRegex);
  if (inMatch) {
    const locationStr = inMatch[1].trim();
    // Check if it matches any known location
    for (const city of INDIAN_LOCATIONS.cities) {
      if (locationStr.includes(city) || city.includes(locationStr)) {
        result.city = city;
        result.location = city;
        return result;
      }
    }
    for (const state of INDIAN_LOCATIONS.states) {
      if (locationStr.includes(state) || state.includes(locationStr)) {
        result.state = state;
        result.location = state;
        return result;
      }
    }
  }

  return result;
}

/**
 * Extract condition from query
 */
function extractCondition(query) {
  if (query.includes('new') && !query.includes('second hand') && !query.includes('used')) {
    return 'NEW';
  }
  if (query.includes('second hand') || query.includes('used') || query.includes('pre owned')) {
    return 'USED';
  }
  if (query.includes('like new') || query.includes('like-new')) {
    return 'LIKE_NEW';
  }
  if (query.includes('refurbished') || query.includes('refurb')) {
    return 'REFURBISHED';
  }
  return null;
}

/**
 * Extract category/product keywords
 */
function extractCategoryKeywords(query) {
  const categoryMap = {
    'car': ['car', 'cars', 'automobile', 'vehicle', 'vehicles'],
    'mobile': ['mobile', 'phone', 'smartphone', 'cell phone', 'mobail', 'mobyle'],
    'bike': ['bike', 'bicycle', 'motorcycle', 'scooter', 'two wheeler'],
    'property': ['house', 'home', 'apartment', 'flat', 'property', 'real estate'],
    'job': ['job', 'jobs', 'employment', 'vacancy', 'opening'],
    'electronics': ['laptop', 'computer', 'tv', 'television', 'fridge', 'refrigerator', 'washing machine'],
    'furniture': ['furniture', 'sofa', 'bed', 'table', 'chair'],
    'fashion': ['clothes', 'clothing', 'dress', 'shirt', 'jeans', 'shoes']
  };

  const keywords = [];
  let matchedCategory = null;

  for (const [category, terms] of Object.entries(categoryMap)) {
    for (const term of terms) {
      if (query.includes(term)) {
        keywords.push(term);
        if (!matchedCategory) {
          matchedCategory = category;
        }
      }
    }
  }

  return {
    category: matchedCategory,
    keywords
  };
}

/**
 * Determine user intent
 */
function determineIntent(query) {
  if (query.includes('sell') || query.includes('selling') || query.includes('for sale')) {
    return 'sell';
  }
  if (query.includes('buy') || query.includes('purchase') || query.includes('want')) {
    return 'buy';
  }
  if (query.includes('rent') || query.includes('rental') || query.includes('renting')) {
    return 'rent';
  }
  // Default to buy intent
  return 'buy';
}

/**
 * Extract all keywords from query
 */
function extractKeywords(query) {
  // Remove common stop words
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were'];
  const words = query.split(/\s+/).filter(word => 
    word.length > 2 && !stopWords.includes(word.toLowerCase())
  );
  return words;
}

/**
 * Find or create search query pattern
 */
async function recordSearchPattern(parsedQuery) {
  try {
    const { normalizedQuery, category, location, priceIntent, minPrice, maxPrice } = parsedQuery;

    // Find existing pattern
    let pattern = await prisma.searchQueryPattern.findFirst({
      where: {
        normalizedQuery: normalizedQuery
      }
    });

    if (pattern) {
      // Update search count
      pattern = await prisma.searchQueryPattern.update({
        where: { id: pattern.id },
        data: {
          searchCount: { increment: 1 },
          lastSearched: new Date()
        }
      });
    } else {
      // Create new pattern
      // Resolve category and location IDs if needed
      let categoryId = null;
      let locationId = null;

      if (category) {
        const categoryObj = await prisma.category.findFirst({
          where: {
            OR: [
              { slug: { contains: category, mode: 'insensitive' } },
              { name: { contains: category, mode: 'insensitive' } }
            ]
          }
        });
        if (categoryObj) categoryId = categoryObj.id;
      }

      if (location && location.city) {
        const locationObj = await prisma.location.findFirst({
          where: {
            OR: [
              { city: { contains: location.city, mode: 'insensitive' } },
              { slug: { contains: location.city, mode: 'insensitive' } }
            ]
          }
        });
        if (locationObj) locationId = locationObj.id;
      }

      pattern = await prisma.searchQueryPattern.create({
        data: {
          pattern: parsedQuery.originalQuery,
          normalizedQuery: normalizedQuery,
          categoryId,
          locationId,
          priceIntent: priceIntent?.type || null,
          searchCount: 1
        }
      });
    }

    return pattern;
  } catch (error) {
    console.error('Error recording search pattern:', error);
    return null;
  }
}

module.exports = {
  parseIndianQuery,
  recordSearchPattern,
  extractPriceIntent,
  extractLocation,
  extractCondition,
  extractCategoryKeywords,
  determineIntent
};

