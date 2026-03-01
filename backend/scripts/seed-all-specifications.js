require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Seed Specifications for All Categories and Subcategories
 * 
 * This script creates default specifications for every category+subcategory combination
 * in the database. It ensures that the specifications API returns data for all combinations.
 */

// Common specifications that apply to most categories
const commonSpecs = [
  { name: 'condition', label: 'Condition', type: 'select', required: true, order: 1 },
  { name: 'price', label: 'Price', type: 'number', required: true, order: 999 },
];

// Category-specific specifications
const categorySpecs = {
  'mobiles': {
    'mobile-phones': [
      { name: 'condition', label: 'Condition', type: 'select', required: true, order: 1 },
      { name: 'brand', label: 'Brand', type: 'select', required: true, order: 2 },
      { name: 'model', label: 'Model', type: 'select', required: true, order: 3 },
      { name: 'ram', label: 'RAM', type: 'select', required: false, order: 4 },
      { name: 'storage', label: 'Storage', type: 'select', required: false, order: 5 },
      { name: 'price', label: 'Price', type: 'number', required: true, order: 6 },
    ],
    'tablets': [
      { name: 'brand', label: 'Brand', type: 'select', required: true, order: 2 },
      { name: 'model', label: 'Model', type: 'select', required: true, order: 3 },
      { name: 'storage', label: 'Storage', type: 'select', required: false, order: 4 },
      { name: 'screen_size', label: 'Screen Size', type: 'text', required: false, order: 5 },
    ],
    'smart-watches': [
      { name: 'brand', label: 'Brand', type: 'select', required: true, order: 2 },
      { name: 'model', label: 'Model', type: 'select', required: true, order: 3 },
      { name: 'color', label: 'Color', type: 'select', required: false, order: 4 },
    ],
    'accessories': [
      { name: 'brand', label: 'Brand', type: 'select', required: true, order: 2 },
      { name: 'type', label: 'Type', type: 'select', required: true, order: 3 },
    ],
  },
  'electronics-appliances': {
    'laptops': [
      { name: 'brand', label: 'Brand', type: 'select', required: true, order: 2 },
      { name: 'model', label: 'Model', type: 'select', required: true, order: 3 },
      { name: 'processor', label: 'Processor', type: 'text', required: false, order: 4 },
      { name: 'ram', label: 'RAM', type: 'select', required: false, order: 5 },
      { name: 'storage', label: 'Storage', type: 'select', required: false, order: 6 },
    ],
    'tvs': [
      { name: 'brand', label: 'Brand', type: 'select', required: true, order: 2 },
      { name: 'model', label: 'Model', type: 'select', required: true, order: 3 },
      { name: 'screen_size', label: 'Screen Size', type: 'text', required: false, order: 4 },
    ],
    'cameras': [
      { name: 'brand', label: 'Brand', type: 'select', required: true, order: 2 },
      { name: 'model', label: 'Model', type: 'select', required: true, order: 3 },
      { name: 'type', label: 'Type', type: 'select', required: false, order: 4 },
    ],
    'home-appliances': [
      { name: 'brand', label: 'Brand', type: 'select', required: true, order: 2 },
      { name: 'type', label: 'Type', type: 'select', required: true, order: 3 },
    ],
    'kitchen-appliances': [
      { name: 'brand', label: 'Brand', type: 'select', required: true, order: 2 },
      { name: 'type', label: 'Type', type: 'select', required: true, order: 3 },
    ],
    'gaming-consoles': [
      { name: 'brand', label: 'Brand', type: 'select', required: true, order: 2 },
      { name: 'model', label: 'Model', type: 'select', required: true, order: 3 },
    ],
  },
  'vehicles': {
    'cars': [
      { name: 'brand', label: 'Brand', type: 'select', required: true, order: 2 },
      { name: 'model', label: 'Model', type: 'select', required: true, order: 3 },
      { name: 'year', label: 'Year', type: 'number', required: true, order: 4 },
      { name: 'fuel_type', label: 'Fuel Type', type: 'select', required: true, order: 5 },
      { name: 'km_driven', label: 'KM Driven', type: 'number', required: true, order: 6 },
      { name: 'transmission', label: 'Transmission', type: 'select', required: true, order: 7 },
    ],
    'motorcycles': [
      { name: 'brand', label: 'Brand', type: 'select', required: true, order: 2 },
      { name: 'model', label: 'Model', type: 'select', required: true, order: 3 },
      { name: 'year', label: 'Year', type: 'number', required: true, order: 4 },
      { name: 'km_driven', label: 'KM Driven', type: 'number', required: true, order: 5 },
    ],
    'scooters': [
      { name: 'brand', label: 'Brand', type: 'select', required: true, order: 2 },
      { name: 'model', label: 'Model', type: 'select', required: true, order: 3 },
      { name: 'year', label: 'Year', type: 'number', required: true, order: 4 },
    ],
    'bicycles': [
      { name: 'brand', label: 'Brand', type: 'select', required: true, order: 2 },
      { name: 'type', label: 'Type', type: 'select', required: true, order: 3 },
    ],
    'commercial-vehicles': [
      { name: 'brand', label: 'Brand', type: 'select', required: true, order: 2 },
      { name: 'type', label: 'Vehicle Type', type: 'select', required: true, order: 3 },
      { name: 'year', label: 'Year', type: 'number', required: true, order: 4 },
    ],
    'spare-parts': [
      { name: 'brand', label: 'Brand', type: 'select', required: true, order: 2 },
      { name: 'part_type', label: 'Part Type', type: 'select', required: true, order: 3 },
    ],
  },
  'properties': {
    'apartments': [
      { name: 'bedrooms', label: 'Bedrooms', type: 'number', required: false, order: 2 },
      { name: 'bathrooms', label: 'Bathrooms', type: 'number', required: false, order: 3 },
      { name: 'area_sqft', label: 'Area (Sq Ft)', type: 'number', required: true, order: 4 },
      { name: 'furnished', label: 'Furnished', type: 'select', required: false, order: 5 },
    ],
    'houses': [
      { name: 'bedrooms', label: 'Bedrooms', type: 'number', required: false, order: 2 },
      { name: 'bathrooms', label: 'Bathrooms', type: 'number', required: false, order: 3 },
      { name: 'area_sqft', label: 'Area (Sq Ft)', type: 'number', required: true, order: 4 },
      { name: 'furnished', label: 'Furnished', type: 'select', required: false, order: 5 },
    ],
    'plots': [
      { name: 'area_sqft', label: 'Area (Sq Ft)', type: 'number', required: true, order: 2 },
      { name: 'plot_type', label: 'Plot Type', type: 'select', required: false, order: 3 },
    ],
    'commercial-space': [
      { name: 'area_sqft', label: 'Area (Sq Ft)', type: 'number', required: true, order: 2 },
      { name: 'property_type', label: 'Property Type', type: 'select', required: true, order: 3 },
    ],
    'pg-hostel': [
      { name: 'accommodation_type', label: 'Accommodation Type', type: 'select', required: true, order: 2 },
      { name: 'sharing', label: 'Sharing', type: 'select', required: false, order: 3 },
    ],
  },
  'home-furniture': {
    'sofa': [
      { name: 'type', label: 'Type', type: 'select', required: true, order: 2 },
      { name: 'material', label: 'Material', type: 'select', required: false, order: 3 },
      { name: 'seating_capacity', label: 'Seating Capacity', type: 'number', required: false, order: 4 },
    ],
    'beds': [
      { name: 'size', label: 'Size', type: 'select', required: true, order: 2 },
      { name: 'material', label: 'Material', type: 'select', required: false, order: 3 },
    ],
    'wardrobe': [
      { name: 'type', label: 'Type', type: 'select', required: true, order: 2 },
      { name: 'material', label: 'Material', type: 'select', required: false, order: 3 },
    ],
    'tables': [
      { name: 'type', label: 'Type', type: 'select', required: true, order: 2 },
      { name: 'material', label: 'Material', type: 'select', required: false, order: 3 },
    ],
    'home-decor': [
      { name: 'type', label: 'Type', type: 'select', required: true, order: 2 },
      { name: 'material', label: 'Material', type: 'select', required: false, order: 3 },
    ],
    'lighting': [
      { name: 'type', label: 'Type', type: 'select', required: true, order: 2 },
      { name: 'wattage', label: 'Wattage', type: 'text', required: false, order: 3 },
    ],
  },
  'fashion': {
    'men': [
      { name: 'brand', label: 'Brand', type: 'select', required: true, order: 2 },
      { name: 'size', label: 'Size', type: 'select', required: true, order: 3 },
      { name: 'type', label: 'Type', type: 'select', required: true, order: 4 },
    ],
    'women': [
      { name: 'brand', label: 'Brand', type: 'select', required: true, order: 2 },
      { name: 'size', label: 'Size', type: 'select', required: true, order: 3 },
      { name: 'type', label: 'Type', type: 'select', required: true, order: 4 },
    ],
    'kids': [
      { name: 'brand', label: 'Brand', type: 'select', required: true, order: 2 },
      { name: 'size', label: 'Size', type: 'select', required: true, order: 3 },
      { name: 'age_group', label: 'Age Group', type: 'select', required: false, order: 4 },
    ],
    'watches': [
      { name: 'brand', label: 'Brand', type: 'select', required: true, order: 2 },
      { name: 'type', label: 'Type', type: 'select', required: true, order: 3 },
    ],
    'jewellery': [
      { name: 'type', label: 'Type', type: 'select', required: true, order: 2 },
      { name: 'material', label: 'Material', type: 'select', required: true, order: 3 },
    ],
    'footwear': [
      { name: 'brand', label: 'Brand', type: 'select', required: true, order: 2 },
      { name: 'size', label: 'Size', type: 'select', required: true, order: 3 },
      { name: 'type', label: 'Type', type: 'select', required: true, order: 4 },
    ],
    'bags': [
      { name: 'brand', label: 'Brand', type: 'select', required: true, order: 2 },
      { name: 'type', label: 'Type', type: 'select', required: true, order: 3 },
    ],
  },
  'books-sports-hobbies': {
    'books': [
      { name: 'title', label: 'Title', type: 'text', required: false, order: 2 },
      { name: 'author', label: 'Author', type: 'text', required: false, order: 3 },
      { name: 'edition', label: 'Edition', type: 'text', required: false, order: 4 },
    ],
    'musical-instruments': [
      { name: 'brand', label: 'Brand', type: 'select', required: true, order: 2 },
      { name: 'type', label: 'Instrument Type', type: 'select', required: true, order: 3 },
    ],
    'sports-gear': [
      { name: 'brand', label: 'Brand', type: 'select', required: true, order: 2 },
      { name: 'type', label: 'Equipment Type', type: 'select', required: true, order: 3 },
    ],
    'art-craft': [
      { name: 'type', label: 'Type', type: 'select', required: true, order: 2 },
      { name: 'material', label: 'Material', type: 'select', required: false, order: 3 },
    ],
    'toys': [
      { name: 'brand', label: 'Brand', type: 'select', required: true, order: 2 },
      { name: 'age_group', label: 'Age Group', type: 'select', required: false, order: 3 },
    ],
    'collectibles': [
      { name: 'type', label: 'Type', type: 'select', required: true, order: 2 },
      { name: 'year', label: 'Year', type: 'number', required: false, order: 3 },
    ],
  },
  'services': {
    'professional-services': [
      { name: 'service_type', label: 'Service Type', type: 'select', required: true, order: 2 },
      { name: 'experience', label: 'Years of Experience', type: 'number', required: false, order: 3 },
    ],
    'home-services': [
      { name: 'service_type', label: 'Service Type', type: 'select', required: true, order: 2 },
    ],
    'event-services': [
      { name: 'service_type', label: 'Service Type', type: 'select', required: true, order: 2 },
      { name: 'event_type', label: 'Event Type', type: 'select', required: false, order: 3 },
    ],
    'tutoring': [
      { name: 'subject', label: 'Subject', type: 'select', required: true, order: 2 },
      { name: 'level', label: 'Level', type: 'select', required: false, order: 3 },
    ],
  },
  'jobs': {
    'full-time': [
      { name: 'job_title', label: 'Job Title', type: 'text', required: true, order: 2 },
      { name: 'experience_required', label: 'Experience Required', type: 'text', required: false, order: 3 },
      { name: 'salary_range', label: 'Salary Range', type: 'text', required: false, order: 4 },
    ],
    'part-time': [
      { name: 'job_title', label: 'Job Title', type: 'text', required: true, order: 2 },
      { name: 'hours_per_week', label: 'Hours Per Week', type: 'number', required: false, order: 3 },
      { name: 'salary_range', label: 'Salary Range', type: 'text', required: false, order: 4 },
    ],
    'freelance': [
      { name: 'job_title', label: 'Job Title', type: 'text', required: true, order: 2 },
      { name: 'project_type', label: 'Project Type', type: 'select', required: false, order: 3 },
      { name: 'budget', label: 'Budget', type: 'text', required: false, order: 4 },
    ],
    'internships': [
      { name: 'job_title', label: 'Job Title', type: 'text', required: true, order: 2 },
      { name: 'duration', label: 'Duration', type: 'text', required: false, order: 3 },
      { name: 'stipend', label: 'Stipend', type: 'text', required: false, order: 4 },
    ],
  },
  'pets': {
    'dogs': [
      { name: 'breed', label: 'Breed', type: 'text', required: false, order: 2 },
      { name: 'age', label: 'Age', type: 'text', required: false, order: 3 },
      { name: 'gender', label: 'Gender', type: 'select', required: false, order: 4 },
    ],
    'cats': [
      { name: 'breed', label: 'Breed', type: 'text', required: false, order: 2 },
      { name: 'age', label: 'Age', type: 'text', required: false, order: 3 },
      { name: 'gender', label: 'Gender', type: 'select', required: false, order: 4 },
    ],
    'birds': [
      { name: 'species', label: 'Species', type: 'text', required: false, order: 2 },
      { name: 'age', label: 'Age', type: 'text', required: false, order: 3 },
    ],
    'fish': [
      { name: 'species', label: 'Species', type: 'text', required: false, order: 2 },
      { name: 'quantity', label: 'Quantity', type: 'number', required: false, order: 3 },
    ],
    'pet-accessories': [
      { name: 'type', label: 'Type', type: 'select', required: true, order: 2 },
      { name: 'brand', label: 'Brand', type: 'select', required: false, order: 3 },
    ],
    'pet-services': [
      { name: 'service_type', label: 'Service Type', type: 'select', required: true, order: 2 },
    ],
  },
};

// Common options for select fields
const selectOptions = {
  condition: ['New', 'Like New', 'Excellent', 'Good', 'Fair', 'Poor'],
  ram: ['2 GB', '4 GB', '6 GB', '8 GB', '12 GB', '16 GB', '32 GB'],
  storage: ['32 GB', '64 GB', '128 GB', '256 GB', '512 GB', '1 TB'],
  color: ['Black', 'White', 'Blue', 'Red', 'Green', 'Gold', 'Silver', 'Grey'],
  fuel_type: ['Petrol', 'Diesel', 'Electric', 'CNG', 'Hybrid'],
  transmission: ['Manual', 'Automatic', 'CVT', 'AMT'],
  size: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  material: ['Wood', 'Metal', 'Plastic', 'Leather', 'Fabric', 'Glass'],
  gender: ['Male', 'Female'],
  // Brand options - popular brands across categories
  brand: [
    'Samsung', 'Apple', 'Xiaomi', 'Vivo', 'Oppo', 'OnePlus', 'Realme', 'Motorola', 
    'Google', 'Nokia', 'Sony', 'LG', 'HP', 'Dell', 'Lenovo', 'Asus', 'Acer',
    'Maruti', 'Hyundai', 'Honda', 'Toyota', 'Ford', 'Mahindra', 'Tata', 'Bajaj',
    'Hero', 'TVS', 'Yamaha', 'Royal Enfield', 'IKEA', 'Godrej', 'Nilkamal'
  ],
  // Model - leave empty, will be fetched dynamically based on brand selection
  model: [],
  type: ['Standard', 'Premium', 'Basic', 'Deluxe', 'Professional'],
  service_type: ['Repair', 'Installation', 'Maintenance', 'Consultation', 'Training'],
  event_type: ['Wedding', 'Birthday', 'Corporate', 'Festival', 'Concert'],
  subject: ['Math', 'Science', 'English', 'Computer', 'Music', 'Art'],
  level: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
  project_type: ['Web Development', 'Mobile App', 'Design', 'Writing', 'Marketing'],
  accommodation_type: ['Single', 'Double', 'Triple', 'Dormitory'],
  sharing: ['Single Occupancy', 'Double Sharing', 'Triple Sharing', '4+ Sharing'],
  property_type: ['Apartment', 'House', 'Villa', 'Plot', 'Commercial'],
  plot_type: ['Residential', 'Commercial', 'Agricultural', 'Industrial'],
  furnished: ['Fully Furnished', 'Semi Furnished', 'Unfurnished'],
  part_type: ['Engine', 'Transmission', 'Brakes', 'Suspension', 'Body Parts', 'Electrical'],
  age_group: ['0-2 years', '3-5 years', '6-8 years', '9-12 years', '13+ years'],
};

async function seedAllSpecifications() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('📦 Seeding Specifications for All Categories & Subcategories');
    console.log('='.repeat(80) + '\n');

    // Get all categories with subcategories
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        subcategories: {
          where: { isActive: true },
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { order: 'asc' }
    });

    console.log(`📊 Found ${categories.length} active categories\n`);

    let totalSpecs = 0;
    let totalOptions = 0;

    for (const category of categories) {
      console.log(`\n📁 Category: ${category.name} (${category.slug})`);
      
      if (!category.subcategories || category.subcategories.length === 0) {
        console.log('   ⚠️  No subcategories found');
        continue;
      }

      for (const subcategory of category.subcategories) {
        console.log(`   📂 Subcategory: ${subcategory.name} (${subcategory.slug})`);

        // Get specifications for this category+subcategory combination
        const categorySlug = category.slug;
        const subcategorySlug = subcategory.slug;
        
        // Map category slug to categorySpecs key (handle legacy naming)
        // "electronics" category contains "mobiles" subcategories
        let categorySpecsKey = categorySlug;
        if (categorySlug === 'electronics') {
          // Map based on subcategory
          const mobileSubcategories = ['mobile-phones', 'tablets', 'accessories', 'smart-watches'];
          if (mobileSubcategories.includes(subcategorySlug)) {
            categorySpecsKey = 'mobiles';
          } else {
            categorySpecsKey = 'electronics-appliances';
          }
        }
        
        // Get category-specific specs or use empty array
        const categorySpecificSpecs = categorySpecs[categorySpecsKey]?.[subcategorySlug] || [];
        
        // For mobile-phones, use only category-specific specs (includes condition and price)
        // For other categories, combine common specs with category-specific specs
        const allSpecs = (categorySpecsKey === 'mobiles' && subcategorySlug === 'mobile-phones')
          ? categorySpecificSpecs.sort((a, b) => a.order - b.order)
          : [...commonSpecs, ...categorySpecificSpecs].sort((a, b) => a.order - b.order);

        for (const specData of allSpecs) {
          // Check if specification already exists
          const existingSpec = await prisma.specification.findFirst({
            where: {
              categoryId: category.id,
              subcategoryId: subcategory.id,
              name: specData.name,
              adId: null, // Only category defaults
            }
          });

          let spec;
          if (existingSpec) {
            // Update existing specification
            spec = await prisma.specification.update({
              where: { id: existingSpec.id },
              data: {
                label: specData.label,
                type: specData.type,
                required: specData.required,
                isActive: true,
                order: specData.order
              }
            });
            console.log(`      ✅ Updated: ${specData.name}`);
          } else {
            // Create new specification
            spec = await prisma.specification.create({
              data: {
                name: specData.name,
                label: specData.label,
                type: specData.type,
                required: specData.required,
                isActive: true,
                order: specData.order,
                categoryId: category.id,
                subcategoryId: subcategory.id,
                adId: null
              }
            });
            console.log(`      ✅ Created: ${specData.name} (${specData.type})`);
          }
          totalSpecs++;

          // Add options for select type specifications
          if (specData.type === 'select') {
            const options = selectOptions[specData.name] || [];
            
            if (options.length > 0) {
              for (let i = 0; i < options.length; i++) {
                const optionValue = options[i];
                
                const existingOption = await prisma.specificationOption.findFirst({
                  where: {
                    specificationId: spec.id,
                    value: optionValue
                  }
                });
                
                if (existingOption) {
                  await prisma.specificationOption.update({
                    where: { id: existingOption.id },
                    data: {
                      isActive: true,
                      order: i
                    }
                  });
                } else {
                  await prisma.specificationOption.create({
                    data: {
                      specificationId: spec.id,
                      value: optionValue,
                      label: optionValue,
                      isActive: true,
                      order: i
                    }
                  });
                  totalOptions++;
                }
              }
            }
          }
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Specifications Seeding Complete!');
    console.log('='.repeat(80));
    console.log(`   Total Specifications: ${totalSpecs}`);
    console.log(`   Total Options: ${totalOptions}`);
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Error seeding specifications:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedAllSpecifications();
