const Ad = require('../../domain/entities/Ad');
const AdConfig = require('../../domain/config/AdConfig');
const AdRepository = require('../../infrastructure/database/repositories/AdRepository');
const { moderateAd } = require('../../../services/contentModeration');
const { indexAd, searchAds } = require('../../../services/meilisearch');
const { rankAds } = require('../../../services/adRankingService');
const { getPostingStatus, consumeBusinessAd } = require('../../../services/adPostingLogicService');
const { getCachedAds, cacheAds } = require('../../../utils/redis-helpers');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logger } = require('../../config/logger');
const { createRateLimitedLogger } = require('../../../utils/rateLimitedLog');
const { slugify } = require('../../../utils/slug');
const { enrichAdForSeoUrl, enrichAdsResult, computeAdSlugFields } = require('../../../utils/adSeo');

const rlLog = createRateLimitedLogger(logger, 120 * 1000); // once per 2 min for fallback

const RANK_POOL_SIZE = 300;
const RANK_CACHE_TTL_SEC = 150;

/**
 * Ad Service
 * Business logic for Ad operations
 */
class AdService {
  constructor(adRepository = AdRepository) {
    this.adRepository = adRepository;
  }

  async getAds(filters = {}) {
    const reservedKeys = new Set([
      'page', 'limit', 'category', 'subcategory', 'location', 'city', 'state',
      'minPrice', 'maxPrice', 'search', 'condition', 'sort', 'latitude', 'longitude', 'radius', 'userId',
      'brand', 'model'
    ]);
    const attributeFilters = {};
    for (const [key, value] of Object.entries(filters)) {
      if (reservedKeys.has(key) || value === undefined || value === null || value === '') continue;
      attributeFilters[key] = value;
    }

    const {
      page = 1,
      limit = 20,
      category,
      subcategory,
      location,
      city,
      state,
      minPrice,
      maxPrice,
      search,
      condition,
      sort = 'newest',
      latitude,
      longitude,
      radius = 50,
      userId,
      brand: filterBrand,
      model: filterModel,
    } = filters;

    const where = {
      // Only show APPROVED ads (excludes INACTIVE, EXPIRED, PENDING, REJECTED, SOLD)
      status: 'APPROVED',
      AND: [
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      ]
    };

    // Category filter
    if (category) {
      const categoryObj = await prisma.category.findUnique({
        where: { slug: category },
        select: { id: true }
      });
      if (categoryObj) {
        where.categoryId = categoryObj.id;
      }
    }

    // Subcategory filter
    if (subcategory) {
      const subcategoryObj = await prisma.subcategory.findFirst({
        where: { slug: subcategory },
        select: { id: true }
      });
      if (subcategoryObj) {
        where.subcategoryId = subcategoryObj.id;
      }
    }

    // Location filter - priority: location slug > city/state
    if (location) {
      const locationObj = await prisma.location.findUnique({
        where: { slug: location },
        select: { id: true }
      });
      if (locationObj) {
        where.locationId = locationObj.id;
      }
    } else if (city || state) {
      // Filter by city and/or state - check both locationId (via Location table) AND direct city/state on Ad
      const locationWhere = {};
      if (city) {
        locationWhere.city = city;
      }
      if (state) {
        locationWhere.state = state;
      }
      
      if (Object.keys(locationWhere).length > 0) {
        const matchingLocations = await prisma.location.findMany({
          where: {
            ...locationWhere,
            isActive: true
          },
          select: { id: true }
        });
        
        const locationIds = matchingLocations.map(loc => loc.id);
        
        // Build OR condition: match by locationId OR by direct city/state on Ad
        const locationConditions = [];
        
        if (locationIds.length > 0) {
          locationConditions.push({ locationId: { in: locationIds } });
        }
        
        // Also match ads with direct city/state fields (for ads without locationId)
        // MongoDB doesn't support case-insensitive, so we match exact
        const directLocationConditions = {};
        if (city) {
          directLocationConditions.city = city;
        }
        if (state) {
          directLocationConditions.state = state;
        }
        
        if (Object.keys(directLocationConditions).length > 0) {
          locationConditions.push(directLocationConditions);
        }
        
        if (locationConditions.length > 0) {
          // Add OR condition inside AND array (match by locationId OR direct city/state)
          if (locationConditions.length === 1) {
            where.AND.push(locationConditions[0]);
          } else {
            where.AND.push({ OR: locationConditions });
          }
        }
        // If no locationConditions match, don't filter by location (show all approved ads)
        // This ensures users see ads even if their location doesn't match exactly
      }
    }

    // Price filters
    if (minPrice !== undefined) {
      where.price = { ...where.price, gte: parseFloat(minPrice) };
    }
    if (maxPrice !== undefined) {
      where.price = { ...where.price, lte: parseFloat(maxPrice) };
    }

    // Condition filter
    if (condition && AdConfig.VALID_CONDITIONS.includes(condition)) {
      where.condition = condition;
    }

    // User filter
    if (userId) {
      where.userId = userId;
    }

    // Location-based search (latitude/longitude)
    if (latitude && longitude) {
      // This would require PostGIS or similar for proper distance calculation
      // For now, we'll use a simple bounding box approximation
      // In production, use proper geospatial queries
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Text search: Meilisearch when available, else Prisma fallback (title/description contains)
    if (search && search.trim()) {
      const searchTerm = search.trim();
      try {
        const categoryId = where.categoryId || undefined;
        const subcategoryId = where.subcategoryId || undefined;
        const locationId = where.locationId || undefined;
        const hasAttrFilters = Object.keys(attributeFilters).length > 0;
        const fetchLimit = hasAttrFilters ? Math.min(limitNum * 15, 500) : limitNum;
        const fetchPage = hasAttrFilters ? 1 : pageNum;

        const searchResult = await searchAds(searchTerm, {
          page: fetchPage,
          limit: fetchLimit,
          categoryId,
          subcategoryId,
          locationId,
          minPrice: where.price && typeof where.price.gte !== 'undefined' ? where.price.gte : undefined,
          maxPrice: where.price && typeof where.price.lte !== 'undefined' ? where.price.lte : undefined,
          condition: where.condition || undefined,
          sort,
        });

        const hits = searchResult.hits || [];
        const ids = hits.map((h) => h.id);
        if (ids.length === 0) {
          return { ads: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 };
        }

        const fullAds = await prisma.ad.findMany({
          where: { id: { in: ids } },
          include: {
            user: { select: { id: true, name: true, avatar: true, isVerified: true } },
            category: { select: { id: true, name: true, slug: true } },
            subcategory: { select: { id: true, name: true, slug: true } },
            location: { select: { id: true, name: true, slug: true, city: true, state: true } },
          },
        });

        const orderMap = new Map(ids.map((id, i) => [id, i]));
        let sorted = fullAds.slice().sort((a, b) => (orderMap.get(a.id) ?? 9999) - (orderMap.get(b.id) ?? 9999));

        if (hasAttrFilters) {
          const attrsMatch = (ad) => {
            const attrs = ad.attributes && typeof ad.attributes === 'object' ? ad.attributes : {};
            for (const [key, filterVal] of Object.entries(attributeFilters)) {
              const attrVal = attrs[key];
              if (attrVal == null || String(attrVal).trim() !== String(filterVal).trim()) return false;
            }
            return true;
          };
          sorted = sorted.filter(attrsMatch);
        }

        const total = sorted.length;
        const start = (pageNum - 1) * limitNum;
        const ads = sorted.slice(start, start + limitNum);
        return enrichAdsResult({
          ads,
          total: hasAttrFilters ? total : (searchResult.total ?? total),
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil((hasAttrFilters ? total : (searchResult.total ?? total)) / limitNum),
        });
      } catch (err) {
        rlLog.warn('meilisearch_fallback', { err: err.message, search: searchTerm }, 'Meilisearch unavailable, using Prisma text search');
        where.AND.push({
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
        });
      }
    }

    // When filtering by any attribute (brand, model, ram, storage, processor, etc.), fetch larger set and filter in memory (MongoDB has no JSON path filter in Prisma)
    if (Object.keys(attributeFilters).length > 0) {
      const ATTRIBUTE_POOL = 3000;
      const pool = await this.adRepository.findManyRaw(where, ATTRIBUTE_POOL);
      const getAttrVal = (attrs, key) => {
        const v = attrs[key];
        if (v != null && String(v).trim() !== '') return v;
        if (key === 'fuel_type') return attrs.fuel;
        if (key === 'fuel') return attrs.fuel_type;
        return v;
      };
      const attrsMatch = (ad) => {
        const attrs = ad.attributes && typeof ad.attributes === 'object' ? ad.attributes : {};
        for (const [key, filterVal] of Object.entries(attributeFilters)) {
          const attrVal = getAttrVal(attrs, key);
          if (attrVal == null || String(attrVal).trim() !== String(filterVal).trim()) return false;
        }
        return true;
      };
      const filtered = (pool.ads || []).filter(attrsMatch);
      const orderBy = (a, b) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return sort === 'oldest' ? tA - tB : tB - tA;
      };
      filtered.sort(orderBy);
      const total = filtered.length;
      const start = (pageNum - 1) * limitNum;
      const ads = filtered.slice(start, start + limitNum);
      return enrichAdsResult({ ads, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
    }

    const useRanking = (sort === 'newest' || !sort) && !(search && search.trim());

    if (useRanking) {
      const rankKey = `rank:${category || ''}:${subcategory || ''}:${location || ''}:${city || ''}:${state || ''}:${pageNum}:${limitNum}`;
      const cached = await getCachedAds(rankKey);
      if (cached) return cached;

      const [total, pool] = await Promise.all([
        prisma.ad.count({ where }),
        this.adRepository.findManyRaw(where, RANK_POOL_SIZE)
      ]);
      
      // Fallback: If location filter returns 0 results, try without location filter (show all ads)
      if (total === 0 && (city || state || location)) {
        const whereWithoutLocation = { ...where };
        // Remove location filters from AND array
        whereWithoutLocation.AND = whereWithoutLocation.AND.filter(condition => {
          if (typeof condition === 'object' && condition !== null) {
            // Check if this is a location-related condition
            if (condition.locationId || condition.city || condition.state || condition.OR) {
              if (Array.isArray(condition.OR)) {
                // Check if OR contains location conditions
                const hasLocation = condition.OR.some(c => c.locationId || c.city || c.state);
                return !hasLocation;
              }
              return false;
            }
          }
          return true;
        });
        // Also remove top-level location filters
        delete whereWithoutLocation.locationId;
        delete whereWithoutLocation.city;
        delete whereWithoutLocation.state;
        delete whereWithoutLocation.OR;
        
        const [totalFallback, poolFallback] = await Promise.all([
          prisma.ad.count({ where: whereWithoutLocation }),
          this.adRepository.findManyRaw(whereWithoutLocation, RANK_POOL_SIZE)
        ]);
        
        if (totalFallback > 0) {
          const start = (pageNum - 1) * limitNum;
          const ranked = await rankAds(poolFallback.ads, { locationContext: null, updateLastShown: false });
          const ads = ranked.slice(start, start + limitNum);
          const result = enrichAdsResult({
            ads,
            total: totalFallback,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(totalFallback / limitNum)
          });
          await cacheAds(rankKey, result, RANK_CACHE_TTL_SEC);
          return result;
        }
      }
      
      if (total === 0) {
        return { ads: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 };
      }
      const start = (pageNum - 1) * limitNum;
      if (start >= RANK_POOL_SIZE) {
        return enrichAdsResult(await this.adRepository.findMany({
          ...where,
          page: pageNum,
          limit: limitNum,
          sort: 'newest'
        }));
      }
      const locationContext = (city || state) ? { city: city || null, state: state || null } : null;
      const ranked = await rankAds(pool.ads, { locationContext, updateLastShown: false });
      const ads = ranked.slice(start, start + limitNum);
      const result = enrichAdsResult({
        ads,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      });
      await cacheAds(rankKey, result, RANK_CACHE_TTL_SEC);
      return result;
    }

    let result = await this.adRepository.findMany({
      ...where,
      page: pageNum,
      limit: limitNum,
      sort
    });

    // Fallback: If location filter returns 0 results, try without location filter
    if (result.total === 0 && (city || state || location) && result.ads.length === 0) {
      const whereWithoutLocation = { ...where };
      whereWithoutLocation.AND = whereWithoutLocation.AND.filter(condition => {
        if (typeof condition === 'object' && condition !== null) {
          if (condition.locationId || condition.city || condition.state || condition.OR) {
            if (Array.isArray(condition.OR)) {
              const hasLocation = condition.OR.some(c => c.locationId || c.city || c.state);
              return !hasLocation;
            }
            return false;
          }
        }
        return true;
      });
      delete whereWithoutLocation.locationId;
      delete whereWithoutLocation.city;
      delete whereWithoutLocation.state;
      delete whereWithoutLocation.OR;
      
      result = await this.adRepository.findMany({
        ...whereWithoutLocation,
        page: pageNum,
        limit: limitNum,
        sort
      });
    }

    return enrichAdsResult(result);
  }

  /**
   * Aggregate filter options from actual ads (attributes) for a category/subcategory.
   * Returns only spec values that exist in currently available products — no master JSON only.
   * Used by filter page to show e.g. only RAM 8GB, 16GB if no 32GB product exists.
   */
  async getFilterOptionsFromAds(categorySlug, subcategorySlug) {
    const slugMap = { smartphone: 'mobiles' };
    const mappedCat = slugMap[categorySlug] || categorySlug;
    const where = {
      status: 'APPROVED',
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }
      ]
    };

    if (mappedCat) {
      const category = await prisma.category.findFirst({
        where: { slug: mappedCat },
        select: { id: true }
      });
      if (category) where.categoryId = category.id;
    }

    if (subcategorySlug) {
      const subcategory = await prisma.subcategory.findFirst({
        where: { slug: subcategorySlug },
        select: { id: true }
      });
      if (subcategory) where.subcategoryId = subcategory.id;
    }

    const ads = await prisma.ad.findMany({
      where,
      select: { attributes: true },
      take: 5000
    });

    const agg = {};
    const brandModels = {}; // brand -> Set of models (for filter: only models that exist for selected brand)
    for (const ad of ads) {
      const attrs = ad.attributes && typeof ad.attributes === 'object' ? ad.attributes : {};
      let brandVal = null;
      let modelVal = null;
      for (const [key, value] of Object.entries(attrs)) {
        if (value == null || value === '') continue;
        const v = Array.isArray(value) ? value.map(String).join(',') : String(value).trim();
        if (!v) continue;
        if (!agg[key]) agg[key] = new Set();
        agg[key].add(v);
        if (key === 'brand') brandVal = v;
        if (key === 'model') modelVal = v;
      }
      if (brandVal && modelVal) {
        if (!brandModels[brandVal]) brandModels[brandVal] = new Set();
        brandModels[brandVal].add(modelVal);
      }
    }

    const filterOptions = {};
    for (const [key, set] of Object.entries(agg)) {
      filterOptions[key] = [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }
    const brandModelsSorted = {};
    for (const [brand, set] of Object.entries(brandModels)) {
      brandModelsSorted[brand] = [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }

    return { filterOptions, brandModels: brandModelsSorted };
  }

  async getAdById(id) {
    const ad = await this.adRepository.findById(id, {
      user: true,
      category: true,
      subcategory: true,
      location: true
    });

    if (!ad) {
      throw new Error('Ad not found');
    }

    return enrichAdForSeoUrl(ad);
  }

  /** Get ad by SEO path: stateSlug, citySlug, categorySlug, slug. For URL /{state}/{city}/{category}/{slug}. */
  async getAdByPath(stateSlug, citySlug, categorySlug, slug) {
    const s = (stateSlug || '').toLowerCase().trim();
    const c = (citySlug || '').toLowerCase().trim();
    const cat = (categorySlug || '').toLowerCase().trim();
    const sl = (slug || '').toLowerCase().trim();
    if (!cat || !sl) return null;

    // Fast path: indexed lookup when full path is present (include PENDING so newly created ads render)
    if (s && c) {
      const byPath = await prisma.ad.findFirst({
        where: {
          status: { in: ['APPROVED', 'PENDING'] },
          stateSlug: s,
          citySlug: c,
          categorySlug: cat,
          slug: sl,
        },
        include: {
          user: { select: { id: true, name: true, avatar: true, isVerified: true, phone: true, createdAt: true, updatedAt: true } },
          category: { select: { id: true, name: true, slug: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
          location: { select: { id: true, name: true, slug: true } },
        },
      });
      if (byPath) return byPath;
    }

    // Fallback: ads not yet backfilled or URL missing state/city (resolve by categoryId + state/city/slug)
    const category = await prisma.category.findFirst({
      where: { slug: cat, isActive: true },
    });
    if (!category) return null;
    const ads = await prisma.ad.findMany({
      where: {
        categoryId: category.id,
        status: { in: ['APPROVED', 'PENDING'] },
        ...(s && c
          ? { OR: [{ state: { not: null }, city: { not: null } }, { stateSlug: s, citySlug: c }] }
          : { state: { not: null }, city: { not: null } }),
      },
      take: 200,
      include: {
        user: { select: { id: true, name: true, avatar: true, isVerified: true, phone: true, createdAt: true, updatedAt: true } },
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
        location: { select: { id: true, name: true, slug: true } },
      },
    });
    for (const ad of ads) {
      const adStateSlug = slugify(ad.state || '');
      const adCitySlug = slugify(ad.city || '');
      const adSlug = (ad.slug && ad.slug.trim()) ? ad.slug.toLowerCase().trim() : slugify(ad.title || '', 70);
      if (adStateSlug === s && adCitySlug === c && (adSlug === sl || slugify(ad.title || '', 70) === sl)) {
        return ad;
      }
    }
    return null;
  }

  /** Get ad by JustDial-style path: /:city/services/:category/:slug. Resolves city from location slug. */
  async getAdByServicePath(locationSlug, categorySlug, slug) {
    const locSlug = (locationSlug || '').toLowerCase().trim();
    const catSlug = (categorySlug || '').toLowerCase().trim();
    const sl = (slug || '').toLowerCase().trim();
    if (!locSlug || !catSlug || !sl) return null;

    const location = await prisma.location.findUnique({
      where: { slug: locSlug, isActive: true },
      select: { id: true, state: true, city: true },
    });
    if (!location) return null;

    const stateSlug = slugify(location.state || '');
    const citySlug = slugify(location.city || '');

    const serviceCategory = await prisma.category.findFirst({
      where: { slug: 'services', isActive: true },
      select: { id: true },
    });
    if (!serviceCategory) return null;

    const subcategory = await prisma.subcategory.findFirst({
      where: { slug: catSlug, categoryId: serviceCategory.id },
      select: { id: true },
    });
    if (!subcategory) return null;

    const ad = await prisma.ad.findFirst({
      where: {
        status: 'APPROVED',
        categoryId: serviceCategory.id,
        subcategoryId: subcategory.id,
        slug: sl,
        OR: [
          { locationId: location.id },
          ...(stateSlug && citySlug ? [{ stateSlug, citySlug }] : []),
        ],
      },
      include: {
        user: { select: { id: true, name: true, avatar: true, isVerified: true, phone: true, createdAt: true, updatedAt: true } },
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
        location: { select: { id: true, name: true, slug: true, city: true, state: true } },
      },
    });
    if (ad) return enrichAdForSeoUrl(ad);

    const ads = await prisma.ad.findMany({
      where: {
        status: 'APPROVED',
        categoryId: serviceCategory.id,
        subcategoryId: subcategory.id,
        OR: [
          { locationId: location.id },
          ...(stateSlug && citySlug ? [{ stateSlug, citySlug }] : []),
        ],
      },
      take: 200,
      include: {
        user: { select: { id: true, name: true, avatar: true, isVerified: true, phone: true, createdAt: true, updatedAt: true } },
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
        location: { select: { id: true, name: true, slug: true, city: true, state: true } },
      },
    });
    for (const a of ads) {
      const adSlugVal = (a.slug && a.slug.trim()) ? a.slug.toLowerCase().trim() : slugify(a.title || '', 70);
      if (adSlugVal === sl || slugify(a.title || '', 70) === sl) return enrichAdForSeoUrl(a);
    }
    return null;
  }

  async createAd(userId, adData, paymentOrder = null) {
    const posting = await getPostingStatus(userId);
    if (!posting.canPost && !paymentOrder) {
      throw new Error(posting.blockReason || `Cannot post. ${posting.mode === 'BUSINESS' ? 'Package exhausted.' : 'Free ad limit reached.'}`);
    }

    let packageType = 'NORMAL';
    let usedBusinessAd = false;
    if (!paymentOrder && posting.mode === 'BUSINESS' && posting.remaining_ads > 0) {
      const consumed = await consumeBusinessAd(userId);
      if (consumed) {
        packageType = consumed.packageType;
        usedBusinessAd = true;
      }
    }

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: adData.categoryId }
    });
    if (!category) {
      throw new Error('Invalid category');
    }

    // Verify location if provided
    if (adData.locationId) {
      const location = await prisma.location.findUnique({
        where: { id: adData.locationId }
      });
      if (!location) {
        throw new Error('Invalid location');
      }
    }

    // Verify subcategory if provided
    if (adData.subcategoryId) {
      const subcategory = await prisma.subcategory.findUnique({
        where: { id: adData.subcategoryId }
      });
      if (!subcategory || subcategory.categoryId !== adData.categoryId) {
        throw new Error('Invalid subcategory');
      }
    }

    // Get premium options from payment order or request body
    let premiumType = adData.premiumType || null;
    let isUrgent = adData.isUrgent === true || adData.isUrgent === 'true';

    if (paymentOrder && paymentOrder.adData) {
      let parsedAdData = paymentOrder.adData;
      if (typeof parsedAdData === 'string') {
        try {
          parsedAdData = JSON.parse(parsedAdData);
        } catch (e) {
          parsedAdData = {};
        }
      }
      premiumType = parsedAdData.premiumType || premiumType;
      isUrgent = parsedAdData.isUrgent !== undefined ? parsedAdData.isUrgent : isUrgent;
    }

    // Calculate premium expiry
    let premiumExpiresAt = null;
    if (premiumType || isUrgent) {
      premiumExpiresAt = AdConfig.calculatePremiumExpiry(premiumType, isUrgent);
    }

    // Create ad entity (packageType: BUSINESS = package tier for ranking, SINGLE = NORMAL)
    const adEntity = new Ad({
      title: adData.title,
      description: adData.description,
      price: adData.price,
      originalPrice: adData.originalPrice,
      condition: adData.condition || 'USED',
      status: 'PENDING', // Will be moderated
      userId,
      categoryId: adData.categoryId,
      subcategoryId: adData.subcategoryId || null,
      locationId: adData.locationId || null,
      images: adData.images || [],
      attributes: adData.attributes || {},
      premiumType,
      isUrgent,
      expiresAt: AdConfig.calculateExpiryDate(),
      premiumExpiresAt,
      packageType
    });

    // Create ad in database (include state, city, neighbourhood, discount from adData so all form fields are saved)
    const createPayload = {
      ...adEntity.toJSON(),
      state: adData.state || null,
      city: adData.city || null,
      neighbourhood: adData.neighbourhood || null,
      exactLocation: adData.exactLocation || null,
      discount: adData.discount != null && adData.discount !== '' ? parseFloat(adData.discount) : null
    };
    const ad = await this.adRepository.create(createPayload);

    // Auto-generate slug fields for SEO path (/state/city/category/slug) and persist state/city from location
    const slugFields = computeAdSlugFields(ad, { appendIdForUniqueness: true });
    const stateFromLocation = ad.location?.state ?? ad.state ?? null;
    const cityFromLocation = ad.location?.city ?? ad.city ?? null;
    const updatePayload = {
      ...slugFields,
      ...(stateFromLocation != null && { state: stateFromLocation }),
      ...(cityFromLocation != null && { city: cityFromLocation }),
    };
    if (updatePayload.slug || updatePayload.stateSlug || updatePayload.citySlug || updatePayload.categorySlug || updatePayload.state || updatePayload.city) {
      await this.adRepository.update(ad.id, updatePayload);
      ad.slug = slugFields.slug;
      ad.stateSlug = slugFields.stateSlug;
      ad.citySlug = slugFields.citySlug;
      ad.categorySlug = slugFields.categorySlug;
      if (stateFromLocation != null) ad.state = stateFromLocation;
      if (cityFromLocation != null) ad.city = cityFromLocation;
    }

    // Run content moderation and store flags for auto-approval cron (and immediate reject if unsafe)
    try {
      const moderationResult = await moderateAd(ad.title, ad.description, ad.images || []);
      const flags = moderationResult.moderationFlags || {};
      const imageDetails = flags.imageDetails || [];
      const moderationFlags = {
        textModeration: { flagged: !!flags.hasAdultText },
        imageModeration: imageDetails.map((d) => ({ safe: d.isSafe !== false }))
      };

      if (moderationResult.shouldReject) {
        await this.adRepository.update(ad.id, {
          status: 'REJECTED',
          autoRejected: true,
          rejectionReason: moderationResult.rejectionReason || 'Content policy violation',
          moderationStatus: 'rejected',
          moderationFlags
        });
        throw new Error(moderationResult.rejectionReason || 'Ad rejected: content policy violation');
      }

      await this.adRepository.update(ad.id, {
        moderationFlags,
        moderationStatus: 'pending'
      });
    } catch (moderationError) {
      if (moderationError.message && moderationError.message.includes('rejected')) {
        throw moderationError;
      }
      console.error('Moderation error:', moderationError);
      // Fail-open: keep PENDING, store no flags; cron will approve after threshold
    }

    // Do not index PENDING ads in search; they are indexed when approved (cron or manual)

    // Update free ads count only when posting in SINGLE mode (free quota), not when business ad was used
    if (!paymentOrder && !usedBusinessAd && posting.freeAdsRemaining > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          freeAdsUsed: { increment: 1 },
          freeAdsUsedThisMonth: { increment: 1 }
        }
      });
    }

    return ad;
  }

  async updateAd(adId, userId, adData) {
    // Verify ad exists and belongs to user
    const existingAd = await this.adRepository.findById(adId);
    if (!existingAd) {
      throw new Error('Ad not found');
    }
    if (existingAd.userId !== userId) {
      throw new Error('You can only update your own ads');
    }

    // Update ad
    let updatedAd = await this.adRepository.update(adId, adData);

    // Recompute slug fields when title/location/category might have changed
    const merged = { ...existingAd, ...adData, category: updatedAd.category || existingAd.category, location: updatedAd.location || existingAd.location };
    const slugFields = computeAdSlugFields(merged);
    updatedAd = await this.adRepository.update(adId, slugFields);

    // Re-index in search
    try {
      await indexAd(updatedAd);
    } catch (indexError) {
      console.error('Indexing error:', indexError);
    }

    return updatedAd;
  }

  async deleteAd(adId, userId) {
    // Verify ad exists and belongs to user
    const existingAd = await this.adRepository.findById(adId);
    if (!existingAd) {
      throw new Error('Ad not found');
    }
    if (existingAd.userId !== userId) {
      throw new Error('You can only delete your own ads');
    }

    // Delete from search index
    try {
      const { deleteAd } = require('../../../services/meilisearch');
      await deleteAd(adId);
    } catch (indexError) {
      console.error('Delete from index error:', indexError);
    }

    // Delete ad
    await this.adRepository.delete(adId);

    return { success: true };
  }

  async checkAdLimit(userId, options = {}) {
    const { premiumSelected = false } = options;
    const legacy = await this.adRepository.checkLimit(userId);
    try {
      const posting = await getPostingStatus(userId);
      const allowDirectPost = posting.allowDirectPost === true;
      // Single source of truth: show "Business Package Status" section only when user has no business quota left (not purchased or quota exhausted)
      const showBusinessPackageStatusSection = posting.showBusinessPackageStatusSection === true;
      const hidePremiumSection = !showBusinessPackageStatusSection;
      const hideSingleBuy = allowDirectPost || posting.hideSingleBuy === true;
      // When businessPlanActive + planExpiryValid + businessAdsUsed < businessAdsLimit → hide popup, allow direct post
      const showUpgradePopup = !allowDirectPost &&
        posting.freeAdsRemaining <= 0 &&
        !premiumSelected &&
        (posting.businessPackageExpired || !posting.activeBusinessPackage) &&
        !(posting.activeBusinessPackage && (posting.businessAdsRemaining ?? 0) > 0);
      const upgradeReason = showUpgradePopup ? 'FREE_LIMIT_REACHED' : undefined;

      return {
        ...legacy,
        ...posting,
        canPost: posting.canPost,
        limit: legacy.limit,
        freeAdsUsed: legacy.freeAdsUsed,
        premiumSelected: !!premiumSelected,
        allowDirectPost,
        showBusinessPackageStatusSection,
        hidePremiumSection,
        hideSingleBuy,
        showUpgradePopup,
        upgradeReason,
      };
    } catch (err) {
      logger.warn({ err: err.message, userId }, 'getPostingStatus failed, using legacy checkLimit');
      return {
        ...legacy,
        canPost: legacy.canPost,
        activeBusinessPackage: false,
        businessAdsRemaining: 0,
        showBusinessPackageStatusSection: true,
        hidePremiumSection: false,
        hideSingleBuy: false,
        allowDirectPost: false,
        showUpgradePopup: false,
        upgradeReason: undefined,
      };
    }
  }
}

module.exports = new AdService();
