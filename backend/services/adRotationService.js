/**
 * Ad Rotation Service
 * Every 2.5 hours, update lastShownAt for a batch of ads (round-robin within each plan)
 * so that within the same plan tier ads rotate fairly and no single ad stays on top.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getRankConfig } = require('./adRankConfigService');
const { clearAdsCache } = require('../utils/redis-helpers');

const PLAN_ORDER = ['SELLER_PRIME', 'SELLER_PLUS', 'MAX_VISIBILITY', 'NORMAL'];
const BATCH_SIZE_PER_PLAN = 50;

/**
 * Run one rotation cycle: for each plan tier, pick up to BATCH_SIZE_PER_PLAN ads
 * that have the oldest (or null) lastShownAt and set lastShownAt = now.
 */
async function runRotationCycle() {
  const config = await getRankConfig();
  if (config.disableRotation) {
    return { rotated: 0, message: 'Rotation disabled by config' };
  }

  const now = new Date();
  let totalRotated = 0;

  for (const packageType of PLAN_ORDER) {
    const ads = await prisma.ad.findMany({
      where: {
        status: 'APPROVED',
        packageType,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ]
      },
      orderBy: [
        { lastShownAt: 'asc' },
        { createdAt: 'asc' }
      ],
      take: BATCH_SIZE_PER_PLAN,
      select: { id: true }
    });

    if (ads.length === 0) continue;

    const ids = ads.map(a => a.id);
    const { count } = await prisma.ad.updateMany({
      where: { id: { in: ids } },
      data: { lastShownAt: now }
    });
    totalRotated += count;
  }

  await clearAdsCache();
  return { rotated: totalRotated, at: now.toISOString() };
}

module.exports = { runRotationCycle };
