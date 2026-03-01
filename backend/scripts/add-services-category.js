/**
 * Add/Update Services category with detailed subcategories
 * Run: node scripts/add-services-category.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SERVICES_DATA = {
  category: { id: 'services', name: 'Services' },
  subcategories: [
    { id: 'plumbing', name: 'Plumbing', categoryId: 'services' },
    { id: 'electrician', name: 'Electrician', categoryId: 'services' },
    { id: 'ac_repair', name: 'AC Repair & Service', categoryId: 'services' },
    { id: 'fridge_repair', name: 'Refrigerator Repair', categoryId: 'services' },
    { id: 'washing_machine_repair', name: 'Washing Machine Repair', categoryId: 'services' },
    { id: 'carpentry', name: 'Carpentry', categoryId: 'services' },
    { id: 'painting', name: 'Painting', categoryId: 'services' },
    { id: 'pest_control', name: 'Pest Control', categoryId: 'services' },
    { id: 'house_cleaning', name: 'House Cleaning', categoryId: 'services' },
    { id: 'water_tank_cleaning', name: 'Water Tank Cleaning', categoryId: 'services' },
    { id: 'salon_service', name: 'Salon / Beauty Service', categoryId: 'services' },
    { id: 'spa_massage', name: 'Spa & Massage', categoryId: 'services' },
    { id: 'makeup_artist', name: 'Makeup Artist', categoryId: 'services' },
    { id: 'fitness_trainer', name: 'Fitness Trainer', categoryId: 'services' },
    { id: 'yoga_trainer', name: 'Yoga Trainer', categoryId: 'services' },
    { id: 'dietician', name: 'Dietician', categoryId: 'services' },
    { id: 'astrologer', name: 'Astrologer', categoryId: 'services' },
    { id: 'numerology', name: 'Numerology', categoryId: 'services' },
    { id: 'digital_marketing', name: 'Digital Marketing', categoryId: 'services' },
    { id: 'web_development', name: 'Website Development', categoryId: 'services' },
    { id: 'app_development', name: 'App Development', categoryId: 'services' },
    { id: 'seo_service', name: 'SEO Service', categoryId: 'services' },
    { id: 'accounting', name: 'Accounting / CA', categoryId: 'services' },
    { id: 'gst_filing', name: 'GST Filing', categoryId: 'services' },
    { id: 'branding', name: 'Branding / Logo Design', categoryId: 'services' },
    { id: 'data_entry', name: 'Data Entry', categoryId: 'services' },
    { id: 'mobile_repair', name: 'Mobile Repair', categoryId: 'services' },
    { id: 'laptop_repair', name: 'Laptop Repair', categoryId: 'services' },
    { id: 'tv_repair', name: 'TV Repair', categoryId: 'services' },
    { id: 'printer_repair', name: 'Printer Repair', categoryId: 'services' },
    { id: 'cctv_repair', name: 'CCTV Repair', categoryId: 'services' },
    { id: 'inverter_repair', name: 'Inverter Repair', categoryId: 'services' },
    { id: 'home_tuition', name: 'Home Tuition', categoryId: 'services' },
    { id: 'online_classes', name: 'Online Classes', categoryId: 'services' },
    { id: 'spoken_english', name: 'Spoken English', categoryId: 'services' },
    { id: 'coding_classes', name: 'Coding Classes', categoryId: 'services' },
    { id: 'music_classes', name: 'Music Classes', categoryId: 'services' },
    { id: 'dance_classes', name: 'Dance Classes', categoryId: 'services' },
    { id: 'photography', name: 'Photography', categoryId: 'services' },
    { id: 'videography', name: 'Videography', categoryId: 'services' },
    { id: 'event_management', name: 'Event Management', categoryId: 'services' },
    { id: 'dj_service', name: 'DJ Service', categoryId: 'services' },
    { id: 'stage_decoration', name: 'Stage Decoration', categoryId: 'services' },
    { id: 'taxi_service', name: 'Taxi Service', categoryId: 'services' },
    { id: 'vehicle_rental', name: 'Vehicle Rental', categoryId: 'services' },
    { id: 'packers_movers', name: 'Packers & Movers', categoryId: 'services' },
    { id: 'driver_service', name: 'Driver Service', categoryId: 'services' },
    { id: 'home_nurse', name: 'Home Nurse', categoryId: 'services' },
    { id: 'physiotherapy', name: 'Physiotherapy', categoryId: 'services' },
    { id: 'lab_test', name: 'Lab Test', categoryId: 'services' },
    { id: 'ambulance_service', name: 'Ambulance Service', categoryId: 'services' },
    { id: 'lawyer_service', name: 'Lawyer Service', categoryId: 'services' },
    { id: 'notary', name: 'Notary', categoryId: 'services' },
    { id: 'agreement_writing', name: 'Agreement Writing', categoryId: 'services' },
    { id: 'passport_service', name: 'Passport Service', categoryId: 'services' },
    { id: 'content_writing', name: 'Content Writing', categoryId: 'services' },
    { id: 'translation', name: 'Translation', categoryId: 'services' },
    { id: 'video_editing', name: 'Video Editing', categoryId: 'services' },
    { id: 'graphic_design', name: 'Graphic Design', categoryId: 'services' },
    { id: 'voice_over', name: 'Voice Over', categoryId: 'services' },
    { id: 'social_media_manager', name: 'Social Media Manager', categoryId: 'services' },
  ],
};

async function addServicesCategory() {
  try {
    console.log('📦 Adding/Updating Services category and subcategories...');

    const categorySlug = SERVICES_DATA.category.id;
    const categoryName = SERVICES_DATA.category.name;

    // Upsert Services category
    const category = await prisma.category.upsert({
      where: { slug: categorySlug },
      update: { name: categoryName, description: 'Home, personal, business, repair, education, event, medical, legal and creative services', isActive: true },
      create: {
        name: categoryName,
        slug: categorySlug,
        description: 'Home, personal, business, repair, education, event, medical, legal and creative services',
        isActive: true,
        order: 9,
      },
    });

    console.log(`✅ Category: ${category.name} (id: ${category.id})`);

    let created = 0;
    let updated = 0;

    for (const sub of SERVICES_DATA.subcategories) {
      const slug = sub.id;
      const name = sub.name;
      const existing = await prisma.subcategory.findFirst({
        where: { categoryId: category.id, slug },
      });
      if (existing) {
        await prisma.subcategory.update({
          where: { id: existing.id },
          data: { name, isActive: true },
        });
        updated++;
        console.log(`  📝 Updated: ${name}`);
      } else {
        await prisma.subcategory.create({
          data: { name, slug, categoryId: category.id, isActive: true },
        });
        created++;
        console.log(`  ✅ Created: ${name}`);
      }
    }

    console.log(`\n✅ Done! Created ${created}, updated ${updated} subcategories.`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addServicesCategory();
