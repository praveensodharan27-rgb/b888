/**
 * Test Ad Ranking Order
 * 
 * Verifies that the ranking score calculation produces correct order
 */

const { calculateRankingScore, calculateRankingBreakdown } = require('../utils/adRankingScore');

const testAds = [
  {
    title: 'Enterprise Top Ad',
    planType: 'ENTERPRISE',
    isTopAdActive: true,
    isFeaturedActive: false,
    isUrgent: false,
    isBumpActive: false,
    createdAt: new Date(),
  },
  {
    title: 'Professional Top + Featured',
    planType: 'PROFESSIONAL',
    isTopAdActive: true,
    isFeaturedActive: true,
    isUrgent: false,
    isBumpActive: false,
    createdAt: new Date(),
  },
  {
    title: 'Starter Featured + Urgent',
    planType: 'STARTER',
    isTopAdActive: false,
    isFeaturedActive: true,
    isUrgent: true,
    isBumpActive: false,
    createdAt: new Date(),
  },
  {
    title: 'Free Top Ad',
    planType: 'FREE',
    isTopAdActive: true,
    isFeaturedActive: false,
    isUrgent: false,
    isBumpActive: false,
    createdAt: new Date(),
  },
  {
    title: 'Free Normal (12 hours old)',
    planType: 'FREE',
    isTopAdActive: false,
    isFeaturedActive: false,
    isUrgent: false,
    isBumpActive: false,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
  },
  {
    title: 'Enterprise Normal',
    planType: 'ENTERPRISE',
    isTopAdActive: false,
    isFeaturedActive: false,
    isUrgent: false,
    isBumpActive: false,
    createdAt: new Date(),
  },
  {
    title: 'Professional Featured + Urgent + Bump',
    planType: 'PROFESSIONAL',
    isTopAdActive: false,
    isFeaturedActive: true,
    isUrgent: true,
    isBumpActive: true,
    createdAt: new Date(),
  },
];

console.log('🎯 Ad Ranking System Test\n');
console.log('═══════════════════════════════════════════════════════════\n');

// Calculate scores
console.log('📊 Individual Ad Scores:\n');
testAds.forEach((ad, index) => {
  const score = calculateRankingScore(ad);
  const breakdown = calculateRankingBreakdown(ad);
  
  console.log(`${index + 1}. ${ad.title}`);
  console.log(`   Plan: ${ad.planType} (${breakdown.planScore} pts)`);
  console.log(`   Features:`);
  if (breakdown.topAdBoost > 0) console.log(`     - Top Ad: +${breakdown.topAdBoost}`);
  if (breakdown.featuredBoost > 0) console.log(`     - Featured: +${breakdown.featuredBoost}`);
  if (breakdown.urgentBoost > 0) console.log(`     - Urgent: +${breakdown.urgentBoost}`);
  if (breakdown.bumpBoost > 0) console.log(`     - Bump: +${breakdown.bumpBoost}`);
  if (breakdown.freshnessBonus > 0) console.log(`     - Freshness: +${breakdown.freshnessBonus}`);
  console.log(`   ⭐ Total Score: ${score} points\n`);
});

// Sort by score
const sorted = testAds
  .map(ad => ({ ...ad, score: calculateRankingScore(ad) }))
  .sort((a, b) => b.score - a.score);

console.log('═══════════════════════════════════════════════════════════\n');
console.log('🏆 Final Ranking Order (Highest to Lowest):\n');

sorted.forEach((ad, index) => {
  const badges = [];
  if (ad.isTopAdActive) badges.push('TOP');
  if (ad.isFeaturedActive) badges.push('FEATURED');
  if (ad.isUrgent) badges.push('URGENT');
  if (ad.isBumpActive) badges.push('BOOSTED');
  
  const badgeText = badges.length > 0 ? ` [${badges.join(', ')}]` : '';
  
  console.log(`${index + 1}. ${ad.title}${badgeText}`);
  console.log(`   Score: ${ad.score} points | Plan: ${ad.planType}\n`);
});

console.log('═══════════════════════════════════════════════════════════\n');

// Verify expected order
console.log('✅ Verification:\n');

const expectedOrder = [
  'Professional Top + Featured',      // 160 pts
  'Enterprise Top Ad',                 // 150 pts
  'Professional Featured + Urgent + Bump', // 145 pts
  'Starter Featured + Urgent',         // 120 pts
  'Enterprise Normal',                 // 110 pts
  'Free Top Ad',                       // 60 pts
  'Free Normal (12 hours old)',        // 15 pts
];

let allCorrect = true;
expectedOrder.forEach((expected, index) => {
  const actual = sorted[index].title;
  const match = actual === expected;
  
  if (match) {
    console.log(`✅ Position ${index + 1}: ${actual}`);
  } else {
    console.log(`❌ Position ${index + 1}: Expected "${expected}", got "${actual}"`);
    allCorrect = false;
  }
});

console.log('\n═══════════════════════════════════════════════════════════\n');

if (allCorrect) {
  console.log('🎉 All tests passed! Ranking system is working correctly.\n');
} else {
  console.log('⚠️  Some tests failed. Check the ranking logic.\n');
  process.exit(1);
}
