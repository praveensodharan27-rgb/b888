const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Match level constants for location targeting
 * Higher number = more specific match
 */
const MATCH_CITY = 4;
const MATCH_DISTRICT = 3;
const MATCH_STATE = 2;
const MATCH_COUNTRY = 1;
const MATCH_GLOBAL = 0;

/**
 * Check if user location matches a target location
 * Returns match level: 4=city, 3=district, 2=state, 1=country, 0=no match
 */
function getMatchLevel(userLoc, target) {
  const u = userLoc || {};
  const t = target || {};
  const uc = (s) => (s || '').toString().trim().toLowerCase();
  const tc = (s) => (s || '').toString().trim().toLowerCase();

  if (!u.country && !u.state && !u.district && !u.city) return -1;

  const matchCountry = !tc(t.country) || uc(u.country) === tc(t.country);
  const matchState = !tc(t.state) || uc(u.state) === tc(t.state);
  const matchDistrict = !tc(t.district) || uc(u.district) === tc(t.district);
  const matchCity = !tc(t.city) || uc(u.city) === tc(t.city);

  if (tc(t.city) && matchCountry && matchState && matchDistrict && matchCity) return MATCH_CITY;
  if (tc(t.district) && matchCountry && matchState && matchDistrict) return MATCH_DISTRICT;
  if (tc(t.state) && matchCountry && matchState) return MATCH_STATE;
  if (tc(t.country) && matchCountry) return MATCH_COUNTRY;
  return -1;
}

/**
 * GET /api/free-posting-promos
 * Fetch active, date-valid promo cards. Filter by user location.
 * Query: country, state, district, city (user's location)
 * Returns best matching card by: City > District > State > Country > Global
 * If multiple at same level, highest priority wins.
 */
router.get('/', async (req, res) => {
  try {
    const { country, state, district, city } = req.query;
    const userLoc = {
      country: country || null,
      state: state || null,
      district: district || null,
      city: city || null,
    };

    const now = new Date();
    const where = {
      isActive: true,
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
        { OR: [{ endDate: null }, { endDate: { gte: now } }] },
      ],
    };

    const promos = await prisma.freePostingPromo.findMany({
      where,
      orderBy: [{ priority: 'desc' }],
    });

    let best = null;
    let bestLevel = -1;

    for (const promo of promos) {
      if (promo.showForAllLocations) {
        if (bestLevel < MATCH_GLOBAL) {
          best = promo;
          bestLevel = MATCH_GLOBAL;
        } else if (bestLevel === MATCH_GLOBAL && promo.priority > (best?.priority ?? 0)) {
          best = promo;
        }
        continue;
      }

      const targets = Array.isArray(promo.targetLocations)
        ? promo.targetLocations
        : promo.targetLocations
          ? [promo.targetLocations]
          : [];

      for (const t of targets) {
        const level = getMatchLevel(userLoc, t);
        if (level > bestLevel || (level === bestLevel && level >= 0 && promo.priority > (best?.priority ?? 0))) {
          best = promo;
          bestLevel = level;
        }
      }
    }

    if (!best) {
      return res.json({ success: true, card: null });
    }

    res.json({
      success: true,
      card: {
        id: best.id,
        image: best.image,
        title: best.title,
        description: best.description,
        ctaText: best.ctaText,
        ctaLink: best.ctaLink,
      },
    });
  } catch (error) {
    console.error('Get free-posting-promos error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch promo card' });
  }
});

module.exports = router;
