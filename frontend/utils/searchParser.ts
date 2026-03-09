/**
 * Advanced Search Parser - Extracts location, price, and keywords from search queries
 * Examples:
 * - "iPhone in Kochi" → { keywords: "iPhone", location: "Kochi" }
 * - "Car under 5 lakh in Mumbai" → { keywords: "Car", price: { max: 500000 }, location: "Mumbai" }
 * - "Laptop above 50000" → { keywords: "Laptop", price: { min: 50000 } }
 */

interface ParsedSearch {
  keywords: string;
  location?: string;
  price?: {
    min?: number;
    max?: number;
  };
  category?: string;
}

// Common Indian cities for location detection
const INDIAN_CITIES = [
  'mumbai', 'delhi', 'bangalore', 'bengaluru', 'hyderabad', 'ahmedabad', 'chennai', 'kolkata',
  'pune', 'jaipur', 'surat', 'lucknow', 'kanpur', 'nagpur', 'indore', 'thane', 'bhopal',
  'visakhapatnam', 'pimpri', 'patna', 'vadodara', 'ghaziabad', 'ludhiana', 'agra', 'nashik',
  'faridabad', 'meerut', 'rajkot', 'kalyan', 'vasai', 'varanasi', 'srinagar', 'aurangabad',
  'dhanbad', 'amritsar', 'navi mumbai', 'allahabad', 'prayagraj', 'ranchi', 'howrah', 'coimbatore',
  'jabalpur', 'gwalior', 'vijayawada', 'jodhpur', 'madurai', 'raipur', 'kota', 'chandigarh',
  'guwahati', 'solapur', 'hubli', 'mysore', 'mysuru', 'tiruchirappalli', 'bareilly', 'moradabad',
  'gurgaon', 'gurugram', 'aligarh', 'jalandhar', 'bhubaneswar', 'salem', 'warangal', 'mira',
  'thiruvananthapuram', 'trivandrum', 'bhiwandi', 'saharanpur', 'guntur', 'amravati', 'bikaner',
  'noida', 'jamshedpur', 'bhilai', 'cuttack', 'firozabad', 'kochi', 'cochin', 'ernakulam',
  'thrissur', 'kozhikode', 'calicut', 'kollam', 'palakkad', 'kannur', 'malappuram', 'alappuzha',
  'kottayam', 'manjeri', 'thalassery', 'kasaragod', 'tirur', 'kanhangad', 'payyanur', 'koyilandy',
  'varkala', 'neyyattinkara', 'kayamkulam', 'nedumangad', 'cherthala', 'changanassery', 'perinthalmanna',
  'attingal', 'kodungallur', 'ponnani', 'ottappalam', 'tiruvalla', 'thodupuzha', 'perumbavoor',
  'chalakudy', 'changanacherry', 'guruvayur', 'vadakara', 'kalpetta', 'shornur', 'pandalam',
];

// Common Indian states
const INDIAN_STATES = [
  'kerala', 'karnataka', 'tamil nadu', 'maharashtra', 'delhi', 'uttar pradesh', 'up',
  'gujarat', 'rajasthan', 'west bengal', 'madhya pradesh', 'mp', 'telangana', 'andhra pradesh',
  'bihar', 'odisha', 'punjab', 'haryana', 'jharkhand', 'assam', 'chhattisgarh', 'uttarakhand',
  'himachal pradesh', 'hp', 'goa', 'tripura', 'meghalaya', 'manipur', 'nagaland', 'arunachal pradesh',
  'mizoram', 'sikkim', 'jammu and kashmir', 'ladakh', 'puducherry', 'chandigarh',
];

// Price patterns
const PRICE_PATTERNS = [
  // "under 5 lakh", "below 50000", "less than 10000"
  { regex: /(?:under|below|less than|upto|up to)\s+(\d+(?:\.\d+)?)\s*(lakh|lakhs|k|thousand|cr|crore)?/i, type: 'max' },
  // "above 50000", "over 1 lakh", "more than 10000"
  { regex: /(?:above|over|more than|from)\s+(\d+(?:\.\d+)?)\s*(lakh|lakhs|k|thousand|cr|crore)?/i, type: 'min' },
  // "between 10000 and 50000"
  { regex: /between\s+(\d+(?:\.\d+)?)\s*(lakh|lakhs|k|thousand|cr|crore)?\s+(?:and|to)\s+(\d+(?:\.\d+)?)\s*(lakh|lakhs|k|thousand|cr|crore)?/i, type: 'range' },
];

/**
 * Convert price string to number
 * Examples: "5 lakh" → 500000, "50k" → 50000, "1 cr" → 10000000
 */
function convertPriceToNumber(value: string, unit?: string): number {
  const num = parseFloat(value);
  if (isNaN(num)) return 0;
  
  const unitLower = (unit || '').toLowerCase();
  
  if (unitLower.includes('lakh')) return num * 100000;
  if (unitLower.includes('cr') || unitLower.includes('crore')) return num * 10000000;
  if (unitLower === 'k' || unitLower.includes('thousand')) return num * 1000;
  
  return num;
}

/**
 * Parse search query and extract location, price, and keywords
 */
export function parseSearchQuery(query: string): ParsedSearch {
  if (!query || !query.trim()) {
    return { keywords: '' };
  }

  let remainingQuery = query.trim();
  const result: ParsedSearch = { keywords: '' };

  // 1. Extract location (city or state)
  // Pattern: "in <location>" or "at <location>" or "near <location>"
  const locationPattern = /(?:in|at|near)\s+([a-z\s]+?)(?:\s+(?:under|above|below|over|between|for|with|₹|\d)|$)/i;
  const locationMatch = remainingQuery.match(locationPattern);
  
  if (locationMatch) {
    const locationText = locationMatch[1].trim().toLowerCase();
    
    // Check if it's a known city or state
    const isCity = INDIAN_CITIES.some(city => locationText.includes(city) || city.includes(locationText));
    const isState = INDIAN_STATES.some(state => locationText.includes(state) || state.includes(locationText));
    
    if (isCity || isState) {
      result.location = locationMatch[1].trim();
      // Remove location from query
      remainingQuery = remainingQuery.replace(locationMatch[0], '').trim();
    }
  }

  // 2. Extract price range
  for (const pattern of PRICE_PATTERNS) {
    const match = remainingQuery.match(pattern.regex);
    if (match) {
      if (pattern.type === 'max') {
        result.price = { max: convertPriceToNumber(match[1], match[2]) };
      } else if (pattern.type === 'min') {
        result.price = { min: convertPriceToNumber(match[1], match[2]) };
      } else if (pattern.type === 'range') {
        result.price = {
          min: convertPriceToNumber(match[1], match[2]),
          max: convertPriceToNumber(match[3], match[4]),
        };
      }
      // Remove price from query
      remainingQuery = remainingQuery.replace(match[0], '').trim();
      break;
    }
  }

  // 3. Clean up remaining query (remove extra spaces, "for", "with", etc.)
  remainingQuery = remainingQuery
    .replace(/\s+/g, ' ')
    .replace(/\b(for|with|a|an|the)\b/gi, '')
    .trim();

  result.keywords = remainingQuery;
  
  return result;
}

/**
 * Build search URL with parsed parameters
 */
export function buildSearchUrl(parsed: ParsedSearch, baseUrl: string = '/ads'): string {
  const params = new URLSearchParams();
  
  if (parsed.keywords) {
    params.set('search', parsed.keywords);
  }
  
  if (parsed.location) {
    params.set('location', parsed.location.toLowerCase().replace(/\s+/g, '-'));
  }
  
  if (parsed.price?.min) {
    params.set('minPrice', String(parsed.price.min));
  }
  
  if (parsed.price?.max) {
    params.set('maxPrice', String(parsed.price.max));
  }
  
  if (parsed.category) {
    params.set('category', parsed.category);
  }
  
  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Get recent searches from localStorage
 */
export function getRecentSearches(limit: number = 5): string[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem('recent_searches');
    if (!stored) return [];
    
    const searches = JSON.parse(stored);
    return Array.isArray(searches) ? searches.slice(0, limit) : [];
  } catch {
    return [];
  }
}

/**
 * Save search to recent searches
 */
export function saveRecentSearch(query: string): void {
  if (typeof window === 'undefined' || !query.trim()) return;
  
  try {
    const searches = getRecentSearches(20);
    const trimmed = query.trim();
    
    // Remove if already exists
    const filtered = searches.filter(s => s.toLowerCase() !== trimmed.toLowerCase());
    
    // Add to front
    const updated = [trimmed, ...filtered].slice(0, 10);
    
    localStorage.setItem('recent_searches', JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving recent search:', error);
  }
}

/**
 * Clear recent searches
 */
export function clearRecentSearches(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem('recent_searches');
  } catch (error) {
    console.error('Error clearing recent searches:', error);
  }
}

/**
 * Popular searches (hardcoded for now, can be fetched from API later)
 */
export function getPopularSearches(): string[] {
  return [
    'iPhone',
    'Car',
    'Laptop',
    'Bike',
    'Furniture',
    'Mobile',
    'House',
    'Apartment',
    'Scooter',
    'TV',
  ];
}
