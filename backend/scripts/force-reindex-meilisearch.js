require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { MeiliSearch } = require('meilisearch');

const prisma = new PrismaClient();

// Meilisearch client
const client = new MeiliSearch({
  host: process.env.MEILI_HOST || 'http://127.0.0.1:7700',
  apiKey: process.env.MEILI_API_KEY || 'root123',
});

const INDEX_NAME = 'ads';

// Calculate ranking score
function calculateRankingScore(ad) {
  let score = 0;
  
  // Premium features (highest priority)
  if (ad.isTopAdActive) score += 50;
  if (ad.isFeaturedActive) score += 40;
  if (ad.isUrgent) score += 20;
  if (ad.isBumpActive) score += 10;
  
  // Plan type priority
  const planPriority = getPlanPriority(ad.planType);
  score += planPriority * 5;
  
  // Recency boost (newer ads get higher score)
  const daysSinceCreation = (Date.now() - new Date(ad.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceCreation < 1) score += 15;
  else if (daysSinceCreation < 3) score += 10;
  else if (daysSinceCreation < 7) score += 5;
  
  return score;
}

function getPlanPriority(planType) {
  const PLAN_PRIORITY_MAP = {
    'enterprise': 40,
    'pro': 30,
    'basic': 20,
    'normal': 10
  };
  return PLAN_PRIORITY_MAP[(planType || 'normal').toLowerCase()] || 10;
}

async function main() {
  try {
    console.log('🔄 Force reindexing Meilisearch...');
    
    // Check Meilisearch health
    await client.health();
    console.log('✅ Meilisearch is healthy');
    
    const index = client.index(INDEX_NAME);
    
    // Delete all documents first
    console.log('🗑️  Clearing existing index...');
    await index.deleteAllDocuments();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for deletion
    
    // Fetch all APPROVED ads from database
    console.log('📊 Fetching APPROVED ads from database...');
    const ads = await prisma.ad.findMany({
      where: {
        status: 'APPROVED'
      },
      include: {
        category: { select: { id: true, name: true } },
        subcategory: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    });
    
    console.log(`📦 Found ${ads.length} APPROVED ads`);
    
    if (ads.length === 0) {
      console.log('⚠️  No ads to index');
      return;
    }
    
    // Transform ads for Meilisearch
    const documents = ads.map(ad => {
      const _geo = (ad.latitude && ad.longitude) || (ad.location?.latitude && ad.location?.longitude)
        ? {
            lat: ad.latitude || ad.location?.latitude,
            lng: ad.longitude || ad.location?.longitude,
          }
        : null;
      
      const rankingScore = calculateRankingScore(ad);
      
      return {
        id: ad.id,
        title: ad.title,
        description: ad.description || '',
        categoryId: ad.categoryId,
        subcategoryId: ad.subcategoryId,
        locationId: ad.locationId,
        category: ad.category?.name || '',
        categoryName: ad.category?.name || '',
        subcategory: ad.subcategory?.name || '',
        location: ad.location?.name || '',
        city: ad.city || '',
        state: ad.state || '',
        neighbourhood: ad.neighbourhood || '',
        exactLocation: ad.exactLocation || '',
        tags: (ad.tags && Array.isArray(ad.tags)) ? ad.tags.join(' ') : '',
        _geo,
        brand: ad.brand || '',
        model: ad.model || '',
        specifications: ad.specifications ? JSON.stringify(ad.specifications) : '',
        planType: ad.planType || 'normal',
        planPriority: getPlanPriority(ad.planType),
        rankingScore,
        isTopAdActive: ad.isTopAdActive || false,
        isFeaturedActive: ad.isFeaturedActive || false,
        isUrgent: ad.isUrgent || false,
        isBumpActive: ad.isBumpActive || false,
        createdAt: ad.createdAt?.toISOString() || new Date().toISOString(),
        adExpiryDate: ad.expiresAt?.toISOString() || ad.adExpiryDate?.toISOString() || null,
        price: ad.price,
        condition: ad.condition,
        status: ad.status,
        isPremium: ad.isPremium || false,
        premiumType: ad.premiumType || null,
        packageType: ad.packageType || 'NORMAL',
        userId: ad.userId,
        images: ad.images || [],
        featuredAt: ad.featuredAt?.toISOString() || null,
      };
    });
    
    // Add documents to Meilisearch
    console.log('📤 Adding documents to Meilisearch...');
    const task = await index.addDocuments(documents);
    console.log(`⏳ Task enqueued: ${task.taskUid}`);
    
    // Wait for indexing to complete
    console.log('⏳ Waiting for indexing to complete...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify
    const stats = await index.getStats();
    console.log(`✅ Reindex complete! ${stats.numberOfDocuments} documents indexed`);
    
  } catch (error) {
    console.error('❌ Reindex failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
