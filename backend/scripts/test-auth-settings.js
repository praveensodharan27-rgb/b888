const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAuthSettings() {
  try {
    console.log('🔍 Checking AuthPageSettings table...\n');
    
    const settings = await prisma.authPageSettings.findMany();
    
    if (settings.length === 0) {
      console.log('❌ No settings found in database');
      console.log('💡 Run: node scripts/seed-auth-settings.js\n');
    } else {
      console.log(`✅ Found ${settings.length} settings:\n`);
      settings.forEach(s => {
        console.log(`📄 ${s.page.toUpperCase()}`);
        console.log(`   Title: ${s.title}`);
        console.log(`   Subtitle: ${s.subtitle}`);
        console.log(`   Tagline: ${s.tagline}`);
        console.log(`   Image: ${s.imageUrl?.substring(0, 50)}...`);
        console.log(`   Color: ${s.backgroundColor}\n`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Possible fixes:');
    console.log('   1. Run: npx prisma generate');
    console.log('   2. Run: npx prisma db push');
    console.log('   3. Run: node scripts/seed-auth-settings.js\n');
  } finally {
    await prisma.$disconnect();
  }
}

testAuthSettings();

