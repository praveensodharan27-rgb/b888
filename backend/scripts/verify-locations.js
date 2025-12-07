const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyLocations() {
  try {
    const locations = await prisma.location.findMany({
      take: 5,
      select: {
        name: true,
        state: true,
        city: true,
        pincode: true,
        latitude: true,
        longitude: true
      },
      orderBy: { name: 'asc' }
    });

    console.log('\n📍 Sample Locations with Details:\n');
    locations.forEach(loc => {
      console.log(`${loc.name}, ${loc.state}`);
      console.log(`  City: ${loc.city || 'N/A'}`);
      console.log(`  Pincode: ${loc.pincode || 'N/A'}`);
      console.log(`  Coordinates: ${loc.latitude}, ${loc.longitude}`);
      console.log('');
    });

    const total = await prisma.location.count();
    const withCoords = await prisma.location.count({
      where: {
        latitude: { not: null },
        longitude: { not: null }
      }
    });

    console.log(`📊 Total Locations: ${total}`);
    console.log(`📍 Locations with Coordinates: ${withCoords}`);
    console.log('');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyLocations();

