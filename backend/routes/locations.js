const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { cacheMiddleware } = require('../middleware/cache');

const router = express.Router();
const prisma = new PrismaClient();

// Get all locations with details
router.get('/',
  cacheMiddleware(10 * 60 * 1000), // Cache for 10 minutes (locations don't change often)
  async (req, res) => {
  try {
    const { state, city, type, detailed } = req.query;
    const where = { isActive: true };

    if (state) where.state = state;
    if (city) where.city = city;

    // Type filter: 'city' (only cities), 'area' (only local areas), or all
    if (type === 'city') {
      where.neighbourhood = null;
      where.city = { not: null };
    } else if (type === 'area') {
      where.neighbourhood = { not: null };
    }

    // If detailed=true, include more information
    const selectFields = detailed === 'true' ? {
      id: true,
      name: true,
      slug: true,
      state: true,
      city: true,
      neighbourhood: true,
      pincode: true,
      latitude: true,
      longitude: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    } : {
        id: true,
        name: true,
        slug: true,
        state: true,
        city: true,
        neighbourhood: true,
        pincode: true,
        isActive: true
    };

    const locations = await prisma.location.findMany({
      where,
      select: selectFields,
      orderBy: [
        { state: 'asc' },
        { city: 'asc' },
        { neighbourhood: 'asc' },
        { name: 'asc' }
      ]
    });

    // Group locations by type for better structure
    const grouped = locations.reduce((acc, loc) => {
      const isCity = !loc.neighbourhood || loc.neighbourhood === null;
      const isArea = loc.neighbourhood && loc.neighbourhood !== null;
      
      if (isCity) {
        acc.cities.push(loc);
      } else if (isArea) {
        acc.areas.push(loc);
      } else {
        acc.other.push(loc);
      }
      return acc;
    }, { cities: [], areas: [], other: [] });

    // Set cache headers
    res.set({
      'Cache-Control': 'public, max-age=300, s-maxage=600', // Cache for 5 minutes, CDN for 10 minutes
      'Vary': 'Accept-Encoding'
    });
    
    // Return structured data if detailed
    if (detailed === 'true') {
      res.json({ 
        success: true, 
        locations,
        summary: {
          total: locations.length,
          cities: grouped.cities.length,
          areas: grouped.areas.length,
          other: grouped.other.length
        },
        grouped
      });
    } else {
    res.json({ success: true, locations });
    }
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch locations' });
  }
});

// Get locations list with details (enhanced endpoint)
router.get('/list',
  cacheMiddleware(10 * 60 * 1000), // Cache for 10 minutes
  async (req, res) => {
  try {
    const { state, city, type, limit = 100, offset = 0 } = req.query;
    const where = { isActive: true };

    if (state) where.state = state;
    if (city) where.city = city;
    
    // Type filter: 'city' (only cities), 'area' (only local areas), or all
    if (type === 'city') {
      where.neighbourhood = null;
      where.city = { not: null };
    } else if (type === 'area') {
      where.neighbourhood = { not: null };
    }

    // Get total count
    const total = await prisma.location.count({ where });

    // Get locations with all details
    const locations = await prisma.location.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        state: true,
        city: true,
        neighbourhood: true,
        pincode: true,
        latitude: true,
        longitude: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: [
        { state: 'asc' },
        { city: 'asc' },
        { neighbourhood: 'asc' },
        { name: 'asc' }
      ],
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    // Categorize locations
    const categorized = locations.map(loc => ({
      ...loc,
      type: !loc.neighbourhood || loc.neighbourhood === null ? 'city' : 'area',
      displayName: loc.neighbourhood 
        ? `${loc.neighbourhood}, ${loc.city || ''}, ${loc.state || ''}`.replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ',')
        : loc.city 
          ? `${loc.city}, ${loc.state || ''}`.replace(/^,\s*|,\s*$/g, '')
          : loc.name
    }));

    res.json({ 
      success: true, 
      locations: categorized,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      },
      summary: {
        cities: categorized.filter(l => l.type === 'city').length,
        areas: categorized.filter(l => l.type === 'area').length
      }
    });
  } catch (error) {
    console.error('Get locations list error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch locations list' });
  }
});

// Get unique states (alphabetically sorted) - MUST come before /:slug route
router.get('/states',
  cacheMiddleware(10 * 60 * 1000), // Cache for 10 minutes
  async (req, res) => {
  try {
    // Fetch all active locations with states
    const locations = await prisma.location.findMany({
      where: { 
        isActive: true, 
        state: { not: null } 
      },
      select: { 
        state: true 
      }
    });

    // Get unique states using Set (more reliable than Prisma distinct in MongoDB)
    const uniqueStates = new Set();
    locations.forEach(loc => {
      if (loc.state && loc.state.trim()) {
        uniqueStates.add(loc.state.trim());
      }
    });

    // Convert to array and sort alphabetically
    const states = Array.from(uniqueStates).sort((a, b) => a.localeCompare(b));

    console.log(`📍 Found ${states.length} unique states:`, states.slice(0, 5), states.length > 5 ? '...' : '');

    res.json({ success: true, states });
  } catch (error) {
    console.error('Get states error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch states' });
  }
});

// Get cities by state (alphabetically indexed A-Z) - MUST come before /:slug route
router.get('/states/:state/cities',
  cacheMiddleware(10 * 60 * 1000), // Cache for 10 minutes
  async (req, res) => {
  try {
    const { state } = req.params;
    const { q } = req.query; // Optional search query
    
    console.log('📍 GET /locations/states/:state/cities', {
      state: state,
      decodedState: decodeURIComponent(state),
      query: q,
      hasQuery: !!q
    });
    
    // When searching, return both cities AND local areas
    // When not searching, return only cities for navigation
    if (q && q.trim().length >= 2) {
      // Search mode: Return both cities and local areas that match the query
      const searchQuery = q.trim().toLowerCase();
      
      // Fetch all locations in the state, then filter in memory (MongoDB limitation)
      const allLocations = await prisma.location.findMany({
        where: {
          isActive: true,
          state: decodeURIComponent(state)
        },
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          state: true,
          neighbourhood: true,
          pincode: true
        }
      });

      // Filter in memory for case-insensitive search
      let filtered = allLocations.filter(loc => {
        const nameMatch = loc.name?.toLowerCase().includes(searchQuery);
        const cityMatch = loc.city?.toLowerCase().includes(searchQuery);
        const neighbourhoodMatch = loc.neighbourhood?.toLowerCase().includes(searchQuery);
        return nameMatch || cityMatch || neighbourhoodMatch;
      });

      // When searching for a city in this state, also include all districts/local areas in that city
      const matchingCities = filtered.filter(loc => {
        const isCity = !loc.neighbourhood || loc.neighbourhood === null || loc.neighbourhood === '';
        return isCity && (loc.name?.toLowerCase().includes(searchQuery) || loc.city?.toLowerCase().includes(searchQuery));
      });

      // For each matching city, find all districts/local areas in that city (within this state)
      if (matchingCities.length > 0) {
        const citiesToInclude = new Set();
        matchingCities.forEach(city => {
          if (city.city) citiesToInclude.add(city.city.toLowerCase());
          if (city.name) citiesToInclude.add(city.name.toLowerCase());
        });
        
        // Find all districts/local areas in matching cities (within this state)
        const districtsInCities = allLocations.filter(loc => {
          const isDistrict = loc.neighbourhood && loc.neighbourhood !== null && loc.neighbourhood !== '';
          if (!isDistrict) return false;
          
          // Check if this district belongs to a matching city in this state
          const cityMatch = loc.city && citiesToInclude.has(loc.city.toLowerCase());
          return cityMatch;
        });

        // Combine original results with districts from matching cities (avoid duplicates)
        const existingIds = new Set(filtered.map(loc => loc.id));
        districtsInCities.forEach(district => {
          if (!existingIds.has(district.id)) {
            filtered.push(district);
            existingIds.add(district.id);
          }
        });
      }

      // Sort: Cities first (no neighbourhood or name matches city), then local areas/districts
      const sorted = filtered.sort((a, b) => {
        const aIsCity = !a.neighbourhood || a.neighbourhood === null || a.neighbourhood === '';
        const bIsCity = !b.neighbourhood || b.neighbourhood === null || b.neighbourhood === '';
        if (aIsCity && !bIsCity) return -1;
        if (!aIsCity && bIsCity) return 1;
        return a.name.localeCompare(b.name);
      });

      // For search results, return full location objects (cities + areas)
      return res.json({ success: true, cities: sorted, indexed: {} });
    }

    // Navigation mode: Return only cities for hierarchical selection
    const where = {
      isActive: true,
      state: decodeURIComponent(state),
      city: { not: null },
      neighbourhood: null // Only cities, not local areas
    };

    const locations = await prisma.location.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        state: true,
        neighbourhood: true,
        pincode: true
      }
    });

    // Get unique cities (by city name) and keep full location objects
    // Use Map to deduplicate by city name, preferring entries where name matches city
    const cityMap = new Map();
    locations.forEach(loc => {
      if (loc.city) {
        const cityKey = loc.city.toLowerCase();
        // If map doesn't have this city, or if current entry has name matching city (better match)
        if (!cityMap.has(cityKey) || (loc.name && loc.name.toLowerCase() === cityKey)) {
          cityMap.set(cityKey, loc);
        }
      }
    });

    let cities = Array.from(cityMap.values())
      .sort((a, b) => {
        // Sort by name if available, otherwise by city name
        const aName = (a.name || a.city || '').toLowerCase();
        const bName = (b.name || b.city || '').toLowerCase();
        return aName.localeCompare(bName);
      });

    // Index cities by first letter (A-Z) for display
    const indexed = {};
    cities.forEach(city => {
      const cityName = (city.name || city.city || '').trim();
      if (!cityName) {
        console.warn('City without name/city field:', city);
        return;
      }
      const firstLetter = cityName.charAt(0).toUpperCase();
      if (!indexed[firstLetter]) {
        indexed[firstLetter] = [];
      }
      indexed[firstLetter].push(city);
    });

    console.log(`📍 Returning ${cities.length} cities for state "${decodeURIComponent(state)}" with ${Object.keys(indexed).length} indexed letters`);

    res.json({ success: true, cities, indexed });
  } catch (error) {
    console.error('❌ Get cities error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      state: req.params?.state,
      query: req.query?.q
    });
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch cities',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get local areas by city - MUST come before /:slug route
router.get('/cities/:city/areas',
  cacheMiddleware(10 * 60 * 1000), // Cache for 10 minutes
  async (req, res) => {
  try {
    const { city } = req.params;
    const { state } = req.query; // Optional state filter
    
    const where = {
      isActive: true,
      city: decodeURIComponent(city),
      neighbourhood: { not: null } // Only local areas
    };

    if (state) {
      where.state = decodeURIComponent(state);
    }

    const locations = await prisma.location.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        neighbourhood: true,
        city: true,
        state: true
      },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, areas: locations });
  } catch (error) {
    console.error('Get areas error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch areas' });
  }
});

// Mobile: Get nearby locations by coordinates - MUST come before /:slug route
router.get('/mobile/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query; // radius in km

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const radiusKm = parseFloat(radius);

    // Simple distance calculation (Haversine formula approximation)
    // For production, consider using MongoDB geospatial queries
    const locations = await prisma.location.findMany({
      where: {
        isActive: true,
        latitude: { not: null },
        longitude: { not: null }
      },
      select: {
        id: true,
        name: true,
        slug: true,
        state: true,
        city: true,
        neighbourhood: true,
        pincode: true,
        latitude: true,
        longitude: true,
        isActive: true
      }
    });

    // Calculate distances and filter
    const nearbyLocations = locations
      .map(loc => {
        if (!loc.latitude || !loc.longitude) return null;
        
        const R = 6371; // Earth's radius in km
        const dLat = (loc.latitude - lat) * Math.PI / 180;
        const dLon = (loc.longitude - lon) * Math.PI / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat * Math.PI / 180) * Math.cos(loc.latitude * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return { ...loc, distance };
      })
      .filter(loc => loc && loc.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 20); // Limit to 20 results

    res.json({
      success: true,
      locations: nearbyLocations,
      center: { latitude: lat, longitude: lon },
      radius: radiusKm
    });
  } catch (error) {
    console.error('Get nearby locations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch nearby locations' });
  }
});

// NOTE: /states and /states/:state/cities routes are defined earlier (before /:slug route)
// to ensure they are matched before the parameterized route
// The duplicate routes that were here have been removed - using the ones defined earlier

// Get neighborhoods by state and/or city
router.get('/neighborhoods',
  cacheMiddleware(5 * 60 * 1000), // Cache for 5 minutes
  async (req, res) => {
  try {
    const { state, city, q, limit = 50 } = req.query;
    const where = { isActive: true, neighbourhood: { not: null } };

    if (state) where.state = state;
    if (city) where.city = city;

    const locations = await prisma.location.findMany({
      where,
      select: {
        neighbourhood: true,
        city: true,
        state: true
      }
    });

    // Get unique neighborhoods
    const neighborhoodMap = new Map();
    locations.forEach(loc => {
      if (loc.neighbourhood) {
        const key = `${loc.neighbourhood}-${loc.city}-${loc.state}`;
        if (!neighborhoodMap.has(key)) {
          neighborhoodMap.set(key, {
            neighbourhood: loc.neighbourhood,
            city: loc.city,
            state: loc.state
          });
        }
      }
    });

    let neighborhoods = Array.from(neighborhoodMap.values());

    // Filter by search query if provided
    if (q && q.trim().length >= 1) {
      const searchQuery = q.trim().toLowerCase();
      neighborhoods = neighborhoods.filter(neighborhood => 
        neighborhood.neighbourhood?.toLowerCase().includes(searchQuery) ||
        neighborhood.city?.toLowerCase().includes(searchQuery)
      );
    }

    // Sort and limit
    neighborhoods = neighborhoods
      .sort((a, b) => a.neighbourhood.localeCompare(b.neighbourhood))
      .slice(0, parseInt(limit));

    res.json({ success: true, neighborhoods });
  } catch (error) {
    console.error('Get neighborhoods error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch neighborhoods' });
  }
});

// Mobile: Search locations by query - MUST come before /:slug route
router.get('/mobile/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    // Allow empty query but return empty results
    if (!q || q.trim().length === 0) {
      return res.json({
        success: true,
        locations: []
      });
    }

    if (q.trim().length < 2) {
      return res.json({
        success: true,
        locations: [] // Return empty array instead of error for short queries
      });
    }

    const searchQuery = q.trim().toLowerCase();

    // MongoDB doesn't support case-insensitive mode, so we'll filter in memory
    const allLocations = await prisma.location.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        slug: true,
        state: true,
        city: true,
        neighbourhood: true,
        pincode: true,
        isActive: true
      }
    });

    // Filter in memory for case-insensitive search (MongoDB limitation)
    let locations = allLocations
      .filter(loc => {
        const nameMatch = loc.name?.toLowerCase().includes(searchQuery);
        const cityMatch = loc.city?.toLowerCase().includes(searchQuery);
        const stateMatch = loc.state?.toLowerCase().includes(searchQuery);
        const neighbourhoodMatch = loc.neighbourhood?.toLowerCase().includes(searchQuery);
        const pincodeMatch = loc.pincode?.includes(searchQuery);
        return nameMatch || cityMatch || stateMatch || neighbourhoodMatch || pincodeMatch;
      });

    // When searching for a city, also include all districts/local areas in that city
    // Find matching cities first (cities that match the search query)
    const matchingCities = locations.filter(loc => {
      const isCity = !loc.neighbourhood || loc.neighbourhood === null || loc.neighbourhood === '';
      return isCity && (loc.name?.toLowerCase().includes(searchQuery) || loc.city?.toLowerCase().includes(searchQuery));
    });

    // For each matching city, find all districts/local areas in that city
    if (matchingCities.length > 0) {
      const citiesToInclude = new Set();
      const statesToInclude = new Set();
      
      matchingCities.forEach(city => {
        if (city.city) citiesToInclude.add(city.city.toLowerCase());
        if (city.state) statesToInclude.add(city.state.toLowerCase());
        // Also include the city name itself
        if (city.name) citiesToInclude.add(city.name.toLowerCase());
      });
      
      // Find all districts/local areas in matching cities
      const districtsInCities = allLocations.filter(loc => {
        const isDistrict = loc.neighbourhood && loc.neighbourhood !== null && loc.neighbourhood !== '';
        if (!isDistrict) return false;
        
        // Check if this district belongs to a matching city
        const cityMatch = loc.city && citiesToInclude.has(loc.city.toLowerCase());
        const stateMatch = loc.state && statesToInclude.has(loc.state.toLowerCase());
        
        return cityMatch || stateMatch;
      });

      // Combine original results with districts from matching cities (avoid duplicates)
      const existingIds = new Set(locations.map(loc => loc.id));
      districtsInCities.forEach(district => {
        if (!existingIds.has(district.id)) {
          locations.push(district);
          existingIds.add(district.id);
        }
      });
    }

    // Sort: Cities first (no neighbourhood or name matches city), then local areas/districts
    // This matches OLX-style location search behavior
    locations.sort((a, b) => {
      // Check if location is a main city (has city but no neighbourhood, or name matches city)
      const aIsCity = !a.neighbourhood || a.neighbourhood === null || a.neighbourhood === '';
      const bIsCity = !b.neighbourhood || b.neighbourhood === null || b.neighbourhood === '';
      
      // Cities come first
      if (aIsCity && !bIsCity) return -1;
      if (!aIsCity && bIsCity) return 1;
      
      // Within same type, sort alphabetically
      return a.name.localeCompare(b.name);
    });

    // Limit results
    locations = locations.slice(0, parseInt(limit));

    res.json({
      success: true,
      locations,
      query: searchQuery
    });
  } catch (error) {
    console.error('❌ Search locations error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      query: req.query
    });
    // Return empty results instead of error to prevent frontend crashes
    res.json({ 
      success: true, 
      locations: [],
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get single location by slug - MUST be last to avoid conflicts with other routes
router.get('/:slug', async (req, res) => {
  try {
    const location = await prisma.location.findUnique({
      where: { slug: req.params.slug },
      select: {
        id: true,
        name: true,
        slug: true,
        state: true,
        city: true,
        neighbourhood: true,
        pincode: true,
        isActive: true
        // Removed _count - it's slow and not always needed
      }
    });

    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    res.json({ success: true, location });
  } catch (error) {
    console.error('Get location error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch location' });
  }
});

module.exports = router;

