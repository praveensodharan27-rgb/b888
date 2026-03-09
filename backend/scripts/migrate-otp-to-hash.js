/**
 * Migrate OTP table: remove old records that use plaintext `code` field.
 * Run once after deploying the enterprise OTP system (hash-based).
 * New schema uses `hash` instead of `code`.
 */

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing legacy OTP records (old schema used `code`, new uses `hash`)...');
  const result = await prisma.oTP.deleteMany({});
  console.log(`Deleted ${result.count} OTP records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
