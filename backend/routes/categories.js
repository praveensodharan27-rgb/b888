const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { cacheMiddleware } = require('../middleware/cache');

const router = express.Router();
const prisma = new PrismaClient();

// Get all categories with subcategories
router.get('/',
  cacheMiddleware(5 * 60 * 1000), // Cache for 5 minutes (categories don't change often)
  async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        subcategories: {
          where: { isActive: true },
          orderBy: { name: 'asc' }
        }
        // Removed _count - it's slow and not always needed
      },
      orderBy: { order: 'asc' }
    });

    // Set cache headers
    res.set({
      'Cache-Control': 'public, max-age=300, s-maxage=600', // Cache for 5 minutes, CDN for 10 minutes
      'Vary': 'Accept-Encoding'
    });
    res.json({ success: true, categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// Get single category
router.get('/:slug', async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { slug: req.params.slug },
      include: {
        subcategories: {
          where: { isActive: true },
          orderBy: { name: 'asc' }
        },
        _count: {
          select: { ads: { where: { status: 'APPROVED' } } }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({ success: true, category });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch category' });
  }
});

// Get subcategories with ad counts for a category
router.get('/:id/subcategories', async (req, res) => {
  try {
    const subcategories = await prisma.subcategory.findMany({
      where: {
        categoryId: req.params.id,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        _count: {
          select: {
            ads: {
              where: { status: 'APPROVED' }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, subcategories });
  } catch (error) {
    console.error('Get subcategories error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subcategories' });
  }
});

module.exports = router;

