const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

// Detailed location data with coordinates (latitude, longitude)
const defaultLocations = [
  { name: 'Mumbai', slug: 'mumbai', state: 'Maharashtra', city: 'Mumbai', pincode: '400001', latitude: 19.0760, longitude: 72.8777 },
  { name: 'Delhi', slug: 'delhi', state: 'Delhi', city: 'New Delhi', pincode: '110001', latitude: 28.6139, longitude: 77.2090 },
  { name: 'Bangalore', slug: 'bangalore', state: 'Karnataka', city: 'Bangalore', pincode: '560001', latitude: 12.9716, longitude: 77.5946 },
  { name: 'Hyderabad', slug: 'hyderabad', state: 'Telangana', city: 'Hyderabad', pincode: '500001', latitude: 17.3850, longitude: 78.4867 },
  { name: 'Chennai', slug: 'chennai', state: 'Tamil Nadu', city: 'Chennai', pincode: '600001', latitude: 13.0827, longitude: 80.2707 },
  { name: 'Kolkata', slug: 'kolkata', state: 'West Bengal', city: 'Kolkata', pincode: '700001', latitude: 22.5726, longitude: 88.3639 },
  { name: 'Pune', slug: 'pune', state: 'Maharashtra', city: 'Pune', pincode: '411001', latitude: 18.5204, longitude: 73.8567 },
  { name: 'Ahmedabad', slug: 'ahmedabad', state: 'Gujarat', city: 'Ahmedabad', pincode: '380001', latitude: 23.0225, longitude: 72.5714 },
  { name: 'Jaipur', slug: 'jaipur', state: 'Rajasthan', city: 'Jaipur', pincode: '302001', latitude: 26.9124, longitude: 75.7873 },
  { name: 'Surat', slug: 'surat', state: 'Gujarat', city: 'Surat', pincode: '395001', latitude: 21.1702, longitude: 72.8311 },
  { name: 'Lucknow', slug: 'lucknow', state: 'Uttar Pradesh', city: 'Lucknow', pincode: '226001', latitude: 26.8467, longitude: 80.9462 },
  { name: 'Kanpur', slug: 'kanpur', state: 'Uttar Pradesh', city: 'Kanpur', pincode: '208001', latitude: 26.4499, longitude: 80.3319 },
  { name: 'Nagpur', slug: 'nagpur', state: 'Maharashtra', city: 'Nagpur', pincode: '440001', latitude: 21.1458, longitude: 79.0882 },
  { name: 'Indore', slug: 'indore', state: 'Madhya Pradesh', city: 'Indore', pincode: '452001', latitude: 22.7196, longitude: 75.8577 },
  { name: 'Thane', slug: 'thane', state: 'Maharashtra', city: 'Thane', pincode: '400601', latitude: 19.2183, longitude: 72.9781 },
  { name: 'Bhopal', slug: 'bhopal', state: 'Madhya Pradesh', city: 'Bhopal', pincode: '462001', latitude: 23.2599, longitude: 77.4126 },
  { name: 'Visakhapatnam', slug: 'visakhapatnam', state: 'Andhra Pradesh', city: 'Visakhapatnam', pincode: '530001', latitude: 17.6868, longitude: 83.2185 },
  { name: 'Patna', slug: 'patna', state: 'Bihar', city: 'Patna', pincode: '800001', latitude: 25.5941, longitude: 85.1376 },
  { name: 'Vadodara', slug: 'vadodara', state: 'Gujarat', city: 'Vadodara', pincode: '390001', latitude: 22.3072, longitude: 73.1812 },
  { name: 'Ghaziabad', slug: 'ghaziabad', state: 'Uttar Pradesh', city: 'Ghaziabad', pincode: '201001', latitude: 28.6692, longitude: 77.4538 },
  { name: 'Coimbatore', slug: 'coimbatore', state: 'Tamil Nadu', city: 'Coimbatore', pincode: '641001', latitude: 11.0168, longitude: 76.9558 },
  { name: 'Agra', slug: 'agra', state: 'Uttar Pradesh', city: 'Agra', pincode: '282001', latitude: 27.1767, longitude: 78.0081 },
  { name: 'Madurai', slug: 'madurai', state: 'Tamil Nadu', city: 'Madurai', pincode: '625001', latitude: 9.9252, longitude: 78.1198 },
  { name: 'Varanasi', slug: 'varanasi', state: 'Uttar Pradesh', city: 'Varanasi', pincode: '221001', latitude: 25.3176, longitude: 82.9739 },
  { name: 'Srinagar', slug: 'srinagar', state: 'Jammu and Kashmir', city: 'Srinagar', pincode: '190001', latitude: 34.0837, longitude: 74.7973 },
  { name: 'Amritsar', slug: 'amritsar', state: 'Punjab', city: 'Amritsar', pincode: '143001', latitude: 31.6340, longitude: 74.8723 },
  { name: 'Chandigarh', slug: 'chandigarh', state: 'Chandigarh', city: 'Chandigarh', pincode: '160001', latitude: 30.7333, longitude: 76.7794 },
  { name: 'Kochi', slug: 'kochi', state: 'Kerala', city: 'Kochi', pincode: '682001', latitude: 9.9312, longitude: 76.2673 },
  { name: 'Raipur', slug: 'raipur', state: 'Chhattisgarh', city: 'Raipur', pincode: '492001', latitude: 21.2514, longitude: 81.6296 },
  { name: 'Gurgaon', slug: 'gurgaon', state: 'Haryana', city: 'Gurgaon', pincode: '122001', latitude: 28.4089, longitude: 77.0378 },
  { name: 'Noida', slug: 'noida', state: 'Uttar Pradesh', city: 'Noida', pincode: '201301', latitude: 28.5355, longitude: 77.3910 },
];

async function seedLocations() {
  try {
    console.log('\n=== Seeding Locations ===\n');

    let created = 0;
    let skipped = 0;

    for (const location of defaultLocations) {
      try {
        const existing = await prisma.location.findUnique({
          where: { slug: location.slug }
        });

        if (existing) {
          console.log(`⏭️  Skipped: ${location.name} (already exists)`);
          skipped++;
          continue;
        }

        await prisma.location.create({
          data: {
            name: location.name,
            slug: location.slug,
            state: location.state,
            city: location.city,
            pincode: location.pincode,
            latitude: location.latitude,
            longitude: location.longitude,
            isActive: true
          }
        });

        console.log(`✅ Created: ${location.name}`);
        created++;
      } catch (error) {
        console.error(`❌ Error creating ${location.name}:`, error.message);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${defaultLocations.length}\n`);

    const totalLocations = await prisma.location.count();
    console.log(`📍 Total locations in database: ${totalLocations}\n`);

  } catch (error) {
    console.error('❌ Error seeding locations:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedLocations();

