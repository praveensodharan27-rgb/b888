/**
 * Cluster Auto-Update Service
 * Automatically updates clusters when ads are added, edited, or expired
 */

const prisma = require('../prisma/client');
const { updateCluster } = require('./clusteringService');
const { updateListFromCluster } = require('./autoListGenerator');

/**
 * Update all clusters that might be affected by an ad change
 */
async function updateClustersForAd(adId) {
  try {
    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      include: {
        category: true,
        location: true
      }
    });

    if (!ad || ad.status !== 'APPROVED') {
      // Ad is not approved, remove from all clusters
      await removeAdFromClusters(adId);
      return;
    }

    // Check if ad is expired
    const isExpired = ad.expiresAt && new Date(ad.expiresAt) < new Date();
    if (isExpired) {
      await removeAdFromClusters(adId);
      return;
    }

    // Find all clusters that this ad might belong to
    const clustersToUpdate = await findRelevantClusters(ad);

    // Update each cluster
    for (const cluster of clustersToUpdate) {
      try {
        await updateCluster(cluster.id);
        // Update associated lists
        await updateListFromCluster(cluster.id);
      } catch (error) {
        console.error(`Error updating cluster ${cluster.id}:`, error);
      }
    }
  } catch (error) {
    console.error(`Error updating clusters for ad ${adId}:`, error);
  }
}

/**
 * Find all clusters that an ad might belong to
 */
async function findRelevantClusters(ad) {
  const clusters = [];

  // Level 1: Category clusters
  if (ad.categoryId) {
    const categoryCluster = await prisma.adCluster.findFirst({
      where: {
        clusterType: 'category',
        level: 1,
        categoryId: ad.categoryId
      }
    });
    if (categoryCluster) clusters.push(categoryCluster);
  }

  // Level 2: Location clusters
  if (ad.categoryId && (ad.locationId || ad.city || ad.state)) {
    const locationClusters = await prisma.adCluster.findMany({
      where: {
        clusterType: 'location',
        level: 2,
        categoryId: ad.categoryId,
        OR: [
          { locationId: ad.locationId },
          { city: ad.city ? { contains: ad.city, mode: 'insensitive' } : undefined },
          { state: ad.state ? { contains: ad.state, mode: 'insensitive' } : undefined }
        ].filter(Boolean)
      }
    });
    clusters.push(...locationClusters);
  }

  // Level 3: Attribute clusters (price, condition, etc.)
  if (ad.categoryId) {
    const attributeClusters = await prisma.adCluster.findMany({
      where: {
        clusterType: 'attribute',
        level: 3,
        categoryId: ad.categoryId,
        AND: [
          // Price range check
          {
            OR: [
              { minPrice: null },
              { minPrice: { lte: ad.price } }
            ]
          },
          {
            OR: [
              { maxPrice: null },
              { maxPrice: { gte: ad.price } }
            ]
          },
          // Condition check
          {
            OR: [
              { condition: null },
              { condition: ad.condition }
            ]
          },
          // Location check
          {
            OR: [
              { locationId: null },
              { locationId: ad.locationId },
              { city: ad.city ? { contains: ad.city, mode: 'insensitive' } : undefined },
              { state: ad.state ? { contains: ad.state, mode: 'insensitive' } : undefined }
            ].filter(Boolean)
          }
        ]
      }
    });
    clusters.push(...attributeClusters);
  }

  // Level 4: Intent clusters
  if (ad.categoryId && ad.isUrgent) {
    const intentClusters = await prisma.adCluster.findMany({
      where: {
        clusterType: 'intent',
        level: 4,
        categoryId: ad.categoryId,
        intent: 'urgency',
        OR: [
          { locationId: null },
          { locationId: ad.locationId },
          { city: ad.city ? { contains: ad.city, mode: 'insensitive' } : undefined },
          { state: ad.state ? { contains: ad.state, mode: 'insensitive' } : undefined }
        ].filter(Boolean)
      }
    });
    clusters.push(...intentClusters);
  }

  return clusters;
}

/**
 * Remove ad from all clusters
 */
async function removeAdFromClusters(adId) {
  try {
    // Find all clusters containing this ad
    const clusters = await prisma.adCluster.findMany({
      where: {
        adIds: { has: adId }
      }
    });

    // Remove ad from each cluster
    for (const cluster of clusters) {
      const updatedAdIds = cluster.adIds.filter(id => id !== adId);
      
      await prisma.adCluster.update({
        where: { id: cluster.id },
        data: {
          adIds: updatedAdIds,
          adCount: updatedAdIds.length,
          lastUpdated: new Date()
        }
      });

      // Update associated lists
      await updateListFromCluster(cluster.id);
    }
  } catch (error) {
    console.error(`Error removing ad ${adId} from clusters:`, error);
  }
}

/**
 * Update clusters when a new ad is created
 */
async function onAdCreated(adId) {
  await updateClustersForAd(adId);
}

/**
 * Update clusters when an ad is updated
 */
async function onAdUpdated(adId) {
  await updateClustersForAd(adId);
}

/**
 * Update clusters when an ad is deleted or expired
 */
async function onAdDeleted(adId) {
  await removeAdFromClusters(adId);
}

/**
 * Periodic cleanup: Remove expired ads from all clusters
 */
async function cleanupExpiredAds() {
  try {
    const now = new Date();
    
    // Find all expired ads
    const expiredAds = await prisma.ad.findMany({
      where: {
        expiresAt: { lt: now },
        status: 'APPROVED'
      },
      select: { id: true }
    });

    console.log(`🧹 Cleaning up ${expiredAds.length} expired ads from clusters`);

    for (const ad of expiredAds) {
      await removeAdFromClusters(ad.id);
    }

    // Also update status of expired ads
    await prisma.ad.updateMany({
      where: {
        expiresAt: { lt: now },
        status: 'APPROVED'
      },
      data: {
        status: 'EXPIRED'
      }
    });

    return { cleaned: expiredAds.length };
  } catch (error) {
    console.error('Error cleaning up expired ads:', error);
    return { cleaned: 0, error: error.message };
  }
}

/**
 * Periodic update: Refresh all clusters (run daily)
 */
async function refreshAllClusters() {
  try {
    console.log('🔄 Refreshing all clusters...');

    const clusters = await prisma.adCluster.findMany({
      select: { id: true }
    });

    let updated = 0;
    let errors = 0;

    for (const cluster of clusters) {
      try {
        await updateCluster(cluster.id);
        await updateListFromCluster(cluster.id);
        updated++;
      } catch (error) {
        console.error(`Error refreshing cluster ${cluster.id}:`, error);
        errors++;
      }
    }

    console.log(`✅ Refreshed ${updated} clusters, ${errors} errors`);

    return { updated, errors, total: clusters.length };
  } catch (error) {
    console.error('Error refreshing all clusters:', error);
    return { updated: 0, errors: 1, total: 0, error: error.message };
  }
}

/**
 * Merge low-volume clusters (clusters with very few ads)
 */
async function mergeLowVolumeClusters(minAdCount = 3) {
  try {
    const lowVolumeClusters = await prisma.adCluster.findMany({
      where: {
        adCount: { lt: minAdCount },
        level: { gte: 3 } // Only merge level 3+ clusters
      },
      include: {
        category: true,
        location: true
      }
    });

    console.log(`🔀 Found ${lowVolumeClusters.length} low-volume clusters to merge`);

    // Group clusters by similar properties
    const clustersByKey = {};
    for (const cluster of lowVolumeClusters) {
      const key = `${cluster.categoryId}-${cluster.locationId || 'none'}-${cluster.level}`;
      if (!clustersByKey[key]) {
        clustersByKey[key] = [];
      }
      clustersByKey[key].push(cluster);
    }

    // Merge clusters in each group
    for (const [key, clusters] of Object.entries(clustersByKey)) {
      if (clusters.length > 1) {
        // Merge into the first cluster
        const mainCluster = clusters[0];
        const allAdIds = new Set(mainCluster.adIds);

        for (let i = 1; i < clusters.length; i++) {
          clusters[i].adIds.forEach(id => allAdIds.add(id));
        }

        // Update main cluster
        await prisma.adCluster.update({
          where: { id: mainCluster.id },
          data: {
            adIds: Array.from(allAdIds),
            adCount: allAdIds.size,
            lastUpdated: new Date()
          }
        });

        // Delete other clusters
        const idsToDelete = clusters.slice(1).map(c => c.id);
        await prisma.adCluster.deleteMany({
          where: { id: { in: idsToDelete } }
        });

        // Update list
        await updateListFromCluster(mainCluster.id);
      }
    }

    return { merged: lowVolumeClusters.length };
  } catch (error) {
    console.error('Error merging low-volume clusters:', error);
    return { merged: 0, error: error.message };
  }
}

module.exports = {
  updateClustersForAd,
  onAdCreated,
  onAdUpdated,
  onAdDeleted,
  cleanupExpiredAds,
  refreshAllClusters,
  mergeLowVolumeClusters,
  removeAdFromClusters
};

