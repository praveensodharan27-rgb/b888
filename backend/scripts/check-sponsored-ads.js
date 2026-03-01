/**
 * Diagnostic script: Check sponsored ads in MongoDB and test the query logic
 * Run: node backend/scripts/check-sponsored-ads.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

const COLLECTION = 'sponsored_ads';

async function main() {
  const uri = process.env.DATABASE_URL || process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ DATABASE_URL or MONGO_URI not set in .env');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const coll = db.collection(COLLECTION);

    // 1. Check if collection exists and count
    const collections = await db.listCollections().toArray();
    const exists = collections.some((c) => c.name === COLLECTION);
    if (!exists) {
      console.error('❌ Collection "sponsored_ads" does NOT exist!');
      console.log('   Run: node backend/scripts/create-sponsored-ads-collection.js');
      process.exit(1);
    }

    const total = await coll.countDocuments();
    console.log(`\n📊 Total sponsored ads in DB: ${total}`);

    if (total === 0) {
      console.log('   No ads found. Create ads in Admin → Sponsored Ads.');
      process.exit(0);
    }

    // 2. List all ads with key fields
    const all = await coll.find({}).project({
      _id: 1, title: 1, status: 1, budget: 1, targetLocations: 1,
      categorySlug: 1, adSize: 1, startDate: 1, endDate: 1,
    }).toArray();

    console.log('\n📋 All ads:');
    all.forEach((ad, i) => {
      const id = ad._id?.toString().slice(-8);
      const status = ad.status || 'undefined';
      const budget = ad.budget ?? 'null';
      const locs = Array.isArray(ad.targetLocations) ? ad.targetLocations.join(',') || '[]' : ad.targetLocations;
      const cat = ad.categorySlug || '(any)';
      const active = status === 'active' ? '✅' : '❌';
      console.log(`   ${i + 1}. [${id}] ${ad.title} | status=${status} ${active} | budget=${budget} | locs=${locs} | cat=${cat}`);
    });

    // 3. Count ads that would match the public API (active, date valid, budget ok)
    const now = new Date();
    const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const activeCount = await coll.countDocuments({ status: 'active' });
    const dateValid = await coll.countDocuments({
      status: 'active',
      $and: [
        { $or: [{ startDate: null }, { startDate: { $lte: utcToday } }] },
        { $or: [{ endDate: null }, { endDate: { $gte: utcToday } }] },
      ],
    });
    const platformDefault = await coll.countDocuments({
      status: 'active',
      $and: [
        { $or: [{ startDate: null }, { startDate: { $lte: utcToday } }] },
        { $or: [{ endDate: null }, { endDate: { $gte: utcToday } }] },
        {
          $or: [
            { targetLocations: { $size: 0 } },
            { targetLocations: { $exists: false } },
            { targetLocations: [] },
            { targetLocations: 'all' },
          ],
        },
        {
          $or: [
            { budget: { $gte: 0 } },
            { budget: { $exists: false } },
            { budget: null },
          ],
        },
      ],
    });

    console.log('\n🔍 Query checks (no location = platform default):');
    console.log(`   - status=active: ${activeCount}`);
    console.log(`   - date valid: ${dateValid}`);
    console.log(`   - platform default (empty locs) + budget ok: ${platformDefault}`);

    if (platformDefault === 0) {
      console.log('\n⚠️  No ads match platform-default query!');
      console.log('   Fix: Ensure ads have status=active, targetLocations=[] (or leave empty), budget>=0');
    } else {
      console.log('\n✅ Ads should display. If not, check:');
      console.log('   - Backend running? curl http://localhost:5000/api/sponsored-ads?size=auto');
      console.log('   - Frontend NEXT_PUBLIC_API_URL points to backend?');
      console.log('   - Browser console for API errors?');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
