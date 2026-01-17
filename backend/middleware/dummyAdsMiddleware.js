const { generateDummyAds } = require('../services/dummyDataService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Check if dummy data mode is enabled
function isDummyModeEnabled() {
  return process.env.USE_DUMMY_DATA === 'true' || process.env.USE_DUMMY_DATA === '1';
}

// Inject dummy ads into response
async function injectDummyAds(realAds, queryParams = {}) {
  if (!isDummyModeEnabled()) {
    console.log('ℹ️ Dummy mode disabled, skipping dummy ads injection');
    return realAds;
  }

  console.log('🔧 Dummy mode enabled, injecting dummy ads...');
  try {
    const {
      category,
      subcategory,
      location,
      limit = 20,
      page = 1,
    } = queryParams;

    // Determine how many dummy ads to generate
    // Generate 2-5 dummy ads per page
    const dummyCount = Math.min(
      Math.floor(Math.random() * 4) + 2, // 2-5 ads
      parseInt(limit) || 20
    );

    // Get category/subcategory IDs if provided
    let categoryId = null;
    let subcategoryId = null;
    let state = null;
    let city = null;

    if (category) {
      try {
        const categoryObj = await prisma.category.findUnique({
          where: { slug: category },
        });
        if (categoryObj) categoryId = categoryObj.id;
      } catch (error) {
        console.error('Error fetching category for dummy ads:', error);
      }
    }

    if (subcategory && categoryId) {
      try {
        const subcategoryObj = await prisma.subcategory.findFirst({
          where: {
            slug: subcategory,
            categoryId: categoryId,
          },
        });
        if (subcategoryObj) subcategoryId = subcategoryObj.id;
      } catch (error) {
        console.error('Error fetching subcategory for dummy ads:', error);
      }
    }

    if (location) {
      try {
        const locationObj = await prisma.location.findUnique({
          where: { slug: location },
        });
        if (locationObj) {
          state = locationObj.state;
          city = locationObj.city;
        }
      } catch (error) {
        console.error('Error fetching location for dummy ads:', error);
      }
    }

    console.log(`📦 Generating ${dummyCount} dummy ads...`, {
      categoryId,
      subcategoryId,
      state,
      city,
    });

    // Generate dummy ads
    const dummyAds = await generateDummyAds(dummyCount, {
      categoryId,
      subcategoryId,
      state,
      city,
    });

    console.log(`✅ Generated ${dummyAds.length} dummy ads`);

    // Format dummy ads to match real ad structure
    const formattedDummyAds = await Promise.all(
      dummyAds.map(async (ad) => {
        // Fetch related data
        const [categoryData, subcategoryData, userData] = await Promise.all([
          ad.categoryId
            ? prisma.category.findUnique({
                where: { id: ad.categoryId },
                select: { id: true, name: true, slug: true },
              })
            : null,
          ad.subcategoryId
            ? prisma.subcategory.findUnique({
                where: { id: ad.subcategoryId },
                select: { id: true, name: true, slug: true },
              })
            : null,
          prisma.user.findUnique({
            where: { id: ad.userId },
            select: {
              id: true,
              name: true,
              avatar: true,
              phone: true,
              showPhone: true,
              isVerified: true,
            },
          }),
        ]);

        return {
          id: `dummy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: ad.title,
          description: ad.description,
          price: ad.price,
          originalPrice: ad.originalPrice,
          discount: ad.discount,
          condition: ad.condition,
          images: ad.images,
          status: ad.status,
          isPremium: ad.isPremium,
          premiumType: ad.premiumType,
          isUrgent: ad.isUrgent,
          views: ad.views,
          createdAt: ad.createdAt,
          updatedAt: ad.createdAt,
          postedAt: ad.postedAt,
          expiresAt: ad.expiresAt,
          attributes: ad.attributes,
          category: categoryData,
          subcategory: subcategoryData,
          user: userData,
          location: ad.state && ad.city
            ? {
                id: null,
                name: `${ad.city}, ${ad.state}`,
                slug: `${ad.city.toLowerCase().replace(/\s+/g, '-')}-${ad.state.toLowerCase().replace(/\s+/g, '-')}`,
                latitude: null,
                longitude: null,
              }
            : null,
          _count: {
            favorites: Math.floor(Math.random() * 50),
          },
          // Mark as dummy internally (not exposed to frontend)
          _isDummy: true,
        };
      })
    );

    // Mix dummy ads with real ads (insert at random positions)
    const allAds = [...realAds];
    formattedDummyAds.forEach((dummyAd) => {
      const insertIndex = Math.floor(Math.random() * (allAds.length + 1));
      allAds.splice(insertIndex, 0, dummyAd);
    });

    // Sort by createdAt (newest first) to maintain real-time feel
    allAds.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.postedAt || 0);
      const dateB = new Date(b.createdAt || b.postedAt || 0);
      return dateB - dateA;
    });

    console.log(`✅ Injected ${formattedDummyAds.length} dummy ads. Total ads: ${allAds.length}`);
    return allAds;
  } catch (error) {
    console.error('❌ Error injecting dummy ads:', error);
    console.error('Error stack:', error.stack);
    // Return real ads if dummy generation fails
    return realAds;
  }
}

module.exports = {
  isDummyModeEnabled,
  injectDummyAds,
};

