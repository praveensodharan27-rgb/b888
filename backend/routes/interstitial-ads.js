const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Get active interstitial ads by position
router.get('/', async (req, res) => {
  try {
    const { position } = req.query;
    const where = {
      isActive: true,
      OR: [
        { startDate: null },
        { startDate: { lte: new Date() } }
      ],
      AND: [
        {
          OR: [
            { endDate: null },
            { endDate: { gte: new Date() } }
          ]
        }
      ]
    };

    if (position) where.position = position;

    const ads = await prisma.interstitialAd.findMany({
      where,
      orderBy: { order: 'asc' }
    });

    res.json({ success: true, ads });
  } catch (error) {
    console.error('Get interstitial ads error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch interstitial ads' });
  }
});

// Track interstitial ad view
router.post('/:id/view', async (req, res) => {
  try {
    await prisma.interstitialAd.update({
      where: { id: req.params.id },
      data: { views: { increment: 1 } }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Track interstitial ad view error:', error);
    res.status(500).json({ success: false, message: 'Failed to track view' });
  }
});

// Track interstitial ad click
router.post('/:id/click', async (req, res) => {
  try {
    await prisma.interstitialAd.update({
      where: { id: req.params.id },
      data: { clicks: { increment: 1 } }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Track interstitial ad click error:', error);
    res.status(500).json({ success: false, message: 'Failed to track click' });
  }
});

module.exports = router;

