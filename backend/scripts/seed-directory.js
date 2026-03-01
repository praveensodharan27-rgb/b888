/**
 * Seed India Business Directory: states, cities, categories, sample businesses and blog.
 * Run: node scripts/seed-directory.js
 */
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

function slugify(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function main() {
  const dataPath = path.join(__dirname, '../data/india-states-cities.json');
  const raw = fs.readFileSync(dataPath, 'utf8');
  const { states: statesData } = JSON.parse(raw);

  console.log('Seeding directory states and cities...');
  for (const s of statesData) {
    const stateSlug = s.slug || slugify(s.name);
    const state = await prisma.directoryState.upsert({
      where: { slug: stateSlug },
      update: { name: s.name, isActive: true },
      create: { name: s.name, slug: stateSlug },
    });
    for (const cityName of s.cities || []) {
      const citySlug = slugify(cityName);
      if (!citySlug) continue;
      await prisma.directoryCity.upsert({
        where: {
          stateId_slug: { stateId: state.id, slug: citySlug },
        },
        update: { name: cityName, isActive: true },
        create: { name: cityName, slug: citySlug, stateId: state.id },
      });
    }
  }

  const defaultCategories = [
    { name: 'Spa & Wellness', slug: 'spa', description: 'Spa, massage, ayurvedic and wellness centres.' },
    { name: 'Restaurants', slug: 'restaurants', description: 'Restaurants, cafes and food outlets.' },
    { name: 'Hospitals & Clinics', slug: 'hospitals-and-clinics', description: 'Hospitals, clinics and healthcare.' },
    { name: 'Schools', slug: 'schools', description: 'Schools, tuition and education.' },
    { name: 'Gyms & Fitness', slug: 'gyms-and-fitness', description: 'Gyms, yoga and fitness centres.' },
    { name: 'Salons', slug: 'salons', description: 'Hair and beauty salons.' },
    { name: 'Legal Services', slug: 'legal-services', description: 'Lawyers and legal services.' },
    { name: 'Real Estate', slug: 'real-estate', description: 'Property dealers and real estate.' },
    { name: 'Automobiles', slug: 'automobiles', description: 'Car dealers, service and repair.' },
    { name: 'Electronics', slug: 'electronics', description: 'Electronics and repair shops.' },
    // Wizard / service categories (mybusiness create)
    { name: 'Retail', slug: 'retail', description: 'E-commerce, boutique shops, and consumer goods distribution.' },
    { name: 'Food & Beverage', slug: 'food-beverage', description: 'Restaurants, catering, cafes, and beverage manufacturers.' },
    { name: 'Technology', slug: 'technology', description: 'SaaS, fintech, IT infrastructure, and digital products.' },
    { name: 'Healthcare', slug: 'healthcare', description: 'Clinics, wellness centers, biotech, and medical services.' },
    { name: 'Professional Services', slug: 'professional-services', description: 'Consulting, legal, accounting, and creative agencies.' },
    { name: 'Construction', slug: 'construction', description: 'Engineering, trade crafts, real estate, and architecture.' },
  ];

  console.log('Seeding directory categories...');
  for (const c of defaultCategories) {
    await prisma.directoryCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description || null, isActive: true },
      create: { name: c.name, slug: c.slug, description: c.description || null },
    });
  }

  const kerala = await prisma.directoryState.findFirst({ where: { slug: 'kerala' } });
  const ernakulam = await prisma.directoryCity.findFirst({
    where: { stateId: kerala.id, slug: 'ernakulam' },
  });
  const spaCat = await prisma.directoryCategory.findFirst({ where: { slug: 'spa' } });
  if (kerala && ernakulam && spaCat) {
    const existing = await prisma.directoryBusiness.findFirst({
      where: {
        stateId: kerala.id,
        cityId: ernakulam.id,
        categoryId: spaCat.id,
        slug: 'moksha-ayurvedic-spa',
      },
    });
    if (!existing) {
      await prisma.directoryBusiness.create({
        data: {
          name: 'Moksha Ayurvedic Spa',
          slug: 'moksha-ayurvedic-spa',
          description: 'Best Ayurvedic spa in Ernakulam. Professional massage therapy and relaxation services at affordable prices. Traditional treatments and wellness packages.',
          phone: '+91 9846123456',
          email: 'info@mokshaspa.com',
          website: 'https://mokshaspa.com',
          address: 'MG Road, Ernakulam, Kerala 682016',
          latitude: 9.9312,
          longitude: 76.2673,
          openingHours: {
            mon: '9:00 AM - 8:00 PM',
            tue: '9:00 AM - 8:00 PM',
            wed: '9:00 AM - 8:00 PM',
            thu: '9:00 AM - 8:00 PM',
            fri: '9:00 AM - 8:00 PM',
            sat: '9:00 AM - 6:00 PM',
            sun: '10:00 AM - 4:00 PM',
          },
          categoryId: spaCat.id,
          cityId: ernakulam.id,
          stateId: kerala.id,
          isVerified: true,
          isFeatured: true,
          rating: 4.7,
          reviewCount: 42,
          whatsapp: '919846123456',
        },
      });
      console.log('Created sample business: Moksha Ayurvedic Spa');
    }
  }

  const blogSlug = 'best-spa-in-ernakulam';
  const existingPost = await prisma.directoryBlogPost.findUnique({ where: { slug: blogSlug } });
  if (!existingPost) {
    await prisma.directoryBlogPost.create({
      data: {
        title: 'Best Spa in Ernakulam – Top 10 Ayurvedic & Wellness Centres',
        slug: blogSlug,
        excerpt: 'Discover the best spa and wellness centres in Ernakulam. Compare prices, services and read reviews.',
        content: `<p>Looking for the best spa in Ernakulam? We've rounded up top-rated Ayurvedic spas and wellness centres in the city.</p>
<h2>Why Choose a Spa in Ernakulam?</h2>
<p>Ernakulam is home to some of Kerala's finest Ayurvedic and wellness centres. From traditional Abhyangam to modern facials, you'll find a range of services to relax and rejuvenate.</p>
<h2>Top Picks</h2>
<p>Our list includes Moksha Ayurvedic Spa and other highly-rated establishments. Each offers professional massage therapy and relaxation services at competitive prices.</p>
<h2>How to Choose</h2>
<p>Consider location, reviews, pricing and the type of treatments offered. Book in advance during peak season.</p>
<h2>FAQ</h2>
<p><strong>What are the average spa prices in Ernakulam?</strong> Prices vary from ₹800 for basic massage to ₹3000+ for full body treatments.</p>
<p><strong>Do I need to book in advance?</strong> Yes, especially on weekends and holidays.</p>`,
        metaTitle: 'Best Spa in Ernakulam | Top Ayurvedic & Wellness Centres 2024',
        metaDescription: 'Find the best spa in Ernakulam. Compare top Ayurvedic and wellness centres, read reviews and book appointments.',
        author: 'SellIt Directory',
        publishedAt: new Date(),
        tags: ['spa', 'ernakulam', 'kerala', 'ayurvedic', 'wellness'],
      },
    });
    console.log('Created sample blog post');
  }

  console.log('Directory seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
