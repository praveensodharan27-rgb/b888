// Quick script to test database connection
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    
    // Try a simple query
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('✅ Database version:', result[0].version);
    
    // Check if tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    if (tables.length === 0) {
      console.log('⚠️  No tables found. Run: npm run prisma:migrate');
    } else {
      console.log('✅ Tables found:', tables.length);
      console.log('Tables:', tables.map(t => t.table_name).join(', '));
    }
    
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('Error:', error.message);
    console.log('\nPlease check:');
    console.log('1. PostgreSQL is running');
    console.log('2. DATABASE_URL in .env is correct');
    console.log('3. Database "sellit" exists');
    console.log('4. Username and password are correct');
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

