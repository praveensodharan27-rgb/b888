const { PrismaClient } = require('@prisma/client');

/**
 * Prisma Client Singleton
 * Ensures only one instance of PrismaClient is created
 */
class PrismaClientSingleton {
  constructor() {
    if (!PrismaClientSingleton.instance) {
      this.client = new PrismaClient({
        log: process.env.NODE_ENV === 'development' 
          ? ['query', 'error', 'warn'] 
          : ['error'],
      });
      PrismaClientSingleton.instance = this;
    }
    return PrismaClientSingleton.instance;
  }

  getClient() {
    return this.client;
  }

  async disconnect() {
    await this.client.$disconnect();
  }

  async connect() {
    await this.client.$connect();
  }
}

const prismaInstance = new PrismaClientSingleton();
const prisma = prismaInstance.getClient();

module.exports = prisma;

