// Comprehensive database diagnostic script
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function checkDatabase() {
  console.log('🔍 Starting comprehensive database check...\n');
  
  try {
    // 1. Test basic connection
    console.log('1️⃣ Testing database connection...');
    await prisma.$connect();
    console.log('   ✅ Database connection successful!\n');
    
    // 2. Check database version
    console.log('2️⃣ Checking database version...');
    const version = await prisma.$queryRaw`SELECT version()`;
    console.log('   ✅ Database version:', version[0].version.split(',')[0], '\n');
    
    // 3. Check if AdPostingOrder table exists
    console.log('3️⃣ Checking AdPostingOrder table...');
    try {
      const tableInfo = await prisma.$queryRaw`
        SELECT 
          column_name, 
          data_type, 
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = 'AdPostingOrder'
        ORDER BY ordinal_position
      `;
      
      if (tableInfo.length === 0) {
        console.log('   ❌ AdPostingOrder table does not exist!');
        console.log('   💡 Run: npm run prisma:migrate\n');
      } else {
        console.log('   ✅ AdPostingOrder table exists with columns:');
        tableInfo.forEach(col => {
          console.log(`      - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
        });
        console.log('');
      }
    } catch (error) {
      console.log('   ❌ Error checking table:', error.message, '\n');
    }
    
    // 4. Check indexes on AdPostingOrder
    console.log('4️⃣ Checking indexes on AdPostingOrder...');
    try {
      const indexes = await prisma.$queryRaw`
        SELECT 
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE tablename = 'AdPostingOrder'
      `;
      
      if (indexes.length === 0) {
        console.log('   ⚠️  No indexes found on AdPostingOrder table');
        console.log('   💡 Run: npm run prisma:migrate\n');
      } else {
        console.log('   ✅ Indexes found:');
        indexes.forEach(idx => {
          console.log(`      - ${idx.indexname}`);
          if (idx.indexdef.includes('razorpayOrderId')) {
            console.log(`        ✅ Index on razorpayOrderId exists`);
          }
        });
        console.log('');
      }
    } catch (error) {
      console.log('   ❌ Error checking indexes:', error.message, '\n');
    }
    
    // 5. Count AdPostingOrder records
    console.log('5️⃣ Counting AdPostingOrder records...');
    try {
      const count = await prisma.adPostingOrder.count();
      console.log(`   ✅ Total AdPostingOrder records: ${count}\n`);
      
      if (count > 0) {
        // Get recent orders
        const recentOrders = await prisma.adPostingOrder.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            razorpayOrderId: true,
            userId: true,
            status: true,
            amount: true,
            createdAt: true
          }
        });
        
        console.log('   📋 Recent orders:');
        recentOrders.forEach((order, idx) => {
          console.log(`      ${idx + 1}. ID: ${order.id}`);
          console.log(`         razorpayOrderId: ${order.razorpayOrderId || '(null)'}`);
          console.log(`         userId: ${order.userId}`);
          console.log(`         status: ${order.status}`);
          console.log(`         amount: ₹${order.amount}`);
          console.log(`         createdAt: ${order.createdAt}`);
          console.log('');
        });
      }
    } catch (error) {
      console.log('   ❌ Error counting records:', error.message);
      console.log('   Error code:', error.code);
      console.log('   Error meta:', JSON.stringify(error.meta, null, 2), '\n');
    }
    
    // 6. Test query with a sample orderId
    console.log('6️⃣ Testing findUnique query...');
    try {
      // Try to find any order with a razorpayOrderId
      const sampleOrder = await prisma.adPostingOrder.findFirst({
        where: {
          razorpayOrderId: { not: null }
        },
        select: {
          id: true,
          razorpayOrderId: true
        }
      });
      
      if (sampleOrder) {
        console.log(`   ✅ Found sample order: ${sampleOrder.id}`);
        console.log(`   Testing query with orderId: ${sampleOrder.razorpayOrderId}`);
        
        // Test the exact query used in verification
        const testQuery = await prisma.adPostingOrder.findUnique({
          where: { razorpayOrderId: sampleOrder.razorpayOrderId }
        });
        
        if (testQuery) {
          console.log('   ✅ findUnique query works correctly!\n');
        } else {
          console.log('   ❌ findUnique query returned null (unexpected)\n');
        }
      } else {
        console.log('   ⚠️  No orders with razorpayOrderId found to test\n');
      }
    } catch (error) {
      console.log('   ❌ Error testing query:', error.message);
      console.log('   Error code:', error.code);
      console.log('   Error name:', error.name);
      if (error.meta) {
        console.log('   Error meta:', JSON.stringify(error.meta, null, 2));
      }
      console.log('');
    }
    
    // 7. Check for potential issues
    console.log('7️⃣ Checking for potential issues...');
    try {
      // Check for orders with null razorpayOrderId
      const nullOrderIds = await prisma.adPostingOrder.count({
        where: { razorpayOrderId: null }
      });
      
      if (nullOrderIds > 0) {
        console.log(`   ⚠️  Found ${nullOrderIds} orders with null razorpayOrderId`);
        console.log('   This is normal for orders created before payment\n');
      } else {
        console.log('   ✅ No orders with null razorpayOrderId\n');
      }
      
      // Check for duplicate razorpayOrderIds
      const duplicates = await prisma.$queryRaw`
        SELECT razorpayOrderId, COUNT(*) as count
        FROM "AdPostingOrder"
        WHERE razorpayOrderId IS NOT NULL
        GROUP BY razorpayOrderId
        HAVING COUNT(*) > 1
      `;
      
      if (duplicates.length > 0) {
        console.log('   ⚠️  Found duplicate razorpayOrderIds:');
        duplicates.forEach(dup => {
          console.log(`      - ${dup.razorpayOrderId}: ${dup.count} occurrences`);
        });
        console.log('');
      } else {
        console.log('   ✅ No duplicate razorpayOrderIds found\n');
      }
    } catch (error) {
      console.log('   ❌ Error checking for issues:', error.message, '\n');
    }
    
    // 8. Test with a non-existent orderId (to see error format)
    console.log('8️⃣ Testing error handling with non-existent orderId...');
    try {
      const nonExistent = await prisma.adPostingOrder.findUnique({
        where: { razorpayOrderId: 'order_test_nonexistent_12345' }
      });
      
      if (nonExistent === null) {
        console.log('   ✅ Query correctly returns null for non-existent order\n');
      }
    } catch (error) {
      console.log('   ❌ Unexpected error:', error.message);
      console.log('   Error code:', error.code, '\n');
    }
    
    console.log('✅ Database check completed!\n');
    
  } catch (error) {
    console.error('❌ Database check failed!');
    console.error('Error type:', error.constructor.name);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    
    if (error.meta) {
      console.error('Prisma meta:', JSON.stringify(error.meta, null, 2));
    }
    
    if (error.cause) {
      console.error('Error cause:', error.cause);
    }
    
    console.error('\n💡 Common issues:');
    console.error('   1. PostgreSQL is not running');
    console.error('   2. DATABASE_URL in .env is incorrect');
    console.error('   3. Database "sellit" does not exist');
    console.error('   4. Username/password incorrect');
    console.error('   5. Prisma migrations not run (npm run prisma:migrate)');
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();

