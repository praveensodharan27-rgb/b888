const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { uploadImages } = require('../middleware/upload');
const { cacheMiddleware, clearCache } = require('../middleware/cache');
const { indexAd, deleteAd, searchAds } = require('../services/meilisearch');
const { moderateAdContent, moderateAd, getModerationStatus } = require('../services/contentModeration');
const { generateUniqueAdSlug } = require('../utils/slug');
const { rankAds } = require('../services/adRankingService');
const { rankAdsOGNOX } = require('../services/ognoxRankingService');
const { rankAdsWithRotation, insertAdsIntoFeed, categorizeAd } = require('../services/ognoxAdsRotationService');
const { rankAdsWithSmartScoring, getCurrentLocationFromRequest } = require('../services/smartAdScoringService');
const Razorpay = require('razorpay');

// Ensure dotenv is loaded
require('dotenv').config();

const router = express.Router();
const prisma = new PrismaClient();

const isValidObjectId = (value = '') => /^[a-fA-F0-9]{24}$/.test(value);

// Initialize Razorpay (only if keys are provided)
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  // Ensure TEST key is used (rzp_test_xxx)
  const keyId = process.env.RAZORPAY_KEY_ID;
  const isTestKey = keyId.startsWith('rzp_test_');
  
  if (!isTestKey && process.env.NODE_ENV !== 'production') {
    console.warn('⚠️ WARNING: Non-test Razorpay key detected in non-production environment:', keyId.substring(0, 10) + '...');
    console.warn('⚠️ Expected TEST key format: rzp_test_xxx');
  }
  
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
  console.log('✅ Razorpay initialized in ads route', {
    keyType: isTestKey ? 'TEST' : 'LIVE',
    keyPrefix: keyId.substring(0, 10) + '...'
  });
} else {
  console.warn('⚠️ Razorpay not initialized in ads route - keys missing');
}

// Ad posting price (in INR)
const AD_POSTING_PRICE = 49;
const FREE_ADS_LIMIT = 2;

// Get all ads with filters, search, and sorting
router.get('/',
  cacheMiddleware(60 * 1000), // Cache for 60 seconds (increased from 30)
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('category').optional().isString(),
    query('subcategory').optional().isString(),
    query('city').optional().isString(),
    query('state').optional().isString(),
    query('latitude').optional().isFloat(),
    query('longitude').optional().isFloat(),
    query('radius').optional().isFloat({ min: 0 }),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
    query('search').optional().isString(),
    query('condition').optional().isIn(['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED']),
    query('sort').optional().isIn(['newest', 'oldest', 'price_low', 'price_high', 'featured', 'bumped'])
  ],
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        subcategory,
        city,
        state,
        latitude,
        longitude,
        radius = 50, // Default 50km radius
        minPrice,
        maxPrice,
        search,
        condition,
        sort = 'newest',
        userId // Filter by user ID
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const now = new Date();
      const where = {
        // Only show APPROVED ads (excludes INACTIVE, EXPIRED, PENDING, REJECTED, SOLD)
        status: 'APPROVED',
        // Filter out expired ads
        AND: [
          {
            OR: [
              { expiresAt: null }, // Ads without expiration (legacy)
              { expiresAt: { gt: now } } // Ads that haven't expired yet
            ]
          }
        ]
      };

      // Parallelize category and subcategory lookups
      // IMPORTANT: If search exists, ignore category/subcategory filters (search overrides category)
      const shouldIgnoreCategory = search && search.trim();
      
      const [categoryObj, subcategoryObj] = await Promise.all([
        (!shouldIgnoreCategory && category) ? prisma.category.findUnique({ where: { slug: category }, select: { id: true } }) : null,
        (!shouldIgnoreCategory && subcategory) ? prisma.subcategory.findFirst({ where: { slug: subcategory }, select: { id: true } }) : null,
      ]);

      // Only apply category filter if search doesn't exist
      if (!shouldIgnoreCategory && categoryObj) {
        where.categoryId = categoryObj.id;
      }

      // Only apply subcategory filter if search doesn't exist
      if (!shouldIgnoreCategory && subcategoryObj) {
        where.subcategoryId = subcategoryObj.id;
      }

      // REMOVED: Location filtering - location filter completely removed

      // Price filter
      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price.gte = parseFloat(minPrice);
        if (maxPrice) where.price.lte = parseFloat(maxPrice);
      }

      // Condition filter
      if (condition) {
        where.condition = condition;
      }

      // User ID filter
      if (userId) {
        where.userId = userId;
      }

      // Search - use Meilisearch for better search results when search query is provided
      // If no search query, continue with regular Prisma query
      let useMeilisearch = false;
      if (search && search.trim()) {
        useMeilisearch = true;
      }

      // Sorting - REMOVED: Premium ads prioritization
      // Simple sorting by selected criteria only - no ad filtering or prioritization
      let orderBy = [];
      
      switch (sort) {
        case 'oldest':
          orderBy = [{ createdAt: 'asc' }];
          break;
        case 'price_low':
          orderBy = [{ price: 'asc' }, { createdAt: 'desc' }];
          break;
        case 'price_high':
          orderBy = [{ price: 'desc' }, { createdAt: 'desc' }];
          break;
        case 'featured':
          orderBy = [{ featuredAt: 'desc' }, { createdAt: 'desc' }];
          break;
        case 'bumped':
          orderBy = [{ bumpedAt: 'desc' }, { createdAt: 'desc' }];
          break;
        default:
          // newest: by creation date
          orderBy = [{ createdAt: 'desc' }];
          break;
      }

      // Use Meilisearch for search queries, Prisma for regular queries
      let ads = [];
      let total = 0;
      
      if (useMeilisearch) {
        // Use Meilisearch for better search results
        console.log(`🔍 Using Meilisearch for search: "${search}"`);
        try {
          const searchResults = await searchAds(search.trim(), {
            page: parseInt(page),
            limit: Math.max(parseInt(limit) * 5, 200), // Fetch more for ranking
            categoryId: (!shouldIgnoreCategory && categoryObj) ? categoryObj.id : undefined,
            subcategoryId: (!shouldIgnoreCategory && subcategoryObj) ? subcategoryObj.id : undefined,
            minPrice: minPrice ? parseFloat(minPrice) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
            condition,
            sort,
            status: 'APPROVED',
          });
          
          const adIds = searchResults.hits.map(hit => hit.id);
          total = searchResults.total;
          
          if (adIds.length > 0) {
            // Fetch full ad details from database
            ads = await prisma.ad.findMany({
              where: {
                id: { in: adIds },
                status: 'APPROVED',
                AND: [
                  {
                    OR: [
                      { expiresAt: null },
                      { expiresAt: { gt: now } }
                    ]
                  }
                ]
              },
              select: {
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
                postedAt: true,
                expiresAt: true,
                createdAt: true,
                updatedAt: true,
                packageType: true,
                lastShownAt: true,
                userId: true,
                attributes: true,
                category: { select: { id: true, name: true, slug: true } },
                subcategory: { select: { id: true, name: true, slug: true } },
                location: { select: { id: true, name: true, slug: true, latitude: true, longitude: true, city: true, state: true } },
                user: { select: { id: true, name: true, avatar: true, phone: true, showPhone: true, isVerified: true } },
                _count: { select: { favorites: true } }
              }
            });
            
            // Maintain Meilisearch relevance order
            const adsMap = new Map(ads.map(ad => [ad.id, ad]));
            ads = adIds.map(id => adsMap.get(id)).filter(Boolean);
            
            // Apply smart ranking with location boost for search results
            if (ads.length > 0) {
              try {
                // Get current location for ranking
                let currentLocationForRanking = null;
                if (city || state) {
                  currentLocationForRanking = { city, state };
                }
                
                // Use smart scoring with location boost (isSearch = true)
                ads = rankAdsWithSmartScoring(ads, {
                  query: search.trim(),
                  currentLocation: currentLocationForRanking,
                  isSearch: true // Enable search location boost
                });
                console.log(`✅ Applied smart ranking with location boost to search results`);
              } catch (rankingError) {
                console.error('⚠️ Error applying ranking to search results:', rankingError);
                // Continue with unranked results if ranking fails
              }
            }
          }
          
          console.log(`📦 Meilisearch result: fetched ${ads.length} ads, total=${total}`);
        } catch (meilisearchError) {
          console.error('⚠️ Meilisearch error, falling back to Prisma:', meilisearchError);
          useMeilisearch = false; // Fallback to Prisma
        }
      }
      
      // Fallback to Prisma if Meilisearch not used or failed
      if (!useMeilisearch) {
        const fetchLimit = Math.max(parseInt(limit) * 5, 200);
        
        console.log(`🔍 Using Prisma query with filters:`, {
          category: category || 'none',
          subcategory: subcategory || 'none',
          search: search || 'none'
        });
        
        // KEYWORD-BASED OR SEARCH: Split search query into keywords and match against all fields
        // Matches Meilisearch behavior: keywords match title, description, category, location, city, state, neighbourhood, tags
        if (search && search.trim()) {
          // Split search query into keywords (space-separated)
          const keywords = search.trim().split(/\s+/).filter(k => k.length > 0);
          console.log(`🔍 Prisma fallback: Search query split into ${keywords.length} keywords:`, keywords);
          
          // Build OR conditions for each keyword
          // Each keyword can match any field (OR logic across fields)
          // ANY keyword matching returns the ad (OR logic across keywords)
          const keywordConditions = keywords.map(keyword => ({
            OR: [
              { title: { contains: keyword, mode: 'insensitive' } },
              { description: { contains: keyword, mode: 'insensitive' } },
              { city: { contains: keyword, mode: 'insensitive' } },
              { state: { contains: keyword, mode: 'insensitive' } },
              { neighbourhood: { contains: keyword, mode: 'insensitive' } },
              { exactLocation: { contains: keyword, mode: 'insensitive' } },
              { category: { name: { contains: keyword, mode: 'insensitive' } } },
              { subcategory: { name: { contains: keyword, mode: 'insensitive' } } },
              { location: { name: { contains: keyword, mode: 'insensitive' } } },
            ]
          }));
          
          // OR logic: ANY keyword matching returns the ad
          where.AND.push({
            OR: keywordConditions
          });
        }
        
        const [adsResult, totalResult] = await Promise.all([
          prisma.ad.findMany({
            where,
            select: {
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
              postedAt: true, // For displaying "time ago" in ad cards
              expiresAt: true,
              createdAt: true,
              updatedAt: true,
              packageType: true,
              lastShownAt: true,
              userId: true,
              attributes: true,
              slug: true, // For SEO-friendly URLs in ad cards
              city: true, // Direct city field from Ad model
              state: true, // Direct state field from Ad model
              category: { select: { id: true, name: true, slug: true } },
              subcategory: { select: { id: true, name: true, slug: true } },
              location: { select: { id: true, name: true, slug: true, latitude: true, longitude: true, city: true, state: true } },
              user: { select: { id: true, name: true, avatar: true, phone: true, showPhone: true, isVerified: true } },
              _count: { select: { favorites: true } }
            },
            orderBy: [{ createdAt: 'desc' }],
            skip: 0,
            take: fetchLimit
          }),
          prisma.ad.count({ where })
        ]);
        
        ads = adsResult;
        total = totalResult;
        console.log(`📦 Prisma query result: fetched ${ads.length} ads, total=${total}`);
      }

      // LOCATION-BASED ADS FETCHING with fallback hierarchy
      // Strategy: City/Radius → State → All India (NEVER HIDE ADS)
      let locationKey = 'all'; // For rotation seed
      let adsWithDistance = [];

      // Get current location for city-first filtering in search
      let currentLocation = null;
      if (city || state) {
        currentLocation = { city, state };
      }

      // If a text search is active, apply CITY-FIRST filtering
      // City ads appear at top, state ads as fallback if city results are low
      if (search && search.trim()) {
        if (currentLocation && currentLocation.city) {
          // Separate city ads and other ads
          const cityAdsList = ads.filter(ad => {
            const adCity = (ad.city || ad.location?.city || '').toLowerCase();
            return adCity === currentLocation.city.toLowerCase();
          });
          
          const otherAds = ads.filter(ad => {
            const adCity = (ad.city || ad.location?.city || '').toLowerCase();
            return adCity !== currentLocation.city.toLowerCase();
          });

          // If city results are low (< 10), include state-level ads
          if (cityAdsList.length < 10 && currentLocation.state) {
            const stateAdsList = otherAds.filter(ad => {
              const adState = (ad.state || ad.location?.state || '').toLowerCase();
              return adState === currentLocation.state.toLowerCase();
            });
            
            // Combine: city ads first, then state ads
            adsWithDistance = [...cityAdsList, ...stateAdsList];
            console.log(`🔎 Search: ${cityAdsList.length} city ads + ${stateAdsList.length} state ads`);
          } else {
            // Enough city results or no state - use only city ads
            adsWithDistance = cityAdsList;
            console.log(`🔎 Search: ${cityAdsList.length} city ads (enough results)`);
          }
        } else {
          // No location - show all search results
          adsWithDistance = ads;
          console.log('🔎 Search active -> no location filter, showing all search results.');
        }
        locationKey = currentLocation?.city || 'all';
      } else {
        // If no search keyword, apply normal location-based filtering with fallback
        if (city || state || (latitude && longitude)) {
          const userLat = latitude ? parseFloat(latitude) : null;
          const userLng = longitude ? parseFloat(longitude) : null;
          const radiusKm = radius ? parseFloat(radius) : 50;
          
          // Set location key for rotation seed
          locationKey = city || state || 'all';
          
          // STEP 1: Try city + radius filtering
          if (city && userLat && userLng) {
            // Filter by city name and radius
            const adsInCity = ads.filter(ad => {
              const adCity = ad.location?.city || ad.city;
              if (adCity && adCity.toLowerCase() === city.toLowerCase()) {
                // If ad has coordinates, check radius
                if (ad.location?.latitude && ad.location?.longitude) {
                  const R = 6371; // Earth's radius in km
                  const dLat = (ad.location.latitude - userLat) * Math.PI / 180;
                  const dLng = (ad.location.longitude - userLng) * Math.PI / 180;
                  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                            Math.cos(userLat * Math.PI / 180) * Math.cos(ad.location.latitude * Math.PI / 180) *
                            Math.sin(dLng/2) * Math.sin(dLng/2);
                  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                  const distance = R * c;
                  return distance <= radiusKm;
                }
                // No coordinates - include if city matches
                return true;
              }
              return false;
            });
            
            if (adsInCity.length > 0) {
              adsWithDistance = adsInCity;
              console.log(`📍 Found ${adsInCity.length} ads in city: ${city}`);
            }
          } else if (userLat && userLng) {
            // STEP 1b: Try radius-only filtering (if no city but has coordinates)
            const R = 6371;
            const adsInRadius = ads.filter(ad => {
              if (ad.location?.latitude && ad.location?.longitude) {
                const dLat = (ad.location.latitude - userLat) * Math.PI / 180;
                const dLng = (ad.location.longitude - userLng) * Math.PI / 180;
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                          Math.cos(userLat * Math.PI / 180) * Math.cos(ad.location.latitude * Math.PI / 180) *
                          Math.sin(dLng/2) * Math.sin(dLng/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                const distance = R * c;
                return distance <= radiusKm;
              }
              return false;
            });
            
            if (adsInRadius.length > 0) {
              adsWithDistance = adsInRadius;
              console.log(`📍 Found ${adsInRadius.length} ads within ${radiusKm}km radius`);
            }
          } else if (state) {
            // STEP 2: Try state filtering
            const adsInState = ads.filter(ad => {
              const adState = ad.location?.state || ad.state;
              return adState && adState.toLowerCase() === state.toLowerCase();
            });
            
            if (adsInState.length > 0) {
              adsWithDistance = adsInState;
              locationKey = state;
              console.log(`📍 Found ${adsInState.length} ads in state: ${state}`);
            }
          }
          
          // STEP 3: Fallback to All India if no location matches
          if (adsWithDistance.length === 0) {
            adsWithDistance = ads; // Show all ads - NEVER HIDE
            locationKey = 'all';
            console.log(`📍 No ads in location, showing all ${ads.length} ads (All India fallback)`);
          }
        } else {
          // No location provided - show all ads
          adsWithDistance = ads;
          locationKey = 'all';
        }
      }

      // Ensure all ads have images as arrays
      const adsWithImages = adsWithDistance.map(ad => ({
        ...ad,
        images: Array.isArray(ad.images) ? ad.images.filter(img => img && (typeof img === 'string' ? img.trim() !== '' : true)) : (ad.images && typeof ad.images === 'string' && ad.images.trim() !== '' ? [ad.images] : [])
      }));

      // Apply OLX-style ranking with 1-hour rotation
      // Uses 3-tier system: Business → Premium → Free with time-based rotation
      let rankedAds = [];
      try {
        // Only rank if we have ads
        if (adsWithImages && adsWithImages.length > 0) {
          // Use OLX ranking which now includes 1-hour rotation
          rankedAds = await rankAdsOGNOX(adsWithImages, { 
            locationKey: locationKey,
            updateLastShown: true 
          });
          
          // Fallback: if ranking returns empty but we have ads, use original order
          if (!rankedAds || rankedAds.length === 0) {
            console.warn(`⚠️ Ranking returned empty (input: ${adsWithImages.length} ads), using original ads order`);
            // Filter only by status and basic expiry
            const now = new Date();
            rankedAds = adsWithImages.filter(ad => {
              if (!ad || !ad.id) return false;
              if (ad.status !== 'APPROVED') return false;
              if (ad.expiresAt && new Date(ad.expiresAt) <= now) return false;
              return true;
            });
            
            // If still empty, return all approved ads
            if (rankedAds.length === 0) {
              rankedAds = adsWithImages.filter(ad => ad && ad.id && ad.status === 'APPROVED');
            }
          }
        } else {
          rankedAds = [];
        }
      } catch (error) {
        console.error('Error in ranking ads:', error);
        // Fallback to original ads if ranking fails
        const now = new Date();
        rankedAds = (adsWithImages || []).filter(ad => {
          if (!ad || !ad.id) return false;
          if (ad.status !== 'APPROVED') return false;
          if (ad.expiresAt && new Date(ad.expiresAt) <= now) return false;
          return true;
        });
      }
      
      // Calculate total count from filtered/ranked ads (for accurate pagination)
      const totalCount = rankedAds.length;
      
      console.log(`📊 Ads processing: initial=${ads.length}, afterLocation=${adsWithDistance.length}, afterRanking=${rankedAds.length}, totalCount=${totalCount}`);
      
      // Apply pagination after ranking
      const paginatedAds = rankedAds.slice(skip, skip + parseInt(limit));
      
      console.log(`📄 Pagination: skip=${skip}, limit=${limit}, paginatedAds=${paginatedAds.length}`);
      
      // REMOVED: Distance-based sorting and package grouping
      const sortedAds = paginatedAds;

      // Filter phone numbers based on privacy settings + viewer auth
      // Rule: show phone only if seller enabled AND viewer is authenticated
      const adsWithPrivacy = sortedAds.map(ad => ({
        ...ad,
        user: ad.user ? {
          ...ad.user,
          phone: (req.user && ad.user.showPhone) ? ad.user.phone : null
        } : ad.user
      }));

      // Set cache headers for GET requests
      res.set({
        'Cache-Control': 'public, max-age=60, s-maxage=120', // Cache for 60s, CDN cache for 120s
        'Vary': 'Accept-Encoding'
      });

      // Include quota information if user is authenticated
      let quota = null;
      if (req.user) {
        try {
          const FREE_ADS_LIMIT = 2;
          const now = new Date();
          
          // Get user quota
          const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
              freeAdsRemaining: true,
              freeAdsUsed: true
            }
          });
          
          const freeAdsRemaining = user?.freeAdsRemaining ?? FREE_ADS_LIMIT;
          const freeAdsUsed = user?.freeAdsUsed || 0;
          
          // Get business package quota (accept both 'paid' and 'verified' status)
          const activeBusinessPackages = await prisma.businessPackage.findMany({
            where: {
              userId: req.user.id,
              status: { in: ['paid', 'verified'] },
              expiresAt: { gt: now }
            },
            select: {
              totalAdsAllowed: true,
              adsUsed: true
            }
          });
          
          const businessAdsRemaining = activeBusinessPackages.reduce((sum, pkg) => {
            const remaining = (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0);
            return sum + remaining;
          }, 0);
          
          quota = {
            freeAdsRemaining,
            businessAdsRemaining,
            totalRemaining: freeAdsRemaining + businessAdsRemaining
          };
        } catch (error) {
          console.error('Error fetching quota for ads list:', error);
          // Don't fail the request if quota fetch fails
        }
      }

      // Final logging before response
      console.log(`✅ Final response: sending ${adsWithPrivacy.length} ads, total=${totalCount}, page=${page}, limit=${limit}`);
      if (adsWithPrivacy.length === 0) {
        console.warn(`⚠️ WARNING: Returning 0 ads in response!`);
        console.warn(`⚠️ Debug info: initialAds=${ads.length}, afterLocation=${adsWithDistance.length}, afterRanking=${rankedAds.length}, afterPagination=${paginatedAds.length}`);
      }
      
      res.json({
        success: true,
        ads: adsWithPrivacy,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount, // Total from filtered/ranked ads
          pages: Math.ceil(totalCount / parseInt(limit))
        },
        ...(quota && { quota })
      });
    } catch (error) {
      console.error('Get ads error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch ads' });
    }
  }
);

// Home Feed Endpoint - Uses navbar location with smart ranking
router.get('/home-feed',
  cacheMiddleware(60 * 1000), // Cache for 60 seconds
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('city').optional().isString(),
    query('state').optional().isString(),
    query('location').optional().isString(), // Location slug
  ],
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 12, // Default smaller batch for lazy loading
        city,
        state,
        location: locationSlug
      } = req.query;

      const now = new Date();
      
      // Get current location from navbar (priority: query params > location slug)
      let currentLocation = null;
      if (city || state) {
        currentLocation = { city, state };
      } else if (locationSlug) {
        try {
          const location = await prisma.location.findFirst({
            where: { slug: locationSlug },
            select: { city: true, state: true, neighbourhood: true }
          });
          if (location) {
            currentLocation = {
              city: location.city,
              state: location.state,
              neighbourhood: location.neighbourhood
            };
          }
        } catch (error) {
          console.error('Error fetching location:', error);
        }
      }

      // If no location provided, show all approved ads (fallback)
      let where = {
        status: 'APPROVED',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ]
      };

      // STEP 1: If location is provided, try to fetch ads from same city
      if (currentLocation && currentLocation.city) {
        where.city = currentLocation.city;
      }

      // Fetch enough ads to maintain priority across multiple pages
      // We need to fetch more than one page to ensure proper ranking
      const fetchLimit = Math.max(parseInt(limit) * 10, 200); // Fetch 10 pages worth or 200, whichever is larger
      
      // If no location provided, increase fetch limit to show more ads
      const actualFetchLimit = (currentLocation && currentLocation.city) ? fetchLimit : Math.max(parseInt(limit) * 20, 500);
      
      let ads = await prisma.ad.findMany({
        where,
        select: {
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
          postedAt: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
          packageType: true,
          lastShownAt: true,
          userId: true,
          attributes: true,
          slug: true,
          city: true,
          state: true,
          neighbourhood: true,
          category: { select: { id: true, name: true, slug: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
          location: { select: { id: true, name: true, slug: true, latitude: true, longitude: true, city: true, state: true } },
          user: { select: { id: true, name: true, avatar: true, phone: true, showPhone: true, isVerified: true } },
          _count: { select: { favorites: true } }
        },
        take: actualFetchLimit // Fetch enough for multiple pages
      });

      // STEP 2: If results < 10 and location is provided, expand to state level
      if (ads.length < 10 && currentLocation && currentLocation.state) {
        const stateWhere = {
          status: 'APPROVED',
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } }
          ],
          state: currentLocation.state
        };

        const stateAds = await prisma.ad.findMany({
          where: stateWhere,
          select: {
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
            postedAt: true,
            expiresAt: true,
            createdAt: true,
            updatedAt: true,
            packageType: true,
            lastShownAt: true,
            userId: true,
            attributes: true,
            slug: true,
            city: true,
            state: true,
            neighbourhood: true,
            category: { select: { id: true, name: true, slug: true } },
            subcategory: { select: { id: true, name: true, slug: true } },
            location: { select: { id: true, name: true, slug: true, latitude: true, longitude: true, city: true, state: true } },
            user: { select: { id: true, name: true, avatar: true, phone: true, showPhone: true, isVerified: true } },
            _count: { select: { favorites: true } }
          },
          take: actualFetchLimit // Fetch enough for multiple pages
        });

        // Merge: city ads first, then state ads (avoid duplicates)
        const cityAdIds = new Set(ads.map(ad => ad.id));
        const additionalStateAds = stateAds.filter(ad => !cityAdIds.has(ad.id));
        ads = [...ads, ...additionalStateAds];
      }

      // STEP 3: Apply smart ranking with Premium → Business → Free priority
      // Sort by: 1) Package priority (Premium → Business → Free), 2) Recency (newest first)
      // This ensures Premium ads always appear first, then Business, then Free
      // Within each package type, sort by date (newest first)
      
      // Separate ads by package type
      const premiumAds = ads.filter(ad => {
        if (!ad || !ad.id) return false;
        return ad.isPremium === true;
      });
      
      const businessAds = ads.filter(ad => {
        if (!ad || !ad.id) return false;
        if (ad.isPremium === true) return false; // Exclude premium
        return ad.packageType && ['SELLER_PRIME', 'SELLER_PLUS', 'MAX_VISIBILITY'].includes(ad.packageType);
      });
      
      const freeAds = ads.filter(ad => {
        if (!ad || !ad.id) return false;
        if (ad.isPremium === true) return false; // Exclude premium
        return !ad.packageType || ad.packageType === 'NORMAL';
      });
      
      // Sort each group by date (newest first)
      const sortByDate = (a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA; // Newest first
      };
      
      premiumAds.sort(sortByDate);
      businessAds.sort(sortByDate);
      freeAds.sort(sortByDate);
      
      // Combine: Premium → Business → Free (maintaining date order within each)
      const rankedAds = [...premiumAds, ...businessAds, ...freeAds];

      // Apply pagination (maintains priority across pages)
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const paginatedAds = rankedAds.slice(skip, skip + parseInt(limit));

      // Filter phone numbers based on privacy
      const adsWithPrivacy = paginatedAds.map(ad => ({
        ...ad,
        user: ad.user ? {
          ...ad.user,
          phone: (req.user && ad.user.showPhone) ? ad.user.phone : null
        } : ad.user
      }));

      res.json({
        success: true,
        ads: adsWithPrivacy,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: rankedAds.length,
          pages: Math.ceil(rankedAds.length / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Home feed error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch home feed' });
    }
  }
);

// Check ad limit status
router.get('/check-limit',
  authenticate,
  async (req, res) => {
    try {
      const now = new Date();
      const FREE_ADS_LIMIT = 2;

          // Check and reset monthly quota if needed
          const { checkAndResetUserQuota } = require('../services/monthlyQuotaReset');
          await checkAndResetUserQuota(req.user.id);

          // Get user's free ads quota (monthly)
          const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { 
              freeAdsRemaining: true,
              freeAdsUsed: true,
              freeAdsUsedThisMonth: true,
              lastFreeAdsResetDate: true
            }
          });

          const freeAdsRemaining = user?.freeAdsRemaining ?? FREE_ADS_LIMIT;
          const freeAdsUsed = user?.freeAdsUsedThisMonth || 0; // Use monthly counter

      // Get ALL UserBusinessPackages (including exhausted and expired) - IMPORTANT: Always show purchased packages
      const allUserBusinessPackages = await prisma.userBusinessPackage.findMany({
        where: {
          userId: req.user.id
        },
        orderBy: {
          purchaseTime: 'asc' // Oldest purchased first
        }
      });

      // Also get BusinessPackage for backward compatibility
      const allBusinessPackages = await prisma.businessPackage.findMany({
        where: {
          userId: req.user.id,
          status: { in: ['paid', 'verified'] },
          expiresAt: { gt: now }
        },
        select: {
          id: true,
          packageType: true,
          totalAdsAllowed: true,
          adsUsed: true,
          status: true,
          premiumSlotsTotal: true,
          premiumSlotsUsed: true,
          expiresAt: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      // Use UserBusinessPackage if available, otherwise fallback to BusinessPackage
      const packagesToUse = allUserBusinessPackages.length > 0 ? allUserBusinessPackages : allBusinessPackages;

      // Separate active packages (with remaining ads) and exhausted packages
      // Handle both UserBusinessPackage and BusinessPackage formats
      const activeBusinessPackages = packagesToUse.filter(pkg => {
        if ('totalAds' in pkg) {
          // UserBusinessPackage format
          const remaining = (pkg.totalAds || 0) - (pkg.usedAds || 0);
          const now = new Date();
          return remaining > 0 && pkg.status === 'active' && (!pkg.expiresAt || new Date(pkg.expiresAt) > now);
        } else {
          // BusinessPackage format (backward compatibility)
          const remaining = (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0);
          return remaining > 0;
        }
      });

      const exhaustedBusinessPackages = packagesToUse.filter(pkg => {
        if ('totalAds' in pkg) {
          // UserBusinessPackage format
          return pkg.status === 'exhausted' || ((pkg.totalAds || 0) - (pkg.usedAds || 0) === 0 && pkg.status !== 'expired');
        } else {
          // BusinessPackage format
          const remaining = (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0);
          return remaining === 0;
        }
      });

      console.log('📦 /api/ads/check-limit - Business packages:', {
        userId: req.user.id,
        totalPackages: allBusinessPackages.length,
        activeCount: activeBusinessPackages.length,
        exhaustedCount: exhaustedBusinessPackages.length,
        activePackages: activeBusinessPackages.map(pkg => ({
          id: pkg.id,
          type: pkg.packageType,
          totalAdsAllowed: pkg.totalAdsAllowed,
          adsUsed: pkg.adsUsed,
          remaining: (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0)
        })),
        exhaustedPackages: exhaustedBusinessPackages.map(pkg => ({
          id: pkg.id,
          type: pkg.packageType,
          totalAdsAllowed: pkg.totalAdsAllowed,
          adsUsed: pkg.adsUsed,
          remaining: 0,
          status: 'EXHAUSTED'
        }))
      });

      // Calculate total ads remaining from business packages
      const businessAdsRemaining = activeBusinessPackages.reduce((sum, pkg) => {
        if ('totalAds' in pkg) {
          // UserBusinessPackage format
          return sum + ((pkg.totalAds || 0) - (pkg.usedAds || 0));
        } else {
          // BusinessPackage format
          return sum + ((pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0));
        }
      }, 0);

      console.log('📊 /api/ads/check-limit - Quota calculation:', {
        businessAdsRemaining,
        freeAdsRemaining,
        totalRemaining: businessAdsRemaining + freeAdsRemaining
      });

      // CORE BUSINESS RULES (UPDATED):
      // 1. FREE ADS (monthly) are used FIRST
      // 2. Business package ads are used SECOND (after free ads exhausted)
      // 3. Payment required when BOTH are exhausted
      // 4. Total remaining = free ads + business ads (both count)
      
      const totalRemaining = freeAdsRemaining + businessAdsRemaining; // Sum of both

      const canPost = totalRemaining > 0;
      const hasLimit = !canPost;

      // Get total purchased packages count (all time) from UserBusinessPackage
      const totalPurchased = allUserBusinessPackages.length || allBusinessPackages.length;

      // Format packages for response - Include ALL packages (active + exhausted + expired)
      // Use UserBusinessPackage if available, otherwise BusinessPackage
      const packageNames = {
        MAX_VISIBILITY: 'Max Visibility',
        SELLER_PLUS: 'Seller Plus',
        SELLER_PRIME: 'Seller Prime'
      };

      const packages = packagesToUse.map(pkg => {
        if ('totalAds' in pkg) {
          // UserBusinessPackage format
          const remaining = (pkg.totalAds || 0) - (pkg.usedAds || 0);
          const now = new Date();
          const isExpired = pkg.expiresAt && new Date(pkg.expiresAt) <= now;
          const isExhausted = remaining === 0 && !isExpired;
          
          return {
            packageId: pkg.id,
            packageName: `${packageNames[pkg.packageType] || pkg.packageType} Package`,
            packageType: pkg.packageType,
            totalAds: pkg.totalAds || 0,
            usedAds: pkg.usedAds || 0,
            adsRemaining: remaining,
            isExhausted: isExhausted,
            isExpired: isExpired,
            status: isExpired ? 'EXPIRED' : (isExhausted ? 'EXHAUSTED' : 'ACTIVE'),
            purchasedAt: pkg.purchaseTime,
            expiresAt: pkg.expiresAt,
            amount: pkg.amount,
            allowedCategories: pkg.allowedCategories || []
          };
        } else {
          // BusinessPackage format (backward compatibility)
          const remaining = (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0);
          const isExhausted = remaining === 0;
          
          return {
            packageId: pkg.id,
            packageName: `${packageNames[pkg.packageType] || pkg.packageType} Package`,
            packageType: pkg.packageType,
            totalAds: pkg.totalAdsAllowed || 0,
            usedAds: pkg.adsUsed || 0,
            adsRemaining: remaining,
            isExhausted: isExhausted,
            status: isExhausted ? 'EXHAUSTED' : 'ACTIVE',
            purchasedAt: pkg.createdAt,
            expiresAt: pkg.expiresAt,
            premiumSlotsTotal: pkg.premiumSlotsTotal || 0,
            premiumSlotsUsed: pkg.premiumSlotsUsed || 0,
            premiumSlotsAvailable: (pkg.premiumSlotsTotal || 0) - (pkg.premiumSlotsUsed || 0)
          };
        }
      });

      // Calculate next reset date for free ads
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      nextMonth.setHours(0, 0, 0, 0);

      // Structured quota response
      const userAdQuota = {
        monthlyFreeAds: {
          total: FREE_ADS_LIMIT,
          used: freeAdsUsed,
          remaining: freeAdsRemaining,
          resetAt: nextMonth.toISOString()
        },
        packages: packages
      };

      res.json({
        success: true,
        hasLimit,
        canPost,
        // NEW: Structured quota data
        userAdQuota,
        // Quota information (backward compatibility)
        freeAdsRemaining: freeAdsRemaining,
        freeAdsUsed,
        freeAdsUsedThisMonth: freeAdsUsed,
        freeAdsLimit: FREE_ADS_LIMIT,
        businessAdsRemaining,
        totalRemaining,
        hasFreeAdsRemaining: freeAdsRemaining > 0,
        hasBusinessAdsRemaining: businessAdsRemaining > 0,
        // Package information
        activePackagesCount: activeBusinessPackages.length,
        exhaustedPackagesCount: exhaustedBusinessPackages.length,
        totalPackages: allBusinessPackages.length, // Total active packages (including exhausted)
        totalPurchased: totalPurchased, // Total packages purchased (all time, including expired)
        packages, // All packages (active + exhausted)
        activePackages: activeBusinessPackages.map(pkg => ({
          id: pkg.id,
          packageType: pkg.packageType,
          totalAdsAllowed: pkg.totalAdsAllowed || 0,
          adsUsed: pkg.adsUsed || 0,
          adsRemaining: (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0)
        })),
        exhaustedPackages: exhaustedBusinessPackages.map(pkg => ({
          id: pkg.id,
          packageType: pkg.packageType,
          totalAdsAllowed: pkg.totalAdsAllowed || 0,
          adsUsed: pkg.adsUsed || 0,
          adsRemaining: 0,
          status: 'EXHAUSTED'
        })),
        // Monthly quota info
        isMonthlyQuota: true,
        nextResetDate: (() => {
          const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          nextMonth.setHours(0, 0, 0, 0);
          return nextMonth.toISOString();
        })(),
        lastResetDate: user?.lastFreeAdsResetDate?.toISOString() || null,
        // Legacy fields for backward compatibility
        premiumSlotsTotal: activeBusinessPackages.reduce((sum, pkg) => sum + (pkg.premiumSlotsTotal || 0), 0),
        premiumSlotsUsed: activeBusinessPackages.reduce((sum, pkg) => sum + (pkg.premiumSlotsUsed || 0), 0),
        premiumSlotsAvailable: activeBusinessPackages.reduce((sum, pkg) => {
          return sum + ((pkg.premiumSlotsTotal || 0) - (pkg.premiumSlotsUsed || 0));
        }, 0)
      });
    } catch (error) {
      console.error('Check ad limit error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to check ad limit status',
        hasLimit: false,
        canPost: true,
        freeAdsUsed: 0,
        freeAdsLimit: 2,
        activePackagesCount: 0,
        totalAdsRemaining: 0,
        packages: []
      });
    }
  }
);

// Get ad posting eligibility (NEW - CORE BUSINESS RULES)
router.get('/eligibility', authenticate, async (req, res) => {
  try {
    const FREE_ADS_LIMIT = 2;
    const now = new Date();

    // Check and reset monthly quota if needed
    const { checkAndResetUserQuota } = require('../services/monthlyQuotaReset');
    await checkAndResetUserQuota(req.user.id);

    // Get user with freeAdsRemaining
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        freeAdsRemaining: true,
        freeAdsUsed: true,
        freeAdsUsedThisMonth: true
      }
    });

    const freeAdsRemaining = user?.freeAdsRemaining ?? FREE_ADS_LIMIT;
    const freeAdsUsed = user?.freeAdsUsedThisMonth || 0;

    // Check UserBusinessPackage (newer system)
    const userBusinessPackages = await prisma.userBusinessPackage.findMany({
      where: {
        userId: req.user.id,
        status: 'active',
        expiresAt: { gt: now }
      },
      select: {
        id: true,
        packageType: true,
        totalAds: true,
        usedAds: true,
        expiresAt: true
      }
    });

    // Check BusinessPackage (older system, backward compatibility)
    const businessPackages = await prisma.businessPackage.findMany({
      where: {
        userId: req.user.id,
        status: { in: ['paid', 'verified'] },
        expiresAt: { gt: now }
      },
      select: {
        id: true,
        packageType: true,
        totalAdsAllowed: true,
        adsUsed: true,
        expiresAt: true
      }
    });

    // Calculate business ads remaining
    const businessAdsRemaining = userBusinessPackages.reduce((sum, pkg) => {
      return sum + ((pkg.totalAds || 0) - (pkg.usedAds || 0));
    }, 0) + businessPackages.reduce((sum, pkg) => {
      return sum + ((pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0));
    }, 0);

    const businessPackageActive = userBusinessPackages.length > 0 || businessPackages.length > 0;
    const businessPackageExpired = businessPackageActive && businessAdsRemaining === 0;
    const totalRemaining = freeAdsRemaining + businessAdsRemaining;

    // NEW PAYMENT LOGIC:
    // 1. If Business Package Active + Ads Remaining: Hide all payments, allow posting
    // 2. If Ads Exhausted: Show Business renewal / upgrade
    // 3. If Package Expired: Allow only 2 free ads / month, after limit → block + upgrade popup
    // 4. Premium ads: ALWAYS require payment (ignore quota)

    const showNormalPayment = !businessPackageActive || businessPackageExpired;
    const showBusinessRenewal = businessPackageExpired;
    const canPostNormalAd = businessAdsRemaining > 0 || freeAdsRemaining > 0;
    const canPostPremiumAd = true; // Always allowed (but requires payment)
    const premiumRequiresPayment = true; // Premium ads ALWAYS paid
    const shouldShowUpgradePopup = !canPostNormalAd && freeAdsRemaining === 0;

    res.json({
      success: true,
      freeAdsRemaining,
      businessAdsRemaining,
      businessPackageActive,
      businessPackageExpired,
      totalRemaining,
      // Payment visibility
      showNormalPayment,
      showBusinessRenewal,
      shouldShowUpgradePopup,
      // Posting eligibility
      canPostFreeAd: freeAdsRemaining > 0,
      canPostNormalAd,
      canPostPremiumAd,
      premiumRequiresPayment,
      // Additional info
      freeAdsLimit: FREE_ADS_LIMIT,
      freeAdsUsed,
      activePackages: [
        ...userBusinessPackages.map(pkg => ({
          id: pkg.id,
          packageType: pkg.packageType,
          totalAdsAllowed: pkg.totalAds || 0,
          adsUsed: pkg.usedAds || 0,
          adsRemaining: (pkg.totalAds || 0) - (pkg.usedAds || 0),
          expiresAt: pkg.expiresAt
        })),
        ...businessPackages.map(pkg => ({
          id: pkg.id,
          packageType: pkg.packageType,
          totalAdsAllowed: pkg.totalAdsAllowed || 0,
          adsUsed: pkg.adsUsed || 0,
          adsRemaining: (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0),
          expiresAt: pkg.expiresAt
        }))
      ]
    });
  } catch (error) {
    console.error('Get eligibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch eligibility',
      freeAdsRemaining: 0,
      businessAdsRemaining: 0,
      businessPackageActive: false,
      businessPackageExpired: false,
      totalRemaining: 0,
      showNormalPayment: true,
      showBusinessRenewal: false,
      shouldShowUpgradePopup: false,
      canPostFreeAd: false,
      canPostNormalAd: false,
      canPostPremiumAd: true,
      premiumRequiresPayment: true
    });
  }
});

// Get price suggestion based on similar ads
router.get('/price-suggestion',
  cacheMiddleware(300 * 1000), // Cache for 5 minutes
  [
    query('categoryId').notEmpty().withMessage('Category ID is required'),
    query('subcategoryId').optional().isString(),
    query('condition').optional().isIn(['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed',
          errors: errors.array() 
        });
      }

      const { categoryId, subcategoryId, condition } = req.query;
      const now = new Date();

      // Build where clause for similar ads
      const where = {
        // Only show APPROVED ads (excludes INACTIVE)
        status: 'APPROVED',
        categoryId: categoryId,
        price: { gt: 0 }, // Only include ads with valid prices
        // Filter out expired ads
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } }
            ]
          }
        ]
      };

      // Add subcategory filter if provided
      if (subcategoryId) {
        where.subcategoryId = subcategoryId;
      }

      // Add condition filter if provided
      if (condition) {
        where.condition = condition;
      }

      // Get similar ads with prices
      const similarAds = await prisma.ad.findMany({
        where,
        select: {
          price: true,
          condition: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 100 // Limit to recent 100 ads for better accuracy
      });

      if (similarAds.length === 0) {
        return res.json({
          success: true,
          suggestion: {
            min: null,
            max: null,
            average: null,
            median: null,
            recommended: null,
            sampleSize: 0,
            message: 'No similar ads found to suggest a price'
          }
        });
      }

      // Extract prices and calculate statistics
      const prices = similarAds.map(ad => ad.price).filter(price => price > 0).sort((a, b) => a - b);

      if (prices.length === 0) {
        return res.json({
          success: true,
          suggestion: {
            min: null,
            max: null,
            average: null,
            median: null,
            recommended: null,
            sampleSize: 0,
            message: 'No valid prices found in similar ads'
          }
        });
      }

      // Calculate statistics
      const min = prices[0];
      const max = prices[prices.length - 1];
      const sum = prices.reduce((acc, price) => acc + price, 0);
      const average = Math.round(sum / prices.length);
      
      // Calculate median
      const median = prices.length % 2 === 0
        ? Math.round((prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2)
        : prices[Math.floor(prices.length / 2)];

      // Recommended price: Use median as it's less affected by outliers
      // But also consider average for a balanced suggestion
      const recommended = Math.round((median + average) / 2);

      // Calculate price ranges
      const lowerQuartile = prices[Math.floor(prices.length * 0.25)];
      const upperQuartile = prices[Math.floor(prices.length * 0.75)];

      res.json({
        success: true,
        suggestion: {
          min,
          max,
          average,
          median,
          recommended,
          lowerQuartile,
          upperQuartile,
          sampleSize: prices.length,
          priceRange: {
            low: lowerQuartile,
            medium: median,
            high: upperQuartile
          },
          message: `Based on ${prices.length} similar ${condition ? condition.toLowerCase() : ''} ad${prices.length > 1 ? 's' : ''}`
        }
      });
    } catch (error) {
      console.error('Price suggestion error:', error);
      res.status(500).json({ success: false, message: 'Failed to get price suggestion' });
    }
  }
);

// Live Location Feed - REMOVED: location filtering
router.get('/live-location',
  cacheMiddleware(30 * 1000), // Cache for 30 seconds (shorter for live feed)
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('category').optional().isString(),
    query('subcategory').optional().isString(),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
    query('search').optional().isString(),
    query('condition').optional().isIn(['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed',
          errors: errors.array() 
        });
      }

      const {
        page = 1,
        limit = 20,
        category,
        subcategory,
        minPrice,
        maxPrice,
        search,
        condition
      } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const now = new Date();

      // Build where clause - REMOVED: location coordinate filtering
      const where = {
        // Only show APPROVED ads (excludes INACTIVE)
        status: 'APPROVED',
        // Filter out expired ads
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } }
            ]
          }
        ]
      };

      // Parallelize category and subcategory lookups
      const [categoryObj, subcategoryObj] = await Promise.all([
        category ? prisma.category.findUnique({ where: { slug: category }, select: { id: true } }) : null,
        subcategory ? prisma.subcategory.findFirst({ where: { slug: subcategory }, select: { id: true } }) : null,
      ]);

      if (categoryObj) {
        where.categoryId = categoryObj.id;
      }

      if (subcategoryObj) {
        where.subcategoryId = subcategoryObj.id;
      }

      // Price filter
      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price.gte = parseFloat(minPrice);
        if (maxPrice) where.price.lte = parseFloat(maxPrice);
      }

      // Condition filter
      if (condition) {
        where.condition = condition;
      }

      // Search filter
      if (search) {
        where.AND.push({
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        });
      }

      // REMOVED: Location-based distance filtering
      const ads = await prisma.ad.findMany({
        where,
        select: {
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
          updatedAt: true,
          attributes: true,
          category: { select: { id: true, name: true, slug: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
          location: { select: { id: true, name: true, slug: true, latitude: true, longitude: true } },
          user: { select: { id: true, name: true, avatar: true, isVerified: true } },
          _count: { select: { favorites: true } }
        },
        orderBy: [
          { createdAt: 'desc' }
        ]
      });

      // REMOVED: Distance calculation and radius filtering
      const adsWithDistance = ads;

      // Apply pagination
      const total = adsWithDistance.length;
      const paginatedAds = adsWithDistance.slice(skip, skip + parseInt(limit));

      // Ensure all ads have images as arrays
      const adsWithImages = paginatedAds.map(ad => ({
        ...ad,
        images: Array.isArray(ad.images) 
          ? ad.images.filter(img => img && (typeof img === 'string' ? img.trim() !== '' : true)) 
          : (ad.images && typeof ad.images === 'string' && ad.images.trim() !== '' ? [ad.images] : [])
      }));

      // REMOVED: Distance-based sorting and premium prioritization
      const sortedAds = adsWithImages;

      // Set cache headers for live feed (shorter cache)
      res.set({
        'Cache-Control': 'public, max-age=30, s-maxage=60', // Cache for 30s, CDN cache for 60s
        'Vary': 'Accept-Encoding'
      });

      res.json({
        success: true,
        ads: sortedAds,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
      });
    } catch (error) {
      console.error('Live location feed error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch live location feed' });
    }
  }
);

// Get single ad
// NOTE: No cache middleware - view count needs to increment on every request
router.get('/:id', async (req, res) => {
  try {
    const ad = await prisma.ad.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        subcategory: true,
        location: true,
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            phone: true,
            showPhone: true,
            email: true,
            isVerified: true
          }
        },
        _count: { select: { favorites: true } }
      }
    });

    if (!ad) {
      return res.status(404).json({ success: false, message: 'Ad not found' });
    }

    // Check if ad is expired (but still allow viewing for owner)
    const now = new Date();
    if (ad.expiresAt && ad.expiresAt <= now && ad.status === 'APPROVED') {
      // Mark as expired if not already marked
      if (ad.status !== 'EXPIRED') {
        await prisma.ad.update({
          where: { id: ad.id },
          data: { status: 'EXPIRED' }
        });
        ad.status = 'EXPIRED';
      }
    }

    // Ensure images is always an array
    if (ad.images) {
      ad.images = Array.isArray(ad.images) ? ad.images.filter(img => img && img.trim && img.trim() !== '') : (ad.images.trim && ad.images.trim() !== '' ? [ad.images] : []);
    } else {
      ad.images = [];
    }

    // Increment views
    await prisma.ad.update({
      where: { id: ad.id },
      data: { views: { increment: 1 } }
    });
    
    // Update the ad object with incremented view count for response
    ad.views = (ad.views || 0) + 1;

    // Apply phone privacy filtering + viewer auth
    // Rule: show phone only if seller enabled AND viewer is authenticated
    if (ad.user && (!req.user || !ad.user.showPhone)) {
      ad.user.phone = null;
    }

    res.json({ success: true, ad });
  } catch (error) {
    console.error('Get ad error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ad' });
  }
});


// Create ad
router.post('/',
  authenticate,
  uploadImages,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('price')
      .notEmpty().withMessage('Price is required')
      .isFloat({ min: 0 }).withMessage('Price must be a valid number greater than or equal to 0'),
    body('categoryId').notEmpty().withMessage('Category is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('❌ Validation errors:', errors.array());
        console.error('📝 Request body keys:', Object.keys(req.body || {}));
        console.error('📝 Request body values:', {
          title: req.body?.title?.substring(0, 50),
          description: req.body?.description?.substring(0, 50),
          price: req.body?.price,
          categoryId: req.body?.categoryId,
          subcategoryId: req.body?.subcategoryId,
          state: req.body?.state,
          city: req.body?.city,
          hasImages: !!req.uploadedImages?.length,
          hasAttributes: !!req.body?.attributes,
          attributesType: typeof req.body?.attributes
        });
        
        // Format errors for better frontend display
        const formattedErrors = errors.array().map(err => ({
          field: err.param || err.path || 'unknown',
          message: err.msg || err.message || 'Validation failed',
          value: err.value
        }));
        
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed',
          errors: formattedErrors,
          validationErrors: errors.array() // Keep original format for compatibility
        });
      }
      
      // Log full request body for debugging premium slot issues
      console.log('📦 Full request body (after validation):', {
        premiumType: req.body.premiumType,
        isUrgent: req.body.isUrgent,
        title: req.body.title?.substring(0, 30),
        hasImages: !!req.uploadedImages && req.uploadedImages.length > 0,
        imageCount: req.uploadedImages?.length || 0,
        allBodyKeys: Object.keys(req.body || {})
      });

      if (!req.uploadedImages || req.uploadedImages.length === 0) {
        // If payment was made but images failed, mark payment order for refund/retry
        const paymentOrderId = req.body.paymentOrderId;
        if (paymentOrderId) {
          console.error('❌ Image processing failed after payment:', {
            paymentOrderId,
            userId: req.user.id,
            message: 'Images required but upload failed'
          });
          // Mark payment order for manual review/refund
          try {
            await prisma.adPostingOrder.update({
              where: { razorpayOrderId: paymentOrderId },
              data: { 
                status: 'failed',
                // Store error in metadata if available
              }
            });
          } catch (updateError) {
            console.error('Failed to update payment order status:', updateError);
          }
        }
        return res.status(400).json({ 
          success: false, 
          message: 'At least one image is required. If payment was made, please contact support.',
          paymentOrderId: paymentOrderId || null,
          requiresSupport: !!paymentOrderId
        });
      }

      if (req.uploadedImages.length > 4) {
        return res.status(400).json({ success: false, message: 'Maximum 4 images allowed' });
      }

      // Ad posting is now FREE - only premium features require payment
      const paymentOrderId = req.body.paymentOrderId; // Optional payment order ID (for premium features)

      // If payment order ID provided, verify it (for premium features)
      let paymentOrder = null;
      if (paymentOrderId) {
        // Verify payment order - fetch with adData included
        console.log('🔍 Verifying payment order for premium features:', paymentOrderId);
        paymentOrder = await prisma.adPostingOrder.findUnique({
          where: { razorpayOrderId: paymentOrderId },
          select: {
            id: true,
            userId: true,
            status: true,
            amount: true,
            adData: true,
            razorpayPaymentId: true
          }
        });

        if (!paymentOrder) {
          console.error('❌ Payment order not found:', paymentOrderId);
          return res.status(402).json({ 
            success: false, 
            message: 'Payment order not found. Please complete payment first.',
            requiresPayment: true
          });
        }

        if (paymentOrder.userId !== req.user.id) {
          console.error('❌ Payment order belongs to different user');
          return res.status(403).json({ 
            success: false, 
            message: 'Payment order does not belong to you.',
            requiresPayment: true
          });
        }

        // Accept multiple success statuses: 'paid', 'verified', 'activated'
        const successStatuses = ['paid', 'verified', 'activated'];
        if (!successStatuses.includes(paymentOrder.status)) {
          console.error('❌ Payment order not in success state. Status:', paymentOrder.status);
          
          // If payment ID exists, verify payment status from Razorpay
          if (paymentOrder.razorpayPaymentId) {
            try {
              const Razorpay = require('razorpay');
              const razorpay = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET
              });
              
              const razorpayPayment = await razorpay.payments.fetch(paymentOrder.razorpayPaymentId);
              
              // If Razorpay shows payment as captured/authorized, update our status
              if (razorpayPayment.status === 'captured' || razorpayPayment.status === 'authorized') {
                console.log('✅ Payment confirmed from Razorpay, updating order status to paid');
                await prisma.adPostingOrder.update({
                  where: { id: paymentOrder.id },
                  data: { status: 'paid' }
                });
                // Update paymentOrder status too
                const { updateOrderStatus } = require('../services/paymentProcessor');
                await updateOrderStatus(paymentOrder.razorpayOrderId, 'paid', paymentOrder.razorpayPaymentId, 'ad_posting');
                
                // Retry with updated status
                paymentOrder.status = 'paid';
              } else {
                return res.status(402).json({ 
                  success: false, 
                  message: `Payment not completed. Order status: ${paymentOrder.status}. Please complete payment first.`,
                  requiresPayment: true,
                  orderStatus: paymentOrder.status,
                  razorpayStatus: razorpayPayment.status
                });
              }
            } catch (verifyError) {
              console.error('❌ Error verifying payment from Razorpay:', verifyError);
              // Continue with original check
            }
          }
          
          // Final check after potential fix
          if (!successStatuses.includes(paymentOrder.status)) {
            return res.status(402).json({ 
              success: false, 
              message: `Payment not completed. Order status: ${paymentOrder.status}. Please complete payment first.`,
              requiresPayment: true,
              orderStatus: paymentOrder.status
            });
          }
        }

        console.log('✅ Payment order verified for premium features:', {
          orderId: paymentOrder.id,
          status: paymentOrder.status,
          amount: paymentOrder.amount
        });
      }

      const { title, description, price, originalPrice, discount, condition, categoryId, subcategoryId, locationId, state, city, neighbourhood, exactLocation, attributes, specifications } = req.body;

      // Verify category exists
      const category = await prisma.category.findUnique({ where: { id: categoryId } });

      if (!category) {
        return res.status(400).json({ success: false, message: 'Invalid category' });
      }

      // Verify location exists if provided
      let location = null;
      if (locationId) {
        location = await prisma.location.findUnique({ where: { id: locationId } });
        if (!location) {
          return res.status(400).json({ success: false, message: 'Invalid location' });
        }
      }

      // Verify subcategory if provided
      if (subcategoryId) {
        const subcategory = await prisma.subcategory.findUnique({
          where: { id: subcategoryId }
        });
        if (!subcategory || subcategory.categoryId !== categoryId) {
          return res.status(400).json({ success: false, message: 'Invalid subcategory' });
        }
      }

      // Ensure images is an array and normalize format
      // Handle both old format (array of URLs) and new format (array of objects with url and altText)
      let imagesArray = Array.isArray(req.uploadedImages) ? req.uploadedImages : [];
      // Normalize: extract URLs if objects, keep strings as-is
      imagesArray = imagesArray.map(img => {
        if (typeof img === 'string') return img; // Old format: just URL string
        if (img && img.url) return img.url; // New format: object with url property
        return img; // Fallback
      });
      
      // Store alt texts separately for future use (can be added to schema later)
      const imageAltTexts = Array.isArray(req.uploadedImages) 
        ? req.uploadedImages.map(img => {
            if (typeof img === 'string') return null; // No alt text for old format
            if (img && img.altText) return img.altText;
            return null;
          })
        : [];
      
      console.log('📸 Normalized images:', imagesArray.length, 'URLs');
      if (imageAltTexts.some(alt => alt)) {
        console.log('📝 Image alt texts generated:', imageAltTexts.filter(alt => alt).length);
      }

      // ==================== CONTENT MODERATION ====================
      // NEW FLOW: Post ad first, moderate in background
      // If inappropriate content found, ad will be DISABLED (status: DISABLED)
      // User can edit and resubmit disabled ads
      
      console.log('📝 Ad will be created with PENDING status. Moderation will run in background.');
      
      // Store images for background moderation (use URLs as buffers won't be available later)
      const imagesForModeration = imagesArray.length > 0 ? imagesArray : [];
      // ==================== END MODERATION ====================
      
      // Expiry will be calculated based on ad type (free vs business/premium)
      // Will be set after determining quota usage
      let expiresAt = null;
      
      // Get premium options from payment order OR request body (for business package slots)
      let premiumType = null;
      let isUrgent = false;
      let premiumExpiresAt = null;
      
      // First, try to get from request body (for business package slots)
      console.log('📦 Request body premium fields:', {
        premiumType: req.body.premiumType,
        isUrgent: req.body.isUrgent,
        hasPaymentOrder: !!paymentOrderId
      });
      
      if (req.body.premiumType) {
        premiumType = req.body.premiumType;
        console.log('📦 Premium type from request body:', premiumType);
      }
      if (req.body.isUrgent !== undefined) {
        isUrgent = req.body.isUrgent === 'true' || req.body.isUrgent === true;
        console.log('📦 Urgent flag from request body:', isUrgent);
      }
      
      // If payment order exists, override with payment order data (for paid premium features)
      if (paymentOrder && paymentOrder.adData) {
          // Parse adData if it's a JSON string
          let adData = paymentOrder.adData;
          if (typeof adData === 'string') {
            try {
              adData = JSON.parse(adData);
            } catch (e) {
              console.error('Error parsing adData:', e);
              adData = {};
            }
          }
          
          // Override with payment order data (paid premium features take precedence)
          premiumType = adData.premiumType || premiumType;
          isUrgent = adData.isUrgent !== undefined ? adData.isUrgent : isUrgent;
      }
      
      // Calculate premium expiry based on type (for both payment order and business package slots)
      if (premiumType || isUrgent) {
        // Get settings from database
        const settingsRecord = await prisma.premiumSettings.findUnique({
          where: { key: 'premium_settings' }
        });
        
        let durations = {
          TOP: parseInt(process.env.PREMIUM_DURATION_TOP || '7'),
          FEATURED: parseInt(process.env.PREMIUM_DURATION_FEATURED || '14'),
          BUMP_UP: parseInt(process.env.PREMIUM_DURATION_BUMP_UP || '1'),
        };
        
        if (settingsRecord && settingsRecord.value) {
          try {
            const parsed = JSON.parse(settingsRecord.value);
            durations = parsed.durations || durations;
          } catch (e) {
            console.error('Error parsing settings:', e);
          }
        }
        
        // Calculate premium expiry
        if (premiumType) {
          const duration = durations[premiumType] || 7;
          premiumExpiresAt = new Date();
          premiumExpiresAt.setDate(premiumExpiresAt.getDate() + duration);
        }
        
        // Urgent badge expiry
        if (isUrgent) {
          let urgentDuration = parseInt(process.env.PREMIUM_DURATION_URGENT || '7');
          
          if (settingsRecord && settingsRecord.value) {
            try {
              const parsed = JSON.parse(settingsRecord.value);
              urgentDuration = parsed.durations?.URGENT || urgentDuration;
            } catch (e) {
              console.error('Error parsing settings:', e);
            }
          }
          
          // If no premium type, set urgent expiry, otherwise use premium expiry
          if (!premiumType) {
            premiumExpiresAt = new Date();
            premiumExpiresAt.setDate(premiumExpiresAt.getDate() + urgentDuration);
          }
        }
        
        console.log('⭐ Premium options:', {
          premiumType,
          isUrgent,
          premiumExpiresAt,
          source: paymentOrder ? 'payment_order' : 'business_package_slot'
        });
      }
      
      // Determine if this is a premium ad (has premium features)
      const isPremiumAd = !!(premiumType || isUrgent);
      const now = new Date();
      
      console.log('🔍 Premium ad check:', {
        premiumType,
        isUrgent,
        isPremiumAd,
        hasPaymentOrder: !!paymentOrderId
      });

      // Check if user has any active business packages (accept both 'paid' and 'verified' status)
      const activeBusinessPackages = await prisma.businessPackage.findMany({
        where: {
          userId: req.user.id,
          status: { in: ['paid', 'verified'] },
          expiresAt: {
            gt: now
          }
        },
        select: {
          id: true,
          packageType: true,
          totalAdsAllowed: true,
          adsUsed: true,
          expiresAt: true,
          premiumSlotsTotal: true, // Keep for backward compatibility
          premiumSlotsUsed: true // Keep for backward compatibility
        }
      });
      
      console.log('📦 Active business packages found:', activeBusinessPackages.length);
      activeBusinessPackages.forEach((pkg, index) => {
        const adsRemaining = (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0);
        const premiumSlotsAvailable = (pkg.premiumSlotsTotal || 0) - (pkg.premiumSlotsUsed || 0);
        console.log(`   Package ${index + 1}: ${pkg.packageType} - ${pkg.adsUsed}/${pkg.totalAdsAllowed || 0} ads used, ${adsRemaining} remaining`);
        if (pkg.totalAdsAllowed === 0 || pkg.totalAdsAllowed === null) {
          console.warn(`   ⚠️  WARNING: Package ${pkg.id} has totalAdsAllowed: ${pkg.totalAdsAllowed} - Run: npm run fix-business-package-quota`);
        }
        console.log(`      (Premium slots: ${pkg.premiumSlotsUsed}/${pkg.premiumSlotsTotal} used, ${premiumSlotsAvailable} available - deprecated)`);
      });

      // NEW SYSTEM: Check ads allowed from business packages (for ALL ads, not just premium)
      // Sum up all available ads (totalAdsAllowed - adsUsed)
      const totalAdsRemaining = activeBusinessPackages.reduce((sum, pkg) => {
        const remaining = (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0);
        return sum + remaining;
      }, 0);
      
      console.log('📊 Total ads remaining from business packages:', totalAdsRemaining);
      
      // Check if any packages have totalAdsAllowed: 0 (needs fix)
      const packagesWithZeroQuota = activeBusinessPackages.filter(pkg => (pkg.totalAdsAllowed || 0) === 0);
      if (packagesWithZeroQuota.length > 0) {
        console.warn('⚠️  WARNING: Found packages with totalAdsAllowed: 0. Run: npm run fix-business-package-quota');
        packagesWithZeroQuota.forEach(pkg => {
          console.warn(`   Package ${pkg.id} (${pkg.packageType}): totalAdsAllowed = ${pkg.totalAdsAllowed}`);
        });
      }

      // CORE BUSINESS RULES:
      // 1. Premium ads (TOP/FEATURED/BUMP_UP) ALWAYS require payment (ignore free/business quota)
      // 2. Business package = normal ads free (quota based)
      // 3. Free ads = fallback for normal ads only

      // Check and reset monthly quota if needed (before checking quota)
      const { checkAndResetUserQuota } = require('../services/monthlyQuotaReset');
      await checkAndResetUserQuota(req.user.id);

      // Get user quota (monthly)
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          freeAdsRemaining: true,
          freeAdsUsed: true,
          freeAdsUsedThisMonth: true,
          lastFreeAdsResetDate: true
        }
      });

      const freeAdsRemaining = user?.freeAdsRemaining ?? FREE_ADS_LIMIT;
      const freeAdsUsed = user?.freeAdsUsedThisMonth || 0; // Use monthly counter instead of lifetime
      const businessAdsRemaining = totalAdsRemaining;

      // RULE 1: Premium ads ALWAYS require payment
      if (isPremiumAd && !paymentOrderId) {
        console.log('❌ Premium ad requires payment (ALWAYS PAID)');
        return res.status(402).json({
          success: false,
          message: 'Premium ads (TOP/FEATURED/BUMP_UP) always require payment. Please purchase premium options.',
          requiresPayment: true,
          isPremiumAd: true,
          premiumRequiresPayment: true,
          options: {
            premiumOptions: 'Purchase Premium Options for this ad'
          }
        });
      }

      // RULE 2 & 3: Normal ads - check quota (business package first, then free ads)
      if (!isPremiumAd && !paymentOrderId) {
        // Check if user has quota for normal ads
        const hasQuota = businessAdsRemaining > 0 || freeAdsRemaining > 0;
        
        console.log('📊 Quota check for normal ad:', {
          businessAdsRemaining,
          freeAdsRemaining,
          totalRemaining: businessAdsRemaining + freeAdsRemaining,
          hasQuota,
          activePackagesCount: activeBusinessPackages.length,
          packages: activeBusinessPackages.map(pkg => ({
            id: pkg.id,
            packageType: pkg.packageType,
            totalAdsAllowed: pkg.totalAdsAllowed,
            adsUsed: pkg.adsUsed,
            remaining: (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0)
          }))
        });
        
        if (!hasQuota) {
          console.log('❌ No quota remaining for normal ad:', {
            businessAdsRemaining,
            freeAdsRemaining,
            activePackagesCount: activeBusinessPackages.length,
            packages: activeBusinessPackages.map(pkg => ({
              id: pkg.id,
              packageType: pkg.packageType,
              totalAdsAllowed: pkg.totalAdsAllowed,
              adsUsed: pkg.adsUsed,
              remaining: (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0)
            }))
          });
          
          // Build error message with actual counts (Priority: Free ads first, then business package)
          const freeAdsText = freeAdsRemaining === 0 
            ? `all ${FREE_ADS_LIMIT} free ads (monthly)` 
            : `${FREE_ADS_LIMIT - freeAdsRemaining}/${FREE_ADS_LIMIT} free ads`;
          const businessAdsText = businessAdsRemaining === 0 && activeBusinessPackages.length > 0
            ? `all business package ads`
            : businessAdsRemaining === 0 && activeBusinessPackages.length === 0
              ? `all 0 business package ads`
              : `${businessAdsRemaining} business package ads remaining`;
          
          return res.status(402).json({
            success: false,
            message: `You have used ${freeAdsText} and ${businessAdsText}. Free ads are used first, then business package ads. To post more ads, please select premium options below or purchase a new business package.`,
            requiresPayment: true,
            freeAdsRemaining,
            freeAdsUsed,
            freeAdsLimit: FREE_ADS_LIMIT,
            businessAdsRemaining,
            totalRemaining: businessAdsRemaining + freeAdsRemaining,
            diagnostic: {
              activePackagesCount: activeBusinessPackages.length,
              packages: activeBusinessPackages.map(pkg => ({
                id: pkg.id,
                packageType: pkg.packageType,
                totalAdsAllowed: pkg.totalAdsAllowed,
                adsUsed: pkg.adsUsed,
                remaining: (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0),
                expiresAt: pkg.expiresAt
              })),
              userFreeAdsRemaining: freeAdsRemaining,
              userFreeAdsUsed: freeAdsUsed
            },
            options: {
              premiumOptions: 'Select premium features to boost your ad visibility',
              businessPackage: 'Purchase a Business Package for more ads'
            }
          });
        }
      }

      // CORE BUSINESS RULES - Quota Management:
      // 1. Premium ads: ALWAYS paid (paymentOrderId required) - NO quota decrement
      // 2. Normal ads with business package: Use business package quota (decrement businessAdsRemaining)
      // 3. Normal ads without business package: Use free ads quota (decrement freeAdsRemaining)

      let packageToUse = null;
      let useBusinessPackageQuota = false;
      let useFreeAdsQuota = false;

      if (isPremiumAd) {
        // Premium ads: ALWAYS paid, no quota decrement
        console.log('⭐ Premium ad - using payment order, no quota decrement');
      } else if (!paymentOrderId) {
        // Normal ad: Check quota priority (FREE ADS FIRST, then business package ads)
        // PRIORITY: 1. Free ads (monthly) 2. Business package ads 3. Payment required
        if (freeAdsRemaining > 0) {
          // Use free ads quota FIRST
          useFreeAdsQuota = true;
          console.log(`✅ Using free ads quota FIRST: ${freeAdsRemaining} remaining`);
        } else if (businessAdsRemaining > 0) {
          // Use business package quota SECOND (only if free ads exhausted)
          // PRIORITY: Use UserBusinessPackage table and consume from OLDEST active package first
          // Reuse existing 'now' variable from outer scope
          const userBusinessPackages = await prisma.userBusinessPackage.findMany({
            where: {
              userId: req.user.id,
              status: 'active',
              expiresAt: { gt: now } // Not expired
            },
            orderBy: { purchaseTime: 'asc' } // OLDEST FIRST
          });

          // Sell Box Style LOGIC: Find oldest active package with remaining ads
          // Auto-switch: When one package is exhausted, system automatically uses next oldest package
          for (const pkg of userBusinessPackages) {
            const remaining = (pkg.totalAds || 0) - (pkg.usedAds || 0);
            // Reuse existing 'now' variable from outer scope
            const isExpired = pkg.expiresAt && new Date(pkg.expiresAt) <= now;
            const isActive = !isExpired && pkg.status === 'active';
            
            // Only use active packages with remaining ads
            if (isActive && remaining > 0) {
              packageToUse = pkg;
              useBusinessPackageQuota = true;
              console.log(`✅ Using OLDEST business package (Sell Box style logic): ${pkg.id} (${pkg.packageType}) purchased at ${pkg.purchaseTime}, ${remaining} ads remaining`);
              console.log(`   Package will auto-switch to next oldest when exhausted`);
              break;
            }
          }

          // Fallback to BusinessPackage table if UserBusinessPackage not found (backward compatibility)
          if (!packageToUse) {
            for (const pkg of activeBusinessPackages) {
              const remaining = (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0);
              if (remaining > 0) {
                packageToUse = pkg;
                useBusinessPackageQuota = true;
                console.log(`✅ Using business package quota (fallback): ${pkg.id} (${pkg.packageType}) with ${remaining} ads remaining`);
                break;
              }
            }
          }
        }
      }

      // Store quota info for post-creation decrement
      req.businessPackageId = packageToUse?.id;
      req.userBusinessPackageId = packageToUse?.id; // Store UserBusinessPackage ID if using it
      req.isUserBusinessPackage = packageToUse && 'totalAds' in packageToUse; // Check if it's UserBusinessPackage
      req.useBusinessPackageQuota = useBusinessPackageQuota;
      req.useFreeAdsQuota = useFreeAdsQuota;
      
      // Get package priority for ad ranking
      const adRankingService = require('../services/adRankingService');
      let packagePriority = 1; // Default to NORMAL
      if (packageToUse && packageToUse.packageType) {
        packagePriority = adRankingService.PACKAGE_TYPE_MAP[packageToUse.packageType] || 1;
      } else {
        // Fallback: check user's active package
        packagePriority = await adRankingService.getUserPackagePriority(req.user.id);
      }
      req.adPackagePriority = packagePriority;

      console.log('📝 Quota allocation:', {
        isPremiumAd,
        hasPaymentOrder: !!paymentOrderId,
        useBusinessPackageQuota,
        useFreeAdsQuota,
        businessPackageId: req.businessPackageId,
        packagePriority
      });

      // Calculate expiry based on ad type
      // Free ads: shorter expiry (7 days)
      // Business/premium ads: based on package validity
      // Reuse existing 'now' variable declared earlier
      if (isPremiumAd || useBusinessPackageQuota) {
        // Business/premium ads: expiry based on package validity
        if (packageToUse && packageToUse.expiresAt) {
          // Use package expiry date, but not more than 90 days from now
          const packageExpiry = new Date(packageToUse.expiresAt);
          const maxExpiry = new Date();
          maxExpiry.setDate(maxExpiry.getDate() + 90);
          expiresAt = packageExpiry < maxExpiry ? packageExpiry : maxExpiry;
          console.log(`⏰ Business/premium ad expiry: ${expiresAt.toISOString()} (based on package validity)`);
        } else {
          // Default: 30 days for business/premium ads
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);
          console.log(`⏰ Business/premium ad expiry: ${expiresAt.toISOString()} (default 30 days)`);
        }
      } else if (useFreeAdsQuota) {
        // Free ads: shorter expiry (7 days)
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        console.log(`⏰ Free ad expiry: ${expiresAt.toISOString()} (7 days)`);
      } else {
        // Fallback: 7 days
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        console.log(`⏰ Ad expiry (fallback): ${expiresAt.toISOString()} (7 days)`);
      }

      // Note: Users can ALWAYS purchase individual premium ads via paymentOrderId
      // This check only applies when trying to use business package premium slots

      console.log('📸 Creating ad with images:', imagesArray);
      console.log('⏰ Ad expires at:', expiresAt);
      if (premiumType) {
        console.log('⭐ Creating premium ad:', { premiumType, isUrgent, premiumExpiresAt });
      }
      
      // Parse attributes if provided (should be JSON string or object)
      let parsedAttributes = null;
      if (attributes) {
        try {
          parsedAttributes = typeof attributes === 'string' ? JSON.parse(attributes) : attributes;
          console.log('✅ Attributes parsed successfully:', Object.keys(parsedAttributes || {}).length, 'fields');
        } catch (e) {
          console.error('❌ Error parsing attributes:', e);
          console.error('   Raw attributes value:', attributes?.substring ? attributes.substring(0, 200) : attributes);
          // Don't fail the request if attributes parsing fails, just log it
          parsedAttributes = null;
        }
      }

      // Validate premiumType enum value
      const validPremiumTypes = ['TOP', 'FEATURED', 'BUMP_UP'];
      if (premiumType && !validPremiumTypes.includes(premiumType)) {
        console.error('❌ Invalid premiumType:', premiumType);
        return res.status(400).json({ 
          success: false, 
          message: `Invalid premium type: ${premiumType}. Must be one of: ${validPremiumTypes.join(', ')}` 
        });
      }

      // Map numeric priority -> Prisma enum string (NEVER send numbers to Prisma enums)
      const priorityToPackageType = (priority) => {
        switch (Number(priority)) {
          case 4: return 'SELLER_PRIME';    // Enterprise
          case 3: return 'SELLER_PLUS';     // Pro
          case 2: return 'MAX_VISIBILITY';  // Basic
          case 1:
          default:
            return 'NORMAL';
        }
      };
      
      // Build ad data object
      const adData = {
        title,
        description,
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        discount: discount ? parseFloat(discount) : null,
        condition: condition || null,
        images: imagesArray,
        attributes: parsedAttributes, // Store attributes as JSON
        categoryId,
        state: state || null,
        city: city || null,
        neighbourhood: neighbourhood || null,
        exactLocation: exactLocation || null,
        userId: req.user.id,
        status: 'PENDING',
        expiresAt: expiresAt,
        // Package type for ranking (Prisma enum string)
        packageType: priorityToPackageType(req.adPackagePriority || 1),
        // Premium fields - ensure proper types
        isPremium: !!premiumType,
        premiumType: premiumType || null, // Will be validated by Prisma enum
        premiumExpiresAt: premiumExpiresAt || null,
        isUrgent: isUrgent || false,
        featuredAt: premiumType === 'FEATURED' ? new Date() : null,
        bumpedAt: premiumType === 'BUMP_UP' ? new Date() : null,
        // Slug will be generated after ad creation
      };
      
      // Remove null/undefined premium fields if not premium ad
      if (!premiumType) {
        adData.premiumType = null;
        adData.premiumExpiresAt = null;
        adData.featuredAt = null;
        adData.bumpedAt = null;
      }
      
      // Only include subcategoryId if provided
      if (subcategoryId) {
        adData.subcategoryId = subcategoryId;
      }
      
      // Only include locationId if it's provided (to handle optional location)
      if (locationId) {
        adData.locationId = locationId;
      }
      
      console.log('📝 Ad data to create:', {
        title: adData.title,
        categoryId: adData.categoryId,
        subcategoryId: adData.subcategoryId || 'null',
        locationId: adData.locationId || 'null',
        userId: adData.userId,
        imagesCount: adData.images.length
      });

      // ==================== CONTENT MODERATION ====================
      // NEW FLOW: Create ad with PENDING status, moderate in background
      // If inappropriate content found, ad will be DISABLED
      // User can edit and resubmit disabled ads
      
      // Create ad with PENDING status - will be approved/disabled after moderation
      adData.status = 'PENDING';
      adData.moderationStatus = 'pending_moderation';
      // Don't set postedAt yet - will be set when approved
      
      console.log('✅ Ad will be created with PENDING status. Background moderation will run asynchronously.');
      // ==================== END MODERATION ====================

      // Update user's phone visibility preference (from ad posting checkbox)
      // Note: This is a user-level setting (applies to all ads). Phone is filtered in GET /ads and GET /ads/:id.
      if (req.body && typeof req.body.showPhone !== 'undefined') {
        const raw = req.body.showPhone;
        const showPhone = raw === true || raw === 'true' || raw === '1' || raw === 1;
        try {
          await prisma.user.update({
            where: { id: req.user.id },
            data: { showPhone }
          });
        } catch (e) {
          console.warn('⚠️ Failed to update user.showPhone preference:', e?.message || e);
        }
      }

      // Build include object conditionally
      const includeObj = {
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } }
      };
      
      // Only include location if locationId is provided
      if (locationId) {
        includeObj.location = { select: { id: true, name: true, slug: true } };
      }

      let ad;
      try {
        console.log('🔄 Attempting to create ad with Prisma...');
        ad = await prisma.ad.create({
          data: adData,
          include: includeObj
        });
        console.log('✅ Ad created successfully:', ad.id);
        
        // ==================== BACKGROUND MODERATION ====================
        // Run moderation asynchronously after ad creation
        // If inappropriate content found, ad will be DISABLED
        // User can edit and resubmit disabled ads
        
        // Check moderation status first
        const { getModerationStatus } = require('../services/contentModeration');
        const moderationStatus = getModerationStatus();
        console.log('🔍 Moderation Service Status:', {
          enabled: moderationStatus.enabled,
          available: moderationStatus.available,
          failClosed: moderationStatus.failClosed,
          hasApiKey: moderationStatus.hasApiKey,
          hasCredentials: moderationStatus.hasCredentials
        });
        
        // Run moderation immediately (don't wait, but don't block response)
        // Use Promise to ensure it runs but don't await
        (async () => {
          try {
            console.log(`🔍 [MODERATION] Starting background moderation for ad: ${ad.id}`);
            console.log(`🔍 [MODERATION] Ad title: ${title.substring(0, 50)}...`);
            console.log(`🔍 [MODERATION] Images count: ${imagesForModeration.length}`);
            
            // Small delay to ensure ad is fully saved
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Get fresh ad data to ensure we have the latest
            const freshAd = await prisma.ad.findUnique({
              where: { id: ad.id },
              select: {
                id: true,
                title: true,
                description: true,
                images: true,
                userId: true,
                status: true
              }
            });
            
            if (!freshAd) {
              console.error(`❌ [MODERATION] Ad ${ad.id} not found for moderation`);
              return;
            }
            
            console.log(`🔍 [MODERATION] Fresh ad retrieved. Current status: ${freshAd.status}`);
            console.log(`🔍 [MODERATION] Running moderation check...`);
            
            // Run moderation check using fresh ad data
            const moderationResult = await moderateAdContent(
              freshAd.images || imagesForModeration,
              freshAd.title || title,
              freshAd.description || description
            );
            
            console.log(`🔍 [MODERATION] Moderation check completed for ad: ${ad.id}`);
            
            console.log('🔍 [MODERATION] Background moderation result:', {
              adId: ad.id,
              isSafe: moderationResult.isSafe,
              hasNudity: moderationResult.hasNudity,
              hasAdultText: moderationResult.hasAdultText,
              moderationDisabled: moderationResult.moderationDisabled,
              moderationUnavailable: moderationResult.moderationUnavailable,
              error: moderationResult.error
            });
            
            // Log warning if moderation is disabled or unavailable
            if (moderationResult.moderationDisabled) {
              console.warn(`⚠️ [MODERATION] Moderation is DISABLED - ad ${ad.id} will be approved without check`);
            }
            if (moderationResult.moderationUnavailable) {
              console.error(`🚨 [MODERATION] Moderation is UNAVAILABLE - ad ${ad.id} moderation failed`);
            }
            
            // Update ad based on moderation result
            if (!moderationResult.isSafe) {
              // Unsafe content found - DISABLE ad
              console.log(`❌ [MODERATION] Unsafe content detected for ad ${ad.id} - DISABLING`);
              const rejectionReason = moderationResult.rejectionReason || 
                'Your ad contains inappropriate content (nudity, violence, or adult content). Please edit and resubmit with appropriate content.';
              
              const updateResult = await prisma.ad.update({
                where: { id: ad.id },
                data: {
                  status: 'DISABLED',
                  moderationStatus: 'disabled_auto',
                  rejectionReason: rejectionReason,
                  autoRejected: true,
                  moderationFlags: {
                    hasNudity: moderationResult.hasNudity,
                    hasAdultText: moderationResult.hasAdultText,
                    imageDetails: moderationResult.imageDetails,
                    textDetails: moderationResult.textDetails,
                    checkedAt: new Date().toISOString()
                  }
                }
              });
              
              console.log(`✅ [MODERATION] Ad ${ad.id} status updated to DISABLED`);
              
              // Create notification for user
              await prisma.notification.create({
                data: {
                  userId: freshAd.userId,
                  title: 'Ad Disabled - Edit and Resubmit',
                  message: `Your ad "${freshAd.title}" was disabled due to inappropriate content. ${rejectionReason} You can edit and resubmit your ad.`,
                  type: 'ad_rejected',
                  link: `/ads/${freshAd.id}/edit`
                }
              }).catch(notifError => {
                console.error('⚠️ [MODERATION] Failed to create disabled notification:', notifError);
              });
              
              // Remove from search index if indexed
              try {
                const { deleteAd } = require('../services/meilisearch');
                await deleteAd(ad.id);
                console.log(`✅ [MODERATION] Removed disabled ad from search index: ${ad.id}`);
              } catch (indexError) {
                console.error('⚠️ [MODERATION] Error removing ad from search index:', indexError);
              }
              
              console.log(`❌ [MODERATION] Ad ${ad.id} DISABLED due to inappropriate content`);
              
            } else {
              // Safe content - APPROVE ad
              console.log(`✅ [MODERATION] Safe content detected for ad ${ad.id} - APPROVING`);
              
              const updateResult = await prisma.ad.update({
                where: { id: ad.id },
                data: {
                  status: 'APPROVED',
                  moderationStatus: 'approved_auto',
                  postedAt: new Date(),
                  moderationFlags: {
                    hasNudity: false,
                    hasAdultText: false,
                    imageDetails: moderationResult.imageDetails,
                    textDetails: moderationResult.textDetails,
                    checkedAt: new Date().toISOString()
                  }
                }
              });
              
              console.log(`✅ [MODERATION] Ad ${ad.id} status updated to APPROVED`);
              
              // Create notification for user
              await prisma.notification.create({
                data: {
                  userId: freshAd.userId,
                  title: 'Ad Approved - Now Active',
                  message: `Your ad "${freshAd.title}" has been approved and is now active!`,
                  type: 'ad_approved',
                  link: `/ads/${freshAd.id}`
                }
              }).catch(notifError => {
                console.error('⚠️ [MODERATION] Failed to create approval notification:', notifError);
              });
              
              // Index in search
              try {
                const { indexAd } = require('../services/meilisearch');
                const updatedAd = await prisma.ad.findUnique({
                  where: { id: ad.id },
                  include: {
                    category: true,
                    subcategory: true,
                    location: true,
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        avatar: true
                      }
                    }
                  }
                });
                if (updatedAd) {
                  await indexAd(updatedAd);
                  console.log(`✅ [MODERATION] Indexed approved ad in search: ${ad.id}`);
                }
              } catch (indexError) {
                console.error('⚠️ [MODERATION] Error indexing ad:', indexError);
              }
              
              console.log(`✅ [MODERATION] Ad ${ad.id} APPROVED and is now ACTIVE`);
            }
          } catch (moderationError) {
            console.error(`❌ [MODERATION] CRITICAL ERROR in background moderation for ad ${ad.id}:`, moderationError);
            console.error(`❌ [MODERATION] Error message:`, moderationError.message);
            console.error(`❌ [MODERATION] Error stack:`, moderationError.stack);
            
            // If moderation fails, keep ad as PENDING for manual review
            // Don't fail the ad creation - let admin review it
            try {
              await prisma.ad.update({
                where: { id: ad.id },
                data: {
                  moderationStatus: 'moderation_error',
                  moderationFlags: {
                    error: moderationError.message || 'Unknown moderation error',
                    errorStack: moderationError.stack?.substring(0, 500),
                    checkedAt: new Date().toISOString()
                  }
                }
              });
              console.log(`⚠️ [MODERATION] Ad ${ad.id} marked as PENDING due to moderation error - requires manual review`);
            } catch (updateError) {
              console.error(`❌ [MODERATION] Failed to update ad moderation status:`, updateError);
            }
          }
        })().catch(criticalError => {
          // Catch any unhandled errors in the async function
          console.error(`❌ [MODERATION] CRITICAL: Background moderation function failed completely:`, criticalError);
          console.error(`❌ [MODERATION] This means moderation did NOT run for ad ${ad.id}`);
        }); // Run asynchronously, don't await
        // ==================== END BACKGROUND MODERATION ====================
        
        // Generate unique slug for the ad
        const slug = await generateUniqueAdSlug(title, ad.id, prisma, categoryId, subcategoryId);
        if (slug) {
          ad = await prisma.ad.update({
            where: { id: ad.id },
            data: { slug },
            include: includeObj
          });
          console.log('✅ Ad slug generated:', slug);
        }

        // Don't index ad immediately - it's PENDING, will be indexed after moderation approves it
        // Indexing happens in background moderation function
      } catch (createError) {
        console.error('❌ Prisma create error details:');
        console.error('   Code:', createError.code);
        console.error('   Message:', createError.message);
        console.error('   Meta:', JSON.stringify(createError.meta, null, 2));
        console.error('   Ad data that failed:', JSON.stringify(adData, null, 2));
        throw createError; // Re-throw to be caught by outer catch
      }

      // CORE BUSINESS RULES - Quota Decrement:
      // 1. Premium ads: NO quota decrement (always paid)
      // 2. Business package quota: Decrement businessAdsRemaining (adsUsed++)
      // 3. Free ads quota: Decrement freeAdsRemaining

      // Decrement business package quota
      if (req.useBusinessPackageQuota && req.businessPackageId) {
        try {
          if (req.isUserBusinessPackage) {
            // Use UserBusinessPackage table
            const packageBefore = await prisma.userBusinessPackage.findUnique({
              where: { id: req.businessPackageId },
              select: {
                id: true,
                totalAds: true,
                usedAds: true,
                packageType: true,
                status: true,
                expiresAt: true
              }
            });
            
            if (!packageBefore) {
              console.error(`❌ UserBusinessPackage ${req.businessPackageId} not found!`);
            } else {
              console.log(`🔄 Decrementing UserBusinessPackage quota: ${req.businessPackageId}`);
              console.log(`   Before: ${packageBefore.usedAds}/${packageBefore.totalAds} ads used`);
              
              const newUsedAds = (packageBefore.usedAds || 0) + 1;
              const remaining = (packageBefore.totalAds || 0) - newUsedAds;
              const now = new Date();
              
              // Update status: exhausted if no ads remaining, expired if past expiry
              let newStatus = packageBefore.status;
              if (packageBefore.expiresAt && packageBefore.expiresAt <= now) {
                newStatus = 'expired';
              } else if (remaining <= 0) {
                newStatus = 'exhausted';
              }
              
              const updatedPackage = await prisma.userBusinessPackage.update({
                where: { id: req.businessPackageId },
                data: { 
                  usedAds: newUsedAds,
                  status: newStatus
                },
                select: {
                  id: true,
                  totalAds: true,
                  usedAds: true,
                  packageType: true,
                  status: true
                }
              });
              
              console.log(`✅ UserBusinessPackage quota decremented`);
              console.log(`   After: ${updatedPackage.usedAds}/${updatedPackage.totalAds} ads used`);
              console.log(`   Remaining: ${remaining} ads remaining`);
              console.log(`   Status: ${updatedPackage.status}`);
              console.log(`   Package Type: ${updatedPackage.packageType}`);
            }
          } else {
            // Fallback to BusinessPackage table (backward compatibility)
            const packageBefore = await prisma.businessPackage.findUnique({
              where: { id: req.businessPackageId },
              select: {
                id: true,
                totalAdsAllowed: true,
                adsUsed: true,
                packageType: true
              }
            });
            
            if (!packageBefore) {
              console.error(`❌ Package ${req.businessPackageId} not found!`);
            } else {
              console.log(`🔄 Decrementing business package quota (fallback): ${req.businessPackageId}`);
              console.log(`   Before: ${packageBefore.adsUsed}/${packageBefore.totalAdsAllowed} ads used`);
              
              const updatedPackage = await prisma.businessPackage.update({
                where: { id: req.businessPackageId },
                data: { adsUsed: { increment: 1 } },
                select: {
                  id: true,
                  totalAdsAllowed: true,
                  adsUsed: true,
                  packageType: true
                }
              });
              
              console.log(`✅ Business package quota decremented`);
              console.log(`   After: ${updatedPackage.adsUsed}/${updatedPackage.totalAdsAllowed} ads used`);
              console.log(`   Remaining: ${updatedPackage.totalAdsAllowed - updatedPackage.adsUsed} ads remaining`);
              console.log(`   Package Type: ${updatedPackage.packageType}`);
            }
          }
        } catch (error) {
          console.error('❌ Error decrementing business package quota:', error);
          console.error('   Error details:', {
            code: error.code,
            message: error.message,
            meta: error.meta
          });
          // Don't fail ad creation if increment fails - log it for manual fix
        }
      }

      // Decrement free ads quota
      if (req.useFreeAdsQuota) {
        try {
          // Get current user state before decrement
          const userBefore = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
              id: true,
              freeAdsRemaining: true,
              freeAdsUsed: true,
              freeAdsUsedThisMonth: true
            }
          });
          
          if (!userBefore) {
            console.error(`❌ User ${req.user.id} not found!`);
          } else {
            console.log(`🔄 Decrementing free ads quota`);
            console.log(`   Before: ${userBefore.freeAdsRemaining} remaining, ${userBefore.freeAdsUsedThisMonth} used this month`);
            
            const updatedUser = await prisma.user.update({
              where: { id: req.user.id },
              data: { 
                freeAdsRemaining: { decrement: 1 },
                freeAdsUsed: { increment: 1 }, // Track for history (lifetime)
                freeAdsUsedThisMonth: { increment: 1 } // Track monthly usage
              },
              select: {
                id: true,
                freeAdsRemaining: true,
                freeAdsUsed: true,
                freeAdsUsedThisMonth: true
              }
            });
            
            console.log(`✅ Free ads quota decremented`);
            console.log(`   After: ${updatedUser.freeAdsRemaining} remaining, ${updatedUser.freeAdsUsedThisMonth} used this month`);
            console.log(`   Lifetime used: ${updatedUser.freeAdsUsed}`);
            
            // Verify the decrement actually happened
            if (updatedUser.freeAdsRemaining === userBefore.freeAdsRemaining - 1) {
              console.log(`✅ FreeAdsRemaining decrement verified: ${userBefore.freeAdsRemaining} → ${updatedUser.freeAdsRemaining}`);
            } else {
              console.error(`⚠️ WARNING: Decrement mismatch! Expected ${userBefore.freeAdsRemaining - 1}, got ${updatedUser.freeAdsRemaining}`);
            }
            
            if (updatedUser.freeAdsUsedThisMonth === userBefore.freeAdsUsedThisMonth + 1) {
              console.log(`✅ FreeAdsUsedThisMonth increment verified: ${userBefore.freeAdsUsedThisMonth} → ${updatedUser.freeAdsUsedThisMonth}`);
            } else {
              console.error(`⚠️ WARNING: Increment mismatch! Expected ${userBefore.freeAdsUsedThisMonth + 1}, got ${updatedUser.freeAdsUsedThisMonth}`);
            }
          }
        } catch (error) {
          console.error('❌ Error decrementing free ads quota:', error);
          console.error('   Error details:', {
            code: error.code,
            message: error.message,
            meta: error.meta
          });
          // Don't fail ad creation if increment fails - log it for manual fix
        }
      }

      // Log quota usage
      if (isPremiumAd) {
        console.log('ℹ️ Premium ad - no quota decrement (always paid)');
      } else if (req.useBusinessPackageQuota) {
        console.log('ℹ️ Normal ad - used business package quota');
      } else if (req.useFreeAdsQuota) {
        console.log('ℹ️ Normal ad - used free ads quota');
      }

      // Emit real-time quota update via socket
      try {
        const { emitAdQuotaUpdate } = require('../socket/socket');
        const { checkAndResetUserQuota } = require('../services/monthlyQuotaReset');
        await checkAndResetUserQuota(req.user.id);
        
        // Get updated quota
        const updatedUser = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: {
            freeAdsRemaining: true,
            freeAdsUsedThisMonth: true,
            lastFreeAdsResetDate: true
          }
        });

        const now = new Date();
        const activeBusinessPackages = await prisma.businessPackage.findMany({
          where: {
            userId: req.user.id,
            status: { in: ['paid', 'verified'] },
            expiresAt: { gt: now }
          },
          select: {
            id: true,
            packageType: true,
            totalAdsAllowed: true,
            adsUsed: true,
            createdAt: true,
            expiresAt: true
          },
          orderBy: { createdAt: 'asc' }
        });

        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        nextMonth.setHours(0, 0, 0, 0);

        const packageNames = {
          MAX_VISIBILITY: 'Max Visibility',
          SELLER_PLUS: 'Seller Plus',
          SELLER_PRIME: 'Seller Prime'
        };

        const quotaData = {
          monthlyFreeAds: {
            total: 2,
            used: updatedUser?.freeAdsUsedThisMonth || 0,
            remaining: updatedUser?.freeAdsRemaining || 0,
            resetAt: nextMonth.toISOString()
          },
          packages: activeBusinessPackages.map(pkg => ({
            packageId: pkg.id,
            packageName: `${packageNames[pkg.packageType] || pkg.packageType} Package`,
            packageType: pkg.packageType,
            totalAds: pkg.totalAdsAllowed || 0,
            usedAds: pkg.adsUsed || 0,
            adsRemaining: (pkg.totalAdsAllowed || 0) - (pkg.adsUsed || 0),
            purchasedAt: pkg.createdAt,
            expiresAt: pkg.expiresAt
          }))
        };

        emitAdQuotaUpdate(req.user.id, quotaData);
        console.log('✅ Emitted real-time quota update to user');
      } catch (socketError) {
        console.error('⚠️ Error emitting quota update:', socketError);
        // Don't fail ad creation if socket emit fails
      }

      // NOTE: Premium order is NOT created separately anymore
      // The AdPostingOrder already contains all premium information in its adData field
      // This prevents duplicate orders in "My Orders" page
      // Premium features are tracked via the Ad model's premiumType and isUrgent fields
      if (premiumType && paymentOrder) {
        console.log('✅ Premium features applied via payment order (no separate PremiumOrder created):', {
          adId: ad.id,
          premiumType,
          isUrgent,
          paymentOrderId
        });
      }

      // Link ad to payment order if premium features were purchased
      if (paymentOrder) {
        console.log('🔗 Linking ad to payment order:', paymentOrderId);
        try {
          await prisma.adPostingOrder.update({
            where: { id: paymentOrder.id },
            data: { adId: ad.id }
          });
          console.log('✅ Ad linked to payment order successfully');
        } catch (linkError) {
          console.error('❌ Error linking ad to payment order:', linkError);
          // Don't fail ad creation if linking fails
        }
      }

      // Log ad posting method (freeAdsUsed increment already handled above for regular ads)
      if (activeBusinessPackages.length > 0) {
        console.log(`📦 User ${req.user.id} posting ad using business package (${activeBusinessPackages.length} active). Free ads: ${freeAdsUsed}/${FREE_ADS_LIMIT}`);
      } else if (paymentOrderId) {
        console.log(`💳 User ${req.user.id} posting ad with premium options payment. Free ads: ${freeAdsUsed}/${FREE_ADS_LIMIT}`);
      } else if (!isPremiumAd) {
        console.log(`📊 User ${req.user.id} posting regular ad. Free ads: ${freeAdsUsed}/${FREE_ADS_LIMIT}`);
      }

      // Create notification for user (non-blocking)
      try {
        const notificationData = {
          userId: req.user.id,
          title: 'Ad Under Review',
          message: `Your ad "${title}" is being reviewed. It will be posted after 5 minutes if it passes our content moderation.`,
          type: 'ad_pending',
          link: `/ads/${ad.id}`
        };
        
        const notification = await prisma.notification.create({
          data: notificationData
        });

        // Emit real-time notification via Socket.IO (non-blocking)
        try {
          const { emitNotification } = require('../socket/socket');
          emitNotification(req.user.id, {
            id: notification.id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            link: notification.link,
            isRead: false,
            createdAt: notification.createdAt
          });
        } catch (socketError) {
          console.error('⚠️ Error emitting socket notification:', socketError);
          // Don't fail ad creation if socket emit fails
        }
      } catch (notificationError) {
        console.error('⚠️ Error creating notification:', notificationError);
        // Don't fail ad creation if notification creation fails
      }

      // Ensure images is an array in the response
      const adWithImages = {
        ...ad,
        images: Array.isArray(ad.images) 
          ? ad.images.filter(img => img && (typeof img === 'string' ? img.trim() !== '' : true))
          : (ad.images && typeof ad.images === 'string' && ad.images.trim() !== '' ? [ad.images] : [])
      };
      
      console.log('📸 Created ad response with images:', { id: adWithImages.id, title: adWithImages.title, images: adWithImages.images });

      // Create product-specific specifications if provided
      let parsedSpecifications = null;
      if (specifications) {
        try {
          parsedSpecifications = typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
        } catch (e) {
          console.error('Error parsing specifications:', e);
          parsedSpecifications = null;
        }
      }

      if (parsedSpecifications && Array.isArray(parsedSpecifications)) {
        try {
          console.log(`📋 Creating ${parsedSpecifications.length} specifications for ad ${ad.id}`);
          
          for (const specData of parsedSpecifications) {
            const { name, label, type, required, placeholder, order, options } = specData;
            
            // Create specification
            const specification = await prisma.specification.create({
              data: {
                name: name.trim(),
                label: label.trim(),
                type,
                adId: ad.id,
                required: required || false,
                placeholder: placeholder?.trim() || null,
                order: order || 0
              }
            });

            // Create options if provided (for select/multiselect types)
            if ((type === 'select' || type === 'multiselect') && options && Array.isArray(options)) {
              for (const optionData of options) {
                await prisma.specificationOption.create({
                  data: {
                    value: optionData.value.trim(),
                    label: optionData.label?.trim() || optionData.value.trim(),
                    specificationId: specification.id,
                    order: optionData.order || 0
                  }
                });
              }
            }
          }
          
          console.log(`✅ Successfully created specifications for ad ${ad.id}`);
        } catch (specError) {
          console.error('⚠️ Error creating specifications:', specError);
          // Don't fail ad creation if specification creation fails
        }
      }

      // Save specification values (from attributes) if provided
      if (parsedAttributes && typeof parsedAttributes === 'object') {
        try {
          // Get all specifications for this ad
          const adSpecs = await prisma.specification.findMany({
            where: { adId: ad.id },
            include: { options: true }
          });

          for (const [specName, value] of Object.entries(parsedAttributes)) {
            const spec = adSpecs.find(s => s.name === specName);
            if (!spec) continue;

            // Handle array values (multiselect)
            const values = Array.isArray(value) ? value : [value];
            
            for (const val of values) {
              if (!val) continue;

              // Check if value matches an existing option
              const matchingOption = spec.options.find(opt => opt.value === val);
              
              // Check if this is a custom value (not in predefined options)
              const isCustom = !matchingOption;

              // Find or create AdSpecificationValue
              const existingValue = await prisma.adSpecificationValue.findFirst({
                where: {
                  adId: ad.id,
                  specificationId: spec.id,
                  value: val
                }
              });

              if (existingValue) {
                // Update usage count
                await prisma.adSpecificationValue.update({
                  where: { id: existingValue.id },
                  data: { usageCount: { increment: 1 } }
                });
              } else {
                // Create new value
                await prisma.adSpecificationValue.create({
                  data: {
                    adId: ad.id,
                    specificationId: spec.id,
                    optionId: matchingOption?.id || null,
                    value: val,
                    isCustom
                  }
                });
              }
            }
          }
          
          console.log(`✅ Successfully saved specification values for ad ${ad.id}`);
        } catch (valueError) {
          console.error('⚠️ Error saving specification values:', valueError);
          // Don't fail ad creation if value saving fails
        }
      }

      // Clear cache after creation
      clearCache('ads');
      
      // Update clusters when ad is created (non-blocking)
      try {
        const { onAdCreated } = require('../services/clusterAutoUpdate');
        // Only update if ad is approved (or will be auto-approved)
        if (ad.status === 'APPROVED' || ad.status === 'PENDING') {
          onAdCreated(ad.id).catch(err => {
            console.error('⚠️ Error updating clusters for new ad:', err);
          });
        }
      } catch (clusterError) {
        console.error('⚠️ Error initializing cluster update:', clusterError);
        // Don't fail ad creation if cluster update fails
      }
      
      res.status(201).json({ success: true, ad: adWithImages });
    } catch (error) {
      console.error('❌ Create ad error:', error);
      console.error('Error stack:', error.stack);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error meta:', error.meta);
      console.error('Request body keys:', Object.keys(req.body || {}));
      console.error('Request body values:', {
        title: req.body?.title?.substring(0, 50),
        categoryId: req.body?.categoryId,
        subcategoryId: req.body?.subcategoryId,
        locationId: req.body?.locationId,
        price: req.body?.price,
        hasImages: !!req.uploadedImages?.length,
        paymentOrderId: req.body?.paymentOrderId
      });
      console.error('Uploaded images:', req.uploadedImages?.length || 0);
      console.error('User ID:', req.user?.id);
      
      // If payment was made but ad creation failed, mark payment order for refund/retry
      const paymentOrderId = req.body?.paymentOrderId;
      if (paymentOrderId) {
        console.error('❌ CRITICAL: Ad creation failed AFTER payment verification!');
        console.error('   Payment Order ID:', paymentOrderId);
        console.error('   User ID:', req.user?.id);
        console.error('   Error:', error.message);
        
        try {
          // Mark payment order as failed for manual review/refund
          await prisma.adPostingOrder.update({
            where: { razorpayOrderId: paymentOrderId },
            data: { 
              status: 'failed',
              // Store error message in metadata if available
            }
          });
          console.error('✅ Payment order marked as failed for refund/retry');
        } catch (updateError) {
          console.error('❌ Failed to update payment order status:', updateError);
        }
      }
      
      // Provide more detailed error message
      let errorMessage = 'Failed to create ad';
      if (error.code === 'P2002') {
        errorMessage = 'A record with this information already exists';
      } else if (error.code === 'P2003') {
        const field = error.meta?.field_name || 'unknown';
        errorMessage = `Invalid reference: ${field}. Please check category, subcategory, or location.`;
      } else if (error.code === 'P2011') {
        errorMessage = 'Null constraint violation. A required field is missing.';
      } else if (error.code === 'P2012') {
        errorMessage = 'Missing required value. Please check all required fields.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Add payment-related message if payment was made
      if (paymentOrderId) {
        errorMessage += ' Payment was processed but ad creation failed. Please contact support for refund.';
      }
      
      res.status(500).json({ 
        success: false, 
        message: errorMessage,
        error: error.name || 'UnknownError',
        errorCode: error.code || 'UNKNOWN_ERROR',
        paymentOrderId: paymentOrderId || null,
        requiresSupport: !!paymentOrderId,
        error: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          code: error.code,
          meta: error.meta,
          stack: error.stack?.split('\n').slice(0, 5).join('\n') // First 5 lines of stack
        } : undefined
      });
    }
  }
);

// Update ad
router.put('/:id',
  authenticate,
  uploadImages,
  [
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim().notEmpty(),
    body('price').optional().isFloat({ min: 0 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      const ad = await prisma.ad.findUnique({
        where: { id: req.params.id }
      });

      if (!ad) {
        return res.status(404).json({ success: false, message: 'Ad not found' });
      }

      if (ad.userId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      const updateData = {};
      if (req.body.title) updateData.title = req.body.title;
      if (req.body.description) updateData.description = req.body.description;
      if (req.body.price) updateData.price = parseFloat(req.body.price);
      if (req.body.originalPrice !== undefined) updateData.originalPrice = req.body.originalPrice ? parseFloat(req.body.originalPrice) : null;
      if (req.body.discount !== undefined) updateData.discount = req.body.discount ? parseFloat(req.body.discount) : null;
      if (req.body.condition !== undefined) updateData.condition = req.body.condition || null;
      if (req.body.categoryId) updateData.categoryId = req.body.categoryId;
      if (req.body.subcategoryId) updateData.subcategoryId = req.body.subcategoryId;
      if (req.body.locationId) updateData.locationId = req.body.locationId;
      if (req.body.state !== undefined) updateData.state = req.body.state || null;
      if (req.body.city !== undefined) updateData.city = req.body.city || null;
      if (req.body.neighbourhood !== undefined) updateData.neighbourhood = req.body.neighbourhood || null;
      if (req.body.exactLocation !== undefined) updateData.exactLocation = req.body.exactLocation || null;
      
      // Regenerate slug if title changed
      if (req.body.title && req.body.title !== ad.title) {
        const newTitle = req.body.title;
        const categoryIdForSlug = updateData.categoryId || ad.categoryId;
        const subcategoryIdForSlug = updateData.subcategoryId !== undefined ? updateData.subcategoryId : ad.subcategoryId;
        const slug = await generateUniqueAdSlug(newTitle, ad.id, prisma, categoryIdForSlug, subcategoryIdForSlug);
        if (slug) {
          updateData.slug = slug;
        }
      }
      // Handle attributes update
      if (req.body.attributes !== undefined) {
        try {
          updateData.attributes = typeof req.body.attributes === 'string' 
            ? JSON.parse(req.body.attributes) 
            : req.body.attributes;
        } catch (e) {
          console.error('Error parsing attributes:', e);
        }
      }
      // If ad was REJECTED or DISABLED, allow resubmission - reset status and clear rejection
      if (ad.status === 'REJECTED' || ad.status === 'DISABLED') {
        console.log('🔄 Rejected/Disabled ad being edited - resetting for resubmission');
        updateData.status = 'PENDING';
        updateData.moderationStatus = 'pending_moderation';
        updateData.rejectionReason = null; // Clear rejection reason
        updateData.autoRejected = false;
      }
      
      // Handle image updates - merge existing with new if provided
      if (req.uploadedImages && req.uploadedImages.length > 0) {
        // Normalize uploaded images: extract URLs if objects
        const normalizedNewImages = req.uploadedImages.map(img => {
          if (typeof img === 'string') return img;
          if (img && img.url) return img.url;
          return img;
        });
        
        // If existingImages are provided, merge them
        if (req.body.existingImages) {
          const existing = Array.isArray(req.body.existingImages) 
            ? req.body.existingImages.filter((img) => img && img.trim() !== '')
            : (req.body.existingImages && req.body.existingImages.trim() !== '' ? [req.body.existingImages] : []);
          updateData.images = [...existing, ...normalizedNewImages];
        } else {
          updateData.images = normalizedNewImages;
        }
        // If images changed, require re-moderation (unless already being reset to PENDING from disabled/rejected)
        // Note: Don't check updatedAd.status here - it doesn't exist yet. Check ad.status instead.
        if (ad.status !== 'REJECTED' && ad.status !== 'DISABLED' && ad.status !== 'PENDING') {
          updateData.status = 'PENDING'; // Require re-approval if images changed
          updateData.moderationStatus = 'pending_moderation';
        }
      } else if (req.body.existingImages) {
        // Only existing images, no new uploads
        updateData.images = Array.isArray(req.body.existingImages) 
          ? req.body.existingImages.filter((img) => img && img.trim() !== '')
          : (req.body.existingImages && req.body.existingImages.trim() !== '' ? [req.body.existingImages] : []);
      }
      
      console.log('📸 Updating ad with images:', updateData.images);

      const updatedAd = await prisma.ad.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
          location: { select: { id: true, name: true, slug: true } },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      // If ad was DISABLED or REJECTED and is being resubmitted, run background moderation
      if ((ad.status === 'DISABLED' || ad.status === 'REJECTED') && updatedAd.status === 'PENDING') {
        console.log(`🔍 Running background moderation for resubmitted ad: ${updatedAd.id}`);
        
        // Run moderation asynchronously
        (async () => {
          try {
            const imagesForModeration = updatedAd.images || [];
            const moderationResult = await moderateAdContent(
              imagesForModeration,
              updatedAd.title,
              updatedAd.description
            );
            
            console.log('🔍 Resubmission moderation result:', {
              adId: updatedAd.id,
              isSafe: moderationResult.isSafe,
              hasNudity: moderationResult.hasNudity,
              hasAdultText: moderationResult.hasAdultText
            });
            
            if (!moderationResult.isSafe) {
              // Still unsafe - disable again
              const rejectionReason = moderationResult.rejectionReason || 
                'Your ad still contains inappropriate content. Please review and edit again.';
              
              await prisma.ad.update({
                where: { id: updatedAd.id },
                data: {
                  status: 'DISABLED', // Changed from REJECTED to DISABLED
                  moderationStatus: 'disabled_auto',
                  rejectionReason: rejectionReason,
                  autoRejected: true,
                  moderationFlags: {
                    hasNudity: moderationResult.hasNudity,
                    hasAdultText: moderationResult.hasAdultText,
                    imageDetails: moderationResult.imageDetails,
                    textDetails: moderationResult.textDetails,
                    checkedAt: new Date().toISOString()
                  }
                }
              });
              
              await prisma.notification.create({
                data: {
                  userId: updatedAd.userId,
                  title: 'Ad Disabled Again - Please Edit',
                  message: `Your resubmitted ad "${updatedAd.title}" was disabled again. ${rejectionReason} Please review our content policy and edit your ad.`,
                  type: 'ad_rejected', // Keep type for backward compatibility
                  link: `/ads/${updatedAd.id}/edit`
                }
              });
              
              console.log(`❌ Resubmitted ad ${updatedAd.id} disabled again`);
            } else {
              // Safe now - approve (status = APPROVED, displayed as "Active")
              await prisma.ad.update({
                where: { id: updatedAd.id },
                data: {
                  status: 'APPROVED', // Status = APPROVED (displayed as "Active" in UI)
                  moderationStatus: 'approved_auto',
                  postedAt: new Date(),
                  moderationFlags: {
                    hasNudity: false,
                    hasAdultText: false,
                    imageDetails: moderationResult.imageDetails,
                    textDetails: moderationResult.textDetails,
                    checkedAt: new Date().toISOString()
                  }
                }
              });
              
              await prisma.notification.create({
                data: {
                  userId: updatedAd.userId,
                  title: 'Ad Approved After Edit - Now Active',
                  message: `Your edited ad "${updatedAd.title}" has been approved and is now active!`,
                  type: 'ad_approved',
                  link: `/ads/${updatedAd.id}`
                }
              });
              
              // Index in search
              try {
                const { indexAd } = require('../services/meilisearch');
                const finalAd = await prisma.ad.findUnique({
                  where: { id: updatedAd.id },
                  include: {
                    category: true,
                    subcategory: true,
                    location: true,
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        avatar: true
                      }
                    }
                  }
                });
                if (finalAd) {
                  await indexAd(finalAd);
                  console.log(`✅ Indexed approved resubmitted ad: ${updatedAd.id}`);
                }
              } catch (indexError) {
                console.error('⚠️ Error indexing resubmitted ad:', indexError);
              }
              
              console.log(`✅ Resubmitted ad ${updatedAd.id} approved`);
            }
          } catch (moderationError) {
            console.error(`❌ Error moderating resubmitted ad ${updatedAd.id}:`, moderationError);
            // Keep as PENDING for manual review
            await prisma.ad.update({
              where: { id: updatedAd.id },
              data: {
                moderationStatus: 'moderation_error'
              }
            });
          }
        })(); // Run asynchronously
      }

      // Index/update in Meilisearch if ad is approved
      if (updatedAd.status === 'APPROVED') {
        try {
          await indexAd(updatedAd);
        } catch (indexError) {
          console.error('⚠️ Error indexing updated ad in Meilisearch:', indexError);
        }
      } else {
        // Remove from index if status changed to non-approved
        try {
          await deleteAd(updatedAd.id);
        } catch (deleteError) {
          console.error('⚠️ Error deleting ad from Meilisearch:', deleteError);
        }
      }

      // Clear cache after update
      clearCache('ads');
      clearCache(`ads/${req.params.id}`);

      // Update clusters when ad is updated (non-blocking)
      try {
        const { onAdUpdated } = require('../services/clusterAutoUpdate');
        onAdUpdated(updatedAd.id).catch(err => {
          console.error('⚠️ Error updating clusters for updated ad:', err);
        });
      } catch (clusterError) {
        console.error('⚠️ Error initializing cluster update:', clusterError);
        // Don't fail ad update if cluster update fails
      }

      res.json({ success: true, ad: updatedAd });
    } catch (error) {
      console.error('❌ Update ad error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack
      });
      
      // Provide more detailed error message
      let errorMessage = 'Failed to update ad';
      if (error.code === 'P2002') {
        errorMessage = 'A record with this information already exists';
      } else if (error.code === 'P2003') {
        const field = error.meta?.field_name || 'unknown';
        errorMessage = `Invalid reference: ${field}. Please check category, subcategory, or location.`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      res.status(500).json({ 
        success: false, 
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Delete ad
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const ad = await prisma.ad.findUnique({
      where: { id: req.params.id }
    });

    if (!ad) {
      return res.status(404).json({ success: false, message: 'Ad not found' });
    }

    if (ad.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await prisma.ad.delete({
      where: { id: req.params.id }
    });

    // Remove from Meilisearch index
    try {
      await deleteAd(req.params.id);
    } catch (deleteError) {
      console.error('⚠️ Error deleting ad from Meilisearch:', deleteError);
    }

    // Clear cache after deletion
    clearCache('ads');
    clearCache(`ads/${req.params.id}`);

    // Update clusters when ad is deleted (non-blocking)
    try {
      const { onAdDeleted } = require('../services/clusterAutoUpdate');
      onAdDeleted(req.params.id).catch(err => {
        console.error('⚠️ Error updating clusters for deleted ad:', err);
      });
    } catch (clusterError) {
      console.error('⚠️ Error initializing cluster update:', clusterError);
      // Don't fail ad deletion if cluster update fails
    }

    res.json({ success: true, message: 'Ad deleted successfully' });
  } catch (error) {
    console.error('Delete ad error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete ad' });
  }
});

// Toggle favorite
router.post('/:id/favorite', authenticate, async (req, res) => {
  try {
    const adId = req.params.id;

    if (!isValidObjectId(adId)) {
      return res.status(400).json({ success: false, message: 'Invalid ad id' });
    }

    const ad = await prisma.ad.findUnique({
      where: { id: adId }
    });

    if (!ad) {
      return res.status(404).json({ success: false, message: 'Ad not found' });
    }

    const existing = await prisma.favorite.findUnique({
      where: {
        userId_adId: {
          userId: req.user.id,
          adId
        }
      }
    });

    if (existing) {
      await prisma.favorite.delete({
        where: { id: existing.id }
      });
      res.json({ success: true, isFavorite: false });
    } else {
      await prisma.favorite.create({
        data: {
          userId: req.user.id,
          adId
        }
      });
      res.json({ success: true, isFavorite: true });
    }
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle favorite' });
  }
});

// Check if ad is favorite
router.get('/:id/favorite', authenticate, async (req, res) => {
  try {
    const adId = req.params.id;

    if (!isValidObjectId(adId)) {
      return res.json({ success: true, isFavorite: false });
    }

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_adId: {
          userId: req.user.id,
          adId
        }
      }
    });

    res.json({ success: true, isFavorite: !!favorite });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({ success: false, message: 'Failed to check favorite' });
  }
});

// Mark ad as sold
router.post('/:id/mark-sold', authenticate, async (req, res) => {
  try {
    const ad = await prisma.ad.findUnique({
      where: { id: req.params.id }
    });

    if (!ad) {
      return res.status(404).json({ success: false, message: 'Ad not found' });
    }

    if (ad.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await prisma.ad.update({
      where: { id: req.params.id },
      data: { status: 'SOLD' }
    });

    res.json({ success: true, message: 'Ad marked as sold' });
  } catch (error) {
    console.error('Mark sold error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark ad as sold' });
  }
});

// Mark ad as expired
router.post('/:id/mark-expired', authenticate, async (req, res) => {
  try {
    const ad = await prisma.ad.findUnique({
      where: { id: req.params.id }
    });

    if (!ad) {
      return res.status(404).json({ success: false, message: 'Ad not found' });
    }

    if (ad.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await prisma.ad.update({
      where: { id: req.params.id },
      data: { status: 'EXPIRED' }
    });

    res.json({ success: true, message: 'Ad marked as expired' });
  } catch (error) {
    console.error('Mark expired error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark ad as expired' });
  }
});

// Report ad
router.post('/:id/report', authenticate, async (req, res) => {
  try {
    const { reason, description } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Reason is required' });
    }

    const ad = await prisma.ad.findUnique({
      where: { id: req.params.id }
    });

    if (!ad) {
      return res.status(404).json({ success: false, message: 'Ad not found' });
    }

    // Create report (you may need to add a Report model)
    // For now, creating a notification for admins
    await prisma.notification.create({
      data: {
        userId: ad.userId,
        type: 'AD_REPORTED',
        title: 'Ad Reported',
        message: `Your ad "${ad.title}" has been reported: ${reason}`,
        metadata: JSON.stringify({
          adId: ad.id,
          reportedBy: req.user.id,
          reason,
          description
        })
      }
    });

    res.json({ success: true, message: 'Ad reported successfully' });
  } catch (error) {
    console.error('Report ad error:', error);
    res.status(500).json({ success: false, message: 'Failed to report ad' });
  }
});

// ========== AD DRAFTS ==========

// Save ad as draft
router.post('/draft', authenticate, async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      originalPrice,
      discount,
      condition,
      images,
      categoryId,
      subcategoryId,
      locationId,
      state,
      city,
      neighbourhood,
      exactLocation,
      attributes,
      isUrgent
    } = req.body;

    // Validate required fields
    if (!title || !description || !price || !categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, price, and category are required'
      });
    }

    // Create draft ad with DRAFT status (we'll use a custom status or store separately)
    const draft = await prisma.ad.create({
      data: {
        title,
        description,
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        discount: discount ? parseFloat(discount) : null,
        condition: condition || null,
        images: Array.isArray(images) ? images : [],
        status: 'PENDING', // Will be changed to APPROVED when published
        userId: req.user.id,
        categoryId,
        subcategoryId: subcategoryId || null,
        locationId: locationId || null,
        state: state || null,
        city: city || null,
        neighbourhood: neighbourhood || null,
        exactLocation: exactLocation || null,
        attributes: attributes ? JSON.stringify(attributes) : null,
        isUrgent: isUrgent || false,
        // Mark as draft using moderationStatus
        moderationStatus: 'draft'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Ad draft saved successfully',
      draft: {
        id: draft.id,
        title: draft.title,
        status: draft.status,
        moderationStatus: draft.moderationStatus,
        createdAt: draft.createdAt
      }
    });
  } catch (error) {
    console.error('Save ad draft error:', error);
    res.status(500).json({ success: false, message: 'Failed to save ad draft' });
  }
});

// Get all drafts for current user
router.get('/drafts', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [drafts, total] = await Promise.all([
      prisma.ad.findMany({
        where: {
          userId: req.user.id,
          moderationStatus: 'draft'
        },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
          location: { select: { id: true, name: true, slug: true } }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.ad.count({
        where: {
          userId: req.user.id,
          moderationStatus: 'draft'
        }
      })
    ]);

    res.json({
      success: true,
      drafts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get drafts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch drafts' });
  }
});

// Get a specific draft
router.get('/draft/:id', authenticate, async (req, res) => {
  try {
    const draft = await prisma.ad.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
        moderationStatus: 'draft'
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
        location: { select: { id: true, name: true, slug: true } }
      }
    });

    if (!draft) {
      return res.status(404).json({ success: false, message: 'Draft not found' });
    }

    res.json({ success: true, draft });
  } catch (error) {
    console.error('Get draft error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch draft' });
  }
});

// Update a draft
router.put('/draft/:id', authenticate, async (req, res) => {
  try {
    const draft = await prisma.ad.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
        moderationStatus: 'draft'
      }
    });

    if (!draft) {
      return res.status(404).json({ success: false, message: 'Draft not found' });
    }

    const updateData = {};
    if (req.body.title) updateData.title = req.body.title;
    if (req.body.description) updateData.description = req.body.description;
    if (req.body.price !== undefined) updateData.price = parseFloat(req.body.price);
    if (req.body.originalPrice !== undefined) updateData.originalPrice = req.body.originalPrice ? parseFloat(req.body.originalPrice) : null;
    if (req.body.discount !== undefined) updateData.discount = req.body.discount ? parseFloat(req.body.discount) : null;
    if (req.body.condition !== undefined) updateData.condition = req.body.condition;
    if (req.body.images !== undefined) updateData.images = Array.isArray(req.body.images) ? req.body.images : [];
    if (req.body.categoryId) updateData.categoryId = req.body.categoryId;
    if (req.body.subcategoryId !== undefined) updateData.subcategoryId = req.body.subcategoryId;
    if (req.body.locationId !== undefined) updateData.locationId = req.body.locationId;
    if (req.body.state !== undefined) updateData.state = req.body.state;
    if (req.body.city !== undefined) updateData.city = req.body.city;
    if (req.body.neighbourhood !== undefined) updateData.neighbourhood = req.body.neighbourhood;
    if (req.body.exactLocation !== undefined) updateData.exactLocation = req.body.exactLocation;
    if (req.body.attributes !== undefined) updateData.attributes = req.body.attributes ? JSON.stringify(req.body.attributes) : null;
    if (req.body.isUrgent !== undefined) updateData.isUrgent = req.body.isUrgent;

    const updatedDraft = await prisma.ad.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
        location: { select: { id: true, name: true, slug: true } }
      }
    });

    res.json({
      success: true,
      message: 'Draft updated successfully',
      draft: updatedDraft
    });
  } catch (error) {
    console.error('Update draft error:', error);
    res.status(500).json({ success: false, message: 'Failed to update draft' });
  }
});

// Publish a draft (change moderationStatus from 'draft' to 'pending')
router.post('/draft/:id/publish', authenticate, async (req, res) => {
  try {
    const draft = await prisma.ad.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
        moderationStatus: 'draft'
      }
    });

    if (!draft) {
      return res.status(404).json({ success: false, message: 'Draft not found' });
    }

    // Validate required fields
    if (!draft.title || !draft.description || !draft.price || !draft.categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields before publishing'
      });
    }

    const publishedAd = await prisma.ad.update({
      where: { id: req.params.id },
      data: {
        moderationStatus: 'pending',
        status: 'PENDING'
      }
    });

    res.json({
      success: true,
      message: 'Draft published successfully',
      ad: publishedAd
    });
  } catch (error) {
    console.error('Publish draft error:', error);
    res.status(500).json({ success: false, message: 'Failed to publish draft' });
  }
});

// Delete a draft
router.delete('/draft/:id', authenticate, async (req, res) => {
  try {
    const draft = await prisma.ad.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
        moderationStatus: 'draft'
      }
    });

    if (!draft) {
      return res.status(404).json({ success: false, message: 'Draft not found' });
    }

    await prisma.ad.delete({
      where: { id: req.params.id }
    });

    res.json({ success: true, message: 'Draft deleted successfully' });
  } catch (error) {
    console.error('Delete draft error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete draft' });
  }
});

// ========== AD RENEWAL ==========

// Renew an expired ad
router.post('/:id/renew', authenticate, async (req, res) => {
  try {
    const ad = await prisma.ad.findUnique({
      where: { id: req.params.id }
    });

    if (!ad) {
      return res.status(404).json({ success: false, message: 'Ad not found' });
    }

    if (ad.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (ad.status !== 'EXPIRED' && ad.status !== 'SOLD') {
      return res.status(400).json({
        success: false,
        message: 'Only expired or sold ads can be renewed'
      });
    }

    // Calculate new expiration date (default 30 days from now)
    const renewalDays = req.body.days || 30;
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + renewalDays);

    const renewedAd = await prisma.ad.update({
      where: { id: req.params.id },
      data: {
        status: 'PENDING', // Reset to pending for moderation
        expiresAt: newExpiresAt,
        moderationStatus: 'pending',
        updatedAt: new Date()
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
        location: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, name: true, avatar: true } }
      }
    });

    res.json({
      success: true,
      message: 'Ad renewed successfully',
      ad: renewedAd,
      expiresAt: newExpiresAt
    });
  } catch (error) {
    console.error('Renew ad error:', error);
    res.status(500).json({ success: false, message: 'Failed to renew ad' });
  }
});

// Get renewal history for an ad
router.get('/:id/renewal-history', authenticate, async (req, res) => {
  try {
    const ad = await prisma.ad.findUnique({
      where: { id: req.params.id },
      select: { userId: true, createdAt: true, updatedAt: true, expiresAt: true }
    });

    if (!ad) {
      return res.status(404).json({ success: false, message: 'Ad not found' });
    }

    if (ad.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // For now, return basic renewal info based on updatedAt vs createdAt
    // In a full implementation, you'd have a separate RenewalHistory model
    res.json({
      success: true,
      history: [
        {
          renewedAt: ad.createdAt,
          expiresAt: ad.expiresAt,
          isOriginal: true
        }
      ],
      canRenew: ad.expiresAt ? new Date(ad.expiresAt) < new Date() : false
    });
  } catch (error) {
    console.error('Get renewal history error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch renewal history' });
  }
});

// Check if ad can be renewed
router.get('/:id/renewal-status', authenticate, async (req, res) => {
  try {
    const ad = await prisma.ad.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        userId: true,
        status: true,
        expiresAt: true,
        createdAt: true
      }
    });

    if (!ad) {
      return res.status(404).json({ success: false, message: 'Ad not found' });
    }

    if (ad.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const now = new Date();
    const isExpired = ad.expiresAt ? new Date(ad.expiresAt) < now : false;
    const canRenew = (ad.status === 'EXPIRED' || ad.status === 'SOLD') && isExpired;

    res.json({
      success: true,
      canRenew,
      isExpired,
      status: ad.status,
      expiresAt: ad.expiresAt,
      daysUntilExpiry: ad.expiresAt
        ? Math.ceil((new Date(ad.expiresAt) - now) / (1000 * 60 * 60 * 24))
        : null
    });
  } catch (error) {
    console.error('Get renewal status error:', error);
    res.status(500).json({ success: false, message: 'Failed to check renewal status' });
  }
});

// ==================== Product-Level Specifications Management ====================

// Get specifications for a specific ad (product)
router.get('/:id/specifications', authenticate, async (req, res) => {
  try {
    const ad = await prisma.ad.findUnique({
      where: { id: req.params.id }
    });

    if (!ad) {
      return res.status(404).json({ success: false, message: 'Ad not found' });
    }

    // Check authorization: user must own the ad or be admin
    if (ad.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Get product-specific specifications with their values
    const specifications = await prisma.specification.findMany({
      where: {
        adId: req.params.id,
        isActive: true
      },
      include: {
        options: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        },
        values: {
          where: { adId: req.params.id },
          select: {
            id: true,
            value: true,
            optionId: true,
            isCustom: true
          }
        }
      },
      orderBy: { order: 'asc' }
    });

    // Get custom values for each specification (for select/multiselect)
    const specificationsWithValues = await Promise.all(
      specifications.map(async (spec) => {
        if (spec.type === 'select' || spec.type === 'multiselect') {
          try {
            const customValues = await prisma.adSpecificationValue.findMany({
              where: {
                specificationId: spec.id,
                isCustom: true,
                usageCount: { gte: 1 }
              },
              select: {
                value: true,
                usageCount: true
              },
              distinct: ['value'],
              orderBy: { usageCount: 'desc' },
              take: 20
            });
            
            return {
              ...spec,
              customValues: customValues.map(v => v.value),
              currentValue: spec.values?.[0]?.value || null,
              currentValues: spec.values?.map(v => v.value) || []
            };
          } catch (err) {
            console.error('Error fetching custom values for spec:', spec.id, err);
            return {
              ...spec,
              customValues: [],
              currentValue: spec.values?.[0]?.value || null,
              currentValues: spec.values?.map(v => v.value) || []
            };
          }
        }
        return {
          ...spec,
          currentValue: spec.values?.[0]?.value || null
        };
      })
    );

    // Also get category defaults as suggestions
    const categoryDefaults = await prisma.specification.findMany({
      where: {
        adId: null, // Only category defaults
        OR: [
          { categoryId: ad.categoryId },
          { subcategoryId: ad.subcategoryId }
        ],
        isActive: true
      },
      include: {
        options: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { order: 'asc' }
    });

    res.json({ 
      success: true, 
      specifications: specificationsWithValues, // Product-specific with values
      categoryDefaults // Suggestions from category
    });
  } catch (error) {
    console.error('Get ad specifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch specifications' });
  }
});

// Product Specifications update endpoints removed - specifications are read-only

module.exports = router;

