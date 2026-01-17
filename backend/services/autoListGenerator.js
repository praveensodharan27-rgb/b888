/**
 * Auto List Generator Service
 * Generates SEO-optimized lists from clusters
 */

const prisma = require('../prisma/client');
const { generateClusterKey } = require('./clusteringService');

/**
 * Generate SEO-friendly slug from title
 */
function generateSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate SEO title from cluster
 */
function generateSEOTitle(cluster, category, location) {
  const parts = [];

  // Add condition if available
  if (cluster.attributes?.condition) {
    const conditionMap = {
      'USED': 'Used',
      'NEW': 'New',
      'LIKE_NEW': 'Like New',
      'REFURBISHED': 'Refurbished'
    };
    parts.push(conditionMap[cluster.attributes.condition] || cluster.attributes.condition);
  }

  // Add category
  if (category) {
    parts.push(category.name);
  }

  // Add price range
  if (cluster.maxPrice) {
    const lakh = Math.round(cluster.maxPrice / 100000);
    if (lakh > 0) {
      parts.push(`Under ₹${lakh} Lakh`);
    } else {
      parts.push(`Under ₹${Math.round(cluster.maxPrice / 1000)}K`);
    }
  }

  // Add location
  if (location) {
    if (location.city) {
      parts.push(`in ${location.city}`);
    } else if (location.state) {
      parts.push(`in ${location.state}`);
    }
  }

  // Add intent
  if (cluster.intent === 'urgency') {
    parts.push('Urgent');
  }

  return parts.join(' ');
}

/**
 * Generate SEO meta description
 */
function generateSEODescription(cluster, category, location, adCount) {
  const parts = [];

  parts.push(`Browse ${adCount || cluster.adCount} verified`);

  // Add condition
  if (cluster.attributes?.condition) {
    const conditionMap = {
      'USED': 'used',
      'NEW': 'new',
      'LIKE_NEW': 'like new',
      'REFURBISHED': 'refurbished'
    };
    parts.push(conditionMap[cluster.attributes.condition] || cluster.attributes.condition.toLowerCase());
  }

  // Add category
  if (category) {
    parts.push(category.name.toLowerCase());
  }

  // Add location
  if (location) {
    if (location.city) {
      parts.push(`in ${location.city}`);
    } else if (location.state) {
      parts.push(`in ${location.state}`);
    }
  }

  // Add price info
  if (cluster.maxPrice) {
    const lakh = Math.round(cluster.maxPrice / 100000);
    if (lakh > 0) {
      parts.push(`under ₹${lakh} lakh`);
    }
  }

  parts.push('on SellIt. Post free ads and get best deals today.');

  return parts.join(' ');
}

/**
 * Generate keywords array
 */
function generateKeywords(cluster, category, location) {
  const keywords = [];

  if (category) {
    keywords.push(category.name);
    keywords.push(`buy ${category.name}`);
    keywords.push(`sell ${category.name}`);
    keywords.push(`${category.name} marketplace`);
  }

  if (location) {
    if (location.city) {
      keywords.push(location.city);
      keywords.push(`${category?.name || 'items'} in ${location.city}`);
    }
    if (location.state) {
      keywords.push(location.state);
      keywords.push(`${category?.name || 'items'} in ${location.state}`);
    }
  }

  if (cluster.attributes?.condition) {
    keywords.push(cluster.attributes.condition.toLowerCase());
    keywords.push(`used ${category?.name || 'items'}`);
  }

  if (cluster.maxPrice) {
    const lakh = Math.round(cluster.maxPrice / 100000);
    if (lakh > 0) {
      keywords.push(`under ${lakh} lakh`);
      keywords.push(`budget ${category?.name || 'items'}`);
    }
  }

  if (cluster.intent === 'urgency') {
    keywords.push('urgent');
    keywords.push('urgent sale');
  }

  return [...new Set(keywords)]; // Remove duplicates
}

/**
 * Create or update auto list from cluster
 */
async function createOrUpdateAutoList(clusterId) {
  const cluster = await prisma.adCluster.findUnique({
    where: { id: clusterId },
    include: {
      category: true,
      location: true
    }
  });

  if (!cluster || cluster.adCount === 0) {
    return null;
  }

  // Generate list properties
  const title = generateSEOTitle(cluster, cluster.category, cluster.location);
  const metaTitle = `${title} | Buy & Sell Online | SellIt`;
  const metaDescription = generateSEODescription(cluster, cluster.category, cluster.location, cluster.adCount);
  const slug = generateSlug(title);
  const keywords = generateKeywords(cluster, cluster.category, cluster.location);

  // Check if list already exists
  let autoList = await prisma.autoList.findUnique({
    where: { slug }
  });

  if (autoList) {
    // Update existing list
    autoList = await prisma.autoList.update({
      where: { id: autoList.id },
      data: {
        title,
        metaTitle,
        metaDescription,
        adIds: cluster.adIds,
        adCount: cluster.adCount,
        keywords,
        lastUpdated: new Date()
      }
    });
  } else {
    // Create new list
    autoList = await prisma.autoList.create({
      data: {
        slug,
        title,
        metaTitle,
        metaDescription,
        description: metaDescription, // Use meta description as description
        clusterId: cluster.id,
        adIds: cluster.adIds,
        adCount: cluster.adCount,
        keywords,
        searchVolume: estimateSearchVolume(cluster, cluster.category, cluster.location),
        priority: calculatePriority(cluster),
        isActive: true
      }
    });
  }

  return autoList;
}

/**
 * Estimate search volume (simplified - can be enhanced with actual data)
 */
function estimateSearchVolume(cluster, category, location) {
  let volume = 100; // Base volume

  // Category multiplier
  if (category) {
    const popularCategories = ['mobile', 'car', 'bike', 'property', 'job'];
    if (popularCategories.includes(category.slug.toLowerCase())) {
      volume *= 5;
    }
  }

  // Location multiplier
  if (location) {
    const popularCities = ['kochi', 'bangalore', 'mumbai', 'delhi', 'chennai', 'hyderabad'];
    if (location.city && popularCities.includes(location.city.toLowerCase())) {
      volume *= 3;
    }
  }

  // Price intent multiplier
  if (cluster.maxPrice) {
    volume *= 1.5;
  }

  // Condition multiplier
  if (cluster.attributes?.condition === 'USED') {
    volume *= 2;
  }

  return Math.round(volume);
}

/**
 * Calculate priority for list
 */
function calculatePriority(cluster) {
  let priority = 0;

  // Base priority on ad count
  priority += Math.min(cluster.adCount / 10, 10);

  // Boost for popular clusters
  priority += cluster.popularityScore / 10;

  // Boost for price-based clusters
  if (cluster.maxPrice) {
    priority += 2;
  }

  // Boost for location-based clusters
  if (cluster.locationId || cluster.city) {
    priority += 1;
  }

  return Math.round(priority);
}

/**
 * Generate lists for all active clusters
 */
async function generateListsForAllClusters(options = {}) {
  const { limit = 100, minAdCount = 5 } = options;

  const clusters = await prisma.adCluster.findMany({
    where: {
      adCount: { gte: minAdCount }
    },
    include: {
      category: true,
      location: true
    },
    orderBy: [
      { popularityScore: 'desc' },
      { adCount: 'desc' }
    ],
    take: limit
  });

  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  for (const cluster of clusters) {
    try {
      const existingList = await prisma.autoList.findFirst({
        where: { clusterId: cluster.id }
      });

      const list = await createOrUpdateAutoList(cluster.id);

      if (list) {
        if (existingList) {
          results.updated++;
        } else {
          results.created++;
        }
      } else {
        results.skipped++;
      }
    } catch (error) {
      console.error(`Error generating list for cluster ${cluster.id}:`, error);
      results.errors.push({ clusterId: cluster.id, error: error.message });
    }
  }

  return results;
}

/**
 * Generate lists for specific category
 */
async function generateListsForCategory(categoryId, options = {}) {
  const { minAdCount = 5 } = options;

  const clusters = await prisma.adCluster.findMany({
    where: {
      categoryId,
      adCount: { gte: minAdCount }
    },
    include: {
      category: true,
      location: true
    },
    orderBy: [
      { popularityScore: 'desc' },
      { adCount: 'desc' }
    ]
  });

  const results = {
    created: 0,
    updated: 0,
    skipped: 0
  };

  for (const cluster of clusters) {
    try {
      const existingList = await prisma.autoList.findFirst({
        where: { clusterId: cluster.id }
      });

      const list = await createOrUpdateAutoList(cluster.id);

      if (list) {
        if (existingList) {
          results.updated++;
        } else {
          results.created++;
        }
      } else {
        results.skipped++;
      }
    } catch (error) {
      console.error(`Error generating list for cluster ${cluster.id}:`, error);
    }
  }

  return results;
}

/**
 * Get all active lists
 */
async function getActiveLists(options = {}) {
  const { limit = 50, offset = 0, sortBy = 'priority' } = options;

  const orderBy = {};
  if (sortBy === 'priority') {
    orderBy.priority = 'desc';
  } else if (sortBy === 'searchVolume') {
    orderBy.searchVolume = 'desc';
  } else if (sortBy === 'adCount') {
    orderBy.adCount = 'desc';
  } else {
    orderBy.lastUpdated = 'desc';
  }

  return await prisma.autoList.findMany({
    where: { isActive: true },
    include: {
      cluster: {
        include: {
          category: true,
          location: true
        }
      }
    },
    orderBy,
    take: limit,
    skip: offset
  });
}

/**
 * Get list by slug
 */
async function getListBySlug(slug) {
  return await prisma.autoList.findUnique({
    where: { slug },
    include: {
      cluster: {
        include: {
          category: true,
          location: true
        }
      }
    }
  });
}

/**
 * Update list when cluster changes
 */
async function updateListFromCluster(clusterId) {
  const cluster = await prisma.adCluster.findUnique({
    where: { id: clusterId }
  });

  if (!cluster) return null;

  const list = await prisma.autoList.findFirst({
    where: { clusterId }
  });

  if (!list) {
    // Create new list if cluster has enough ads
    if (cluster.adCount >= 5) {
      return await createOrUpdateAutoList(clusterId);
    }
    return null;
  }

  // Update existing list
  return await createOrUpdateAutoList(clusterId);
}

module.exports = {
  createOrUpdateAutoList,
  generateListsForAllClusters,
  generateListsForCategory,
  getActiveLists,
  getListBySlug,
  updateListFromCluster,
  generateSEOTitle,
  generateSEODescription,
  generateKeywords,
  generateSlug
};

