const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const packageJson = require('../package.json');

const router = express.Router();
const prisma = new PrismaClient();

// Get system version information (minimal in production to avoid info disclosure)
router.get('/version', async (req, res) => {
  try {
    const isProd = process.env.NODE_ENV === 'production';
    const version = {
      api: {
        version: packageJson.version || '1.0.0',
        name: packageJson.name || 'sellit-api',
        description: packageJson.description || 'SellIt Marketplace API',
        ...(!isProd && { nodeVersion: process.version, environment: process.env.NODE_ENV || 'development' })
      },
      ...(!isProd && {
        database: { provider: 'mongodb', connected: true },
        server: {
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      })
    };

    res.json({ success: true, version });
  } catch (error) {
    console.error('Get version error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch version information' });
  }
});

// Get detailed system information (admin only)
router.get('/info', authenticate, requireAdmin, async (req, res) => {
  try {
    // Get database statistics
    const [
      userCount,
      adCount,
      activeAdCount,
      categoryCount,
      locationCount,
      totalTransactions,
      totalRevenue
    ] = await Promise.all([
      prisma.user.count(),
      prisma.ad.count(),
      prisma.ad.count({ where: { status: 'APPROVED' } }),
      prisma.category.count(),
      prisma.location.count(),
      prisma.walletTransaction.count(),
      prisma.walletTransaction.aggregate({
        where: { type: 'CREDIT', status: 'COMPLETED' },
        _sum: { amount: true }
      })
    ]);

    const systemInfo = {
      api: {
        version: packageJson.version || '1.0.0',
        name: packageJson.name || 'sellit-api',
        description: packageJson.description || 'SellIt Marketplace API',
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        startTime: new Date(Date.now() - process.uptime() * 1000).toISOString()
      },
      database: {
        provider: 'mongodb',
        connected: true,
        statistics: {
          users: userCount,
          ads: adCount,
          activeAds: activeAdCount,
          categories: categoryCount,
          locations: locationCount,
          transactions: totalTransactions
        }
      },
      server: {
        uptime: process.uptime(),
        uptimeFormatted: formatUptime(process.uptime()),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        },
        cpu: {
          usage: process.cpuUsage()
        },
        timestamp: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      business: {
        totalRevenue: (totalRevenue._sum.amount || 0) / 100, // Convert from paise
        currency: 'INR'
      }
    };

    res.json({
      success: true,
      systemInfo
    });
  } catch (error) {
    console.error('Get system info error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch system information' });
  }
});

// Get system health check (enhanced)
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        api: {
          status: 'ok',
          uptime: process.uptime()
        },
        database: {
          status: 'checking'
        }
      }
    };

    // Test database connection (MongoDB: use runCommandRaw; Prisma may use $queryRaw for SQL - adapt if needed)
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.checks.database.status = 'ok';
    } catch (dbErr) {
      health.checks.database.status = 'error';
      health.checks.database.error = process.env.NODE_ENV === 'production' ? 'Database unavailable' : dbErr.message;
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json({
      success: health.status === 'healthy',
      health
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      success: false,
      health: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: process.env.NODE_ENV === 'production' ? 'Service unavailable' : error.message
      }
    });
  }
});

// Get API status
router.get('/status', async (req, res) => {
  try {
    const status = {
      api: 'operational',
      database: 'operational',
      timestamp: new Date().toISOString()
    };

    // Quick database check
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      status.database = 'degraded';
      status.api = 'degraded';
    }

    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch status' });
  }
});

// Get app readiness status (comprehensive health check)
router.get('/readiness', async (req, res) => {
  try {
    const readiness = {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        api: { status: 'ok', message: 'API is operational' },
        database: { status: 'checking', message: 'Checking database connection...' },
        paymentGateway: { status: 'checking', message: 'Checking payment gateway...' },
        wallet: { status: 'checking', message: 'Checking wallet system...' },
        premium: { status: 'checking', message: 'Checking premium system...' },
        businessPackage: { status: 'checking', message: 'Checking business package system...' }
      }
    };

    // Check database
    try {
      await prisma.$queryRaw`SELECT 1`;
      readiness.checks.database = { status: 'ok', message: 'Database connected' };
    } catch (error) {
      readiness.checks.database = { status: 'error', message: process.env.NODE_ENV === 'production' ? 'Database unavailable' : error.message };
      readiness.status = 'degraded';
    }

    // Check payment gateway
    try {
      const Razorpay = require('razorpay');
      if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        readiness.checks.paymentGateway = { status: 'ok', message: 'Payment gateway configured' };
      } else {
        readiness.checks.paymentGateway = { status: 'warning', message: 'Payment gateway not configured (dev mode)' };
      }
    } catch (error) {
      readiness.checks.paymentGateway = { status: 'error', message: process.env.NODE_ENV === 'production' ? 'Payment gateway check failed' : error.message };
      readiness.status = 'degraded';
    }

    // Check wallet system
    try {
      const walletCount = await prisma.wallet.count();
      readiness.checks.wallet = { status: 'ok', message: `Wallet system operational (${walletCount} wallets)` };
    } catch (error) {
      readiness.checks.wallet = { status: 'error', message: process.env.NODE_ENV === 'production' ? 'Wallet check failed' : error.message };
      readiness.status = 'degraded';
    }

    // Check premium system
    try {
      const premiumSettings = await prisma.premiumSettings.findUnique({
        where: { key: 'premium_settings' }
      });
      readiness.checks.premium = { 
        status: 'ok', 
        message: premiumSettings ? 'Premium settings configured' : 'Premium settings using defaults' 
      };
    } catch (error) {
      readiness.checks.premium = { status: 'error', message: process.env.NODE_ENV === 'production' ? 'Premium check failed' : error.message };
      readiness.status = 'degraded';
    }

    // Check business package system
    try {
      const businessPackageCount = await prisma.businessPackage.count();
      readiness.checks.businessPackage = { 
        status: 'ok', 
        message: `Business package system operational (${businessPackageCount} packages)` 
      };
    } catch (error) {
      readiness.checks.businessPackage = { status: 'error', message: process.env.NODE_ENV === 'production' ? 'Business package check failed' : error.message };
      readiness.status = 'degraded';
    }

    // Determine overall status
    const allChecksOk = Object.values(readiness.checks).every(check => check.status === 'ok' || check.status === 'warning');
    if (!allChecksOk) {
      readiness.status = 'not_ready';
    }

    const statusCode = readiness.status === 'ready' ? 200 : readiness.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json({
      success: readiness.status === 'ready' || readiness.status === 'degraded',
      readiness
    });
  } catch (error) {
    console.error('App readiness check error:', error);
    res.status(503).json({
      success: false,
      readiness: {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: process.env.NODE_ENV === 'production' ? 'Service unavailable' : error.message
      }
    });
  }
});

// Get system metrics (admin only)
router.get('/metrics', authenticate, requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      newUsers24h,
      newUsers7d,
      newUsers30d,
      newAds24h,
      newAds7d,
      newAds30d,
      activeUsers24h,
      totalRevenue24h,
      totalRevenue7d,
      totalRevenue30d
    ] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: last24Hours } } }),
      prisma.user.count({ where: { createdAt: { gte: last7Days } } }),
      prisma.user.count({ where: { createdAt: { gte: last30Days } } }),
      prisma.ad.count({ where: { createdAt: { gte: last24Hours } } }),
      prisma.ad.count({ where: { createdAt: { gte: last7Days } } }),
      prisma.ad.count({ where: { createdAt: { gte: last30Days } } }),
      prisma.user.count({
        where: {
          updatedAt: { gte: last24Hours }
        }
      }),
      prisma.walletTransaction.aggregate({
        where: {
          type: 'CREDIT',
          status: 'COMPLETED',
          createdAt: { gte: last24Hours }
        },
        _sum: { amount: true }
      }),
      prisma.walletTransaction.aggregate({
        where: {
          type: 'CREDIT',
          status: 'COMPLETED',
          createdAt: { gte: last7Days }
        },
        _sum: { amount: true }
      }),
      prisma.walletTransaction.aggregate({
        where: {
          type: 'CREDIT',
          status: 'COMPLETED',
          createdAt: { gte: last30Days }
        },
        _sum: { amount: true }
      })
    ]);

    const metrics = {
      users: {
        total: await prisma.user.count(),
        last24Hours: newUsers24h,
        last7Days: newUsers7d,
        last30Days: newUsers30d,
        active24Hours: activeUsers24h
      },
      ads: {
        total: await prisma.ad.count(),
        active: await prisma.ad.count({ where: { status: 'APPROVED' } }),
        last24Hours: newAds24h,
        last7Days: newAds7d,
        last30Days: newAds30d
      },
      revenue: {
        last24Hours: (totalRevenue24h._sum.amount || 0) / 100,
        last7Days: (totalRevenue7d._sum.amount || 0) / 100,
        last30Days: (totalRevenue30d._sum.amount || 0) / 100,
        currency: 'INR'
      },
      system: {
        uptime: process.uptime(),
        uptimeFormatted: formatUptime(process.uptime()),
        memoryUsage: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        },
        timestamp: new Date().toISOString()
      }
    };

    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch metrics' });
  }
});

// Helper function to format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

module.exports = router;

