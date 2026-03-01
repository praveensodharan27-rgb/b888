/**
 * My Business API – one business per user (scalable for multiple later).
 * Base path: /api/business
 *
 * POST   /api/business           – create business (auth)
 * GET   /api/business/my        – get logged-in user's business (auth)
 * PUT   /api/business/:id       – update business (auth, owner only)
 * GET   /api/business/public/:slug – get business by slug (public)
 */
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { slugify, slugifyUnique } = require('../utils/slug');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { uploadBusinessImage } = require('../middleware/upload');

const router = express.Router();
const prisma = new PrismaClient();

// ----- Validation helpers -----
function required(value, name) {
  const v = value != null ? String(value).trim() : '';
  return v || null;
}

// ----- GET /api/business/my – logged-in user's business (one for now) -----
router.get('/my', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const business = await prisma.business.findUnique({
      where: { userId },
    });
    return res.json({ success: true, data: business });
  } catch (e) {
    console.error('Business my error:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch business' });
  }
});

// ----- POST /api/business/upload – upload one image (logo, cover, or gallery); returns { url } -----
router.post('/upload', authenticate, uploadBusinessImage, (req, res) => {
  if (!req.uploadedBusinessImage) {
    return res.status(400).json({ success: false, message: 'No image uploaded' });
  }
  return res.json({ success: true, url: req.uploadedBusinessImage });
});

// ----- POST /api/business – create business (one per user) -----
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const body = req.body || {};

    const businessName = required(body.business_name || body.businessName);
    const category = required(body.category);
    const phone = required(body.phone);
    const city = required(body.city);

    if (!businessName) return res.status(400).json({ success: false, message: 'Business name is required' });
    if (!category) return res.status(400).json({ success: false, message: 'Category is required' });
    if (!phone) return res.status(400).json({ success: false, message: 'Phone is required' });
    if (!city) return res.status(400).json({ success: false, message: 'City is required' });

    const existing = await prisma.business.findUnique({ where: { userId } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You already have a business. Edit it from My Business.' });
    }

    const existingSlugs = await prisma.business.findMany({ select: { slug: true } }).then((rows) => rows.map((r) => r.slug));
    const slug = slugifyUnique(businessName, existingSlugs, '', 70);

    const description = required(body.description) || null;
    const whatsapp = required(body.whatsapp) || null;
    const email = required(body.email) || null;
    const website = required(body.website) || null;
    const address = required(body.address) || null;
    const state = required(body.state) || null;
    const pincode = required(body.pincode) || null;
    const logo = required(body.logo) || null;
    const coverImage = required(body.cover_image || body.coverImage) || null;
    const gallery = Array.isArray(body.gallery) ? body.gallery.filter((u) => typeof u === 'string').slice(0, 20) : [];
    const services = body.services != null && Array.isArray(body.services) ? body.services : null;
    const workingHours = body.working_hours != null && typeof body.working_hours === 'object' ? body.working_hours : null;
    const socialLinks = body.social_links != null && typeof body.social_links === 'object' ? body.social_links : null;
    let mapLocation = null;
    if (body.map_location && typeof body.map_location === 'object' && (body.map_location.lat != null || body.map_location.lng != null)) {
      mapLocation = { lat: Number(body.map_location.lat) || 0, lng: Number(body.map_location.lng) || 0 };
    }

    const business = await prisma.business.create({
      data: {
        userId,
        businessName,
        slug,
        category,
        description,
        phone,
        whatsapp,
        email,
        website,
        address,
        state,
        city,
        pincode,
        mapLocation,
        logo,
        coverImage,
        gallery,
        services,
        workingHours,
        socialLinks,
        isActive: true,
        isVerified: false,
      },
    });

    return res.status(201).json({ success: true, data: business });
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'A business with this name/slug already exists.' });
    }
    console.error('Business create error:', e);
    return res.status(500).json({ success: false, message: 'Failed to create business' });
  }
});

// ----- GET /api/business/public/:slug – public page by slug (must be before /:id) -----
router.get('/public/:slug', optionalAuthenticate, async (req, res) => {
  try {
    const slug = (req.params.slug || '').toLowerCase().trim();
    if (!slug) return res.status(400).json({ success: false, message: 'Slug is required' });

    const business = await prisma.business.findFirst({
      where: { slug, isActive: true },
    });

    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const isOwner = !!req.user && String(business.userId) === String(req.user.id);
    const payload = { ...business };
    if (isOwner) payload.isOwner = true;

    return res.json({ success: true, data: payload });
  } catch (e) {
    console.error('Business public by slug error:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch business' });
  }
});

// ----- GET /api/business/:id – get own business by id (owner only, for edit form) -----
router.get('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const id = req.params.id;
    const business = await prisma.business.findFirst({ where: { id, userId } });
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }
    return res.json({ success: true, data: business });
  } catch (e) {
    console.error('Business get by id error:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch business' });
  }
});

// ----- PUT /api/business/:id – update business (owner only) -----
router.put('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const id = req.params.id;
    const body = req.body || {};

    const business = await prisma.business.findFirst({ where: { id, userId } });
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const updates = {};
    if (body.business_name !== undefined) updates.businessName = String(body.business_name || body.businessName).trim() || business.businessName;
    if (body.category !== undefined) updates.category = String(body.category).trim() || business.category;
    if (body.description !== undefined) updates.description = required(body.description);
    if (body.phone !== undefined) updates.phone = String(body.phone).trim() || business.phone;
    if (body.whatsapp !== undefined) updates.whatsapp = required(body.whatsapp);
    if (body.email !== undefined) updates.email = required(body.email);
    if (body.website !== undefined) updates.website = required(body.website);
    if (body.address !== undefined) updates.address = required(body.address);
    if (body.state !== undefined) updates.state = required(body.state);
    if (body.city !== undefined) updates.city = String(body.city).trim() || business.city;
    if (body.pincode !== undefined) updates.pincode = required(body.pincode);
    if (body.logo !== undefined) updates.logo = required(body.logo);
    if (body.cover_image !== undefined) updates.coverImage = required(body.cover_image);
    if (body.coverImage !== undefined) updates.coverImage = required(body.coverImage);
    if (body.gallery !== undefined) updates.gallery = Array.isArray(body.gallery) ? body.gallery.filter((u) => typeof u === 'string').slice(0, 20) : business.gallery;
    if (body.services !== undefined) updates.services = Array.isArray(body.services) ? body.services : body.services;
    if (body.working_hours !== undefined) updates.workingHours = typeof body.working_hours === 'object' ? body.working_hours : body.working_hours;
    if (body.social_links !== undefined) updates.socialLinks = typeof body.social_links === 'object' ? body.social_links : body.social_links;
    if (body.is_active !== undefined) updates.isActive = Boolean(body.is_active);
    if (body.map_location !== undefined) {
      updates.mapLocation =
        body.map_location && typeof body.map_location === 'object'
          ? { lat: Number(body.map_location.lat) || 0, lng: Number(body.map_location.lng) || 0 }
          : null;
    }

    // If business name changed, regenerate slug (keep unique)
    if (updates.businessName && updates.businessName !== business.businessName) {
      const existingSlugs = await prisma.business.findMany({ where: { id: { not: id } }, select: { slug: true } }).then((rows) => rows.map((r) => r.slug));
      updates.slug = slugifyUnique(updates.businessName, existingSlugs, '', 70);
    }

    const updated = await prisma.business.update({
      where: { id },
      data: updates,
    });

    return res.json({ success: true, data: updated });
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Slug already in use.' });
    }
    console.error('Business update error:', e);
    return res.status(500).json({ success: false, message: 'Failed to update business' });
  }
});

module.exports = router;
