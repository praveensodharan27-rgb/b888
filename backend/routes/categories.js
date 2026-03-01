const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { cacheMiddleware } = require('../middleware/cache');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const prisma = new PrismaClient();

// Lazy MongoDB client for subcategory_spec_configs (collection not in Prisma schema)
let mongoClient = null;
async function getMongoClient() {
  if (!mongoClient && process.env.DATABASE_URL) {
    const { MongoClient } = require('mongodb');
    mongoClient = new MongoClient(process.env.DATABASE_URL);
    await mongoClient.connect();
  }
  return mongoClient;
}

// Load brands and models data from JSON file
let brandsModelsData = null;
try {
  const brandsModelsPath = path.join(__dirname, '../data/brands-models.json');
  const brandsModelsFile = fs.readFileSync(brandsModelsPath, 'utf8');
  brandsModelsData = JSON.parse(brandsModelsFile);
} catch (error) {
  console.warn('⚠️ Could not load brands-models.json:', error.message);
  brandsModelsData = { categories: [] };
}

// Load spec config (category -> subcategory -> field names)
let specConfig = [];
try {
  const specConfigPath = path.join(__dirname, '../data/spec-config.json');
  specConfig = JSON.parse(fs.readFileSync(specConfigPath, 'utf8'));
} catch (error) {
  console.warn('⚠️ Could not load spec-config.json:', error.message);
}
const { buildSpecFromField } = require('../data/spec-field-definitions');

// Get all categories with subcategories
router.get('/',
  cacheMiddleware(10 * 60), // Cache for 10 minutes (categories don't change often)
  async (req, res) => {
  try {
    console.log('🔄 Categories API endpoint called');
    
    // First check total count
    const totalCount = await prisma.category.count({ where: { isActive: true } });
    console.log(`📊 Total active categories in DB: ${totalCount}`);
    
    if (totalCount === 0) {
      console.warn('⚠️  No active categories found in database!');
      console.warn('   Run: npm run seed-all-categories');
      return res.json({ 
        success: true, 
        categories: [],
        message: 'No categories found. Please seed the database.',
        totalCount: 0
      });
    }

    // CRITICAL: Get only MAIN categories
    // In Prisma schema: Category model has NO categoryId field
    // Subcategory model has categoryId field pointing to parent Category
    // So all records in Category table are main categories
    // Subcategories are in Subcategory table and linked via relation
    // 
    // IMPORTANT: We explicitly ensure we only get main categories by:
    // 1. Querying Category table (which only contains main categories)
    // 2. Including subcategories via the relation (Subcategory table)
    // 3. NOT filtering by categoryId (since Category doesn't have that field)
    const categories = await prisma.category.findMany({
      where: { 
        isActive: true
        // Category table ONLY contains main categories
        // Subcategories are stored in Subcategory table with categoryId relation
        // If subcategories appear here, the database structure is wrong
      },
      include: {
        subcategories: {
          where: { isActive: true },
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { order: 'asc' }
    });

    // Double-check: Ensure no subcategories are in the result
    // (This shouldn't happen if DB structure is correct, but we verify)
    const verifiedCategories = categories.filter(cat => {
      // Main categories should NOT have a categoryId field
      // If they do, they're actually subcategories and shouldn't be here
      const hasCategoryId = cat.categoryId || cat.category_id;
      if (hasCategoryId) {
        console.error(`❌ ERROR: Found subcategory in Category table: ${cat.name} (id: ${cat.id})`);
        console.error(`   This should be in Subcategory table with categoryId: ${hasCategoryId}`);
        return false; // Filter it out
      }
      return true; // Keep main categories
    });

    if (verifiedCategories.length !== categories.length) {
      console.warn(`⚠️  Filtered out ${categories.length - verifiedCategories.length} subcategories from Category table`);
      console.warn(`   Database structure needs fixing. Run: npm run seed-all-categories`);
    }

    // Use verified categories (main categories only)
    const finalCategories = verifiedCategories;

    // Debug logging - Show ALL categories from database
    console.log('📦 Categories fetched from DB:', {
      totalCategories: finalCategories.length,
      filteredOut: categories.length - finalCategories.length,
      categoriesWithSubs: finalCategories.filter(c => c.subcategories && c.subcategories.length > 0).length,
      totalSubcategories: finalCategories.reduce((sum, c) => sum + (c.subcategories?.length || 0), 0),
    });
    
    // Log each category with its subcategories
    console.log('\n📋 ALL MAIN CATEGORIES FROM DATABASE (after verification):');
    finalCategories.forEach((cat, index) => {
      console.log(`\n${index + 1}. MAIN CATEGORY: ${cat.name} (id: ${cat.id}, slug: ${cat.slug})`);
      console.log(`   - Has categoryId? ${cat.categoryId ? 'YES (ERROR - this is a subcategory!)' : 'NO (correct - main category)'}`);
      console.log(`   - Subcategories count: ${cat.subcategories?.length || 0}`);
      if (cat.subcategories && cat.subcategories.length > 0) {
        cat.subcategories.forEach((sub, subIndex) => {
          console.log(`   ${subIndex + 1}. SUB: ${sub.name} (id: ${sub.id}, slug: ${sub.slug}, categoryId: ${sub.categoryId})`);
        });
      } else {
        console.log('   - No subcategories');
      }
    });
    
    // Sample category for quick reference
    if (finalCategories[0]) {
      console.log('\n📌 Sample Category (first one):', {
        id: finalCategories[0].id,
        name: finalCategories[0].name,
        slug: finalCategories[0].slug,
        hasCategoryId: !!(finalCategories[0].categoryId || finalCategories[0].category_id),
        subcategoriesCount: finalCategories[0].subcategories?.length || 0,
        subcategories: finalCategories[0].subcategories?.map(s => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          categoryId: s.categoryId
        })) || [],
      });
    }

    // Ensure we always return an array (even if empty)
    if (!Array.isArray(finalCategories)) {
      console.error('❌ Categories is not an array:', typeof finalCategories);
      return res.json({ success: true, categories: [] });
    }

    // Set cache headers
    res.set({
      'Cache-Control': 'public, max-age=600, s-maxage=1200', // Cache for 10 minutes, CDN for 20 minutes
      'Vary': 'Accept-Encoding'
    });
    
    console.log('✅ Sending categories response:', {
      success: true,
      categoriesCount: finalCategories.length,
      responseFormat: 'correct'
    });
    
    res.json({ success: true, categories: finalCategories });
  } catch (error) {
    console.error('❌ Get categories error:', error.message);
    const { getSafeErrorPayload } = require('../utils/safeErrorResponse');
    res.status(500).json(getSafeErrorPayload(error, 'Failed to fetch categories'));
  }
});

// Default fallback when no spec config matches
const FALLBACK_SPECIFICATIONS = [
  { id: 'spec-condition', name: 'condition', label: 'Condition', type: 'select', required: true, order: 1, options: [
    { id: 'opt-new', value: 'NEW', label: 'New', order: 0 },
    { id: 'opt-like-new', value: 'LIKE_NEW', label: 'Like New', order: 1 },
    { id: 'opt-used', value: 'USED', label: 'Used', order: 2 },
    { id: 'opt-refurbished', value: 'REFURBISHED', label: 'Refurbished', order: 3 },
  ], customValues: [] },
  { id: 'spec-brand', name: 'brand', label: 'Brand', type: 'text', required: false, order: 2, options: [], customValues: [] },
  { id: 'spec-model', name: 'model', label: 'Model', type: 'text', required: false, order: 3, options: [], customValues: [] },
  { id: 'spec-price', name: 'price', label: 'Price', type: 'number', required: true, order: 999, options: [], customValues: [] },
];

// Normalize slugs for consistent matching
function normalizeSlug(slug) {
  if (!slug || typeof slug !== 'string') return '';
  return slug.trim().toLowerCase();
}

// Get spec config from DB (subcategory_spec_configs) or JSON
async function getSpecConfigData(categorySlug, subcategorySlug) {
  const cat = normalizeSlug(categorySlug);
  const sub = normalizeSlug(subcategorySlug);
  let mappedCat = cat;
  if (cat === 'electronics') {
    const mobileSubs = ['mobile-phones', 'tablets', 'accessories', 'smart-watches'];
    mappedCat = mobileSubs.includes(sub) ? 'mobiles' : 'electronics-appliances';
  }
  if (cat === 'smartphone') mappedCat = 'mobiles';
  if (cat === 'other') mappedCat = 'other-misc';

  // Try DB first
  try {
    const client = await getMongoClient();
    if (client) {
      const subcat = await prisma.subcategory.findFirst({
        where: {
          ...(sub ? { slug: sub } : {}),
          category: { slug: mappedCat }
        },
        select: { id: true }
      });
      if (subcat) {
        const db = client.db();
        const { ObjectId } = require('mongodb');
        const subId = typeof subcat.id === 'string' ? new ObjectId(subcat.id) : subcat.id;
        const doc = await db.collection('subcategory_spec_configs').findOne({ subcategoryId: subId });
        if (doc && Array.isArray(doc.fields) && doc.fields.length) {
          return {
            fields: doc.fields,
            brandsModels: doc.brandsModels || null,
            types: doc.types || null,
            compatibility: doc.compatibility || null,
            source: 'db'
          };
        }
      }
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') console.warn('Spec config DB read:', err.message);
  }

  // Fallback to JSON — try mappedCat first, then cat (e.g. electronics-appliances from URL)
  let categoryConfig = specConfig.find(c => normalizeSlug(c.category) === mappedCat);
  if (!categoryConfig && cat !== mappedCat) {
    categoryConfig = specConfig.find(c => normalizeSlug(c.category) === cat);
  }
  if (!categoryConfig?.subcategories) return null;
  const subConfig = (sub && categoryConfig.subcategories[sub]) ? categoryConfig.subcategories[sub] : categoryConfig.subcategories[Object.keys(categoryConfig.subcategories)[0]];
  if (!subConfig) return null;
  const fields = Array.isArray(subConfig) ? subConfig : (subConfig.fields || []);
  const brandsModels = (typeof subConfig === 'object' && !Array.isArray(subConfig) && subConfig.brands) ? subConfig.brands : null;
  const types = (typeof subConfig === 'object' && !Array.isArray(subConfig) && Array.isArray(subConfig.types)) ? subConfig.types : null;
  const compatibility = (typeof subConfig === 'object' && !Array.isArray(subConfig) && subConfig.compatibility && typeof subConfig.compatibility === 'object') ? subConfig.compatibility : null;
  return { fields, brandsModels, types, compatibility, source: 'json' };
}

// Build specs from spec-config (DB or JSON) using spec-field-definitions.js
function getFallbackSpecifications(categorySlug, subcategorySlug, configData) {
  const cat = normalizeSlug(categorySlug);
  const sub = normalizeSlug(subcategorySlug);
  let mappedCat = cat;
  if (cat === 'electronics') {
    const mobileSubs = ['mobile-phones', 'tablets', 'accessories', 'smart-watches'];
    mappedCat = mobileSubs.includes(sub) ? 'mobiles' : 'electronics-appliances';
  }
  if (cat === 'other') mappedCat = 'other-misc';

  const fields = configData?.fields;
  if (!fields?.length) return FALLBACK_SPECIFICATIONS;

  const specs = fields.map((fieldName, idx) => buildSpecFromField(fieldName, idx + 1));

  // Inject Types options from config (books, fashion, sports-gear, appliances, etc.)
  if (configData?.types && Array.isArray(configData.types) && configData.types.length) {
    const typeSpec = specs.find(s => s.name === 'type');
    if (typeSpec) {
      typeSpec.type = 'select';
      typeSpec.options = configData.types.map((t, i) => ({
        id: `opt-type-${i}`,
        value: t,
        label: t,
        order: i
      }));
    }
  }

  const noPriceCategories = ['jobs', 'services', 'properties', 'other-misc'];
  if (!noPriceCategories.includes(mappedCat) && !specs.some(s => s.name === 'price')) {
    specs.push(buildSpecFromField('price', 999));
  }

  return specs;
}

// Get brands from spec-config (DB or JSON) for category/subcategory
function getSpecConfigBrands(categorySlug, subcategorySlug, configData) {
  if (configData?.brandsModels && typeof configData.brandsModels === 'object') {
    return Object.entries(configData.brandsModels).map(([name, models]) => ({ name, models: models || [] }));
  }
  const cat = normalizeSlug(categorySlug);
  const sub = normalizeSlug(subcategorySlug);
  let mappedCat = cat;
  if (cat === 'electronics') {
    const mobileSubs = ['mobile-phones', 'tablets', 'accessories', 'smart-watches'];
    mappedCat = mobileSubs.includes(sub) ? 'mobiles' : 'electronics-appliances';
  }
  const categoryConfig = specConfig.find(c => normalizeSlug(c.category) === mappedCat);
  if (!categoryConfig?.subcategories?.[sub]) return null;
  const subConfig = categoryConfig.subcategories[sub];
  if (typeof subConfig !== 'object' || Array.isArray(subConfig) || !subConfig.brands) return null;
  return Object.entries(subConfig.brands).map(([name, models]) => ({ name, models: models || [] }));
}

// Get all brands for a category/subcategory (merge spec-config + brands-models.json for full list)
function getAllBrandsForFilter(categorySlug, subcategorySlug, configData) {
  const specBrands = getSpecConfigBrands(categorySlug, subcategorySlug, configData) || [];
  const slugMap = { mobiles: 'electronics', electronics: 'electronics', smartphone: 'electronics' };
  const mapped = slugMap[normalizeSlug(categorySlug)] || categorySlug;
  let jsonBrands = [];
  const cat = brandsModelsData?.categories?.find((c) => normalizeSlug(c.slug) === normalizeSlug(mapped));
  if (cat && subcategorySlug) {
    const sub = cat.subcategories?.find((s) => normalizeSlug(s.slug) === normalizeSlug(subcategorySlug));
    if (sub?.brands?.length) jsonBrands = sub.brands;
  }
  const seen = new Set();
  const merged = [];
  for (const list of [jsonBrands, specBrands]) {
    for (const b of list) {
      const name = (typeof b === 'object' && b?.name) ? b.name : String(b);
      if (name && !seen.has(name)) {
        seen.add(name);
        merged.push(typeof b === 'object' ? b : { name, models: [] });
      }
    }
  }
  return merged;
}

// Build filter options from spec config (same shape as /ads/filter-options) so filter page shows ALL specs when no ads
async function getFilterOptionsFromConfig(categorySlug, subcategorySlug) {
  const configData = await getSpecConfigData(categorySlug, subcategorySlug);
  if (!configData?.fields?.length) return { filterOptions: {}, brandModels: {}, fields: [] };
  const fields = configData.fields.filter((f) => f !== 'condition' && f !== 'price');
  const filterOptions = {};
  for (const fieldName of fields) {
    if (fieldName === 'brand') {
      const brands = getAllBrandsForFilter(categorySlug, subcategorySlug, configData);
      if (brands?.length) filterOptions.brand = brands.map((b) => b.name);
      continue;
    }
    if (fieldName === 'model') continue; // models come from brandModels
    if (fieldName === 'type' && configData.types?.length) {
      filterOptions.type = configData.types;
      continue;
    }
    const spec = buildSpecFromField(fieldName, 0);
    const options = spec.options && Array.isArray(spec.options) ? spec.options.map((o) => (o.value != null ? o.value : o.label)) : [];
    if (options.length) filterOptions[fieldName] = options;
  }
  const brandsList = getAllBrandsForFilter(categorySlug, subcategorySlug, configData);
  const brandModels = {};
  if (brandsList?.length) {
    for (const b of brandsList) {
      brandModels[b.name] = Array.isArray(b.models) ? b.models : [];
    }
  }
  return { filterOptions, brandModels, fields };
}

// GET /categories/filter-options-from-config — filter options from spec config (so filter page shows ALL specs when no ads)
router.get('/filter-options-from-config', cacheMiddleware(60 * 60), async (req, res) => {
  try {
    const categorySlug = req.query.categorySlug || req.query.category;
    const subcategorySlug = req.query.subcategorySlug || req.query.subcategory;
    if (!categorySlug && !subcategorySlug) {
      return res.json({ success: true, filterOptions: {}, brandModels: {}, fields: [] });
    }
    const { filterOptions, brandModels, fields } = await getFilterOptionsFromConfig(categorySlug, subcategorySlug);
    res.json({ success: true, filterOptions: filterOptions || {}, brandModels: brandModels || {}, fields: fields || [] });
  } catch (err) {
    console.error('Get filter-options-from-config error:', err);
    const { getSafeErrorPayload } = require('../utils/safeErrorResponse');
    res.status(500).json(getSafeErrorPayload(err, 'Failed to fetch filter options from config'));
  }
});

// IMPORTANT: More specific routes must come before less specific ones
// Get specifications for category/subcategory (defaults/suggestions) or ad (product-specific) - MUST BE BEFORE PARAMETERIZED ROUTES
router.get('/specifications', async (req, res) => {
  try {
    console.log('📋 GET /api/categories/specifications - Request received:', req.query);
    const { categorySlug, subcategorySlug, adId } = req.query;
    
    // Debug: Log the slugs being used
    console.log('🔍 Category/Subcategory slugs:', { categorySlug, subcategorySlug });
    
    // If adId is provided, get product-specific specifications
    if (adId) {
      let specifications = [];
      try {
        specifications = await prisma.specification.findMany({
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
      } catch (dbErr) {
        console.warn('⚠️ Specification model not available, returning fallback:', dbErr.message);
        return res.json({ success: true, specifications: FALLBACK_SPECIFICATIONS });
      }
    }
    
    // Otherwise, get category defaults (suggestions)
    // CRITICAL: Use fallback specifications directly - MongoDB has no Specification model,
    // and DB specs (if any) may have wrong category mapping (e.g. Car getting Phone specs).
    // This ensures correct, clean specs per category/subcategory.
    if (!categorySlug && !subcategorySlug) {
      return res.json({ success: true, specifications: [] });
    }

    // Map "electronics" to correct category based on subcategory (for brands-models.json compatibility)
    let mappedCategorySlug = categorySlug;
    if (categorySlug === 'electronics' && subcategorySlug) {
      const mobileSubs = ['mobile-phones', 'tablets', 'accessories', 'smart-watches'];
      const electronicsSubs = ['laptops', 'tvs', 'cameras', 'home-appliances', 'kitchen-appliances', 'gaming-consoles'];
      if (mobileSubs.includes(subcategorySlug)) mappedCategorySlug = 'mobiles';
      else if (electronicsSubs.includes(subcategorySlug)) mappedCategorySlug = 'electronics-appliances';
      else mappedCategorySlug = 'electronics-appliances';
    } else if (categorySlug === 'electronics' && !subcategorySlug) {
      mappedCategorySlug = 'electronics-appliances';
    }

    const configData = await getSpecConfigData(mappedCategorySlug, subcategorySlug);
    const specifications = getFallbackSpecifications(mappedCategorySlug, subcategorySlug, configData);
    const specConfigBrands = getSpecConfigBrands(mappedCategorySlug, subcategorySlug, configData);
    const modelSpec = specifications?.find((s) => s.name === 'model');
    const brandSpec = specifications?.find((s) => s.name === 'brand');

    console.log('✅ Returning specifications (fallback):', {
      categorySlug,
      subcategorySlug,
      mappedCategorySlug,
      count: specifications?.length || 0,
      hasModel: !!modelSpec,
      hasBrands: !!specConfigBrands?.length,
      allSpecNames: specifications?.map((s) => s.name) || []
    });

    const response = { success: true, specifications: specifications || [] };
    if (specConfigBrands?.length) response.brands = specConfigBrands;
    if (configData?.types?.length) response.types = configData.types;
    if (configData?.compatibility && typeof configData.compatibility === 'object') response.compatibility = configData.compatibility;
    return res.json(response);
  } catch (error) {
    console.error('❌ Get specifications error:', error);
    const configData = await getSpecConfigData(req.query?.categorySlug, req.query?.subcategorySlug).catch(() => null);
    const fallback = getFallbackSpecifications(req.query?.categorySlug, req.query?.subcategorySlug, configData);
    return res.json({ success: true, specifications: fallback });
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

      // Block unwanted test entries
      const unwantedEntries = ['mokia', 'yyytytty'];
      const valueLower = (value || '').trim().toLowerCase();
      if (unwantedEntries.some(entry => valueLower === entry || valueLower.includes(entry))) {
        return res.status(400).json({ 
          success: false, 
          message: 'This value is not allowed' 
        });
      }

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

// Get brands for any category or subcategory - MUST come before parameterized routes
router.get('/brands', async (req, res) => {
  try {
    const { categoryId, categorySlug, subcategoryId, subcategorySlug, sub, limit = 50, search, popular } = req.query;
    const searchLimit = parseInt(limit) || 50;
    
    let targetCategoryId = null;
    let targetSubcategoryId = null;
    
    // PRIORITY: subcategorySlug (from frontend) > subcategoryId > sub
    // Frontend sends subcategorySlug, so prioritize slug-based lookup
    console.log('🔍 Brands API - Received parameters:', {
      categoryId,
      categorySlug,
      subcategoryId,
      subcategorySlug,
      sub,
      popular,
      search
    });
    
    // PRIORITY 1: Handle subcategorySlug first (frontend sends this)
    if (subcategorySlug) {
      console.log('🔍 Brands API - Searching for subcategory by slug (PRIORITY):', subcategorySlug);
      
      const subcategory = await prisma.subcategory.findFirst({
        where: {
          slug: subcategorySlug,
          isActive: true
        },
        select: { id: true, name: true, slug: true, categoryId: true }
      });
      
      if (subcategory) {
        targetSubcategoryId = subcategory.id;
        targetCategoryId = subcategory.categoryId;
        console.log('✅ Found subcategory by slug:', { 
          id: subcategory.id, 
          name: subcategory.name, 
          slug: subcategory.slug, 
          categoryId: subcategory.categoryId,
          searchedFor: subcategorySlug
        });
      } else {
        console.warn('⚠️ Subcategory not found by slug:', subcategorySlug);
        // List similar subcategories for debugging
        const similarSubcategories = await prisma.subcategory.findMany({
          where: { 
            isActive: true,
            OR: [
              { slug: { contains: subcategorySlug, mode: 'insensitive' } },
              { name: { contains: subcategorySlug, mode: 'insensitive' } }
            ]
          },
          select: { id: true, name: true, slug: true, categoryId: true },
          take: 10
        });
        if (similarSubcategories.length > 0) {
          console.warn('💡 Similar subcategories found:', similarSubcategories.map(s => ({
            id: s.id,
            name: s.name,
            slug: s.slug
          })));
        }
      }
    } 
    // PRIORITY 2: Handle subcategoryId (fallback)
    else if (subcategoryId) {
      console.log('🔍 Brands API - Searching for subcategory by ID (fallback):', subcategoryId);
      
      // Check if it's a valid ObjectId
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(subcategoryId);
      
      if (isValidObjectId) {
        const subcategory = await prisma.subcategory.findUnique({
          where: { id: subcategoryId },
          select: { id: true, name: true, slug: true, categoryId: true }
        });
        if (subcategory) {
          targetSubcategoryId = subcategory.id;
          targetCategoryId = subcategory.categoryId;
          console.log('✅ Found subcategory by ID:', { id: subcategory.id, name: subcategory.name, categoryId: subcategory.categoryId });
        } else {
          console.warn('⚠️ Subcategory not found by ID:', subcategoryId);
        }
      } else {
        console.warn('⚠️ Invalid subcategoryId format (not ObjectId):', subcategoryId);
      }
    }
    // PRIORITY 3: Handle sub parameter (legacy compatibility)
    else if (sub) {
      console.log('🔍 Brands API - Searching for subcategory by sub parameter (legacy):', sub);
      
      // Try as slug first, then as name
      const subcategory = await prisma.subcategory.findFirst({
        where: {
          OR: [
            { slug: sub },
            { name: { contains: sub, mode: 'insensitive' } }
          ],
          isActive: true
        },
        select: { id: true, name: true, slug: true, categoryId: true }
      });
      
      if (subcategory) {
        targetSubcategoryId = subcategory.id;
        targetCategoryId = subcategory.categoryId;
        console.log('✅ Found subcategory by sub parameter:', { 
          id: subcategory.id, 
          name: subcategory.name, 
          slug: subcategory.slug, 
          categoryId: subcategory.categoryId
        });
      } else {
        console.warn('⚠️ Subcategory not found by sub parameter:', sub);
      }
    }
    
    // Get category ID from categoryId or categorySlug (if subcategory not found)
    // PRIORITY: Always try categorySlug first if provided (frontend sends slugs)
    if (!targetCategoryId) {
      if (categorySlug) {
        // Frontend sends categorySlug - use this first
        const category = await prisma.category.findFirst({
          where: { slug: categorySlug, isActive: true },
          select: { id: true, name: true, slug: true }
        });
        if (category) {
          targetCategoryId = category.id;
          console.log('✅ Found category by slug:', { 
            slug: categorySlug, 
            id: category.id, 
            name: category.name 
          });
        } else {
          console.warn('⚠️ Category not found by slug:', categorySlug);
        }
      } else if (categoryId) {
        // Fallback to categoryId if categorySlug not provided
        targetCategoryId = categoryId;
        console.log('✅ Using categoryId from params:', targetCategoryId);
      }
    }
    
    // Default popular brands (fallback for categories without brands)
    const defaultBrands = [
      { id: 'samsung', name: 'Samsung', verified: false },
      { id: 'apple', name: 'Apple', verified: true },
      { id: 'xiaomi', name: 'Xiaomi / Redmi', verified: false },
      { id: 'vivo', name: 'Vivo', verified: false },
      { id: 'oppo', name: 'Oppo', verified: false },
      { id: 'oneplus', name: 'OnePlus', verified: false },
      { id: 'realme', name: 'Realme', verified: false },
      { id: 'motorola', name: 'Motorola', verified: false },
      { id: 'google', name: 'Google Pixel', verified: true },
      { id: 'nokia', name: 'Nokia', verified: false },
      { id: 'ikea', name: 'IKEA', verified: false },
      { id: 'herman-miller', name: 'Herman Miller', verified: true },
      { id: 'west-elm', name: 'West Elm', verified: false },
      { id: 'muuto', name: 'Muuto', verified: true },
      { id: 'hay-design', name: 'Hay Design', verified: false },
    ];
    
    // If no category/subcategory specified, return empty (or fetch all brands from DB)
    if (!targetCategoryId && !targetSubcategoryId) {
      // Option 1: Return empty (recommended - user must select category/subcategory)
      // return res.json({ success: true, brands: [] });
      
      // Option 2: Fetch all brands from all approved ads (if needed)
      const allAds = await prisma.ad.findMany({
        where: {
          status: 'APPROVED',
          attributes: { not: null }
        },
        select: { attributes: true }
      });
      
      const allBrandCounts = {};
      allAds.forEach(ad => {
        if (ad.attributes && typeof ad.attributes === 'object') {
          const brand = ad.attributes.brand;
          if (brand && typeof brand === 'string' && brand.trim()) {
            const brandKey = brand.trim();
            allBrandCounts[brandKey] = (allBrandCounts[brandKey] || 0) + 1;
          }
        }
      });
      
      const allBrandNames = Object.keys(allBrandCounts);
      const allBrands = allBrandNames.map(name => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name: name,
        count: allBrandCounts[name] || 0,
        verified: false,
        isActive: true,
        popular: allBrandCounts[name] >= 10
      }));
      
      let filteredBrands = allBrands;
      if (search && search.trim()) {
        const searchLower = search.toLowerCase();
        filteredBrands = allBrands.filter(brand => 
          brand.name.toLowerCase().includes(searchLower)
        );
      }
      
      // Filter by popular if requested
      if (popular === 'true') {
        filteredBrands = filteredBrands.filter(brand => brand.popular);
      }
      
      // Sort by popularity
      filteredBrands.sort((a, b) => {
        if (a.count !== b.count) return b.count - a.count;
        return a.name.localeCompare(b.name);
      });
      
      return res.json({ success: true, brands: filteredBrands.slice(0, searchLimit) });
    }
    
    // Build where clause for ads query
    const adsWhere = {
      status: 'APPROVED',
      attributes: { not: null }
    };
    
    // Priority: Filter by subcategory if available, else by category
    if (targetSubcategoryId) {
      adsWhere.subcategoryId = targetSubcategoryId;
      console.log('🔍 Fetching brands for subcategory:', { 
        subcategoryId: targetSubcategoryId, 
        categoryId: targetCategoryId,
        subcategorySlug: subcategorySlug,
        sub: sub,
        subcategoryIdParam: subcategoryId,
        receivedParams: { categoryId, categorySlug, subcategoryId, subcategorySlug, sub }
      });
      
      // Verify subcategory exists and get ad count
      const subcategoryCheck = await prisma.subcategory.findUnique({
        where: { id: targetSubcategoryId },
        select: { 
          id: true, 
          name: true, 
          slug: true, 
          categoryId: true, 
          _count: { 
            select: { 
              ads: {
                where: { status: 'APPROVED' }
              }
            } 
          } 
        }
      });
      
      if (subcategoryCheck) {
        console.log('✅ Subcategory verified:', {
          id: subcategoryCheck.id,
          name: subcategoryCheck.name,
          slug: subcategoryCheck.slug,
          categoryId: subcategoryCheck.categoryId,
          totalApprovedAds: subcategoryCheck._count.ads
        });
      } else {
        console.warn('⚠️ Subcategory not found in database:', {
          targetSubcategoryId,
          receivedParams: { categoryId, categorySlug, subcategoryId, subcategorySlug, sub }
        });
        
        // Try to find similar subcategories for debugging
        const similarSubcategories = await prisma.subcategory.findMany({
          where: { isActive: true },
          select: { id: true, name: true, slug: true, categoryId: true },
          take: 20
        });
        console.warn('💡 Available subcategories:', similarSubcategories.map(s => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          categoryId: s.categoryId
        })));
        
        return res.json({ success: true, brands: [] });
      }
    } else if (targetCategoryId) {
      adsWhere.categoryId = targetCategoryId;
      console.log('🔍 Fetching brands for category (category-only, no subcategory):', { 
        categoryId: targetCategoryId,
        categorySlug: categorySlug,
        receivedParams: { categoryId, categorySlug, subcategoryId, subcategorySlug, sub },
        willQueryAds: true
      });
      
      // Verify category exists and get ad count
      const categoryCheck = await prisma.category.findUnique({
        where: { id: targetCategoryId },
        select: { 
          id: true, 
          name: true, 
          slug: true,
          _count: { 
            select: { 
              ads: {
                where: { status: 'APPROVED' }
              }
            } 
          } 
        }
      });
      
      if (categoryCheck) {
        console.log('✅ Category verified:', {
          id: categoryCheck.id,
          name: categoryCheck.name,
          slug: categoryCheck.slug,
          totalApprovedAds: categoryCheck._count.ads
        });
      } else {
        console.warn('⚠️ Category not found in database:', targetCategoryId);
        return res.json({ success: true, brands: [] });
      }
    } else {
      console.warn('⚠️ No category or subcategory ID found. Query params:', {
        categoryId, categorySlug, subcategoryId, subcategorySlug, sub,
        targetCategoryId,
        targetSubcategoryId
      });
      return res.json({ success: true, brands: [] });
    }
    
    // Get all ads with brand attribute for this category/subcategory
    const ads = await prisma.ad.findMany({
      where: adsWhere,
      select: { 
        id: true,
        attributes: true,
        subcategoryId: true,
        categoryId: true
      }
    });
    
    console.log('📊 Found ads with attributes:', {
      totalAds: ads.length,
      adsWithAttributes: ads.filter(ad => ad.attributes && typeof ad.attributes === 'object').length,
      sampleAd: ads[0] ? {
        id: ads[0].id,
        hasAttributes: !!ads[0].attributes,
        attributesType: typeof ads[0].attributes,
        subcategoryId: ads[0].subcategoryId,
        categoryId: ads[0].categoryId
      } : null
    });
    
    // Count brand occurrences from database
    // FALLBACK: Use publisher or title if brand is missing (for categories like fiction)
    const brandCounts = {};
    let adsWithBrands = 0;
    let adsWithFallback = 0;
    ads.forEach(ad => {
      if (ad.attributes && typeof ad.attributes === 'object') {
        // Priority 1: Use brand if available
        let brand = ad.attributes.brand;
        
        // Priority 2: Fallback to publisher if brand is missing
        if (!brand || !brand.trim()) {
          brand = ad.attributes.publisher;
        }
        
        // Priority 3: Fallback to title if brand and publisher are missing
        if (!brand || !brand.trim()) {
          brand = ad.attributes.title;
        }
        
        // Use the brand (or fallback) if available
        if (brand && typeof brand === 'string' && brand.trim()) {
          const brandKey = brand.trim();
          brandCounts[brandKey] = (brandCounts[brandKey] || 0) + 1;
          adsWithBrands++;
          
          // Track if we used fallback
          if (!ad.attributes.brand || !ad.attributes.brand.trim()) {
            adsWithFallback++;
          }
        }
      }
    });
    
    console.log('📦 Brand extraction results (with fallback):', {
      totalAds: ads.length,
      adsWithBrands: adsWithBrands,
      adsWithFallback: adsWithFallback,
      adsWithDirectBrand: adsWithBrands - adsWithFallback,
      uniqueBrands: Object.keys(brandCounts).length,
      brandCounts: brandCounts,
      sampleBrands: Object.keys(brandCounts).slice(0, 10),
      // Sample ads without brand/publisher/title for debugging
      adsWithoutAnyBrand: ads
        .filter(ad => {
          if (!ad.attributes || typeof ad.attributes !== 'object') return true;
          const brand = ad.attributes.brand || ad.attributes.publisher || ad.attributes.title;
          return !brand || !brand.trim();
        })
        .slice(0, 3)
        .map(ad => ({
          id: ad.id,
          hasAttributes: !!ad.attributes,
          attributesKeys: ad.attributes && typeof ad.attributes === 'object' ? Object.keys(ad.attributes) : null
        })),
      // Sample ads with brand (or fallback) for debugging
      adsWithBrandOrFallback: ads
        .filter(ad => {
          if (!ad.attributes || typeof ad.attributes !== 'object') return false;
          const brand = ad.attributes.brand || ad.attributes.publisher || ad.attributes.title;
          return brand && brand.trim();
        })
        .slice(0, 5)
        .map(ad => ({
          id: ad.id,
          brand: ad.attributes.brand || ad.attributes.publisher || ad.attributes.title,
          usedFallback: !ad.attributes.brand || !ad.attributes.brand.trim(),
          fallbackSource: !ad.attributes.brand ? (ad.attributes.publisher ? 'publisher' : 'title') : 'brand',
          subcategoryId: ad.subcategoryId,
          categoryId: ad.categoryId
        }))
    });
    
    // Get unique brand names from database (NO static brands - everything from DB)
    const foundBrandNames = Object.keys(brandCounts);
    
    console.log('📦 Brands found in database:', {
      totalBrands: foundBrandNames.length,
      brands: foundBrandNames.slice(0, 10) // Log first 10
    });
    
    // Create brand objects from database only (no static defaults)
    const allBrands = foundBrandNames.map(name => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name: name,
      count: brandCounts[name] || 0,
      verified: false, // Can be enhanced later with a brands table
      isActive: true,
      popular: brandCounts[name] >= 1 // Consider popular if 1+ ads (lower threshold)
    }));
    
    // Filter out unwanted test entries
    const unwantedEntries = ['mokia', 'yyytytty'];
    let filteredBrands = allBrands.filter(brand => {
      const brandNameLower = brand.name.toLowerCase();
      return !unwantedEntries.some(entry => brandNameLower === entry || brandNameLower.includes(entry));
    });
    
    // Filter by popular if requested (but show at least some brands even if not popular)
    if (popular === 'true') {
      const popularBrands = filteredBrands.filter(brand => brand.popular);
      // If we have popular brands, use them. Otherwise, show all brands (at least 1)
      if (popularBrands.length > 0) {
        filteredBrands = popularBrands;
      } else if (filteredBrands.length > 0) {
        // If no popular brands but we have brands, show top 10 by count
        filteredBrands = filteredBrands.sort((a, b) => b.count - a.count).slice(0, 10);
        console.log('⚠️ No popular brands found, showing top brands by count:', filteredBrands.length);
      }
    }
    
    // Filter by search if provided
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      filteredBrands = filteredBrands.filter(brand => 
        brand.name.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort by popularity (count) first, then alphabetical
    filteredBrands.sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count; // Popular first
      return a.name.localeCompare(b.name); // Alphabetical if same count
    });
    
    console.log('✅ Returning brands:', {
      totalBrands: filteredBrands.length,
      returningCount: Math.min(filteredBrands.length, searchLimit),
      sampleBrands: filteredBrands.slice(0, 5).map(b => b.name),
      subcategoryId: targetSubcategoryId,
      categoryId: targetCategoryId,
      popular: popular === 'true'
    });
    
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

// Get brands and models data for all categories/subcategories - MUST come before parameterized routes
router.get('/brands-models', 
  cacheMiddleware(60 * 60), // Cache for 1 hour (brands/models don't change often)
  async (req, res) => {
  try {
    const { categorySlug, subcategorySlug } = req.query;
    
    // Unwanted test entries to filter out
    const unwantedEntries = ['mokia', 'yyytytty'];
    
    // Helper function to filter brands and models
    const filterBrandsModels = (data) => {
      if (!data || !data.categories) return data;
      
      return {
        ...data,
        categories: data.categories.map(category => ({
          ...category,
          subcategories: category.subcategories.map(subcat => ({
            ...subcat,
            brands: (subcat.brands || []).filter(brand => {
              const brandName = (brand.name || brand || '').toLowerCase();
              const isUnwanted = unwantedEntries.some(entry => 
                brandName === entry || brandName.includes(entry)
              );
              if (isUnwanted) return false;
              
              // Also filter models within brands
              if (typeof brand === 'object' && Array.isArray(brand.models)) {
                brand.models = brand.models.filter(model => {
                  const modelName = (model || '').toLowerCase();
                  return !unwantedEntries.some(entry => 
                    modelName === entry || modelName.includes(entry)
                  );
                });
              }
              return true;
            })
          }))
        }))
      };
    };
    
    // If specific category/subcategory requested, filter the data
    if (categorySlug || subcategorySlug) {
      const categorySlugMap = { 'mobiles': 'electronics', 'electronics': 'electronics', 'smartphone': 'electronics' };
      const mappedCategorySlug = categorySlugMap[categorySlug] || categorySlug;
      // Get brands from brands-models.json (full list) for mobiles/electronics + mobile-phones
      let brandsFromJson = [];
      const jsonCategory = brandsModelsData?.categories?.find(
        (c) => c.slug === mappedCategorySlug || c.id === mappedCategorySlug
      );
      if (jsonCategory && subcategorySlug) {
        const jsonSub = jsonCategory.subcategories?.find((s) => s.slug === subcategorySlug || s.id === subcategorySlug);
        if (jsonSub?.brands?.length) brandsFromJson = jsonSub.brands;
      }
      // Also get spec-config brands (in case JSON missing this combo)
      const configData = await getSpecConfigData(categorySlug, subcategorySlug).catch(() => null);
      const specConfigBrands = getSpecConfigBrands(categorySlug, subcategorySlug, configData) || [];
      // Merge both sources: prefer brands-models.json (full list), supplement with spec-config
      const seen = new Set();
      const merged = [];
      for (const b of brandsFromJson.length >= specConfigBrands.length ? brandsFromJson : specConfigBrands) {
        const name = (typeof b === 'object' && b?.name) ? b.name : String(b);
        if (name && !seen.has(name)) { seen.add(name); merged.push(typeof b === 'object' ? b : { name, models: [] }); }
      }
      for (const b of brandsFromJson.length >= specConfigBrands.length ? specConfigBrands : brandsFromJson) {
        const name = (typeof b === 'object' && b?.name) ? b.name : String(b);
        if (name && !seen.has(name)) { seen.add(name); merged.push(typeof b === 'object' ? b : { name, models: [] }); }
      }
      if (merged.length && categorySlug && subcategorySlug) {
        const categoryConfig = specConfig.find(c => normalizeSlug(c.category) === normalizeSlug(categorySlug));
        const catName = categoryConfig?.category || categorySlug;
        const filteredBrands = filterBrandsModels({ categories: [{ subcategories: [{ brands: merged }] }] });
        return res.json({
          success: true,
          categories: [{
            id: categorySlug,
            slug: categorySlug,
            name: catName,
            subcategories: [{
              id: subcategorySlug,
              slug: subcategorySlug,
              name: subcategorySlug,
              brands: filteredBrands?.categories?.[0]?.subcategories?.[0]?.brands || merged
            }]
          }]
        });
      }

      let filteredData = { categories: [] };
      
      if (categorySlug) {
        const categoryData = brandsModelsData.categories.find(
          (cat) => cat.slug === mappedCategorySlug || cat.slug === categorySlug || cat.id === mappedCategorySlug || cat.id === categorySlug
        );
        
        if (categoryData) {
          if (subcategorySlug) {
            const subcategoryData = categoryData.subcategories.find(
              sub => sub.slug === subcategorySlug || sub.id === subcategorySlug
            );
            if (subcategoryData) {
              filteredData = {
                categories: [{
                  ...categoryData,
                  subcategories: [subcategoryData]
                }]
              };
            } else {
              console.warn('⚠️ Subcategory not found:', { categorySlug, subcategorySlug, availableSubs: categoryData.subcategories.map((s) => ({ id: s.id, slug: s.slug })) });
            }
          } else {
            filteredData = { categories: [categoryData] };
          }
        } else {
          console.warn('⚠️ Category not found in brands-models:', { categorySlug, mappedCategorySlug, availableCategories: brandsModelsData.categories.map((c) => ({ id: c.id, slug: c.slug })) });
        }
      }
      
      const cleanedData = filterBrandsModels(filteredData);
      return res.json({ success: true, ...cleanedData });
    }
    
    // Return all brands and models data (filtered)
    const cleanedData = filterBrandsModels(brandsModelsData);
    res.json({ success: true, ...cleanedData });
  } catch (error) {
    console.error('Get brands-models error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch brands and models' });
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
    
    // Filter out unwanted test entries
    const unwantedEntries = ['mokia', 'yyytytty'];
    let filteredModels = allModels.filter(model => {
      const modelNameLower = model.name.toLowerCase();
      return !unwantedEntries.some(entry => modelNameLower === entry || modelNameLower.includes(entry));
    });
    
    // Filter by search if provided
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      filteredModels = filteredModels.filter(model => 
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

    // productSlug must be ad ID (MongoDB ObjectId) - Ad model has no slug field
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(productSlug || '');
    if (!isValidObjectId) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

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

    // Find product by ID (Ad model has no slug field - use id from URL)
    const now = new Date();
    const ad = await prisma.ad.findFirst({
      where: {
        AND: [
          { id: productSlug },
          { categoryId: category.id },
          { subcategoryId: subcategory.id },
          { status: 'APPROVED' },
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } }
            ]
          }
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

// Legacy route: Get subcategories with ad counts for a category (by ID or slug)
router.get('/:id/subcategories', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔄 Fetching subcategories for:', { id, type: typeof id });
    
    // Try to find category by ID first, then by slug
    let categoryId = id;
    
    // Check if id is a valid ObjectId format (24 hex characters)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    
    if (!isValidObjectId) {
      // If not a valid ObjectId, try to find category by slug
      console.log('⚠️ ID is not a valid ObjectId, trying to find by slug:', id);
      const category = await prisma.category.findFirst({
        where: {
          OR: [
            { slug: id },
            { id: id }
          ],
          isActive: true
        },
        select: { id: true, name: true, slug: true }
      });
      
      if (category) {
        categoryId = category.id;
        console.log('✅ Found category by slug:', { slug: id, categoryId: category.id, name: category.name });
      } else {
        console.warn('⚠️ Category not found by ID or slug:', id);
        return res.json({ success: true, subcategories: [] });
      }
    } else {
      // Verify category exists
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true, name: true, slug: true }
      });
      
      if (!category) {
        console.warn('⚠️ Category not found by ID:', categoryId);
        return res.json({ success: true, subcategories: [] });
      }
      
      console.log('✅ Found category by ID:', { categoryId, name: category.name, slug: category.slug });
    }
    
    // First, verify the category exists and get its details
    const categoryDetails = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { 
        id: true, 
        name: true, 
        slug: true,
        _count: {
          select: {
            subcategories: {
              where: { isActive: true }
            }
          }
        }
      }
    });

    if (!categoryDetails) {
      console.warn('⚠️ Category not found:', categoryId);
      return res.json({ success: true, subcategories: [] });
    }

    console.log('📊 Category details:', {
      id: categoryDetails.id,
      name: categoryDetails.name,
      slug: categoryDetails.slug,
      subcategoriesCount: categoryDetails._count.subcategories
    });

    const subcategories = await prisma.subcategory.findMany({
      where: {
        categoryId: categoryId,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        categoryId: true,
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

    console.log('✅ Subcategories query result:', { 
      categoryId, 
      categoryName: categoryDetails.name,
      queryCount: subcategories.length,
      expectedCount: categoryDetails._count.subcategories,
      subcategories: subcategories.map(s => ({ 
        id: s.id, 
        name: s.name, 
        slug: s.slug,
        categoryId: s.categoryId,
        adsCount: s._count.ads
      }))
    });

    // Also check if there are any inactive subcategories
    const inactiveCount = await prisma.subcategory.count({
      where: {
        categoryId: categoryId,
        isActive: false
      }
    });

    if (inactiveCount > 0) {
      console.log('ℹ️ Found inactive subcategories:', inactiveCount);
    }

    res.json({ success: true, subcategories });
  } catch (error) {
    console.error('❌ Get subcategories error:', error.message);
    const { getSafeErrorPayload } = require('../utils/safeErrorResponse');
    res.status(500).json(getSafeErrorPayload(error, 'Failed to fetch subcategories'));
  }
});

module.exports = router;
