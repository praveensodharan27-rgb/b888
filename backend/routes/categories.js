const express = require('express');
const { body, validationResult } = require('express-validator');
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
// Get specifications for category/subcategory (defaults/suggestions) or ad (product-specific) - MUST BE BEFORE PARAMETERIZED ROUTES
router.get('/specifications', async (req, res) => {
  try {
    console.log('📋 GET /api/categories/specifications - Request received:', req.query);
    const { categorySlug, subcategorySlug, adId } = req.query;
    
    // If adId is provided, get product-specific specifications
    if (adId) {
      const specifications = await prisma.specification.findMany({
        where: {
          adId: adId,
          isActive: true
        },
        include: {
          options: {
            where: { isActive: true },
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { order: 'asc' }
      });

      // Get custom values for each specification
      const specificationsWithValues = await Promise.all(
        specifications.map(async (spec) => {
          if (spec.type === 'select' || spec.type === 'multiselect') {
            try {
              const customValues = await prisma.adSpecificationValue.findMany({
                where: {
                  specificationId: spec.id,
                  isCustom: true,
                  usageCount: { gte: 1 }
                },
                select: {
                  value: true,
                  usageCount: true
                },
                distinct: ['value'],
                orderBy: { usageCount: 'desc' },
                take: 20
              });
              
              return {
                ...spec,
                customValues: customValues.map(v => v.value)
              };
            } catch (err) {
              console.error('Error fetching custom values for spec:', spec.id, err);
              return {
                ...spec,
                customValues: []
              };
            }
          }
          return spec;
        })
      );

      return res.json({ success: true, specifications: specificationsWithValues || [] });
    }
    
    // Otherwise, get category defaults (suggestions)
    if (!categorySlug && !subcategorySlug) {
      return res.json({ success: true, specifications: [] });
    }

    let categoryId = null;
    let subcategoryId = null;

    if (categorySlug) {
      const category = await prisma.category.findUnique({
        where: { slug: categorySlug },
        select: { id: true }
      });
      if (category) categoryId = category.id;
    }

    if (subcategorySlug) {
      const subcategory = await prisma.subcategory.findFirst({
        where: { slug: subcategorySlug },
        select: { id: true, categoryId: true }
      });
      if (subcategory) {
        subcategoryId = subcategory.id;
        if (!categoryId) categoryId = subcategory.categoryId;
      }
    }
    
    // Get category defaults (only suggestions, not product-specific)
    const where = { 
      isActive: true,
      adId: null // Only category defaults, not product-specific
    };
    if (categoryId) where.categoryId = categoryId;
    if (subcategoryId) where.subcategoryId = subcategoryId;
    
    const specifications = await prisma.specification.findMany({
      where,
      include: {
        options: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { order: 'asc' }
    });

    // Also get previously used custom values for each specification
    const specificationsWithValues = await Promise.all(
      specifications.map(async (spec) => {
        if (spec.type === 'select' || spec.type === 'multiselect') {
          try {
            const customValues = await prisma.adSpecificationValue.findMany({
              where: {
                specificationId: spec.id,
                isCustom: true,
                usageCount: { gte: 1 }
              },
              select: {
                value: true,
                usageCount: true
              },
              distinct: ['value'],
              orderBy: { usageCount: 'desc' },
              take: 20 // Get top 20 most used custom values
            });
            
            return {
              ...spec,
              customValues: customValues.map(v => v.value)
            };
          } catch (err) {
            console.error('Error fetching custom values for spec:', spec.id, err);
            return {
              ...spec,
              customValues: []
            };
          }
        }
        return spec;
      })
    );

    res.json({ success: true, specifications: specificationsWithValues || [] });
  } catch (error) {
    console.error('Get specifications error:', error);
    res.json({ success: true, specifications: [] });
  }
});

// Save user-entered specification value (for reuse)
router.post('/specifications/values',
  [
    body('specificationId').notEmpty().withMessage('Specification ID is required'),
    body('value').trim().notEmpty().withMessage('Value is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { specificationId, value, optionId, adId } = req.body;

      const specification = await prisma.specification.findUnique({
        where: { id: specificationId }
      });

      if (!specification) {
        return res.status(404).json({ success: false, message: 'Specification not found' });
      }

      // Check if this value already exists
      const existingValue = await prisma.adSpecificationValue.findFirst({
        where: {
          specificationId,
          value: value.trim(),
          isCustom: true
        }
      });

      if (existingValue) {
        // Increment usage count
        await prisma.adSpecificationValue.update({
          where: { id: existingValue.id },
          data: { usageCount: { increment: 1 } }
        });
        return res.json({ success: true, value: existingValue });
      }

      // Create new custom value
      const newValue = await prisma.adSpecificationValue.create({
        data: {
          specificationId,
          value: value.trim(),
          optionId: optionId || null,
          adId: adId || null,
          isCustom: true,
          usageCount: 1
        }
      });

      res.status(201).json({ success: true, value: newValue });
    } catch (error) {
      console.error('Save specification value error:', error);
      res.status(500).json({ success: false, message: 'Failed to save specification value' });
    }
  }
);

// IMPORTANT: More specific routes must come before less specific ones

// Get brands for mobile phones (or other categories that need brands) - MUST come before parameterized routes
router.get('/brands', async (req, res) => {
  try {
    const { categorySlug, subcategorySlug, limit = 10, search } = req.query;
    const searchLimit = parseInt(limit) || 10;
    
    // Default popular brands (top 10)
    const defaultBrands = [
      { id: 'samsung', name: 'Samsung' },
      { id: 'apple', name: 'Apple' },
      { id: 'xiaomi', name: 'Xiaomi / Redmi' },
      { id: 'vivo', name: 'Vivo' },
      { id: 'oppo', name: 'Oppo' },
      { id: 'oneplus', name: 'OnePlus' },
      { id: 'realme', name: 'Realme' },
      { id: 'motorola', name: 'Motorola' },
      { id: 'google', name: 'Google Pixel' },
      { id: 'nokia', name: 'Nokia' },
    ];
    
    // Get brands from existing ads (mobile phones category)
    const mobileCategory = await prisma.category.findFirst({
      where: { slug: 'mobiles' }
    });
    
    if (!mobileCategory) {
      let filteredBrands = defaultBrands;
      if (search && search.trim()) {
        const searchLower = search.toLowerCase();
        filteredBrands = defaultBrands.filter(brand => 
          brand.name.toLowerCase().includes(searchLower)
        );
      }
      return res.json({ success: true, brands: filteredBrands.slice(0, searchLimit) });
    }
    
    // Get all mobile ads with brand attribute
    const ads = await prisma.ad.findMany({
      where: {
        categoryId: mobileCategory.id,
        status: 'APPROVED',
        attributes: { not: null }
      },
      select: { attributes: true }
    });
    
    // Count brand occurrences
    const brandCounts = {};
    ads.forEach(ad => {
      if (ad.attributes && typeof ad.attributes === 'object') {
        const brand = ad.attributes.brand;
        if (brand && typeof brand === 'string' && brand.trim()) {
          const brandKey = brand.trim();
          brandCounts[brandKey] = (brandCounts[brandKey] || 0) + 1;
        }
      }
    });
    
    // Combine default brands with found brands
    const allBrandNames = [...new Set([
      ...defaultBrands.map(b => b.name),
      ...Object.keys(brandCounts)
    ])];
    
    // Create brand objects with popularity
    const allBrands = allBrandNames.map(name => {
      const defaultBrand = defaultBrands.find(b => b.name === name);
      return {
        id: defaultBrand?.id || name.toLowerCase().replace(/\s+/g, '-'),
        name: name
      };
    });
    
    // Sort by popularity
    const sortedBrands = allBrands.sort((a, b) => {
      const countA = brandCounts[a.name] || 0;
      const countB = brandCounts[b.name] || 0;
      if (countA !== countB) return countB - countA; // Popular first
      return a.name.localeCompare(b.name); // Alphabetical if same count
    });
    
    // Filter by search if provided
    let filteredBrands = sortedBrands;
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      filteredBrands = sortedBrands.filter(brand => 
        brand.name.toLowerCase().includes(searchLower)
      );
    }
    
    res.json({ success: true, brands: filteredBrands.slice(0, searchLimit) });
  } catch (error) {
    console.error('Get brands error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch brands' });
  }
});

// Get popular mobile colors - MUST come before parameterized routes
router.get('/mobile/colors', async (req, res) => {
  try {
    const { limit = 10, search } = req.query;
    const searchLimit = parseInt(limit) || 10;
    
    // Default popular colors (top 10)
    const defaultColors = [
      'Black', 'White', 'Blue', 'Red', 'Green', 'Gold', 'Silver', 'Grey', 'Midnight', 'Starlight'
    ];
    
    // Get colors from existing ads (mobile phones category)
    const mobileCategory = await prisma.category.findFirst({
      where: { slug: 'mobiles' }
    });
    
    if (!mobileCategory) {
      return res.json({ success: true, colors: defaultColors.slice(0, searchLimit) });
    }
    
    // Get all mobile ads with color attribute
    const ads = await prisma.ad.findMany({
      where: {
        categoryId: mobileCategory.id,
        status: 'APPROVED',
        attributes: { not: null }
      },
      select: { attributes: true }
    });
    
    // Count color occurrences
    const colorCounts = {};
    ads.forEach(ad => {
      if (ad.attributes && typeof ad.attributes === 'object') {
        const color = ad.attributes.color;
        if (color && typeof color === 'string' && color.trim()) {
          const colorKey = color.trim();
          colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
        }
      }
    });
    
    // Combine default colors with found colors, sort by popularity
    const allColors = [...new Set([...defaultColors, ...Object.keys(colorCounts)])];
    const sortedColors = allColors.sort((a, b) => {
      const countA = colorCounts[a] || 0;
      const countB = colorCounts[b] || 0;
      if (countA !== countB) return countB - countA; // Popular first
      return a.localeCompare(b); // Alphabetical if same count
    });
    
    // Filter by search if provided
    let filteredColors = sortedColors;
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      filteredColors = sortedColors.filter(color => 
        color.toLowerCase().includes(searchLower)
      );
    }
    
    res.json({ success: true, colors: filteredColors.slice(0, searchLimit) });
  } catch (error) {
    console.error('Get mobile colors error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch colors' });
  }
});

// Get popular mobile storage - MUST come before parameterized routes
router.get('/mobile/storage', async (req, res) => {
  try {
    const { limit = 10, search } = req.query;
    const searchLimit = parseInt(limit) || 10;
    
    // Default popular storage (top 10)
    const defaultStorage = [
      '128 GB', '256 GB', '64 GB', '512 GB', '32 GB', '1 TB', '16 GB', '8 GB', '2 TB'
    ];
    
    // Get storage from existing ads (mobile phones category)
    const mobileCategory = await prisma.category.findFirst({
      where: { slug: 'mobiles' }
    });
    
    if (!mobileCategory) {
      return res.json({ success: true, storage: defaultStorage.slice(0, searchLimit) });
    }
    
    // Get all mobile ads with storage attribute
    const ads = await prisma.ad.findMany({
      where: {
        categoryId: mobileCategory.id,
        status: 'APPROVED',
        attributes: { not: null }
      },
      select: { attributes: true }
    });
    
    // Count storage occurrences
    const storageCounts = {};
    ads.forEach(ad => {
      if (ad.attributes && typeof ad.attributes === 'object') {
        const storage = ad.attributes.storage;
        if (storage && typeof storage === 'string' && storage.trim()) {
          const storageKey = storage.trim();
          storageCounts[storageKey] = (storageCounts[storageKey] || 0) + 1;
        }
      }
    });
    
    // Combine default storage with found storage, sort by popularity
    const allStorage = [...new Set([...defaultStorage, ...Object.keys(storageCounts)])];
    const sortedStorage = allStorage.sort((a, b) => {
      const countA = storageCounts[a] || 0;
      const countB = storageCounts[b] || 0;
      if (countA !== countB) return countB - countA; // Popular first
      // Sort by size (GB/TB) if same count
      const sizeA = parseFloat(a) || 0;
      const sizeB = parseFloat(b) || 0;
      if (sizeA !== sizeB) return sizeB - sizeA;
      return a.localeCompare(b);
    });
    
    // Filter by search if provided
    let filteredStorage = sortedStorage;
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      filteredStorage = sortedStorage.filter(storage => 
        storage.toLowerCase().includes(searchLower)
      );
    }
    
    res.json({ success: true, storage: filteredStorage.slice(0, searchLimit) });
  } catch (error) {
    console.error('Get mobile storage error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch storage' });
  }
});

// Get models for a specific brand - MUST come before parameterized routes
router.get('/models', async (req, res) => {
  try {
    const { brand, limit = 20, search } = req.query;
    
    if (!brand) {
      return res.status(400).json({ success: false, message: 'Brand is required' });
    }
    
    // Model data organized by brand
    const modelsByBrand = {
      samsung: [
        { id: 'galaxy-s23', name: 'Galaxy S23' },
        { id: 'galaxy-s22', name: 'Galaxy S22' },
        { id: 'galaxy-s21', name: 'Galaxy S21' },
        { id: 'galaxy-a54', name: 'Galaxy A54' },
        { id: 'galaxy-a34', name: 'Galaxy A34' },
        { id: 'galaxy-a14', name: 'Galaxy A14' },
        { id: 'galaxy-m14', name: 'Galaxy M14' },
        { id: 'galaxy-m34', name: 'Galaxy M34' },
        { id: 'galaxy-z-fold5', name: 'Galaxy Z Fold 5' },
        { id: 'galaxy-z-flip5', name: 'Galaxy Z Flip 5' },
      ],
      apple: [
        { id: 'iphone-15', name: 'iPhone 15' },
        { id: 'iphone-14', name: 'iPhone 14' },
        { id: 'iphone-13', name: 'iPhone 13' },
        { id: 'iphone-12', name: 'iPhone 12' },
        { id: 'iphone-11', name: 'iPhone 11' },
        { id: 'iphone-se-2022', name: 'iPhone SE (2022)' },
        { id: 'iphone-xr', name: 'iPhone XR' },
        { id: 'iphone-xs', name: 'iPhone XS' },
        { id: 'iphone-8-plus', name: 'iPhone 8 Plus' },
      ],
      'xiaomi': [
        { id: 'redmi-note-13', name: 'Redmi Note 13' },
        { id: 'redmi-note-12', name: 'Redmi Note 12' },
        { id: 'redmi-12', name: 'Redmi 12' },
        { id: 'redmi-11-prime', name: 'Redmi 11 Prime' },
        { id: 'mi-11x', name: 'Mi 11X' },
        { id: 'mi-10i', name: 'Mi 10i' },
        { id: 'poco-x5', name: 'Poco X5' },
        { id: 'poco-f5', name: 'Poco F5' },
      ],
      vivo: [
        { id: 'vivo-v29', name: 'Vivo V29' },
        { id: 'vivo-v27', name: 'Vivo V27' },
        { id: 'vivo-y100', name: 'Vivo Y100' },
        { id: 'vivo-y73', name: 'Vivo Y73' },
        { id: 'vivo-t2', name: 'Vivo T2' },
        { id: 'vivo-x90', name: 'Vivo X90' },
        { id: 'vivo-s1', name: 'Vivo S1' },
      ],
      oppo: [
        { id: 'oppo-f21-pro', name: 'Oppo F21 Pro' },
        { id: 'oppo-f19', name: 'Oppo F19' },
        { id: 'oppo-a78', name: 'Oppo A78' },
        { id: 'oppo-a58', name: 'Oppo A58' },
        { id: 'oppo-reno-10', name: 'Oppo Reno 10' },
        { id: 'oppo-reno-8', name: 'Oppo Reno 8' },
      ],
      oneplus: [
        { id: 'oneplus-12', name: 'OnePlus 12' },
        { id: 'oneplus-11', name: 'OnePlus 11' },
        { id: 'oneplus-nord-ce3', name: 'OnePlus Nord CE 3' },
        { id: 'oneplus-nord-2t', name: 'OnePlus Nord 2T' },
        { id: 'oneplus-9', name: 'OnePlus 9' },
        { id: 'oneplus-8t', name: 'OnePlus 8T' },
      ],
      realme: [
        { id: 'realme-12-pro', name: 'Realme 12 Pro' },
        { id: 'realme-11', name: 'Realme 11' },
        { id: 'realme-narzo-60', name: 'Realme Narzo 60' },
        { id: 'realme-c55', name: 'Realme C55' },
        { id: 'realme-gt-neo-3', name: 'Realme GT Neo 3' },
      ],
      motorola: [
        { id: 'moto-g54', name: 'Moto G54' },
        { id: 'moto-g34', name: 'Moto G34' },
        { id: 'moto-edge-40', name: 'Moto Edge 40' },
        { id: 'moto-edge-30', name: 'Moto Edge 30' },
        { id: 'moto-e13', name: 'Moto E13' },
      ],
      google: [
        { id: 'pixel-8', name: 'Pixel 8' },
        { id: 'pixel-7', name: 'Pixel 7' },
        { id: 'pixel-6a', name: 'Pixel 6a' },
        { id: 'pixel-5', name: 'Pixel 5' },
        { id: 'pixel-4a', name: 'Pixel 4a' },
      ],
      nokia: [
        { id: 'nokia-g42', name: 'Nokia G42' },
        { id: 'nokia-g21', name: 'Nokia G21' },
        { id: 'nokia-8-3', name: 'Nokia 8.3' },
        { id: 'nokia-7-2', name: 'Nokia 7.2' },
        { id: 'nokia-c32', name: 'Nokia C32' },
      ],
      nothing: [
        { id: 'nothing-phone-2', name: 'Nothing Phone (2)' },
        { id: 'nothing-phone-1', name: 'Nothing Phone (1)' },
        { id: 'nothing-phone-2a', name: 'Nothing Phone (2a)' },
      ],
    };
    
    // Map brand name to brand key (handle display names vs internal keys)
    let brandKey = brand.toLowerCase();
    // Handle "Xiaomi / Redmi" brand name - map to "xiaomi" key
    if (brandKey === 'xiaomi / redmi' || brandKey.includes('xiaomi') || brandKey.includes('redmi')) {
      brandKey = 'xiaomi';
    }
    // Handle "Google Pixel" brand name - map to "google" key
    if (brandKey === 'google pixel' || brandKey.includes('pixel')) {
      brandKey = 'google';
    }
    
    // Get default models for this brand
    const defaultModels = modelsByBrand[brandKey] || [];
    
    // Get models from existing ads (mobile phones category with this brand)
    const mobileCategory = await prisma.category.findFirst({
      where: { slug: 'mobiles' }
    });
    
    let allModels = [...defaultModels];
    
    if (mobileCategory) {
      // Get all mobile ads with this brand and model attribute
      const ads = await prisma.ad.findMany({
        where: {
          categoryId: mobileCategory.id,
          status: 'APPROVED',
          attributes: { not: null }
        },
        select: { attributes: true }
      });
      
      // Count model occurrences for this brand
      const modelCounts = {};
      ads.forEach(ad => {
        if (ad.attributes && typeof ad.attributes === 'object') {
          const adBrand = ad.attributes.brand;
          const model = ad.attributes.model;
          // Only count models for the selected brand
          if (adBrand && typeof adBrand === 'string' && 
              model && typeof model === 'string' &&
              adBrand.toLowerCase().includes(brand.toLowerCase())) {
            const modelKey = model.trim();
            modelCounts[modelKey] = (modelCounts[modelKey] || 0) + 1;
          }
        }
      });
      
      // Combine default models with found models
      const allModelNames = [...new Set([
        ...defaultModels.map(m => m.name),
        ...Object.keys(modelCounts)
      ])];
      
      // Create model objects with popularity
      allModels = allModelNames.map(name => {
        const defaultModel = defaultModels.find(m => m.name === name);
        return {
          id: defaultModel?.id || name.toLowerCase().replace(/\s+/g, '-'),
          name: name
        };
      });
      
      // Sort by popularity
      allModels.sort((a, b) => {
        const countA = modelCounts[a.name] || 0;
        const countB = modelCounts[b.name] || 0;
        if (countA !== countB) return countB - countA; // Popular first
        return a.name.localeCompare(b.name); // Alphabetical if same count
      });
    }
    
    // Filter by search if provided
    let filteredModels = allModels;
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      filteredModels = allModels.filter(model => 
        model.name.toLowerCase().includes(searchLower)
      );
    }
    
    const searchLimit = parseInt(limit) || 20;
    res.json({ success: true, models: filteredModels.slice(0, searchLimit) });
  } catch (error) {
    console.error('Get models error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch models' });
  }
});

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
