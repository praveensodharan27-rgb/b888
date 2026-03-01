require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { reindexAllAds } = require('../services/meilisearch');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔄 Starting Meilisearch reindex...');
    const count = await reindexAllAds(prisma);
    console.log(`✅ Reindex complete! Indexed ${count} ads.`);
  } catch (error) {
    console.error('❌ Reindex failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

