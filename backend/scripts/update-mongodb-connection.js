/**
 * Update MongoDB Connection String
 * Updates all MongoDB connection strings across the project
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Current MongoDB URI (update this if needed)
const MONGO_URI = 'mongodb+srv://b888:NQEbkx2JWyBNJz7Z@cluster0.cj9oi8t.mongodb.net/olx_app?retryWrites=true&w=majority&appName=Cluster0';

console.log('🔧 Updating MongoDB Connection Strings...\n');

// Files to update
const filesToUpdate = [
  {
    path: path.join(__dirname, '..', '.env'),
    patterns: [
      { search: /DATABASE_URL=.*/g, replace: `DATABASE_URL=${MONGO_URI}` },
      { search: /MONGO_URI=.*/g, replace: `MONGO_URI=${MONGO_URI}` }
    ]
  },
  {
    path: path.join(__dirname, 'fix-mongodb-connection.js'),
    patterns: [
      { search: /const MONGO_URI = ['"].*['"];/, replace: `const MONGO_URI = '${MONGO_URI}';` }
    ]
  },
  {
    path: path.join(__dirname, 'setup-mongodb.js'),
    patterns: [
      { search: /const MONGO_URI = process\.env\.MONGO_URI \|\| ['"].*['"];/, replace: `const MONGO_URI = process.env.MONGO_URI || '${MONGO_URI}';` }
    ]
  },
  {
    path: path.join(__dirname, 'complete-db-setup.js'),
    patterns: [
      { search: /const MONGO_URI = ['"].*['"];/, replace: `const MONGO_URI = '${MONGO_URI}';` }
    ]
  }
];

let updatedCount = 0;

filesToUpdate.forEach(file => {
  if (fs.existsSync(file.path)) {
    try {
      let content = fs.readFileSync(file.path, 'utf8');
      let modified = false;

      file.patterns.forEach(pattern => {
        if (pattern.search.test(content)) {
          content = content.replace(pattern.search, pattern.replace);
          modified = true;
        }
      });

      if (modified) {
        fs.writeFileSync(file.path, content);
        console.log(`✅ Updated: ${path.relative(process.cwd(), file.path)}`);
        updatedCount++;
      } else {
        console.log(`⏭️  Skipped: ${path.relative(process.cwd(), file.path)} (no matches)`);
      }
    } catch (error) {
      console.error(`❌ Error updating ${file.path}:`, error.message);
    }
  } else {
    console.log(`⚠️  File not found: ${path.relative(process.cwd(), file.path)}`);
  }
});

// Update PowerShell scripts
const psFiles = [
  {
    path: path.join(__dirname, '..', 'FINAL_MONGODB_FIX.ps1'),
    pattern: /\$mongoUri = ["'].*["']/
  },
  {
    path: path.join(__dirname, '..', 'update-env-mongodb.ps1'),
    pattern: /\$mongoUri = ["'].*["']/
  }
];

psFiles.forEach(file => {
  if (fs.existsSync(file.path)) {
    try {
      let content = fs.readFileSync(file.path, 'utf8');
      if (file.pattern.test(content)) {
        content = content.replace(file.pattern, `$mongoUri = "${MONGO_URI}"`);
        fs.writeFileSync(file.path, content);
        console.log(`✅ Updated: ${path.relative(process.cwd(), file.path)}`);
        updatedCount++;
      }
    } catch (error) {
      console.error(`❌ Error updating ${file.path}:`, error.message);
    }
  }
});

console.log(`\n✅ Updated ${updatedCount} file(s)`);
console.log(`\n📋 MongoDB URI: ${MONGO_URI.substring(0, 50)}...`);
console.log('\n💡 Next steps:');
console.log('   1. Run: node scripts/fix-mongodb-connection.js');
console.log('   2. Run: npm run prisma:generate');
console.log('   3. Test: node scripts/check-mongodb-ready.js');
console.log('   4. Start server: npm run dev\n');
