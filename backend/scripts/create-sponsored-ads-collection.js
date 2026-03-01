/**
 * Create sponsored_ads collection in MongoDB
 * Run if Prisma generate/db push fails: node scripts/create-sponsored-ads-collection.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const collections = await db.listCollections().toArray();
    const exists = collections.some((c) => c.name === 'sponsored_ads');
    if (exists) {
      console.log('sponsored_ads collection already exists');
      return;
    }
    await db.createCollection('sponsored_ads');
    await db.collection('sponsored_ads').createIndex({ status: 1 });
    await db.collection('sponsored_ads').createIndex({ adSize: 1 });
    await db.collection('sponsored_ads').createIndex({ priority: -1 });
    await db.collection('sponsored_ads').createIndex({ lastShownAt: 1 });
    console.log('sponsored_ads collection created with indexes');
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
