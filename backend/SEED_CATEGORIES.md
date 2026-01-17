# Seed All Categories in Database

## 📋 Overview

This guide will help you seed all categories and subcategories into your MongoDB database.

## ✅ Quick Start

Run this command in PowerShell:

```powershell
cd d:\sellit\backend
npm run seed-all-categories
```

Or use the PowerShell script:

```powershell
cd d:\sellit\backend
powershell -ExecutionPolicy Bypass -File .\seed-categories.ps1
```

## 📦 What Gets Created

The script creates **15 main categories** with **75+ subcategories**:

1. **Mobiles** (4 subcategories)
   - Mobile Phones, Tablets, Smart Watches, Accessories

2. **Electronics & Appliances** (6 subcategories)
   - TVs, Laptops, Cameras, Home Appliances, Kitchen Appliances, Gaming Consoles

3. **Vehicles** (6 subcategories)
   - Cars, Motorcycles, Scooters, Bicycles, Commercial Vehicles, Spare Parts

4. **Properties** (5 subcategories)
   - Apartments, Houses, Plots, Commercial Space, PG/Hostel

5. **Home & Furniture** (6 subcategories)
   - Sofa, Beds, Wardrobe, Tables, Home Decor, Lighting

6. **Fashion** (7 subcategories)
   - Men, Women, Kids, Watches, Jewellery, Footwear, Bags

7. **Books, Sports & Hobbies** (6 subcategories)
   - Books, Musical Instruments, Sports Gear, Art & Craft, Toys, Collectibles

8. **Pets** (5 subcategories)
   - Dogs, Cats, Birds, Fish, Pet Accessories

9. **Services** (6 subcategories)
   - Repair Services, Cleaning, Beauty / Spa, Education, Events, Business Services

10. **Jobs** (5 subcategories)
    - Full-time, Part-time, Freelance, Internship, Contract

11. **Commercial & Industrial** (4 subcategories)
    - Industrial Machines, Tools, Medical Equipment, Packaging Machines

12. **Free Stuff** (3 subcategories)
    - Free Furniture, Free Electronics, Misc Free

13. **Baby & Kids** (5 subcategories)
    - Clothes, Toys, Strollers, Cribs, Kids Furniture

14. **Beauty & Health** (4 subcategories)
    - Cosmetics, Skincare, Medical Devices, Supplements

15. **Other / Misc** (4 subcategories)
    - Agriculture, Office Supplies, Antiques, Miscellaneous

## 🔍 Verify Categories

After seeding, verify the categories were created:

```powershell
node verify-categories.js
```

This will show:
- Total number of categories
- List of all categories with their subcategories
- Summary statistics

## ⚠️ Prerequisites

1. **MongoDB Connection**: Ensure your `DATABASE_URL` in `.env` is correct
   ```powershell
   node fix-url-simple.js
   ```

2. **Prisma Client**: Regenerate Prisma Client if needed
   ```powershell
   npm run prisma:generate
   ```

3. **Test Connection**: Verify MongoDB connection works
   ```powershell
   npm run test-mongodb
   ```

## 🔄 How It Works

The script uses `upsert` operations, which means:
- **If category exists**: Updates the name, description, and order
- **If category doesn't exist**: Creates a new category
- **Subcategories**: Same behavior - updates if exists, creates if new

This means you can run the script multiple times safely without creating duplicates.

## 📝 Script Location

- **Main Script**: `backend/scripts/seed-all-categories.js`
- **Verification Script**: `backend/verify-categories.js`
- **PowerShell Wrapper**: `backend/seed-categories.ps1`

## 🐛 Troubleshooting

### Error: "authentication failed"
```powershell
# Fix MongoDB password
node fix-url-simple.js
npm run prisma:generate
npm run seed-all-categories
```

### Error: "DATABASE_URL must start with mongodb"
```powershell
# Fix DATABASE_URL protocol
node fix-url-simple.js
npm run prisma:generate
npm run seed-all-categories
```

### No Output
If you don't see output, try running directly:
```powershell
node scripts/seed-all-categories.js
```

## ✅ Success Indicators

You should see output like:
```
📦 Seeding all categories and subcategories...
✅ Category created/updated: Mobiles
  ✅ Subcategory: Mobile Phones
  ✅ Subcategory: Tablets
  ...
✅ All categories and subcategories seeding completed!
```

## 📋 Next Steps

After seeding categories:

1. **Seed Locations** (if needed):
   ```powershell
   npm run seed-locations
   ```

2. **Add Dummy Data**:
   ```powershell
   npm run add-dummy-data
   ```

3. **Start Server**:
   ```powershell
   npm run dev
   ```

## 📚 Related Commands

- `npm run seed-all-categories` - Seed all categories
- `npm run seed-mobiles` - Seed only Mobiles category
- `npm run seed-locations` - Seed locations
- `node verify-categories.js` - Verify categories in database
