/**
 * Sponsored Ads Service - Uses MongoDB directly (Prisma client may not have SponsoredAd model)
 */

const { MongoClient, ObjectId } = require('mongodb');

let client = null;
let db = null;

async function getDb() {
  if (db) return db;
  require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error('DATABASE_URL not set');
  client = new MongoClient(uri);
  await client.connect();
  db = client.db();
  return db;
}

const COLLECTION = 'sponsored_ads';

function toObjectId(id) {
  if (typeof id === 'string' && ObjectId.isValid(id)) {
    return new ObjectId(id);
  }
  return id;
}

function docToJson(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id?.toString(), ...rest };
}

async function findMany(options = {}) {
  const coll = (await getDb()).collection(COLLECTION);
  const { where = {}, orderBy = [], take = 100 } = options;
  const cursor = coll.find(where).sort(orderByToMongo(orderBy)).limit(take);
  const docs = await cursor.toArray();
  return docs.map(docToJson);
}

async function findManyRaw(query, sort = { priority: -1, budget: -1, lastShownAt: 1 }, limit = 10) {
  const coll = (await getDb()).collection(COLLECTION);
  // Project only needed fields for performance
  const projection = { _id: 1, title: 1, bannerImage: 1, bannerVideo: 1, description: 1, ctaType: 1, ctaLabel: 1, redirectUrl: 1, adSize: 1 };
  const docs = await coll.find(query).project(projection).sort(sort).limit(limit).toArray();
  return docs.map(docToJson);
}

function orderByToMongo(orderBy) {
  if (!Array.isArray(orderBy) || orderBy.length === 0) return { priority: -1, createdAt: -1 };
  const sort = {};
  for (const o of orderBy) {
    const key = Object.keys(o)[0];
    const dir = o[key];
    sort[key] = dir === 'desc' ? -1 : 1;
  }
  return sort;
}

async function findFirst(options = {}) {
  const ads = await findMany({ ...options, take: 1 });
  return ads[0] || null;
}

async function create(data) {
  const coll = (await getDb()).collection(COLLECTION);
  const now = new Date();
  const doc = {
    ...data,
    targetLocations: data.targetLocations || [],
    impressions: data.impressions ?? 0,
    clicks: data.clicks ?? 0,
    createdAt: now,
    updatedAt: now,
  };
  const result = await coll.insertOne(doc);
  return docToJson({ _id: result.insertedId, ...doc });
}

async function update(id, data) {
  const coll = (await getDb()).collection(COLLECTION);
  const result = await coll.findOneAndUpdate(
    { _id: toObjectId(id) },
    { $set: { ...data, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
  return result ? docToJson(result) : null;
}

async function deleteOne(id) {
  const coll = (await getDb()).collection(COLLECTION);
  const result = await coll.deleteOne({ _id: toObjectId(id) });
  return result.deletedCount > 0;
}

async function increment(id, field, amount = 1) {
  const coll = (await getDb()).collection(COLLECTION);
  await coll.updateOne(
    { _id: toObjectId(id) },
    { $inc: { [field]: amount }, $set: { updatedAt: new Date() } }
  );
}

module.exports = {
  findMany,
  findManyRaw,
  findFirst,
  create,
  update,
  deleteOne,
  increment,
  toObjectId,
};
