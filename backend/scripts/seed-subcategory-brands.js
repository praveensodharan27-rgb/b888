/**
 * Seed SubcategoryBrands collection from backend/data/brands-models.json
 * Run from repo root: node backend/scripts/seed-subcategory-brands.js
 * Or from backend: node scripts/seed-subcategory-brands.js
 */
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const jsonPath = path.join(__dirname, '../data/brands-models.json');
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(raw);

  if (!data.categories || !Array.isArray(data.categories)) {
    console.error('Invalid brands-models.json: missing categories array');
    process.exit(1);
  }

  let upserted = 0;
  for (const category of data.categories) {
    const categorySlug = category.slug || category.id;
    if (!categorySlug) continue;
    const subcategories = category.subcategories || [];
    for (const sub of subcategories) {
      const subcategorySlug = sub.slug || sub.id;
      const brands = sub.brands;
      if (!subcategorySlug || !Array.isArray(brands) || brands.length === 0) continue;

      const brandsJson = brands.map((b) => ({
        name: typeof b === 'object' && b.name ? b.name : String(b),
        models: Array.isArray(b.models) ? b.models : [],
      }));

      await prisma.subcategoryBrands.upsert({
        where: {
          categorySlug_subcategorySlug: {
            categorySlug,
            subcategorySlug,
          },
        },
        create: {
          categorySlug,
          subcategorySlug,
          brands: brandsJson,
        },
        update: {
          brands: brandsJson,
          updatedAt: new Date(),
        },
      });
      upserted++;
      console.log(`  ${categorySlug} / ${subcategorySlug}: ${brandsJson.length} brands`);
    }
  }

  console.log(`\nDone. Upserted ${upserted} subcategory brand lists.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
