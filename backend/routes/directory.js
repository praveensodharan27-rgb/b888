/**
 * India Business Directory API - SEO-optimized, scalable for 28+ states and 700+ cities.
 * Base path: /api/directory
 */
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { slugify } = require('../utils/slug');
const { authenticate } = require('../middleware/auth');
const { slugifyUnique } = require('../utils/slug');

const router = express.Router();
const prisma = new PrismaClient();

// ----- States -----
router.get('/states', async (req, res) => {
  try {
    const states = await prisma.directoryState.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    });
    return res.json({ success: true, states });
  } catch (e) {
    console.error('Directory states error:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch states' });
  }
});

router.get('/states/:stateSlug', async (req, res) => {
  try {
    const state = await prisma.directoryState.findFirst({
      where: { slug: req.params.stateSlug.toLowerCase(), isActive: true },
      include: {
        cities: { where: { isActive: true }, select: { id: true, name: true, slug: true }, orderBy: { name: 'asc' } },
        _count: { select: { businesses: true } },
      },
    });
    if (!state) return res.status(404).json({ success: false, message: 'State not found' });
    return res.json({ success: true, state });
  } catch (e) {
    console.error('Directory state by slug error:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch state' });
  }
});

router.get('/states/:stateSlug/cities', async (req, res) => {
  try {
    const state = await prisma.directoryState.findFirst({
      where: { slug: req.params.stateSlug.toLowerCase(), isActive: true },
    });
    if (!state) return res.status(404).json({ success: false, message: 'State not found' });
    const cities = await prisma.directoryCity.findMany({
      where: { stateId: state.id, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    });
    return res.json({ success: true, cities });
  } catch (e) {
    console.error('Directory cities error:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch cities' });
  }
});

// ----- City (by state + city slug) -----
router.get('/cities/:stateSlug/:citySlug', async (req, res) => {
  try {
    const state = await prisma.directoryState.findFirst({
      where: { slug: req.params.stateSlug.toLowerCase(), isActive: true },
    });
    if (!state) return res.status(404).json({ success: false, message: 'State not found' });
    const city = await prisma.directoryCity.findFirst({
      where: { stateId: state.id, slug: req.params.citySlug.toLowerCase(), isActive: true },
      include: {
        state: { select: { id: true, name: true, slug: true } },
        _count: { select: { businesses: true } },
      },
    });
    if (!city) return res.status(404).json({ success: false, message: 'City not found' });
    return res.json({ success: true, city });
  } catch (e) {
    console.error('Directory city error:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch city' });
  }
});

// ----- Categories -----
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.directoryCategory.findMany({
      where: { isActive: true },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, description: true, metaTitle: true, metaDescription: true },
    });
    return res.json({ success: true, categories });
  } catch (e) {
    console.error('Directory categories error:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// ----- Businesses list (with filters, sort, pagination) -----
router.get('/businesses', async (req, res) => {
  try {
    const { stateSlug, citySlug, categorySlug, page = '1', limit = '20', sort = 'rating' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where = { isActive: true };
    if (stateSlug) {
      const state = await prisma.directoryState.findFirst({
        where: { slug: String(stateSlug).toLowerCase(), isActive: true },
      });
      if (state) where.stateId = state.id;
    }
    if (citySlug && where.stateId) {
      const city = await prisma.directoryCity.findFirst({
        where: { stateId: where.stateId, slug: String(citySlug).toLowerCase(), isActive: true },
      });
      if (city) where.cityId = city.id;
    }
    if (categorySlug) {
      const cat = await prisma.directoryCategory.findFirst({
        where: { slug: String(categorySlug).toLowerCase(), isActive: true },
      });
      if (cat) where.categoryId = cat.id;
    }

    const orderBy = sort === 'newest'
      ? { createdAt: 'desc' }
      : sort === 'name'
        ? { name: 'asc' }
        : [{ isFeatured: 'desc' }, { rating: 'desc' }, { reviewCount: 'desc' }];

    const [businesses, total] = await Promise.all([
      prisma.directoryBusiness.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          city: { select: { id: true, name: true, slug: true } },
          state: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.directoryBusiness.count({ where }),
    ]);

    return res.json({
      success: true,
      businesses,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (e) {
    console.error('Directory businesses list error:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch businesses' });
  }
});

// ----- Create business (logged-in users only) -----
router.post('/businesses', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const body = req.body || {};
    const name = (body.name || body.tradingName || body.legalName || '').toString().trim();
    const stateSlug = (body.stateSlug || body.state || '').toString().trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    const citySlug = (body.citySlug || body.city || '').toString().trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    const categorySlug = (body.categorySlug || body.category || '').toString().trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

    if (!name) return res.status(400).json({ success: false, message: 'Business name is required' });
    if (!stateSlug) return res.status(400).json({ success: false, message: 'State is required' });
    if (!citySlug) return res.status(400).json({ success: false, message: 'City is required' });
    if (!categorySlug) return res.status(400).json({ success: false, message: 'Category is required' });

    let state = await prisma.directoryState.findFirst({
      where: { slug: stateSlug, isActive: true },
    });
    if (!state && body.state) {
      const stateName = (body.state || '').toString().trim().toLowerCase();
      if (stateName) {
        const allStates = await prisma.directoryState.findMany({ where: { isActive: true } });
        state = allStates.find((s) => s.name.toLowerCase() === stateName) || null;
      }
    }
    if (!state) return res.status(400).json({ success: false, message: 'State not found. Please select from the list.' });

    let city = await prisma.directoryCity.findFirst({
      where: { stateId: state.id, slug: citySlug, isActive: true },
    });
    if (!city && body.city) {
      const cityName = (body.city || '').toString().trim().toLowerCase();
      if (cityName) {
        const stateCities = await prisma.directoryCity.findMany({
          where: { stateId: state.id, isActive: true },
        });
        city = stateCities.find((c) => c.name.toLowerCase() === cityName) || null;
      }
    }
    if (!city) return res.status(400).json({ success: false, message: 'City not found. Please select from the list.' });

    const category = await prisma.directoryCategory.findFirst({
      where: { slug: categorySlug, isActive: true },
    });
    if (!category) return res.status(400).json({ success: false, message: 'Category not found.' });

    const existingSlugs = await prisma.directoryBusiness.findMany({
      where: { stateId: state.id, cityId: city.id, categoryId: category.id },
      select: { slug: true },
    }).then((rows) => rows.map((r) => r.slug));

    const businessSlug = slugifyUnique(name, existingSlugs, citySlug);

    const address = (body.address || '').toString().trim() || null;
    const phone = (body.phone || '').toString().trim() || null;
    const email = (body.email || '').toString().trim() || null;
    const website = (body.website || '').toString().trim() || null;
    const description = (body.description || '').toString().trim() || null;
    const whatsapp = (body.whatsapp || body.phone || '').toString().trim().replace(/\D/g, '').slice(0, 15) || null;
    const lat = body.latitude != null ? parseFloat(body.latitude) : null;
    const lng = body.longitude != null ? parseFloat(body.longitude) : null;
    let openingHours = body.openingHours || null;
    if (openingHours && typeof openingHours !== 'object') openingHours = null;

    const business = await prisma.directoryBusiness.create({
      data: {
        name,
        slug: businessSlug,
        description,
        phone,
        email,
        website,
        address,
        latitude: lat,
        longitude: lng,
        openingHours,
        whatsapp: whatsapp || null,
        categoryId: category.id,
        cityId: city.id,
        stateId: state.id,
        userId,
        isActive: true,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        city: { select: { id: true, name: true, slug: true } },
        state: { select: { id: true, name: true, slug: true } },
      },
    });

    return res.status(201).json({ success: true, business });
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'A business with this name already exists in this location and category.' });
    }
    console.error('Directory create business error:', e);
    return res.status(500).json({ success: false, message: 'Failed to create business' });
  }
});

// ----- My businesses (logged-in user's directory listings) -----
router.get('/my-businesses', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const businesses = await prisma.directoryBusiness.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        state: { select: { slug: true, name: true } },
        city: { select: { slug: true, name: true } },
        category: { select: { slug: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, businesses });
  } catch (e) {
    console.error('Directory my-businesses error:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch businesses' });
  }
});

// ----- Single business (by state/city/category/slug) -----
router.get('/business/:stateSlug/:citySlug/:categorySlug/:businessSlug', async (req, res) => {
  try {
    const { stateSlug, citySlug, categorySlug, businessSlug } = req.params;
    const state = await prisma.directoryState.findFirst({
      where: { slug: stateSlug.toLowerCase(), isActive: true },
    });
    if (!state) return res.status(404).json({ success: false, message: 'State not found' });
    const city = await prisma.directoryCity.findFirst({
      where: { stateId: state.id, slug: citySlug.toLowerCase(), isActive: true },
    });
    if (!city) return res.status(404).json({ success: false, message: 'City not found' });
    const category = await prisma.directoryCategory.findFirst({
      where: { slug: categorySlug.toLowerCase(), isActive: true },
    });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    const business = await prisma.directoryBusiness.findFirst({
      where: {
        stateId: state.id,
        cityId: city.id,
        categoryId: category.id,
        slug: businessSlug.toLowerCase(),
        isActive: true,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        city: { select: { id: true, name: true, slug: true } },
        state: { select: { id: true, name: true, slug: true } },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: { id: true, authorName: true, rating: true, content: true, createdAt: true, isVerified: true },
        },
      },
    });
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });

    await prisma.directoryBusiness.update({
      where: { id: business.id },
      data: { viewCount: { increment: 1 } },
    });
    business.viewCount += 1;

    return res.json({ success: true, business });
  } catch (e) {
    console.error('Directory business by slug error:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch business' });
  }
});

// ----- Submit review -----
router.post('/businesses/:id/reviews', async (req, res) => {
  try {
    const businessId = req.params.id;
    const { authorName, rating, content } = req.body || {};
    const numRating = Math.min(5, Math.max(1, parseInt(rating, 10) || 0));
    if (!numRating || !authorName || typeof authorName !== 'string' || authorName.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'authorName and rating (1-5) required' });
    }
    const business = await prisma.directoryBusiness.findUnique({ where: { id: businessId } });
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });

    const review = await prisma.directoryReview.create({
      data: {
        businessId,
        authorName: authorName.trim().slice(0, 120),
        rating: numRating,
        content: (content && typeof content === 'string') ? content.trim().slice(0, 2000) : null,
      },
    });

    const reviews = await prisma.directoryReview.findMany({ where: { businessId } });
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    const reviewCount = reviews.length;
    await prisma.directoryBusiness.update({
      where: { id: businessId },
      data: { rating: Math.round(avg * 10) / 10, reviewCount },
    });

    return res.json({ success: true, review });
  } catch (e) {
    console.error('Directory review create error:', e);
    return res.status(500).json({ success: false, message: 'Failed to submit review' });
  }
});

// ----- Blog -----
router.get('/blog', async (req, res) => {
  try {
    const { page = '1', limit = '12' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;
    const where = { isActive: true, publishedAt: { not: null } };
    const [posts, total] = await Promise.all([
      prisma.directoryBlogPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limitNum,
        select: { id: true, title: true, slug: true, excerpt: true, image: true, publishedAt: true, tags: true },
      }),
      prisma.directoryBlogPost.count({ where }),
    ]);
    return res.json({
      success: true,
      posts,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (e) {
    console.error('Directory blog list error:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch blog posts' });
  }
});

router.get('/blog/:slug', async (req, res) => {
  try {
    const post = await prisma.directoryBlogPost.findFirst({
      where: { slug: req.params.slug.toLowerCase(), isActive: true, publishedAt: { not: null } },
    });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    return res.json({ success: true, post });
  } catch (e) {
    console.error('Directory blog post error:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch post' });
  }
});

// ----- Sitemap URLs (for frontend sitemap) -----
router.get('/sitemap-urls', async (req, res) => {
  try {
    let base = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_BASE_URL;
    if (!base && req.get('x-forwarded-proto') && (req.get('x-forwarded-host') || req.get('host'))) {
      base = `${req.get('x-forwarded-proto')}://${req.get('x-forwarded-host') || req.get('host')}`;
    }
    base = base || 'http://localhost:3000';
    const prefix = base; // Root-level: /state, /state/city, etc. (no /in)
    const states = await prisma.directoryState.findMany({
      where: { isActive: true },
      include: { cities: { where: { isActive: true } } },
    });
    const categories = await prisma.directoryCategory.findMany({
      where: { isActive: true },
      select: { slug: true },
    });
    const urls = [];
    for (const state of states) {
      urls.push({ url: `${prefix}/${state.slug}`, lastmod: state.updatedAt, priority: '0.9', changefreq: 'weekly' });
      for (const city of state.cities) {
        urls.push({
          url: `${prefix}/${state.slug}/${city.slug}`,
          lastmod: city.updatedAt,
          priority: '0.8',
          changefreq: 'weekly',
        });
        for (const cat of categories) {
          urls.push({
            url: `${prefix}/${state.slug}/${city.slug}/${cat.slug}`,
            lastmod: new Date(),
            priority: '0.7',
            changefreq: 'daily',
          });
        }
      }
    }
    const businesses = await prisma.directoryBusiness.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true, state: { select: { slug: true } }, city: { select: { slug: true } }, category: { select: { slug: true } } },
      take: 5000,
    });
    for (const b of businesses) {
      urls.push({
        url: `${prefix}/${b.state.slug}/${b.city.slug}/${b.category.slug}/${b.slug}`,
        lastmod: b.updatedAt,
        priority: '0.6',
        changefreq: 'weekly',
      });
    }
    const blogPosts = await prisma.directoryBlogPost.findMany({
      where: { isActive: true, publishedAt: { not: null } },
      select: { slug: true, updatedAt: true },
      take: 500,
    });
    for (const p of blogPosts) {
      urls.push({ url: `${base}/blog/${p.slug}`, lastmod: p.updatedAt, priority: '0.5', changefreq: 'monthly' });
    }
    return res.json({ success: true, urls });
  } catch (e) {
    console.error('Directory sitemap-urls error:', e);
    return res.status(500).json({ success: false, message: 'Failed to generate sitemap URLs' });
  }
});

// ----- Slug redirect (301 when slug is updated) -----
router.get('/redirect', async (req, res) => {
  try {
    let path = (req.query.path || req.query.fromPath || '').toString().trim();
    if (!path) return res.status(400).json({ success: false, message: 'path required' });
    if (!path.startsWith('/')) path = '/' + path;
    const normalized = path.replace(/\/+/g, '/').toLowerCase();
    const redirect = await prisma.directorySlugRedirect.findUnique({
      where: { fromPath: normalized },
    });
    if (!redirect) return res.status(404).json({ success: false, message: 'No redirect' });
    return res.json({ success: true, toPath: redirect.toPath });
  } catch (e) {
    console.error('Directory redirect error:', e);
    return res.status(500).json({ success: false, message: 'Failed to check redirect' });
  }
});

// Create redirect (call when business slug is updated; fromPath = old URL path, toPath = new URL path)
router.post('/redirects', async (req, res) => {
  try {
    const { fromPath, toPath } = req.body || {};
    const from = (fromPath || '').toString().trim().replace(/\/+/g, '/').toLowerCase();
    const to = (toPath || '').toString().trim().replace(/\/+/g, '/').toLowerCase();
    if (!from || !to || from === to) return res.status(400).json({ success: false, message: 'fromPath and toPath required and must differ' });
    const created = await prisma.directorySlugRedirect.upsert({
      where: { fromPath: from },
      update: { toPath: to },
      create: { fromPath: from, toPath: to },
    });
    return res.json({ success: true, redirect: created });
  } catch (e) {
    console.error('Directory create redirect error:', e);
    return res.status(500).json({ success: false, message: 'Failed to create redirect' });
  }
});

// ----- Lead tracking (call / WhatsApp / contact - optional server-side log) -----
router.post('/lead', async (req, res) => {
  const { type, businessId, metadata } = req.body || {};
  if (!type || !businessId) {
    return res.status(400).json({ success: false, message: 'type and businessId required' });
  }
  // In production: persist to DB or analytics (e.g. Lead model, or send to GA/GSC)
  console.log('[Directory Lead]', { type, businessId, metadata: metadata || {} });
  return res.json({ success: true, message: 'Recorded' });
});

module.exports = router;
