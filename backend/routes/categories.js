const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { cacheMiddleware } = require('../middleware/cache');

const router = express.Router();
const prisma = new PrismaClient();

// Get all categories with subcategories
router.get('/',
  cacheMiddleware(10 * 60 * 1000), // Cache for 10 minutes (categories don't change often)
  async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        subcategories: {
          where: { isActive: true },
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { order: 'asc' }
    });

    // Set cache headers
    res.set({
      'Cache-Control': 'public, max-age=600, s-maxage=1200', // Cache for 10 minutes, CDN for 20 minutes
      'Vary': 'Accept-Encoding'
    });
    res.json({ success: true, categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// IMPORTANT: More specific routes must come before less specific ones
// Get single product/listing: /api/categories/:categorySlug/:subcategorySlug/:productSlug
router.get('/:categorySlug/:subcategorySlug/:productSlug', async (req, res) => {
  try {
    const { categorySlug, subcategorySlug, productSlug } = req.params;

    // Find category
    const category = await prisma.category.findUnique({
      where: { slug: categorySlug },
      select: { id: true, name: true, slug: true }
    });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Find subcategory
    const subcategory = await prisma.subcategory.findFirst({
      where: {
        slug: subcategorySlug,
        categoryId: category.id
      },
      select: { id: true, name: true, slug: true }
    });

    if (!subcategory) {
      return res.status(404).json({ success: false, message: 'Subcategory not found' });
    }

    // Find product by slug or ID
    const now = new Date();
    const ad = await prisma.ad.findFirst({
      where: {
        OR: [
          { slug: productSlug },
          { id: productSlug }
        ],
        categoryId: category.id,
        subcategoryId: subcategory.id,
        status: 'APPROVED',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            phone: true,
            showPhone: true,
            location: {
              select: {
                name: true,
                city: true,
                state: true
              }
            }
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        subcategory: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        location: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            state: true
          }
        }
      }
    });

    if (!ad) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, product: ad, category, subcategory });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch product' });
  }
});

// Get subcategory with listings: /api/categories/:categorySlug/:subcategorySlug
router.get('/:categorySlug/:subcategorySlug', async (req, res) => {
  try {
    const { categorySlug, subcategorySlug } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Find category
    const category = await prisma.category.findUnique({
      where: { slug: categorySlug },
      select: { id: true, name: true, slug: true, metaTitle: true, metaDescription: true }
    });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Find subcategory
    const subcategory = await prisma.subcategory.findFirst({
      where: {
        slug: subcategorySlug,
        categoryId: category.id,
        isActive: true
      },
      include: {
        _count: {
          select: {
            ads: {
              where: {
                status: 'APPROVED',
                OR: [
                  { expiresAt: null },
                  { expiresAt: { gt: new Date() } }
                ]
              }
            }
          }
        }
      }
    });

    if (!subcategory) {
      return res.status(404).json({ success: false, message: 'Subcategory not found' });
    }

    // Get listings for this subcategory
    const now = new Date();
    const where = {
      categoryId: category.id,
      subcategoryId: subcategory.id,
      status: 'APPROVED',
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } }
      ]
    };

    const [ads, total] = await Promise.all([
      prisma.ad.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              location: {
                select: {
                  name: true,
                  city: true,
                  state: true
                }
              }
            }
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          subcategory: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          location: {
            select: {
              id: true,
              name: true,
              slug: true,
              city: true,
              state: true
            }
          }
        },
        orderBy: [
          { isPremium: 'desc' },
          { featuredAt: 'desc' },
          { bumpedAt: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.ad.count({ where })
    ]);

    res.json({
      success: true,
      subcategory,
      category,
      listings: ads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get subcategory error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subcategory' });
  }
});

// Get single category with subcategories and recent listings: /api/categories/:categorySlug
router.get('/:categorySlug', async (req, res) => {
  try {
    const { categorySlug } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const category = await prisma.category.findUnique({
      where: { slug: categorySlug },
      include: {
        subcategories: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: {
                ads: {
                  where: {
                    status: 'APPROVED',
                    OR: [
                      { expiresAt: null },
                      { expiresAt: { gt: new Date() } }
                    ]
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Get recent listings for this category
    const now = new Date();
    const where = {
      categoryId: category.id,
      status: 'APPROVED',
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } }
      ]
    };

    const [recentListings, totalListings] = await Promise.all([
      prisma.ad.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              location: {
                select: {
                  name: true,
                  city: true,
                  state: true
                }
              }
            }
          },
          subcategory: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          location: {
            select: {
              id: true,
              name: true,
              slug: true,
              city: true,
              state: true
            }
          }
        },
        orderBy: [
          { isPremium: 'desc' },
          { featuredAt: 'desc' },
          { bumpedAt: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.ad.count({ where })
    ]);

    res.json({
      success: true,
      category,
      recentListings,
      pagination: {
        page,
        limit,
        total: totalListings,
        pages: Math.ceil(totalListings / limit)
      }
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch category' });
  }
});

// Legacy route: Get subcategories with ad counts for a category (by ID)
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
