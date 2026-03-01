/**
 * Force clear cache by restarting with fresh queries
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function forceClearCache() {
  try {
    console.log('🧹 Force clearing cache by invalidating data...\n');
    
    // Update a dummy field to invalidate cache
    const result = await prisma.ad.updateMany({
      where: { status: 'APPROVED' },
      data: { updatedAt: new Date() }
    });
    
    console.log(`✅ Updated ${result.count} ads to invalidate cache\n`);
    console.log('🎉 Cache invalidated! Next requests will use fresh data with indexes.');
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

forceClearCache();
