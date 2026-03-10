/**
 * MongoDB Connection Configuration
 * Centralized MongoDB connection management
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// MongoDB Connection String
// In production, this MUST be provided via environment variables.
const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.DATABASE_URL ||
  '';

// Prisma Client instance (singleton pattern)
let prismaClient = null;

/**
 * Get or create Prisma Client instance
 * @returns {PrismaClient}
 */
function getPrismaClient() {
  if (!prismaClient) {
    prismaClient = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      datasources: {
        db: {
          url: MONGO_URI
        }
      }
    });
  }
  return prismaClient;
}

/**
 * Connect to MongoDB
 * @returns {Promise<void>}
 */
async function connectMongoDB() {
  try {
    const prisma = getPrismaClient();
    await prisma.$connect();
    console.log('✅ Connected to MongoDB successfully');
    return prisma;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 * @returns {Promise<void>}
 */
async function disconnectMongoDB() {
  try {
    if (prismaClient) {
      await prismaClient.$disconnect();
      prismaClient = null;
      console.log('✅ Disconnected from MongoDB');
    }
  } catch (error) {
    console.error('❌ MongoDB disconnection error:', error.message);
    throw error;
  }
}

/**
 * Test MongoDB connection
 * @returns {Promise<boolean>}
 */
async function testConnection() {
  try {
    const prisma = getPrismaClient();
    await prisma.$connect();
    
    // Simple ping using Mongo command
    await prisma.$runCommandRaw({ ping: 1 });
    
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

/**
 * Get MongoDB connection info (without password)
 * @returns {Object}
 */
function getConnectionInfo() {
  try {
    const url = new URL(MONGO_URI.replace('mongodb+srv://', 'https://'));
    return {
      host: url.hostname,
      database: url.pathname.replace('/', '') || 'olx_app',
      protocol: 'mongodb+srv',
      hasCredentials: !!url.username
    };
  } catch (error) {
    return {
      error: 'Invalid connection string'
    };
  }
}

module.exports = {
  MONGO_URI,
  getPrismaClient,
  connectMongoDB,
  disconnectMongoDB,
  testConnection,
  getConnectionInfo
};
