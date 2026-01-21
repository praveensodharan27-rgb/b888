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

// Get specification schema for a category (and optionally subcategory)
// GET /api/categories/:categoryId/spec-schema
router.get('/:categoryId/spec-schema', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { subcategoryId } = req.query;

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true, slug: true, specOptions: true }
    });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Optional: load subcategory, mainly for future fine-grained schemas
    let subcategory = null;
    if (subcategoryId) {
      subcategory = await prisma.subcategory.findUnique({
        where: { id: subcategoryId },
        select: { id: true, name: true, slug: true, specOptions: true, categoryId: true }
      });
    }

    const key = (subcategory?.slug || category.slug || category.name || '').toLowerCase();
    
    // Use subcategory specOptions if available, otherwise fall back to category specOptions
    // Merge them so subcategory can override category options
    const categorySpecOptions = category.specOptions || {};
    const subcategorySpecOptions = subcategory?.specOptions || {};
    
    // Merge: subcategory options take priority, but if a field doesn't exist in subcategory, use category
    const specOptions = { ...categorySpecOptions, ...subcategorySpecOptions };
    
    console.log('📦 Spec Options Merge:', {
      categoryId,
      subcategoryId: subcategory?.id,
      categorySpecOptions,
      subcategorySpecOptions,
      mergedSpecOptions: specOptions
    });

    let fields = [];

    if (key.includes('mobile')) {
      fields = [
        { key: 'brand', type: 'select', required: true, label: 'Brand' },
        { key: 'model', type: 'select', required: true, label: 'Model', parentField: 'brand' },
        { key: 'storage', type: 'select', required: false, label: 'Storage' },
        { key: 'ram', type: 'select', required: false, label: 'RAM' },
        { key: 'color', type: 'select', required: false, label: 'Color' },
        { key: 'warranty', type: 'select', required: false, label: 'Warranty' },
        { key: 'batteryHealth', type: 'select', required: false, label: 'Battery Health' }
      ];
    } else if (key.includes('laptop')) {
      fields = [
        { key: 'brand', type: 'select', required: true, label: 'Brand' },
        { key: 'model', type: 'select', required: true, label: 'Model', parentField: 'brand' },
        { key: 'processor', type: 'select', required: false, label: 'Processor' },
        { key: 'ram', type: 'select', required: false, label: 'RAM' },
        { key: 'storage', type: 'select', required: false, label: 'Storage' },
        { key: 'screenSize', type: 'select', required: false, label: 'Screen Size' },
        { key: 'color', type: 'select', required: false, label: 'Color' }
      ];
    } else if (key.includes('car') || key.includes('vehicle')) {
      fields = [
        { key: 'brand', type: 'select', required: true, label: 'Brand' },
        { key: 'model', type: 'select', required: true, label: 'Model', parentField: 'brand' },
        { key: 'year', type: 'select', required: true, label: 'Year' },
        { key: 'fuelType', type: 'select', required: true, label: 'Fuel Type' },
        { key: 'kmDriven', type: 'number', required: false, label: 'KM Driven' },
        { key: 'color', type: 'select', required: false, label: 'Color' },
        { key: 'insurance', type: 'select', required: false, label: 'Insurance' }
      ];
    } else {
      // Generic fallback schema
      fields = [
        { key: 'brand', type: 'select', required: false, label: 'Brand' },
        { key: 'model', type: 'select', required: false, label: 'Model', parentField: 'brand' },
        { key: 'year', type: 'select', required: false, label: 'Year' },
        { key: 'color', type: 'select', required: false, label: 'Color' }
      ];
    }

    // Helper function to get nested options (e.g., model based on brand)
    const enrichFieldsWithNestedOptions = (fields, specOptions) => {
      return fields.map(field => {
        // Check if this field has nested options (object, not array) - e.g., model: { "Apple": [...], "Samsung": [...] }
        if (field.parentField && specOptions[field.key] && typeof specOptions[field.key] === 'object' && !Array.isArray(specOptions[field.key])) {
          // This field has nested options
          field.nestedOptions = specOptions[field.key];
          // Set initial options to empty array, will be populated by frontend based on parent selection
          field.options = [];
        } else if (specOptions[field.key] !== undefined && specOptions[field.key] !== null) {
          // specOptions has a value for this field - always use it (even if empty array)
          if (Array.isArray(specOptions[field.key])) {
            field.options = specOptions[field.key];
          } else {
            // Not an array, keep existing options or empty array
            field.options = field.options || [];
          }
        } else {
          // specOptions doesn't have this field - keep existing options from initial definition
          field.options = field.options || [];
        }
        
        console.log(`📋 Field "${field.key}" final options:`, field.options, 'Type:', Array.isArray(field.options) ? 'Array' : typeof field.options);
        return field;
      });
    };

    fields = enrichFieldsWithNestedOptions(fields, specOptions);

    console.log('📦 Spec Schema Response:', {
      categoryId,
      subcategoryId,
      specOptions,
      fieldsCount: fields.length,
      fields: fields.map(f => ({ key: f.key, optionsCount: Array.isArray(f.options) ? f.options.length : 'nested' }))
    });

    return res.json({
      success: true,
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug
      },
      subcategory: subcategory
        ? { id: subcategory.id, name: subcategory.name, slug: subcategory.slug }
        : null,
      specSchema: {
        fields
      }
    });
  } catch (error) {
    console.error('Get spec schema error:', error);
    res.status(500).json({ success: false, message: 'Failed to load spec schema' });
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
