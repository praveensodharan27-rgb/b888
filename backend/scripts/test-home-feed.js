/**
 * Test home feed endpoint
 */

const http = require('http');

function testHomeFeed() {
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/ads/home-feed?limit=5',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('✅ Home Feed Response:');
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Success: ${result.success}`);
        console.log(`   Total ads: ${result.pagination?.total || 0}`);
        console.log(`   Ads returned: ${result.ads?.length || 0}`);
        
        if (result.ads && result.ads.length > 0) {
          console.log('\n📋 Sample ads:');
          result.ads.slice(0, 3).forEach((ad, i) => {
            console.log(`   ${i + 1}. ${ad.title} - ₹${ad.price} (${ad.city || 'N/A'})`);
          });
        } else {
          console.log('\n⚠️  No ads returned!');
        }
      } catch (error) {
        console.error('❌ Error parsing response:', error.message);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request error:', error.message);
  });

  req.end();
}

testHomeFeed();
