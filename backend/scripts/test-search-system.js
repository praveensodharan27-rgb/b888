/**
 * Test Search System
 * Tests autocomplete, search, and ranking functionality
 */

const axios = require('axios');

const API_BASE = process.env.API_URL || 'http://localhost:5000/api';

// Test queries
const TEST_QUERIES = [
  { query: 'iPhone', expectedKeywords: 'iPhone' },
  { query: 'iPhone in Kochi', expectedKeywords: 'iPhone', expectedLocation: 'kochi' },
  { query: 'Car under 5 lakh', expectedKeywords: 'Car', expectedMaxPrice: 500000 },
  { query: 'Laptop above 50000', expectedKeywords: 'Laptop', expectedMinPrice: 50000 },
  { query: 'Bike between 50000 and 100000', expectedKeywords: 'Bike', expectedMinPrice: 50000, expectedMaxPrice: 100000 },
  { query: 'Used furniture in Bangalore', expectedKeywords: 'Used furniture', expectedLocation: 'bangalore' },
];

async function testAutocomplete() {
  console.log('\n🔍 Testing Autocomplete API...\n');
  
  for (const test of TEST_QUERIES.slice(0, 3)) {
    try {
      const response = await axios.get(`${API_BASE}/ads/autocomplete`, {
        params: { q: test.query, limit: 5 }
      });
      
      console.log(`✅ Query: "${test.query}"`);
      console.log(`   Suggestions: ${response.data.suggestions?.length || 0}`);
      if (response.data.suggestions?.length > 0) {
        response.data.suggestions.slice(0, 2).forEach(s => {
          console.log(`   - ${s.title} ${s.category ? `(${s.category})` : ''}`);
        });
      }
      console.log('');
    } catch (error) {
      console.error(`❌ Query: "${test.query}" - Error:`, error.message);
    }
  }
}

async function testSearch() {
  console.log('\n🔍 Testing Search API...\n');
  
  const testCases = [
    { params: { search: 'iPhone', limit: 5 }, description: 'Simple keyword search' },
    { params: { search: 'iPhone', location: 'kochi', limit: 5 }, description: 'Search with location' },
    { params: { search: 'Car', maxPrice: 500000, limit: 5 }, description: 'Search with max price' },
    { params: { category: 'mobiles', limit: 5 }, description: 'Category filter only' },
    { params: { search: 'Laptop', minPrice: 50000, maxPrice: 100000, limit: 5 }, description: 'Search with price range' },
  ];
  
  for (const test of testCases) {
    try {
      const response = await axios.get(`${API_BASE}/ads`, { params: test.params });
      
      console.log(`✅ ${test.description}`);
      console.log(`   Query: ${JSON.stringify(test.params)}`);
      console.log(`   Results: ${response.data.ads?.length || 0} ads`);
      console.log(`   Total: ${response.data.pagination?.total || 0}`);
      if (response.data.ads?.length > 0) {
        console.log(`   First result: ${response.data.ads[0].title}`);
      }
      console.log('');
    } catch (error) {
      console.error(`❌ ${test.description} - Error:`, error.message);
    }
  }
}

async function testPopularSearches() {
  console.log('\n🔍 Testing Popular Searches API...\n');
  
  try {
    const response = await axios.get(`${API_BASE}/ads/popular-searches`, {
      params: { limit: 10 }
    });
    
    console.log(`✅ Popular Searches: ${response.data.searches?.length || 0}`);
    if (response.data.searches?.length > 0) {
      response.data.searches.forEach((search, i) => {
        console.log(`   ${i + 1}. ${search}`);
      });
    }
    console.log('');
  } catch (error) {
    console.error('❌ Popular Searches Error:', error.message);
  }
}

async function testRanking() {
  console.log('\n🔍 Testing Search Ranking...\n');
  
  try {
    const response = await axios.get(`${API_BASE}/ads`, {
      params: { search: 'phone', limit: 10, sort: 'newest' }
    });
    
    console.log(`✅ Ranking Test (search: "phone", sort: newest)`);
    console.log(`   Total results: ${response.data.pagination?.total || 0}`);
    
    if (response.data.ads?.length > 0) {
      console.log('\n   Top 5 results:');
      response.data.ads.slice(0, 5).forEach((ad, i) => {
        const premium = ad.isPremium ? '⭐ PREMIUM' : '';
        const business = ad.packageType && ad.packageType !== 'NORMAL' ? '💼 BUSINESS' : '';
        const badge = premium || business || '🆓 FREE';
        console.log(`   ${i + 1}. ${badge} ${ad.title} - ₹${ad.price}`);
      });
    }
    console.log('');
  } catch (error) {
    console.error('❌ Ranking Test Error:', error.message);
  }
}

async function testFilters() {
  console.log('\n🔍 Testing Filter Combinations...\n');
  
  const filterTests = [
    { 
      params: { category: 'mobiles', condition: 'NEW', minPrice: 10000, maxPrice: 50000, limit: 5 },
      description: 'Category + Condition + Price Range'
    },
    { 
      params: { search: 'car', location: 'mumbai', condition: 'USED', limit: 5 },
      description: 'Search + Location + Condition'
    },
    { 
      params: { category: 'electronics', subcategory: 'laptops', sort: 'price_low', limit: 5 },
      description: 'Category + Subcategory + Sort'
    },
  ];
  
  for (const test of filterTests) {
    try {
      const response = await axios.get(`${API_BASE}/ads`, { params: test.params });
      
      console.log(`✅ ${test.description}`);
      console.log(`   Results: ${response.data.ads?.length || 0} ads`);
      console.log('');
    } catch (error) {
      console.error(`❌ ${test.description} - Error:`, error.message);
    }
  }
}

async function testPerformance() {
  console.log('\n⚡ Testing Performance...\n');
  
  const tests = [
    { endpoint: '/ads/autocomplete?q=iphone', name: 'Autocomplete' },
    { endpoint: '/ads?search=phone&limit=20', name: 'Search' },
    { endpoint: '/ads/popular-searches', name: 'Popular Searches' },
  ];
  
  for (const test of tests) {
    try {
      const start = Date.now();
      await axios.get(`${API_BASE}${test.endpoint}`);
      const duration = Date.now() - start;
      
      const status = duration < 500 ? '✅' : duration < 1000 ? '⚠️' : '❌';
      console.log(`${status} ${test.name}: ${duration}ms`);
    } catch (error) {
      console.error(`❌ ${test.name} - Error:`, error.message);
    }
  }
  console.log('');
}

// Run all tests
async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('           SEARCH SYSTEM TEST SUITE');
  console.log('═══════════════════════════════════════════════════════');
  
  try {
    await testAutocomplete();
    await testSearch();
    await testPopularSearches();
    await testRanking();
    await testFilters();
    await testPerformance();
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('           ALL TESTS COMPLETED');
    console.log('═══════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests };
