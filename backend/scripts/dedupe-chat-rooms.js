/**
 * Remove duplicate chat_rooms (same user1Id, user2Id, adId) so the unique
 * index chat_rooms_user1Id_user2Id_adId_key can be created by db push.
 * Keeps one room per (user1Id, user2Id, adId) and moves messages from
 * duplicate rooms into the kept room, then deletes duplicates.
 *
 * Run from backend: node scripts/dedupe-chat-rooms.js [--dry-run]
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');

async function run() {
  console.log(DRY_RUN ? 'Dedupe chat rooms (DRY RUN)\n' : 'Dedupe chat rooms\n');

  const rooms = await prisma.chatRoom.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { messages: true } } },
  });

  const byKey = new Map();
  for (const r of rooms) {
    const key = `${r.user1Id}|${r.user2Id}|${r.adId}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(r);
  }

  const duplicateGroups = [...byKey.values()].filter((arr) => arr.length > 1);
  if (duplicateGroups.length === 0) {
    console.log('No duplicate chat rooms found. Safe to run db push.');
    return;
  }

  console.log(`Found ${duplicateGroups.length} (user1, user2, ad) pairs with duplicate rooms.\n`);

  let roomsRemoved = 0;
  let messagesReassigned = 0;

  for (const group of duplicateGroups) {
    // Keep the room with the most messages (or first by createdAt)
    const keep = group.slice(1).reduce((best, r) =>
      r._count.messages >= best._count.messages ? r : best
    , group[0]);
    const duplicates = group.filter((r) => r.id !== keep.id);

    for (const dup of duplicates) {
      const count = dup._count?.messages ?? 0;
      if (!DRY_RUN && count > 0) {
        await prisma.chatMessage.updateMany({
          where: { roomId: dup.id },
          data: { roomId: keep.id },
        });
        messagesReassigned += count;
      } else if (DRY_RUN && count > 0) {
        messagesReassigned += count;
      }

      if (!DRY_RUN) {
        await prisma.chatRoom.delete({ where: { id: dup.id } });
        roomsRemoved += 1;
      } else {
        roomsRemoved += 1;
      }
    }
  }

  console.log(`Rooms that would be removed: ${roomsRemoved}`);
  console.log(`Messages that would be reassigned: ${messagesReassigned}`);
  if (DRY_RUN) {
    console.log('\nRun without --dry-run to apply, then run: npx prisma db push --schema=prisma/schema.mongodb.prisma');
  } else {
    console.log('\nDone. Run: npx prisma db push --schema=prisma/schema.mongodb.prisma');
  }
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
