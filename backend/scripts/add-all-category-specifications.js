/**
 * Script to add specifications for all categories
 * Run: node backend/scripts/add-all-category-specifications.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CATEGORY_SPECIFICATIONS = {
  vehicles: {
    name: 'Vehicles',
    slug: 'vehicles',
    specs: [
      {
        name: 'brand',
        label: 'Brand',
        type: 'text',
        required: true,
        placeholder: 'e.g. Maruti, Honda, Toyota',
        order: 1
      },
      {
        name: 'model',
        label: 'Model',
        type: 'text',
        required: true,
        placeholder: 'e.g. Swift, City, Innova',
        order: 2
      },
      {
        name: 'year',
        label: 'Year',
        type: 'number',
        required: false,
        placeholder: 'e.g. 2020',
        order: 3
      },
      {
        name: 'fuel_type',
        label: 'Fuel Type',
        type: 'select',
        required: false,
        placeholder: 'Select Fuel Type',
        order: 4,
        options: [
          { value: 'petrol', label: 'Petrol' },
          { value: 'diesel', label: 'Diesel' },
          { value: 'cng', label: 'CNG' },
          { value: 'lpg', label: 'LPG' },
          { value: 'electric', label: 'Electric' },
          { value: 'hybrid', label: 'Hybrid' }
        ]
      },
      {
        name: 'km_driven',
        label: 'KM Driven',
        type: 'number',
        required: false,
        placeholder: 'e.g. 50000',
        order: 5
      },
      {
        name: 'owner_type',
        label: 'Owner Type',
        type: 'select',
        required: false,
        placeholder: 'Select Owner Type',
        order: 6,
        options: [
          { value: 'first_owner', label: 'First Owner' },
          { value: 'second_owner', label: 'Second Owner' },
          { value: 'third_owner', label: 'Third Owner' },
          { value: 'fourth_owner_plus', label: 'Fourth Owner & Above' }
        ]
      },
      {
        name: 'transmission',
        label: 'Transmission',
        type: 'select',
        required: false,
        placeholder: 'Select Transmission',
        order: 7,
        options: [
          { value: 'manual', label: 'Manual' },
          { value: 'automatic', label: 'Automatic' },
          { value: 'cvt', label: 'CVT' },
          { value: 'amt', label: 'AMT' }
        ]
      },
      {
        name: 'insurance_status',
        label: 'Insurance Status',
        type: 'select',
        required: false,
        placeholder: 'Select Insurance Status',
        order: 8,
        options: [
          { value: 'valid', label: 'Valid' },
          { value: 'expired', label: 'Expired' },
          { value: 'not_available', label: 'Not Available' }
        ]
      },
      {
        name: 'color',
        label: 'Color',
        type: 'text',
        required: false,
        placeholder: 'e.g. White, Black, Red',
        order: 9
      }
    ]
  },
  properties: {
    name: 'Properties',
    slug: 'properties',
    specs: [
      {
        name: 'property_type',
        label: 'Property Type',
        type: 'select',
        required: true,
        placeholder: 'Select Property Type',
        order: 1,
        options: [
          { value: 'apartment', label: 'Apartment' },
          { value: 'house', label: 'House' },
          { value: 'villa', label: 'Villa' },
          { value: 'plot', label: 'Plot' },
          { value: 'commercial', label: 'Commercial' },
          { value: 'office', label: 'Office' },
          { value: 'shop', label: 'Shop' },
          { value: 'warehouse', label: 'Warehouse' },
          { value: 'land', label: 'Land' }
        ]
      },
      {
        name: 'area_sqft',
        label: 'Area (Sqft)',
        type: 'number',
        required: false,
        placeholder: 'e.g. 1200',
        order: 2
      },
      {
        name: 'bedrooms',
        label: 'Bedrooms',
        type: 'select',
        required: false,
        placeholder: 'Select Bedrooms',
        order: 3,
        options: [
          { value: '1', label: '1 BHK' },
          { value: '2', label: '2 BHK' },
          { value: '3', label: '3 BHK' },
          { value: '4', label: '4 BHK' },
          { value: '5', label: '5 BHK' },
          { value: '5+', label: '5+ BHK' },
          { value: 'studio', label: 'Studio' }
        ]
      },
      {
        name: 'bathrooms',
        label: 'Bathrooms',
        type: 'select',
        required: false,
        placeholder: 'Select Bathrooms',
        order: 4,
        options: [
          { value: '1', label: '1' },
          { value: '2', label: '2' },
          { value: '3', label: '3' },
          { value: '4', label: '4' },
          { value: '5+', label: '5+' }
        ]
      },
      {
        name: 'furnishing',
        label: 'Furnishing',
        type: 'select',
        required: false,
        placeholder: 'Select Furnishing',
        order: 5,
        options: [
          { value: 'furnished', label: 'Furnished' },
          { value: 'semi_furnished', label: 'Semi-Furnished' },
          { value: 'unfurnished', label: 'Unfurnished' }
        ]
      },
      {
        name: 'parking',
        label: 'Parking',
        type: 'select',
        required: false,
        placeholder: 'Select Parking',
        order: 6,
        options: [
          { value: '0', label: 'No Parking' },
          { value: '1', label: '1 Parking' },
          { value: '2', label: '2 Parking' },
          { value: '3', label: '3 Parking' },
          { value: '4+', label: '4+ Parking' }
        ]
      },
      {
        name: 'facing',
        label: 'Facing',
        type: 'select',
        required: false,
        placeholder: 'Select Facing',
        order: 7,
        options: [
          { value: 'north', label: 'North' },
          { value: 'south', label: 'South' },
          { value: 'east', label: 'East' },
          { value: 'west', label: 'West' },
          { value: 'north_east', label: 'North-East' },
          { value: 'north_west', label: 'North-West' },
          { value: 'south_east', label: 'South-East' },
          { value: 'south_west', label: 'South-West' }
        ]
      },
      {
        name: 'ownership_type',
        label: 'Ownership Type',
        type: 'select',
        required: false,
        placeholder: 'Select Ownership Type',
        order: 8,
        options: [
          { value: 'freehold', label: 'Freehold' },
          { value: 'leasehold', label: 'Leasehold' },
          { value: 'cooperative', label: 'Cooperative' },
          { value: 'power_of_attorney', label: 'Power of Attorney' }
        ]
      },
      {
        name: 'price_range',
        label: 'Price Range',
        type: 'text',
        required: false,
        placeholder: 'e.g. ₹50,00,000 - ₹1,00,00,000',
        order: 9
      }
    ]
  },
  'home-furniture': {
    name: 'Home & Furniture',
    slug: 'home-furniture',
    specs: [
      {
        name: 'material',
        label: 'Material',
        type: 'text',
        required: false,
        placeholder: 'e.g. Wood, Metal, Plastic',
        order: 1
      },
      {
        name: 'brand',
        label: 'Brand',
        type: 'text',
        required: false,
        placeholder: 'e.g. IKEA, Godrej',
        order: 2
      },
      {
        name: 'condition',
        label: 'Condition',
        type: 'select',
        required: false,
        placeholder: 'Select Condition',
        order: 3,
        options: [
          { value: 'new', label: 'New' },
          { value: 'like_new', label: 'Like New' },
          { value: 'excellent', label: 'Excellent' },
          { value: 'good', label: 'Good' },
          { value: 'fair', label: 'Fair' }
        ]
      },
      {
        name: 'color',
        label: 'Color',
        type: 'text',
        required: false,
        placeholder: 'e.g. Brown, White, Black',
        order: 4
      },
      {
        name: 'dimensions',
        label: 'Dimensions',
        type: 'text',
        required: false,
        placeholder: 'e.g. 120cm x 60cm x 75cm',
        order: 5
      },
      {
        name: 'assembly_required',
        label: 'Assembly Required',
        type: 'select',
        required: false,
        placeholder: 'Select',
        order: 6,
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
          { value: 'pre_assembled', label: 'Pre-Assembled' }
        ]
      },
      {
        name: 'price_range',
        label: 'Price Range',
        type: 'text',
        required: false,
        placeholder: 'e.g. ₹5,000 - ₹20,000',
        order: 7
      }
    ]
  },
  fashion: {
    name: 'Fashion',
    slug: 'fashion',
    specs: [
      {
        name: 'brand',
        label: 'Brand',
        type: 'text',
        required: false,
        placeholder: 'e.g. Zara, H&M, Levi\'s',
        order: 1
      },
      {
        name: 'size',
        label: 'Size',
        type: 'text',
        required: false,
        placeholder: 'e.g. S, M, L, XL, 32, 36',
        order: 2
      },
      {
        name: 'color',
        label: 'Color',
        type: 'text',
        required: false,
        placeholder: 'e.g. Red, Blue, Black',
        order: 3
      },
      {
        name: 'gender',
        label: 'Gender',
        type: 'select',
        required: false,
        placeholder: 'Select Gender',
        order: 4,
        options: [
          { value: 'men', label: 'Men' },
          { value: 'women', label: 'Women' },
          { value: 'boys', label: 'Boys' },
          { value: 'girls', label: 'Girls' },
          { value: 'unisex', label: 'Unisex' }
        ]
      },
      {
        name: 'material',
        label: 'Material',
        type: 'text',
        required: false,
        placeholder: 'e.g. Cotton, Polyester, Denim',
        order: 5
      },
      {
        name: 'fit_type',
        label: 'Fit Type',
        type: 'select',
        required: false,
        placeholder: 'Select Fit Type',
        order: 6,
        options: [
          { value: 'slim', label: 'Slim' },
          { value: 'regular', label: 'Regular' },
          { value: 'loose', label: 'Loose' },
          { value: 'skinny', label: 'Skinny' },
          { value: 'relaxed', label: 'Relaxed' }
        ]
      },
      {
        name: 'condition',
        label: 'Condition',
        type: 'select',
        required: false,
        placeholder: 'Select Condition',
        order: 7,
        options: [
          { value: 'new', label: 'New' },
          { value: 'like_new', label: 'Like New' },
          { value: 'excellent', label: 'Excellent' },
          { value: 'good', label: 'Good' },
          { value: 'fair', label: 'Fair' }
        ]
      },
      {
        name: 'price_range',
        label: 'Price Range',
        type: 'text',
        required: false,
        placeholder: 'e.g. ₹500 - ₹5,000',
        order: 8
      }
    ]
  },
  'books-sports-hobbies': {
    name: 'Books, Sports & Hobbies',
    slug: 'books-sports-hobbies',
    specs: [
      {
        name: 'category_type',
        label: 'Category Type',
        type: 'text',
        required: false,
        placeholder: 'e.g. Fiction, Sports Equipment, Musical Instrument',
        order: 1
      },
      {
        name: 'brand',
        label: 'Brand',
        type: 'text',
        required: false,
        placeholder: 'e.g. Nike, Adidas, Penguin',
        order: 2
      },
      {
        name: 'author_maker',
        label: 'Author / Maker',
        type: 'text',
        required: false,
        placeholder: 'e.g. J.K. Rowling, Company Name',
        order: 3
      },
      {
        name: 'language',
        label: 'Language',
        type: 'select',
        required: false,
        placeholder: 'Select Language',
        order: 4,
        options: [
          { value: 'english', label: 'English' },
          { value: 'hindi', label: 'Hindi' },
          { value: 'malayalam', label: 'Malayalam' },
          { value: 'tamil', label: 'Tamil' },
          { value: 'telugu', label: 'Telugu' },
          { value: 'kannada', label: 'Kannada' },
          { value: 'bengali', label: 'Bengali' },
          { value: 'gujarati', label: 'Gujarati' },
          { value: 'marathi', label: 'Marathi' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        name: 'age_group',
        label: 'Age Group',
        type: 'select',
        required: false,
        placeholder: 'Select Age Group',
        order: 5,
        options: [
          { value: '0-2', label: '0-2 years' },
          { value: '3-5', label: '3-5 years' },
          { value: '6-8', label: '6-8 years' },
          { value: '9-12', label: '9-12 years' },
          { value: '13-17', label: '13-17 years' },
          { value: '18+', label: '18+ years' },
          { value: 'all_ages', label: 'All Ages' }
        ]
      },
      {
        name: 'condition',
        label: 'Condition',
        type: 'select',
        required: false,
        placeholder: 'Select Condition',
        order: 6,
        options: [
          { value: 'new', label: 'New' },
          { value: 'like_new', label: 'Like New' },
          { value: 'excellent', label: 'Excellent' },
          { value: 'good', label: 'Good' },
          { value: 'fair', label: 'Fair' }
        ]
      },
      {
        name: 'price_range',
        label: 'Price Range',
        type: 'text',
        required: false,
        placeholder: 'e.g. ₹100 - ₹5,000',
        order: 7
      }
    ]
  },
  pets: {
    name: 'Pets',
    slug: 'pets',
    specs: [
      {
        name: 'breed',
        label: 'Breed',
        type: 'text',
        required: false,
        placeholder: 'e.g. Golden Retriever, Persian Cat',
        order: 1
      },
      {
        name: 'age',
        label: 'Age',
        type: 'text',
        required: false,
        placeholder: 'e.g. 2 months, 1 year',
        order: 2
      },
      {
        name: 'gender',
        label: 'Gender',
        type: 'select',
        required: false,
        placeholder: 'Select Gender',
        order: 3,
        options: [
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' }
        ]
      },
      {
        name: 'vaccinated',
        label: 'Vaccinated',
        type: 'select',
        required: false,
        placeholder: 'Select',
        order: 4,
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
          { value: 'partially', label: 'Partially' }
        ]
      },
      {
        name: 'trained',
        label: 'Trained',
        type: 'select',
        required: false,
        placeholder: 'Select',
        order: 5,
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
          { value: 'basic', label: 'Basic Training' }
        ]
      },
      {
        name: 'with_papers',
        label: 'With Papers',
        type: 'select',
        required: false,
        placeholder: 'Select',
        order: 6,
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' }
        ]
      },
      {
        name: 'color',
        label: 'Color',
        type: 'text',
        required: false,
        placeholder: 'e.g. Golden, Black, White',
        order: 7
      },
      {
        name: 'price_range',
        label: 'Price Range',
        type: 'text',
        required: false,
        placeholder: 'e.g. ₹5,000 - ₹50,000',
        order: 8
      }
    ]
  },
  services: {
    name: 'Services',
    slug: 'services',
    specs: [
      {
        name: 'service_type',
        label: 'Service Type',
        type: 'text',
        required: false,
        placeholder: 'e.g. Plumbing, Electrician, Tutor',
        order: 1
      },
      {
        name: 'experience_level',
        label: 'Experience Level',
        type: 'select',
        required: false,
        placeholder: 'Select Experience Level',
        order: 2,
        options: [
          { value: 'beginner', label: 'Beginner (0-1 years)' },
          { value: 'intermediate', label: 'Intermediate (2-5 years)' },
          { value: 'experienced', label: 'Experienced (5-10 years)' },
          { value: 'expert', label: 'Expert (10+ years)' }
        ]
      },
      {
        name: 'availability',
        label: 'Availability',
        type: 'select',
        required: false,
        placeholder: 'Select Availability',
        order: 3,
        options: [
          { value: 'full_time', label: 'Full Time' },
          { value: 'part_time', label: 'Part Time' },
          { value: 'weekends_only', label: 'Weekends Only' },
          { value: 'flexible', label: 'Flexible' }
        ]
      },
      {
        name: 'service_mode',
        label: 'Service Mode',
        type: 'select',
        required: false,
        placeholder: 'Select Service Mode',
        order: 4,
        options: [
          { value: 'online', label: 'Online' },
          { value: 'offline', label: 'Offline' },
          { value: 'both', label: 'Both' }
        ]
      },
      {
        name: 'location',
        label: 'Location',
        type: 'text',
        required: false,
        placeholder: 'e.g. City, Area',
        order: 5
      },
      {
        name: 'price_range',
        label: 'Price Range',
        type: 'text',
        required: false,
        placeholder: 'e.g. ₹500 - ₹5,000 per hour',
        order: 6
      }
    ]
  },
  jobs: {
    name: 'Jobs',
    slug: 'jobs',
    specs: [
      {
        name: 'job_role',
        label: 'Job Role',
        type: 'text',
        required: false,
        placeholder: 'e.g. Software Developer, Sales Executive',
        order: 1
      },
      {
        name: 'experience_level',
        label: 'Experience Level',
        type: 'select',
        required: false,
        placeholder: 'Select Experience Level',
        order: 2,
        options: [
          { value: 'fresher', label: 'Fresher (0 years)' },
          { value: '0-1', label: '0-1 years' },
          { value: '1-3', label: '1-3 years' },
          { value: '3-5', label: '3-5 years' },
          { value: '5-10', label: '5-10 years' },
          { value: '10+', label: '10+ years' }
        ]
      },
      {
        name: 'job_type',
        label: 'Job Type',
        type: 'select',
        required: false,
        placeholder: 'Select Job Type',
        order: 3,
        options: [
          { value: 'full_time', label: 'Full Time' },
          { value: 'part_time', label: 'Part Time' },
          { value: 'contract', label: 'Contract' },
          { value: 'internship', label: 'Internship' },
          { value: 'freelance', label: 'Freelance' }
        ]
      },
      {
        name: 'work_mode',
        label: 'Work Mode',
        type: 'select',
        required: false,
        placeholder: 'Select Work Mode',
        order: 4,
        options: [
          { value: 'work_from_home', label: 'Work From Home' },
          { value: 'office', label: 'Office' },
          { value: 'hybrid', label: 'Hybrid' },
          { value: 'field', label: 'Field Work' }
        ]
      },
      {
        name: 'qualification',
        label: 'Qualification',
        type: 'text',
        required: false,
        placeholder: 'e.g. B.Tech, MBA, Diploma',
        order: 5
      },
      {
        name: 'salary_range',
        label: 'Salary Range',
        type: 'text',
        required: false,
        placeholder: 'e.g. ₹20,000 - ₹50,000 per month',
        order: 6
      },
      {
        name: 'location',
        label: 'Location',
        type: 'text',
        required: false,
        placeholder: 'e.g. City, Area',
        order: 7
      }
    ]
  }
};

async function addAllCategorySpecifications() {
  try {
    console.log('🔍 Finding categories and adding specifications...\n');

    const results = [];

    for (const [categoryKey, categoryData] of Object.entries(CATEGORY_SPECIFICATIONS)) {
      try {
        // Find category by slug or name
        const category = await prisma.category.findFirst({
          where: {
            OR: [
              { slug: categoryData.slug },
              { slug: categoryKey },
              { name: { contains: categoryData.name, mode: 'insensitive' } }
            ]
          }
        });

        if (!category) {
          console.log(`⚠️  Category "${categoryData.name}" not found. Skipping...`);
          results.push({ category: categoryData.name, status: 'skipped', reason: 'category not found' });
          continue;
        }

        console.log(`✅ Found category: ${category.name} (${category.slug})`);
        console.log(`📝 Adding ${categoryData.specs.length} specifications...`);

        let createdCount = 0;
        let skippedCount = 0;

        for (const specData of categoryData.specs) {
          try {
            // Check if specification already exists
            const existing = await prisma.specification.findFirst({
              where: {
                name: specData.name,
                categoryId: category.id
              }
            });

            if (existing) {
              console.log(`   ⚠️  "${specData.label}" already exists. Skipping...`);
              skippedCount++;
              continue;
            }

            // Create specification
            const { options, ...specFields } = specData;
            const specification = await prisma.specification.create({
              data: {
                ...specFields,
                categoryId: category.id,
                subcategoryId: null
              }
            });

            console.log(`   ✅ Created: ${specification.label}`);

            // Create options if provided
            if (options && options.length > 0) {
              for (let i = 0; i < options.length; i++) {
                const option = options[i];
                await prisma.specificationOption.create({
                  data: {
                    value: option.value,
                    label: option.label || option.value,
                    specificationId: specification.id,
                    order: i
                  }
                });
              }
              console.log(`      └─ Added ${options.length} options`);
            }

            createdCount++;
          } catch (error) {
            console.error(`   ❌ Error creating "${specData.label}":`, error.message);
          }
        }

        results.push({
          category: categoryData.name,
          status: 'completed',
          created: createdCount,
          skipped: skippedCount
        });

        console.log(`\n📊 ${categoryData.name}: Created ${createdCount}, Skipped ${skippedCount}\n`);
      } catch (error) {
        console.error(`❌ Error processing ${categoryData.name}:`, error.message);
        results.push({ category: categoryData.name, status: 'error', error: error.message });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL SUMMARY');
    console.log('='.repeat(60));
    results.forEach(result => {
      const icon = result.status === 'completed' ? '✅' : result.status === 'skipped' ? '⚠️' : '❌';
      console.log(`${icon} ${result.category}: ${result.status}`);
      if (result.created !== undefined) {
        console.log(`   Created: ${result.created}, Skipped: ${result.skipped}`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    const totalCreated = results.reduce((sum, r) => sum + (r.created || 0), 0);
    const totalSkipped = results.reduce((sum, r) => sum + (r.skipped || 0), 0);
    const totalErrors = results.filter(r => r.status === 'error').length;

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Total Created: ${totalCreated}`);
    console.log(`⚠️  Total Skipped: ${totalSkipped}`);
    console.log(`❌ Total Errors: ${totalErrors}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addAllCategorySpecifications();
