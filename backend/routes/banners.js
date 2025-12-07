const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Get active banners by position
router.get('/', async (req, res) => {
  try {
    const { position, categoryId, locationId } = req.query;
    const where = {
      isActive: true,
      OR: [
        { startDate: null },
        { startDate: { lte: new Date() } }
      ],
      OR: [
        { endDate: null },
        { endDate: { gte: new Date() } }
      ]
    };

    if (position) where.position = position;
    if (categoryId) where.categoryId = categoryId;
    if (locationId) where.locationId = locationId;

    const banners = await prisma.banner.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        location: { select: { id: true, name: true, slug: true } }
      },
      orderBy: { order: 'asc' }
    });

    res.json({ success: true, banners });
  } catch (error) {
    console.error('Get banners error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch banners' });
  }
});

// Track banner click
router.post('/:id/click', async (req, res) => {
  try {
    await prisma.banner.update({
      where: { id: req.params.id },
      data: { clicks: { increment: 1 } }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Track banner click error:', error);
    res.status(500).json({ success: false, message: 'Failed to track click' });
  }
});

module.exports = router;

