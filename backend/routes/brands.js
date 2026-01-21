const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { cacheMiddleware } = require('../middleware/cache');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/brands
// Query params:
//   - category: (optional) category slug to filter brands by category
//   - isPopular: (optional) filter by isPopular flag
router.get('/',
  cacheMiddleware(10 * 60 * 1000), // Cache for 10 minutes
  async (req, res) => {
    try {
      const { category, isPopular } = req.query;

      let whereClause = {
        isActive: true
      };

      // If category slug is provided, find the category and filter by categoryId
      if (category) {
        const categoryRecord = await prisma.category.findUnique({
          where: { slug: category },
          include: {
            subcategories: {
              where: { isActive: true },
              select: { id: true }
            }
          }
        });

        if (categoryRecord) {
          // Get all subcategory IDs
          const subcategoryIds = categoryRecord.subcategories.map(sub => sub.id);
          
          // Find brands that belong to this category OR any of its subcategories
          // Since Brand model has categoryId (not subcategoryId), we'll filter by categoryId
          // and also check if any subcategories have brands (though Brand model doesn't have subcategoryId)
          // For now, we'll just filter by the main categoryId
          whereClause.categoryId = categoryRecord.id;
        } else {
          // Category not found, return empty array
          console.log(`⚠️  Category not found: ${category}`);
          return res.json({ success: true, brands: [] });
        }
      } else if (isPopular === 'true' || isPopular === true) {
        // If no category but isPopular is requested, return only popular brands
        whereClause.isPopular = true;
      } else {
        // If no category and no isPopular filter, return only popular brands by default
        whereClause.isPopular = true;
      }

      const brands = await prisma.brand.findMany({
        where: whereClause,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        },
        orderBy: [
          { isPopular: 'desc' },
          { name: 'asc' }
        ]
      });

      console.log(`📦 Brands fetched: ${brands.length}`, {
        category,
        isPopular,
        whereClause
      });

      // Set cache headers
      res.set({
        'Cache-Control': 'public, max-age=600, s-maxage=1200',
        'Vary': 'Accept-Encoding'
      });

      res.json({ success: true, brands });
    } catch (error) {
      console.error('Get brands error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch brands' });
    }
  }
);

// GET /api/brands/:id
// Get a single brand by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await prisma.brand.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    res.json({ success: true, brand });
  } catch (error) {
    console.error('Get brand error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch brand' });
  }
});

module.exports = router;
