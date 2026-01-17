/**
 * PostgreSQL to MongoDB Migration Script
 * 
 * This script migrates all data from PostgreSQL to MongoDB
 * while maintaining the same data structure and field names.
 * 
 * Usage:
 *   1. Set DATABASE_URL to PostgreSQL connection string
 *   2. Set MONGO_URI to MongoDB connection string
 *   3. Run: node scripts/migrate-postgres-to-mongodb.js
 */

require('dotenv').config();
const { PrismaClient: PostgresClient } = require('@prisma/client');
const { MongoClient } = require('mongodb');

// Load PostgreSQL Prisma Client (temporary, using old schema)
const postgresPrisma = new PostgresClient({
  datasources: {
    db: {
      url: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
});

// MongoDB connection
const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL;
if (!mongoUri) {
  console.error('❌ MONGO_URI or DATABASE_URL must be set');
  process.exit(1);
}

const mongoClient = new MongoClient(mongoUri);

// Collection names mapping (same as Prisma model names)
const collections = [
  'users',
  'otps',
  'categories',
  'subcategories',
  'locations',
  'ads',
  'favorites',
  'premium_orders',
  'ad_posting_orders',
  'chat_rooms',
  'chat_messages',
  'premium_settings',
  'banners',
  'notifications',
  'interstitial_ads',
  'push_subscriptions',
  'wallets',
  'wallet_transactions',
  'referrals',
  'business_packages',
  'extra_ad_slots',
  'search_queries',
  'search_alert_settings',
  'auth_page_settings',
  'follows',
  'contact_requests',
  'blocks',
  'audit_logs',
  'refresh_tokens',
];

// Convert Prisma data to MongoDB format
function convertToMongoFormat(data) {
  if (!data) return null;
  
  // Convert to plain object
  const obj = JSON.parse(JSON.stringify(data));
  
  // Convert id to _id for MongoDB
  if (obj.id) {
    obj._id = obj.id;
    delete obj.id;
  }
  
  // Convert date strings to Date objects
  Object.keys(obj).forEach(key => {
    if (obj[key] && typeof obj[key] === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(obj[key])) {
      obj[key] = new Date(obj[key]);
    }
  });
  
  return obj;
}

// Convert ObjectId strings to MongoDB ObjectId
function convertObjectIds(doc, fieldMappings) {
  const converted = { ...doc };
  
  fieldMappings.forEach(field => {
    if (converted[field] && typeof converted[field] === 'string') {
      // MongoDB will handle string IDs, but we can convert if needed
      // For now, keep as strings since Prisma uses cuid() which are strings
    }
  });
  
  return converted;
}

async function migrateCollection(collectionName, modelName, objectIdFields = []) {
  try {
    console.log(`\n📦 Migrating ${collectionName}...`);
    
    // Fetch all data from PostgreSQL
    const data = await postgresPrisma[modelName].findMany({
      include: getIncludeForModel(modelName),
    });
    
    if (data.length === 0) {
      console.log(`   ⚠️  No data found in ${collectionName}`);
      return { count: 0, errors: [] };
    }
    
    console.log(`   Found ${data.length} records`);
    
    // Connect to MongoDB
    const db = mongoClient.db();
    const collection = db.collection(collectionName);
    
    // Convert and insert data
    const documents = data.map(item => {
      const doc = convertToMongoFormat(item);
      return convertObjectIds(doc, objectIdFields);
    });
    
    // Insert in batches
    const batchSize = 100;
    let inserted = 0;
    const errors = [];
    
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      try {
        const result = await collection.insertMany(batch, { ordered: false });
        inserted += result.insertedCount;
        console.log(`   ✅ Inserted ${inserted}/${documents.length} records`);
      } catch (error) {
        if (error.code === 11000) {
          // Duplicate key error - try inserting one by one
          console.log(`   ⚠️  Some duplicates found, inserting individually...`);
          for (const doc of batch) {
            try {
              await collection.insertOne(doc);
              inserted++;
            } catch (err) {
              if (err.code !== 11000) {
                errors.push({ doc: doc._id, error: err.message });
              }
            }
          }
        } else {
          errors.push({ batch: i, error: error.message });
        }
      }
    }
    
    console.log(`   ✅ Completed: ${inserted} records migrated`);
    if (errors.length > 0) {
      console.log(`   ⚠️  ${errors.length} errors occurred`);
    }
    
    return { count: inserted, errors };
  } catch (error) {
    console.error(`   ❌ Error migrating ${collectionName}:`, error.message);
    return { count: 0, errors: [error.message] };
  }
}

function getIncludeForModel(modelName) {
  // Return appropriate includes for relations
  // Most relations will be handled by references (ObjectId fields)
  return {};
}

async function main() {
  console.log('🚀 Starting PostgreSQL to MongoDB Migration\n');
  console.log(`📊 PostgreSQL: ${process.env.POSTGRES_DATABASE_URL ? 'Connected' : 'Using DATABASE_URL'}`);
  console.log(`🍃 MongoDB: ${mongoUri.substring(0, 30)}...\n`);
  
  try {
    // Connect to MongoDB
    await mongoClient.connect();
    console.log('✅ Connected to MongoDB\n');
    
    // Test PostgreSQL connection
    await postgresPrisma.$connect();
    console.log('✅ Connected to PostgreSQL\n');
    
    const results = {};
    
    // Migrate collections in order (respecting dependencies)
    const migrationOrder = [
      { collection: 'categories', model: 'category', objectIds: [] },
      { collection: 'subcategories', model: 'subcategory', objectIds: ['categoryId'] },
      { collection: 'locations', model: 'location', objectIds: [] },
      { collection: 'users', model: 'user', objectIds: ['locationId', 'referredBy'] },
      { collection: 'otps', model: 'otP', objectIds: ['userId'] },
      { collection: 'ads', model: 'ad', objectIds: ['userId', 'categoryId', 'subcategoryId', 'locationId'] },
      { collection: 'favorites', model: 'favorite', objectIds: ['userId', 'adId'] },
      { collection: 'premium_orders', model: 'premiumOrder', objectIds: ['userId', 'adId'] },
      { collection: 'ad_posting_orders', model: 'adPostingOrder', objectIds: ['userId', 'adId'] },
      { collection: 'chat_rooms', model: 'chatRoom', objectIds: ['user1Id', 'user2Id', 'adId'] },
      { collection: 'chat_messages', model: 'chatMessage', objectIds: ['senderId', 'receiverId', 'roomId'] },
      { collection: 'premium_settings', model: 'premiumSettings', objectIds: [] },
      { collection: 'banners', model: 'banner', objectIds: ['categoryId', 'locationId'] },
      { collection: 'notifications', model: 'notification', objectIds: ['userId'] },
      { collection: 'interstitial_ads', model: 'interstitialAd', objectIds: [] },
      { collection: 'push_subscriptions', model: 'pushSubscription', objectIds: ['userId'] },
      { collection: 'wallets', model: 'wallet', objectIds: ['userId'] },
      { collection: 'wallet_transactions', model: 'walletTransaction', objectIds: ['walletId'] },
      { collection: 'referrals', model: 'referral', objectIds: ['referrerId'] },
      { collection: 'business_packages', model: 'businessPackage', objectIds: ['userId'] },
      { collection: 'extra_ad_slots', model: 'extraAdSlot', objectIds: ['userId'] },
      { collection: 'search_queries', model: 'searchQuery', objectIds: [] },
      { collection: 'search_alert_settings', model: 'searchAlertSettings', objectIds: [] },
      { collection: 'auth_page_settings', model: 'authPageSettings', objectIds: [] },
      { collection: 'follows', model: 'follow', objectIds: ['followerId', 'followingId'] },
      { collection: 'contact_requests', model: 'contactRequest', objectIds: ['requesterId', 'sellerId', 'adId'] },
      { collection: 'blocks', model: 'block', objectIds: ['blockerId', 'blockedId'] },
      { collection: 'audit_logs', model: 'auditLog', objectIds: ['actorId', 'targetId'] },
      { collection: 'refresh_tokens', model: 'refreshToken', objectIds: ['userId'] },
    ];
    
    for (const { collection, model, objectIds } of migrationOrder) {
      results[collection] = await migrateCollection(collection, model, objectIds);
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary');
    console.log('='.repeat(50));
    
    let totalMigrated = 0;
    let totalErrors = 0;
    
    Object.keys(results).forEach(collection => {
      const { count, errors } = results[collection];
      totalMigrated += count;
      totalErrors += errors.length;
      const status = errors.length > 0 ? '⚠️' : '✅';
      console.log(`${status} ${collection}: ${count} records${errors.length > 0 ? ` (${errors.length} errors)` : ''}`);
    });
    
    console.log('='.repeat(50));
    console.log(`✅ Total migrated: ${totalMigrated} records`);
    if (totalErrors > 0) {
      console.log(`⚠️  Total errors: ${totalErrors}`);
    }
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await postgresPrisma.$disconnect();
    await mongoClient.close();
    console.log('\n✅ Disconnected from databases');
  }
}

// Run migration
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
