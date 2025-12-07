const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const generateReferralCode = async (name, userId) => {
  let code;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  // Extract first 3 letters from name (uppercase, alphanumeric only)
  const namePart = name
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, 'X'); // Pad with X if name is too short

  while (!isUnique && attempts < maxAttempts) {
    // Generate random 6-character suffix
    const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 6);
    code = `${namePart}${randomPart}`;

    // Check if code already exists
    const existing = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true }
    });

    if (!existing) {
      isUnique = true;
    }

    attempts++;
  }

  // Fallback: if still not unique, use fully random code with user ID
  if (!isUnique) {
    const userIdPart = userId.substring(0, 4).toUpperCase();
    const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 4);
    code = `${userIdPart}${randomPart}`;
  }

  return code;
};

async function main() {
  console.log('🔄 Generating referral codes for existing users...');

  // Get all users without referral codes
  const users = await prisma.user.findMany({
    where: {
      referralCode: null
    },
    select: {
      id: true,
      name: true
    }
  });

  console.log(`Found ${users.length} users without referral codes`);

  for (const user of users) {
    try {
      const referralCode = await generateReferralCode(user.name, user.id);
      
      await prisma.user.update({
        where: { id: user.id },
        data: { referralCode }
      });

      console.log(`✅ Generated referral code for ${user.name}: ${referralCode}`);
    } catch (error) {
      console.error(`❌ Error generating referral code for ${user.name}:`, error.message);
    }
  }

  // Create wallets for users without wallets
  const usersWithoutWallets = await prisma.user.findMany({
    where: {
      wallet: null
    },
    select: {
      id: true,
      name: true
    }
  });

  console.log(`\n🔄 Creating wallets for ${usersWithoutWallets.length} users...`);

  for (const user of usersWithoutWallets) {
    try {
      await prisma.wallet.create({
        data: {
          userId: user.id,
          balance: 0
        }
      });

      console.log(`✅ Created wallet for ${user.name}`);
    } catch (error) {
      console.error(`❌ Error creating wallet for ${user.name}:`, error.message);
    }
  }

  console.log('\n✅ Done!');
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

