/**
 * Reindex All Ads to Meilisearch with Ranking Scores
 * 
 * This script directly reads from MongoDB and indexes to Meilisearch
 * without requiring Prisma regeneration.
 * 
 * Usage: node scripts/reindex-with-ranking.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const { MeiliSearch } = require('meilisearch');

// Prefer MEILI_* so local overrides Cloud when both set (same as service)
const MEILISEARCH_HOST = process.env.MEILI_HOST || process.env.MEILISEARCH_HOST || 'http://127.0.0.1:7700';
const MEILISEARCH_KEY = process.env.MEILI_API_KEY || process.env.MEILI_MASTER_KEY || process.env.MEILISEARCH_MASTER_KEY || 'masterKey';
const INDEX_NAME = process.env.MEILI_INDEX || process.env.MEILISEARCH_INDEX || 'ads';

async function reindexAllAds() {
  const mongoUrl = process.env.MONGODB_URL || process.env.DATABASE_URL;
  
  if (!mongoUrl) {
    console.error('❌ Error: MONGODB_URL or DATABASE_URL not found in .env');
    process.exit(1);
  }

  console.log('🔄 Starting Meilisearch reindex with ranking scores...\n');

  // Connect to MongoDB
  const mongoClient = new MongoClient(mongoUrl);
  await mongoClient.connect();
  console.log('✅ Connected to MongoDB');

  const db = mongoClient.db();
  const adsCollection = db.collection('ads');
  const categoriesCollection = db.collection('categories');
  const locationsCollection = db.collection('locations');

  // Connect to Meilisearch
  const meiliClient = new MeiliSearch({
    host: MEILISEARCH_HOST,
    apiKey: MEILISEARCH_KEY,
  });
  console.log('✅ Connected to Meilisearch\n');

  const index = meiliClient.index(INDEX_NAME);

  try {
    // Create index if it doesn't exist
    try {
      await meiliClient.createIndex(INDEX_NAME, { primaryKey: 'id' });
      console.log('✅ Created Meilisearch index\n');
    } catch (error) {
      if (error.code !== 'index_already_exists') {
        console.log('ℹ️  Index already exists\n');
      }
    }

    // Get all approved ads
    const ads = await adsCollection.find({ status: 'APPROVED' }).toArray();
    console.log(`📊 Found ${ads.length} approved ads\n`);

    if (ads.length === 0) {
      console.log('⚠️  No approved ads to index');
      return;
    }

    // Get categories and locations for mapping
    const categories = await categoriesCollection.find({}).toArray();
    const locations = await locationsCollection.find({}).toArray();

    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat._id.toString()] = cat.name;
    });

    const locationMap = {};
    locations.forEach(loc => {
      locationMap[loc._id.toString()] = `${loc.city}, ${loc.state}`;
    });

    console.log('⚙️  Preparing ads for indexing...\n');

    // Transform ads for Meilisearch
    const documents = ads.map(ad => {
      const doc = {
        id: ad._id.toString(),
        title: ad.title || '',
        description: ad.description || '',
        price: ad.price || 0,
        categoryName: ad.categoryId ? categoryMap[ad.categoryId.toString()] || '' : '',
        location: ad.locationId ? locationMap[ad.locationId.toString()] || '' : '',
        city: ad.city || '',
        state: ad.state || '',
        images: ad.images || [],
        createdAt: ad.createdAt ? new Date(ad.createdAt).getTime() : Date.now(),
        
        // Ranking fields
        rankingScore: ad.rankingScore || 10,
        planType: ad.planType || 'FREE',
        planPriority: ad.planPriority || 10,
        isTopAdActive: ad.isTopAdActive || false,
        isFeaturedActive: ad.isFeaturedActive || false,
        isBumpActive: ad.isBumpActive || false,
        isUrgent: ad.isUrgent || false,
        
        // Expiry
        adExpiryDate: ad.adExpiryDate ? new Date(ad.adExpiryDate).getTime() : null,
        
        // Geo-location
        latitude: ad.latitude || null,
        longitude: ad.longitude || null,
      };

      // Add _geo if coordinates exist
      if (doc.latitude && doc.longitude) {
        doc._geo = {
          lat: doc.latitude,
          lng: doc.longitude,
        };
      }

      return doc;
    });

    console.log('📤 Indexing ads to Meilisearch...\n');

    // Index in batches of 100
    const batchSize = 100;
    let indexed = 0;

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      await index.addDocuments(batch);
      indexed += batch.length;
      console.log(`   Progress: ${indexed}/${documents.length} indexed...`);
    }

    console.log(`\n✅ Successfully indexed ${indexed} ads!\n`);

    // Show ranking distribution
    console.log('📊 Ranking Score Distribution:');
    const distribution = {
      high: documents.filter(d => d.rankingScore >= 100).length,
      medium: documents.filter(d => d.rankingScore >= 50 && d.rankingScore < 100).length,
      low: documents.filter(d => d.rankingScore < 50).length,
    };

    console.log(`   High (100+): ${distribution.high} ads`);
    console.log(`   Medium (50-99): ${distribution.medium} ads`);
    console.log(`   Low (0-49): ${distribution.low} ads\n`);

    // Show feature distribution
    console.log('🏆 Feature Distribution:');
    const features = {
      topAds: documents.filter(d => d.isTopAdActive).length,
      featured: documents.filter(d => d.isFeaturedActive).length,
      urgent: documents.filter(d => d.isUrgent).length,
      bump: documents.filter(d => d.isBumpActive).length,
    };

    console.log(`   Top Ads: ${features.topAds} ads`);
    console.log(`   Featured: ${features.featured} ads`);
    console.log(`   Urgent: ${features.urgent} ads`);
    console.log(`   Bump: ${features.bump} ads\n`);

    console.log('✅ Reindex complete!\n');
    console.log('📝 Next steps:');
    console.log('   1. Test: curl http://localhost:5000/api/home-feed');
    console.log('   2. Verify ad order (paid ads first)');
    console.log('   3. Test with location: curl "http://localhost:5000/api/home-feed?userLat=19.0760&userLng=72.8777"\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoClient.close();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

reindexAllAds();
