#!/usr/bin/env node
/**
 * Seed Category + Subcategory + Fields + Brands + Models to MongoDB
 *
 * Reads from data/spec-config.json and saves to subcategory_spec_configs collection.
 * Uses MongoDB driver directly (no Prisma schema change needed).
 *
 * Run: node scripts/seed-spec-config-to-db.js
 * Or:  npm run seed-spec-config-to-db
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

const COLLECTION = 'subcategory_spec_configs';

function loadSpecConfig() {
  const p = path.join(__dirname, '../data/spec-config.json');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function normalizeSubConfig(subConfig) {
  const fields = Array.isArray(subConfig) ? subConfig : (subConfig.fields || []);
  const brandsModels = (typeof subConfig === 'object' && !Array.isArray(subConfig) && subConfig.brands)
    ? subConfig.brands
    : null;
  const types = (typeof subConfig === 'object' && !Array.isArray(subConfig) && Array.isArray(subConfig.types))
    ? subConfig.types
    : null;
  const compatibility = (typeof subConfig === 'object' && !Array.isArray(subConfig) && subConfig.compatibility && typeof subConfig.compatibility === 'object')
    ? subConfig.compatibility
    : null;
  return { fields, brandsModels, types, compatibility };
}

async function seedSpecConfigToDb() {
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    console.error('❌ DATABASE_URL not set in .env');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const specConfig = loadSpecConfig();

    // Get subcategories from DB (category slug + subcategory slug -> subcategoryId)
    const categories = await db.collection('categories').find({ isActive: true }).toArray();
    const subcategories = await db.collection('subcategories').find({ isActive: true }).toArray();

    const catBySlug = Object.fromEntries(categories.map(c => [c.slug, c]));
    const subByCatSlug = {};
    const catById = Object.fromEntries(categories.map(c => [c._id.toString(), c]));
    for (const sub of subcategories) {
      const catId = sub.categoryId?.toString?.() || sub.categoryId;
      const cat = catById[catId];
      if (!cat) continue;
      const key = `${cat.slug}::${sub.slug}`;
      subByCatSlug[key] = sub;
    }

    // Delete all old/wrong data so DB only has what's in spec-config.json
    const coll = db.collection(COLLECTION);
    const deleteResult = await coll.deleteMany({});
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} old record(s) from ${COLLECTION}`);

    let inserted = 0;
    let updated = 0;

    for (const catConfig of specConfig) {
      const catSlug = catConfig.category;
      if (!catConfig.subcategories) continue;

      for (const [subSlug, subConfig] of Object.entries(catConfig.subcategories)) {
        const key = `${catSlug}::${subSlug}`;
        const sub = subByCatSlug[key];
        if (!sub) {
          console.warn(`  ⚠️ Subcategory not found: ${catSlug}/${subSlug}`);
          continue;
        }

        const { fields, brandsModels, types, compatibility } = normalizeSubConfig(subConfig);
        const doc = {
          subcategoryId: sub._id,
          fields,
          brandsModels: brandsModels || null,
          types: types || null,
          compatibility: compatibility || null,
          updatedAt: new Date(),
        };

        const result = await coll.updateOne(
          { subcategoryId: sub._id },
          { $set: doc },
          { upsert: true }
        );

        if (result.upsertedCount) inserted++;
        else if (result.modifiedCount) updated++;
      }
    }

    console.log(`\n✅ Spec config saved to DB: ${inserted} inserted, ${updated} updated`);
    console.log(`   Collection: ${COLLECTION}\n`);
  } catch (err) {
    console.error('❌ Error:', err.message);
    throw err;
  } finally {
    await client.close();
  }
}

seedSpecConfigToDb()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
