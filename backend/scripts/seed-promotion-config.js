/**
 * Seed promotion_credit_config into PremiumSettings.
 * Run: node scripts/seed-promotion-config.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CONFIG_KEY = 'promotion_credit_config';

const DEFAULT_CONFIG = {
  creditsPerPromotion: {
    TOP: 1000,
    FEATURED: 2121,
    BUMP_UP: 50
  },
  promotionDurationDays: {
    TOP: 7,
    FEATURED: 7,
    BUMP_UP: 1
  },
  subscriptionPlans: {
    MAX_VISIBILITY: { name: 'Business Basic', price: 299, priority: 1 },
    SELLER_PLUS: { name: 'Business Pro', price: 399, priority: 2 },
    SELLER_PRIME: { name: 'Business Enterprise', price: 499, priority: 3 }
  },
  promotionsEnabled: {
    TOP: true,
    FEATURED: true,
    BUMP_UP: true
  }
};

async function main() {
  const value = JSON.stringify(DEFAULT_CONFIG, null, 2);
  await prisma.premiumSettings.upsert({
    where: { key: CONFIG_KEY },
    create: { key: CONFIG_KEY, value },
    update: { value }
  });
  console.log('✅ promotion_credit_config seeded to PremiumSettings');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
