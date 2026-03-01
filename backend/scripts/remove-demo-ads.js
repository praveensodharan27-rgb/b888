/**
 * Remove demo ads from the database.
 * Deletes ads matching the same title patterns used by generate-realistic-demo-ads / approve-demo-ads.
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

const DEMO_TITLE_PATTERNS = [
  'iPhone 15',
  'Samsung Galaxy S24',
  'OnePlus 12',
  'Xiaomi 14',
  'Vivo X100',
  'Realme GT',
  'Honda City',
  'Yamaha MT-15',
  'Maruti Swift',
  'Royal Enfield',
  'Hyundai Creta',
  'BHK',
  'MacBook Pro',
  'Samsung 55"',
  'Sony WH-1000XM5',
  'Canon EOS',
  'iPad Pro',
  'PlayStation 5',
];

async function removeDemoAds() {
  try {
    console.log('\n🗑️  Removing demo ads...\n');

    const orConditions = DEMO_TITLE_PATTERNS.map((pattern) => ({
      title: { contains: pattern },
    }));

    const demoAds = await prisma.ad.findMany({
      where: { OR: orConditions },
      select: { id: true, title: true, status: true },
      orderBy: { createdAt: 'desc' },
    });

    if (demoAds.length === 0) {
      console.log('No demo ads found. Nothing to remove.');
      return;
    }

    console.log(`Found ${demoAds.length} demo ad(s) to remove:\n`);
    demoAds.forEach((ad, i) => {
      console.log(`  ${i + 1}. [${ad.status}] ${ad.title}`);
    });

    const ids = demoAds.map((a) => a.id);

    // Delete related records first (Prisma relation constraints)
    const delFav = await prisma.favorite.deleteMany({ where: { adId: { in: ids } } });
    console.log(`  - Favorites: ${delFav.count}`);

    const rooms = await prisma.chatRoom.findMany({ where: { adId: { in: ids } }, select: { id: true } });
    const roomIds = rooms.map((r) => r.id);
    if (roomIds.length > 0) {
      const delMsg = await prisma.chatMessage.deleteMany({ where: { roomId: { in: roomIds } } });
      console.log(`  - Chat messages: ${delMsg.count}`);
    }
    const delRooms = await prisma.chatRoom.deleteMany({ where: { adId: { in: ids } } });
    console.log(`  - Chat rooms: ${delRooms.count}`);

    if (prisma.adRankLog) {
      const delRank = await prisma.adRankLog.deleteMany({ where: { adId: { in: ids } } });
      console.log(`  - Ad rank logs: ${delRank.count}`);
    }

    await prisma.contactRequest.updateMany({ where: { adId: { in: ids } }, data: { adId: null } });
    console.log(`  - Contact requests: unlinked`);

    const delPremium = await prisma.premiumOrder.deleteMany({ where: { adId: { in: ids } } });
    console.log(`  - Premium orders: ${delPremium.count}`);

    await prisma.adPostingOrder.updateMany({ where: { adId: { in: ids } }, data: { adId: null } });
    console.log(`  - Ad posting orders: unlinked`);

    const result = await prisma.ad.deleteMany({
      where: { id: { in: ids } },
    });

    console.log(`\n✅ Removed ${result.count} demo ad(s).`);
  } catch (error) {
    console.error('❌ Error removing demo ads:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

removeDemoAds()
  .then(() => {
    console.log('\nDone.');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
