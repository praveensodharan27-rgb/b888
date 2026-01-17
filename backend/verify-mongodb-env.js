/**
 * Verify MongoDB connection string in .env
 */

require('dotenv').config();

console.log('\n🔍 Checking MongoDB Configuration...\n');

const dbUrl = process.env.DATABASE_URL || '';
const mongoUri = process.env.MONGO_URI || '';

console.log('DATABASE_URL:', dbUrl ? (dbUrl.includes('mongodb') ? '✅ MongoDB' : '❌ Not MongoDB') : '❌ NOT SET');
if (dbUrl) {
  console.log('   Value:', dbUrl.substring(0, 50) + '...');
}

console.log('\nMONGO_URI:', mongoUri ? '✅ Set' : '❌ NOT SET');
if (mongoUri) {
  console.log('   Value:', mongoUri.substring(0, 50) + '...');
}

if (dbUrl && dbUrl.includes('mongodb')) {
  console.log('\n✅ MongoDB connection string is configured correctly!');
  console.log('   Restart your server to apply changes.\n');
} else if (dbUrl && dbUrl.includes('postgresql')) {
  console.log('\n❌ Still using PostgreSQL connection!');
  console.log('   Run: node scripts/fix-mongodb-connection.js\n');
} else {
  console.log('\n⚠️  DATABASE_URL not set or invalid');
  console.log('   Make sure .env file has:');
  console.log('   DATABASE_URL=mongodb+srv://b888:Ponkunnam1133!@cluster0.zfcaepv.mongodb.net/?appName=Cluster0\n');
}
