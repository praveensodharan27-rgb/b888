/**
 * Update Product Specifications (attributes) for ALL ads in the database
 * - Ensures attributes field exists (defaults to {} if null)
 * - Syncs top-level condition into attributes.condition when attributes is empty
 * Run: node backend/scripts/update-all-product-specifications.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n📦 Updating Product Specifications for all ads...\n');

  const ads = await prisma.ad.findMany({
    select: { id: true, title: true, attributes: true, condition: true },
  });

  console.log(`Found ${ads.length} ads\n`);

  let updated = 0;
  let skipped = 0;

  for (const ad of ads) {
    let newAttributes = ad.attributes;

    // Ensure attributes is an object (not null/undefined)
    if (newAttributes == null || typeof newAttributes !== 'object') {
      newAttributes = {};
    } else {
      newAttributes = { ...newAttributes };
    }

    // Sync top-level condition into attributes when attributes is empty
    if (Object.keys(newAttributes).length === 0 && ad.condition) {
      newAttributes.condition = ad.condition;
    }

    // Only update if something changed
    const needsUpdate =
      ad.attributes == null ||
      typeof ad.attributes !== 'object' ||
      JSON.stringify(ad.attributes) !== JSON.stringify(newAttributes);

    if (needsUpdate) {
      await prisma.ad.update({
        where: { id: ad.id },
        data: { attributes: newAttributes },
      });
      updated++;
      console.log(`  ✅ Updated: ${ad.title?.substring(0, 40)}...`);
    } else {
      skipped++;
    }
  }

  console.log(`\n✅ Done: ${updated} ads updated, ${skipped} skipped (no change needed)\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
