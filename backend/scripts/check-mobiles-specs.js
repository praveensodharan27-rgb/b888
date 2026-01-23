const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const cat = await prisma.category.findFirst({
      where: { slug: 'mobiles' },
      include: { 
        specifications: { 
          include: { options: true },
          orderBy: { order: 'asc' }
        } 
      }
    });
    
    if (!cat) {
      console.log('❌ Mobiles category not found');
      process.exit(1);
    }
    
    console.log(`✅ Category: ${cat.name} (${cat.slug})`);
    console.log(`📋 Specifications count: ${cat.specifications.length}\n`);
    
    cat.specifications.forEach((spec, idx) => {
      console.log(`${idx + 1}. ${spec.label} (${spec.name})`);
      console.log(`   Type: ${spec.type}, Required: ${spec.required}, Order: ${spec.order}`);
      if (spec.options && spec.options.length > 0) {
        console.log(`   Options: ${spec.options.length}`);
        spec.options.forEach(opt => {
          console.log(`     - ${opt.label || opt.value}`);
        });
      }
      console.log('');
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
