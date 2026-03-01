/**
 * Test API Performance
 * Measures response times before and after optimization
 */

const http = require('http');

async function testEndpoint(path, label) {
  return new Promise((resolve) => {
    const start = Date.now();
    
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'GET',
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const duration = Date.now() - start;
        const size = Buffer.byteLength(data, 'utf8');
        resolve({ label, duration, size, status: res.statusCode });
      });
    });
    
    req.on('error', (error) => {
      resolve({ label, duration: -1, size: 0, status: 0, error: error.message });
    });
    
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Testing API Performance...\n');
  
  const tests = [
    { path: '/api/home-feed?limit=24', label: 'Home Feed (24 ads)' },
    { path: '/api/home-feed?page=2&limit=24', label: 'Home Feed Page 2' },
    { path: '/api/home-feed?page=3&limit=24', label: 'Home Feed Page 3' },
    { path: '/api/categories', label: 'Categories' },
  ];
  
  console.log('📊 Running tests...\n');
  
  for (const test of tests) {
    const result = await testEndpoint(test.path, test.label);
    
    if (result.error) {
      console.log(`❌ ${result.label}: ERROR - ${result.error}`);
    } else {
      const sizeKB = (result.size / 1024).toFixed(2);
      const status = result.status === 200 ? '✅' : '❌';
      const speed = result.duration < 200 ? '⚡' : result.duration < 500 ? '🟡' : '🔴';
      
      console.log(`${status} ${speed} ${result.label}`);
      console.log(`   Response Time: ${result.duration}ms`);
      console.log(`   Payload Size: ${sizeKB} KB`);
      console.log(`   Status: ${result.status}`);
      console.log('');
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('🎯 Performance Targets:');
  console.log('   ⚡ Excellent: < 200ms');
  console.log('   🟡 Good: 200-500ms');
  console.log('   🔴 Slow: > 500ms');
  console.log('');
  console.log('💡 If still slow, run:');
  console.log('   1. node scripts/add-database-indexes.js');
  console.log('   2. node scripts/clear-all-cache.js');
  console.log('   3. Restart backend server');
}

runTests();
