/**
 * Search Personalization Service
 * 
 * Stores and retrieves user search history for personalization
 * - Last searched category
 * - Location preferences
 * - Search frequency
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get user's last searched category from database or session
 */
async function getUserLastCategory(userId, userEmail) {
  if (!userId && !userEmail) return null;
  
  try {
    const lastSearch = await prisma.searchQuery.findFirst({
      where: {
        OR: [
          userId ? { userId } : {},
          userEmail ? { userEmail } : {}
        ].filter(obj => Object.keys(obj).length > 0)
      },
      orderBy: { createdAt: 'desc' },
      select: {
        category: true
      }
    });
    
    return lastSearch?.category || null;
  } catch (error) {
    console.error('Error getting user last category:', error);
    return null;
  }
}

/**
 * Store search query for personalization
 */
async function storeSearchQuery(query, userId, userEmail, category, location) {
  if (!query || !query.trim()) return;
  
  try {
    await prisma.searchQuery.create({
      data: {
        query: query.trim(),
        userId: userId || null,
        userEmail: userEmail || null,
        category: category || null,
        location: location || null,
        processed: false
      }
    });
  } catch (error) {
    console.error('Error storing search query:', error);
    // Don't throw - this is non-critical
  }
}

/**
 * Get popular searches by location for fallback personalization
 */
async function getPopularSearchesByLocation(location, limit = 5) {
  if (!location) return [];
  
  try {
    const searches = await prisma.searchQuery.groupBy({
      by: ['category'],
      where: {
        location: { contains: location, mode: 'insensitive' },
        category: { not: null }
      },
      _count: {
        category: true
      },
      orderBy: {
        _count: {
          category: 'desc'
        }
      },
      take: limit
    });
    
    return searches.map(s => s.category).filter(Boolean);
  } catch (error) {
    console.error('Error getting popular searches:', error);
    return [];
  }
}

module.exports = {
  getUserLastCategory,
  storeSearchQuery,
  getPopularSearchesByLocation
};
