const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { cacheMiddleware } = require('../middleware/cache');

const router = express.Router();
const prisma = new PrismaClient();

// Get all locations
router.get('/',
  cacheMiddleware(5 * 60 * 1000), // Cache for 5 minutes (locations don't change often)
  async (req, res) => {
  try {
    const { state, city } = req.query;
    const where = { isActive: true };

    if (state) where.state = state;
    if (city) where.city = city;

    const locations = await prisma.location.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        state: true,
        city: true,
        neighbourhood: true,
        pincode: true,
        isActive: true
        // Removed _count - it's slow and not always needed
      },
      orderBy: { name: 'asc' }
    });

    // Set cache headers
    res.set({
      'Cache-Control': 'public, max-age=300, s-maxage=600', // Cache for 5 minutes, CDN for 10 minutes
      'Vary': 'Accept-Encoding'
    });
    res.json({ success: true, locations });
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch locations' });
  }
});

// Get single location
router.get('/:slug', async (req, res) => {
  try {
    const location = await prisma.location.findUnique({
      where: { slug: req.params.slug },
      select: {
        id: true,
        name: true,
        slug: true,
        state: true,
        city: true,
        neighbourhood: true,
        pincode: true,
        isActive: true
        // Removed _count - it's slow and not always needed
      }
    });

    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    res.json({ success: true, location });
  } catch (error) {
    console.error('Get location error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch location' });
  }
});

module.exports = router;

