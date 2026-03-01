const express = require('express');
const { query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/brands
 * Get unique brands from ads
 * Query params: category, subcategory, search, popular
 */
router.get('/',
  [
    query('category').optional().isString(),
    query('subcategory').optional().isString(),
    query('search').optional().isString(),
    query('popular').optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { category, subcategory, search, popular } = req.query;

      // Build where clause for ads
      const now = new Date();
      const where = {
        status: 'APPROVED',
        attributes: { not: null },
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } }
            ]
          }
        ]
      };

      // Find category if provided
      let categoryRecord = null;
      if (category) {
        categoryRecord = await prisma.category.findFirst({
          where: { slug: category },
        });
        if (categoryRecord) {
          where.categoryId = categoryRecord.id;
        }
      }

      // Find subcategory if provided
      if (subcategory && categoryRecord) {
        const subcategoryRecord = await prisma.subcategory.findFirst({
          where: {
            slug: subcategory,
            categoryId: categoryRecord.id,
          },
        });
        if (subcategoryRecord) {
          where.subcategoryId = subcategoryRecord.id;
        }
      }

      // Get all approved ads matching criteria
      const ads = await prisma.ad.findMany({
        where,
        select: {
          attributes: true,
        },
      });

      // Extract brands from attributes
      const brandSet = new Set();
      const brandCounts = new Map();

      ads.forEach(ad => {
        if (ad.attributes && typeof ad.attributes === 'object') {
          // Check common brand field names
          const brandFields = ['brand', 'Brand', 'BRAND', 'company', 'Company', 'manufacturer', 'Manufacturer'];
          
          for (const field of brandFields) {
            const brand = ad.attributes[field];
            if (brand && typeof brand === 'string' && brand.trim()) {
              const normalizedBrand = brand.trim();
              brandSet.add(normalizedBrand);
              brandCounts.set(normalizedBrand, (brandCounts.get(normalizedBrand) || 0) + 1);
            }
          }
        }
      });

      // Convert to array and sort
      let brands = Array.from(brandSet);

      // Filter by search query
      if (search) {
        const searchLower = search.toLowerCase();
        brands = brands.filter(brand => 
          brand.toLowerCase().includes(searchLower)
        );
      }

      // Sort by popularity if requested, otherwise alphabetically
      if (popular === 'true' || popular === true) {
        brands.sort((a, b) => {
          const countA = brandCounts.get(a) || 0;
          const countB = brandCounts.get(b) || 0;
          return countB - countA; // Descending order
        });
      } else {
        brands.sort((a, b) => a.localeCompare(b));
      }

      res.json({
        success: true,
        brands: brands.slice(0, 100), // Limit to 100 brands
        total: brands.length,
      });
    } catch (error) {
      console.error('❌ Error getting brands:', error);
      const { getSafeErrorPayload } = require('../utils/safeErrorResponse');
      res.status(500).json(getSafeErrorPayload(error, 'Failed to get brands'));
    }
  }
);

module.exports = router;
