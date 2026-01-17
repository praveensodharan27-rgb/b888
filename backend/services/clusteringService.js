/**
 * Hierarchical Clustering Service
 * Implements 4-level clustering: Category → Location → Attributes → Intent
 */

const prisma = require('../prisma/client');
const { parseIndianQuery } = require('./searchIntelligence');

/**
 * Generate cluster key from cluster properties
 */
function generateClusterKey(properties) {
  const parts = [];
  
  if (properties.categorySlug) parts.push(properties.categorySlug);
  if (properties.city) parts.push(properties.city.toLowerCase().replace(/\s+/g, '-'));
  if (properties.state && !properties.city) parts.push(properties.state.toLowerCase().replace(/\s+/g, '-'));
  if (properties.priceIntent === 'under' && properties.maxPrice) {
    const lakh = Math.round(properties.maxPrice / 100000);
    parts.push(`under-${lakh}-lakh`);
  }
  if (properties.condition) parts.push(properties.condition.toLowerCase());
  if (properties.brand) parts.push(properties.brand.toLowerCase().replace(/\s+/g, '-'));
  
  return parts.join('-');
}

/**
 * Level 1: Category-based clustering
 */
async function clusterByCategory(categoryId) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId }
  });

  if (!category) return null;

  const clusterKey = category.slug;
  
  // Find or create cluster
  let cluster = await prisma.adCluster.findUnique({
    where: { clusterKey }
  });

  if (!cluster) {
    // Get all approved ads in this category
    const ads = await prisma.ad.findMany({
      where: {
        categoryId,
        status: 'APPROVED',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      select: { id: true }
    });

    cluster = await prisma.adCluster.create({
      data: {
        clusterKey,
        clusterType: 'category',
        level: 1,
        categoryId,
        adIds: ads.map(ad => ad.id),
        adCount: ads.length,
        popularityScore: calculatePopularityScore(ads.length, 0, 0)
      }
    });
  }

  return cluster;
}

/**
 * Level 2: Location-based clustering
 */
async function clusterByLocation(categoryId, locationId, state, city) {
  const parts = [];
  if (categoryId) {
    const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { slug: true } });
    if (category) parts.push(category.slug);
  }
  if (city) parts.push(city.toLowerCase().replace(/\s+/g, '-'));
  else if (state) parts.push(state.toLowerCase().replace(/\s+/g, '-'));

  const clusterKey = parts.join('-');
  
  let cluster = await prisma.adCluster.findUnique({
    where: { clusterKey }
  });

  if (!cluster) {
    const where = {
      status: 'APPROVED',
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    };

    if (categoryId) where.categoryId = categoryId;
    if (locationId) where.locationId = locationId;
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (state && !city) where.state = { contains: state, mode: 'insensitive' };

    const ads = await prisma.ad.findMany({
      where,
      select: { id: true }
    });

    cluster = await prisma.adCluster.create({
      data: {
        clusterKey,
        clusterType: 'location',
        level: 2,
        categoryId: categoryId || null,
        locationId: locationId || null,
        state: state || null,
        city: city || null,
        adIds: ads.map(ad => ad.id),
        adCount: ads.length,
        popularityScore: calculatePopularityScore(ads.length, 0, 0)
      }
    });
  }

  return cluster;
}

/**
 * Level 3: Attribute-based clustering (brand, model, price range, etc.)
 */
async function clusterByAttributes(categoryId, locationId, attributes, priceRange) {
  const properties = {
    categorySlug: null,
    city: null,
    state: null,
    priceIntent: null,
    maxPrice: null,
    condition: null,
    brand: null,
    ...attributes
  };

  if (categoryId) {
    const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { slug: true } });
    if (category) properties.categorySlug = category.slug;
  }

  if (locationId) {
    const location = await prisma.location.findUnique({ 
      where: { id: locationId },
      select: { city: true, state: true }
    });
    if (location) {
      properties.city = location.city;
      properties.state = location.state;
    }
  }

  if (priceRange) {
    if (priceRange.maxPrice) {
      properties.priceIntent = 'under';
      properties.maxPrice = priceRange.maxPrice;
    }
    if (priceRange.minPrice) {
      properties.minPrice = priceRange.minPrice;
    }
  }

  const clusterKey = generateClusterKey(properties);
  
  let cluster = await prisma.adCluster.findUnique({
    where: { clusterKey }
  });

  if (!cluster) {
    const where = {
      status: 'APPROVED',
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    };

    if (categoryId) where.categoryId = categoryId;
    if (locationId) where.locationId = locationId;

    // Price filters
    if (priceRange) {
      where.price = {};
      if (priceRange.minPrice) where.price.gte = priceRange.minPrice;
      if (priceRange.maxPrice) where.price.lte = priceRange.maxPrice;
    }

    // Attribute filters
    if (attributes.condition) {
      where.condition = attributes.condition;
    }

    // Brand/model filters from attributes JSON
    if (attributes.brand || attributes.model) {
      where.attributes = {};
      if (attributes.brand) {
        where.attributes.path = ['brand'];
        where.attributes.equals = attributes.brand;
      }
    }

    const ads = await prisma.ad.findMany({
      where,
      select: { id: true }
    });

    cluster = await prisma.adCluster.create({
      data: {
        clusterKey,
        clusterType: 'attribute',
        level: 3,
        categoryId: categoryId || null,
        locationId: locationId || null,
        state: properties.state || null,
        city: properties.city || null,
        minPrice: priceRange?.minPrice || null,
        maxPrice: priceRange?.maxPrice || null,
        attributes: attributes || null,
        adIds: ads.map(ad => ad.id),
        adCount: ads.length,
        popularityScore: calculatePopularityScore(ads.length, 0, 0)
      }
    });
  }

  return cluster;
}

/**
 * Level 4: Intent-based clustering
 */
async function clusterByIntent(categoryId, locationId, intent, attributes, priceRange) {
  const properties = {
    categorySlug: null,
    city: null,
    state: null,
    intent,
    ...attributes
  };

  if (categoryId) {
    const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { slug: true } });
    if (category) properties.categorySlug = category.slug;
  }

  if (locationId) {
    const location = await prisma.location.findUnique({ 
      where: { id: locationId },
      select: { city: true, state: true }
    });
    if (location) {
      properties.city = location.city;
      properties.state = location.state;
    }
  }

  if (priceRange) {
    if (priceRange.maxPrice) {
      properties.priceIntent = 'under';
      properties.maxPrice = priceRange.maxPrice;
    }
  }

  const clusterKey = generateClusterKey(properties) + `-${intent}`;
  
  let cluster = await prisma.adCluster.findUnique({
    where: { clusterKey }
  });

  if (!cluster) {
    const where = {
      status: 'APPROVED',
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    };

    if (categoryId) where.categoryId = categoryId;
    if (locationId) where.locationId = locationId;

    // Intent-specific filters
    if (intent === 'urgency') {
      where.isUrgent = true;
    }

    // Price filters
    if (priceRange) {
      where.price = {};
      if (priceRange.minPrice) where.price.gte = priceRange.minPrice;
      if (priceRange.maxPrice) where.price.lte = priceRange.maxPrice;
    }

    // Attribute filters
    if (attributes.condition) {
      where.condition = attributes.condition;
    }

    const ads = await prisma.ad.findMany({
      where,
      select: { id: true }
    });

    cluster = await prisma.adCluster.create({
      data: {
        clusterKey,
        clusterType: 'intent',
        level: 4,
        categoryId: categoryId || null,
        locationId: locationId || null,
        state: properties.state || null,
        city: properties.city || null,
        minPrice: priceRange?.minPrice || null,
        maxPrice: priceRange?.maxPrice || null,
        attributes: attributes || null,
        intent: intent || null,
        adIds: ads.map(ad => ad.id),
        adCount: ads.length,
        popularityScore: calculatePopularityScore(ads.length, 0, 0)
      }
    });
  }

  return cluster;
}

/**
 * Find or create cluster from search query
 */
async function findOrCreateClusterFromQuery(query) {
  const parsed = parseIndianQuery(query);
  
  // Build cluster properties
  let categoryId = null;
  if (parsed.category) {
    const category = await prisma.category.findFirst({
      where: {
        OR: [
          { slug: { contains: parsed.category, mode: 'insensitive' } },
          { name: { contains: parsed.category, mode: 'insensitive' } }
        ]
      }
    });
    if (category) categoryId = category.id;
  }

  let locationId = null;
  if (parsed.city) {
    const location = await prisma.location.findFirst({
      where: {
        city: { contains: parsed.city, mode: 'insensitive' }
      }
    });
    if (location) locationId = location.id;
  }

  const attributes = {};
  if (parsed.condition) attributes.condition = parsed.condition;

  const priceRange = {};
  if (parsed.minPrice) priceRange.minPrice = parsed.minPrice;
  if (parsed.maxPrice) priceRange.maxPrice = parsed.maxPrice;

  // Create cluster at appropriate level
  if (categoryId && locationId && (priceRange.maxPrice || parsed.condition)) {
    return await clusterByAttributes(categoryId, locationId, attributes, priceRange);
  } else if (categoryId && locationId) {
    return await clusterByLocation(categoryId, locationId, parsed.state, parsed.city);
  } else if (categoryId) {
    return await clusterByCategory(categoryId);
  }

  return null;
}

/**
 * Update cluster with new ads
 */
async function updateCluster(clusterId) {
  const cluster = await prisma.adCluster.findUnique({
    where: { id: clusterId }
  });

  if (!cluster) return null;

  const where = {
    status: 'APPROVED',
    OR: [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } }
    ]
  };

  if (cluster.categoryId) where.categoryId = cluster.categoryId;
  if (cluster.locationId) where.locationId = cluster.locationId;
  if (cluster.city) where.city = { contains: cluster.city, mode: 'insensitive' };
  if (cluster.state && !cluster.city) where.state = { contains: cluster.state, mode: 'insensitive' };

  if (cluster.minPrice || cluster.maxPrice) {
    where.price = {};
    if (cluster.minPrice) where.price.gte = cluster.minPrice;
    if (cluster.maxPrice) where.price.lte = cluster.maxPrice;
  }

  if (cluster.condition) {
    where.condition = cluster.condition;
  }

  if (cluster.intent === 'urgency') {
    where.isUrgent = true;
  }

  // Attribute filters (simplified - can be enhanced)
  if (cluster.attributes) {
    // This would need more complex querying for JSON fields
    // For now, we'll rely on other filters
  }

  const ads = await prisma.ad.findMany({
    where,
    select: { id: true }
  });

  const adIds = ads.map(ad => ad.id);

  return await prisma.adCluster.update({
    where: { id: clusterId },
    data: {
      adIds,
      adCount: adIds.length,
      lastUpdated: new Date(),
      popularityScore: calculatePopularityScore(adIds.length, 0, 0)
    }
  });
}

/**
 * Calculate popularity score
 */
function calculatePopularityScore(adCount, searchCount, viewCount) {
  // Simple scoring algorithm - can be enhanced
  const adScore = Math.min(adCount / 100, 1) * 0.4;
  const searchScore = Math.min(searchCount / 1000, 1) * 0.3;
  const viewScore = Math.min(viewCount / 10000, 1) * 0.3;
  
  return (adScore + searchScore + viewScore) * 100;
}

/**
 * Get all clusters for a category
 */
async function getClustersByCategory(categoryId, options = {}) {
  const { level, limit = 50 } = options;
  
  const where = { categoryId };
  if (level) where.level = level;

  return await prisma.adCluster.findMany({
    where,
    include: {
      category: true,
      location: true,
      lists: {
        where: { isActive: true },
        orderBy: { priority: 'desc' }
      }
    },
    orderBy: [
      { popularityScore: 'desc' },
      { adCount: 'desc' }
    ],
    take: limit
  });
}

/**
 * Get all clusters for a location
 */
async function getClustersByLocation(locationId, options = {}) {
  const { level, limit = 50 } = options;
  
  const where = { locationId };
  if (level) where.level = level;

  return await prisma.adCluster.findMany({
    where,
    include: {
      category: true,
      location: true,
      lists: {
        where: { isActive: true },
        orderBy: { priority: 'desc' }
      }
    },
    orderBy: [
      { popularityScore: 'desc' },
      { adCount: 'desc' }
    ],
    take: limit
  });
}

module.exports = {
  clusterByCategory,
  clusterByLocation,
  clusterByAttributes,
  clusterByIntent,
  findOrCreateClusterFromQuery,
  updateCluster,
  getClustersByCategory,
  getClustersByLocation,
  generateClusterKey,
  calculatePopularityScore
};

