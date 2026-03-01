/**
 * Backfill script: set slug, stateSlug, citySlug, categorySlug on all existing ads
 * for SEO path /{stateSlug}/{citySlug}/{categorySlug}/{slug} and fast indexed lookup.
 *
 * Run: node scripts/backfill-ad-slugs.js
 * Options: --dry-run (no writes), --batch=100 (default 100), --status=APPROVED,PENDING (default all)
 */

const { PrismaClient } = require('@prisma/client');
const { slugify } = require('../utils/slug');

const prisma = new PrismaClient();

const batchArg = process.argv.find((a) => a.startsWith('--batch='));
const BATCH_SIZE = batchArg
  ? parseInt(batchArg.split('=')[1], 10) || 100
  : parseInt(process.env.BATCH_SIZE || '100', 10);
const DRY_RUN = process.argv.includes('--dry-run');
const STATUS_FILTER = (() => {
  const i = process.argv.findIndex((a) => a.startsWith('--status='));
  if (i === -1) return null;
  return process.argv[i].split('=')[1].split(',').map((s) => s.trim()).filter(Boolean);
})();

function getAdSlug(title, existingInPath, maxLength = 70) {
  const base = slugify(title || 'ad', maxLength - 12);
  if (!base) return 'ad';
  let candidate = base;
  let n = 0;
  while (existingInPath.has(candidate)) {
    n += 1;
    candidate = `${base.slice(0, maxLength - 4)}-${n}`;
  }
  return candidate;
}

async function run() {
  console.log('Backfill ad slugs');
  console.log('Options:', { DRY_RUN, BATCH_SIZE, STATUS_FILTER: STATUS_FILTER || 'all statuses' });
  if (DRY_RUN) console.log('(DRY RUN – no updates will be written)\n');

  const where = STATUS_FILTER?.length ? { status: { in: STATUS_FILTER } } : {};
  const total = await prisma.ad.count({ where });
  console.log(`Total ads to process: ${total}\n`);

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // Process in cursor-based batches to avoid loading all into memory
  const cursorId = { current: null };
  const pathSlugs = new Map(); // key: "stateSlug|citySlug|categorySlug" -> Set of slugs used

  while (true) {
    const batch = await prisma.ad.findMany({
      where: cursorId.current ? { ...where, id: { gt: cursorId.current } } : where,
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      include: {
        category: { select: { id: true, slug: true } },
      },
    });
    if (batch.length === 0) break;

    for (const ad of batch) {
      processed += 1;
      try {
        const stateSlug = slugify(ad.state || '', 70);
        const citySlug = slugify(ad.city || '', 70);
        const categorySlug = (ad.category?.slug || '').toLowerCase().trim() || null;

        const pathKey = `${stateSlug || '-'}|${citySlug || '-'}|${categorySlug || '-'}`;
        if (!pathSlugs.has(pathKey)) pathSlugs.set(pathKey, new Set());

        const existingInPath = pathSlugs.get(pathKey);
        const slug = getAdSlug(ad.title, existingInPath);
        existingInPath.add(slug);

        const alreadySet =
          ad.slug != null && ad.slug.trim() !== '' &&
          ad.stateSlug != null && ad.citySlug != null && ad.categorySlug != null;

        if (alreadySet && !DRY_RUN) {
          skipped += 1;
          cursorId.current = ad.id;
          continue;
        }

        const updates = {
          slug: slug || null,
          stateSlug: stateSlug || null,
          citySlug: citySlug || null,
          categorySlug: categorySlug || null,
        };

        if (!DRY_RUN) {
          await prisma.ad.update({
            where: { id: ad.id },
            data: updates,
          });
          updated += 1;
        } else {
          updated += 1;
        }
        cursorId.current = ad.id;
      } catch (e) {
        errors += 1;
        console.error(`Ad ${ad.id} (${ad.title?.slice(0, 30)}):`, e.message);
        cursorId.current = ad.id;
      }
    }

    if (processed % 500 === 0 || batch.length < BATCH_SIZE) {
      console.log(`Processed ${processed}/${total} (updated: ${updated}, skipped: ${skipped}, errors: ${errors})`);
    }
  }

  console.log('\nDone.');
  console.log({ processed, updated, skipped, errors });
  if (DRY_RUN) console.log('Run without --dry-run to apply updates.');
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
