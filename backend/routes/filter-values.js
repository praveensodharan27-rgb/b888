const express = require('express');
const { query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/filter-values?categorySlug= OR /api/filter-values?categoryId=
 * Get available filter values from actual ads in the database
 * Returns unique values for each filter field from APPROVED ads
 */
router.get('/',
  [
    query('categorySlug').optional().isString(),
    query('categoryId').optional().isString(),
    query('subcategorySlug').optional().isString(),
    query('field').optional().isString(), // Specific field to get values for
  ],
  async (req, res) => {
    try {
      console.log('🔍 Filter values request:', {
        categorySlug: req.query.categorySlug,
        categoryId: req.query.categoryId,
        subcategorySlug: req.query.subcategorySlug,
        field: req.query.field,
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { categorySlug, categoryId, subcategorySlug, field } = req.query;

      // Build where clause for ads query
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

      // Find category by slug or ID
      let category = null;
      let subcategory = null;

      if (categorySlug || categoryId) {
        const categoryWhere = categorySlug
          ? { slug: categorySlug, isActive: true }
          : /^[a-fA-F0-9]{24}$/.test(categoryId)
            ? { id: categoryId, isActive: true }
            : null;

        if (categoryWhere) {
          category = await prisma.category.findFirst({
            where: categoryWhere,
            select: { id: true, name: true, slug: true },
          });

          if (category) {
            where.categoryId = category.id;
          }
        }
      }

      // Find subcategory if provided
      if (subcategorySlug && category) {
        subcategory = await prisma.subcategory.findFirst({
          where: {
            slug: subcategorySlug,
            categoryId: category.id,
            isActive: true,
          },
          select: { id: true, name: true, slug: true },
        });

        if (subcategory) {
          where.subcategoryId = subcategory.id;
        }
      }

      // If no category found, return empty
      if (!category) {
        return res.json({
          success: true,
          values: {},
          category: null,
          subcategory: null,
        });
      }

      // Fetch all APPROVED ads for this category/subcategory
      const ads = await prisma.ad.findMany({
        where,
        select: {
          id: true,
          attributes: true,
        },
        take: 10000, // Limit to prevent memory issues
      });

      console.log(`📊 Found ${ads.length} ads for filter values extraction`);

      // Extract unique values for each filter field
      const filterValues = {};

      // Process each ad's attributes
      ads.forEach(ad => {
        if (!ad.attributes || typeof ad.attributes !== 'object') {
          return;
        }

        Object.entries(ad.attributes).forEach(([key, value]) => {
          if (value === null || value === undefined || value === '') {
            return;
          }

          // Initialize array for this field if not exists
          if (!filterValues[key]) {
            filterValues[key] = new Set();
          }

          // Handle different value types
          if (Array.isArray(value)) {
            // For multiselect fields
            value.forEach(v => {
              if (v && String(v).trim()) {
                filterValues[key].add(String(v).trim());
              }
            });
          } else {
            // For single values
            const stringValue = String(value).trim();
            if (stringValue) {
              filterValues[key].add(stringValue);
            }
          }
        });
      });

      // Convert Sets to sorted arrays
      const result = {};
      Object.entries(filterValues).forEach(([key, valueSet]) => {
        const values = Array.from(valueSet).sort();
        
        // Format values for common fields
        if (key === 'ram_gb' || key === 'ram') {
          // Format RAM values (e.g., "4", "6", "8" -> "4GB", "6GB", "8GB")
          result[key] = values.map(v => {
            const num = parseInt(v);
            return isNaN(num) ? v : `${num}GB`;
          }).sort((a, b) => {
            const numA = parseInt(a);
            const numB = parseInt(b);
            return isNaN(numA) || isNaN(numB) ? a.localeCompare(b) : numA - numB;
          });
        } else if (key === 'storage_gb' || key === 'storage') {
          // Format Storage values
          result[key] = values.map(v => {
            const num = parseInt(v);
            return isNaN(num) ? v : `${num}GB`;
          }).sort((a, b) => {
            const numA = parseInt(a);
            const numB = parseInt(b);
            return isNaN(numA) || isNaN(numB) ? a.localeCompare(b) : numA - numB;
          });
        } else {
          // For other fields, return as-is
          result[key] = values;
        }
      });

      // If specific field requested, return only that field
      if (field) {
        return res.json({
          success: true,
          field,
          values: result[field] || [],
          category: category ? {
            id: category.id,
            name: category.name,
            slug: category.slug,
          } : null,
          subcategory: subcategory ? {
            id: subcategory.id,
            name: subcategory.name,
            slug: subcategory.slug,
          } : null,
        });
      }

      console.log('✅ Filter values extracted:', {
        categorySlug: category?.slug,
        subcategorySlug: subcategory?.slug,
        fieldsCount: Object.keys(result).length,
        totalAds: ads.length,
      });

      res.json({
        success: true,
        values: result,
        category: category ? {
          id: category.id,
          name: category.name,
          slug: category.slug,
        } : null,
        subcategory: subcategory ? {
          id: subcategory.id,
          name: subcategory.name,
          slug: subcategory.slug,
        } : null,
      });
    } catch (error) {
      console.error('❌ Error getting filter values:', error);
      const { getSafeErrorPayload } = require('../utils/safeErrorResponse');
      res.status(500).json(getSafeErrorPayload(error, 'Failed to get filter values'));
    }
  }
);

module.exports = router;
