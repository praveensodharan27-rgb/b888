# 🔴 Redis Setup for Windows

**Issue**: Docker Desktop is not running, and Redis is not installed locally.

---

## 🎯 Option 1: Start Docker Desktop (Recommended)

### Steps:
1. **Open Docker Desktop** from Start Menu
2. Wait for Docker to start (whale icon in system tray)
3. Run the command again:
   ```bash
   docker run -d -p 6379:6379 redis:alpine
   ```

### Verify:
```bash
docker ps
```

You should see the Redis container running.

---

## 🎯 Option 2: Install Redis for Windows

### Using Chocolatey (Easiest)

1. **Install Chocolatey** (if not installed):
   ```powershell
   # Run PowerShell as Administrator
   Set-ExecutionPolicy Bypass -Scope Process -Force
   [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
   iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
   ```

2. **Install Redis**:
   ```powershell
   choco install redis-64 -y
   ```

3. **Start Redis**:
   ```powershell
   redis-server
   ```

### Using WSL (Windows Subsystem for Linux)

1. **Install WSL** (if not installed):
   ```powershell
   wsl --install
   ```

2. **Open WSL Terminal**:
   ```bash
   wsl
   ```

3. **Install Redis in WSL**:
   ```bash
   sudo apt update
   sudo apt install redis-server -y
   ```

4. **Start Redis**:
   ```bash
   sudo service redis-server start
   ```

5. **Verify**:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

### Manual Download

1. **Download Redis for Windows**:
   - Visit: https://github.com/microsoftarchive/redis/releases
   - Download: `Redis-x64-3.0.504.msi`

2. **Install** and follow the wizard

3. **Start Redis**:
   - Redis will start automatically as a Windows service
   - Or run: `redis-server.exe`

---

## 🎯 Option 3: Use Cloud Redis (For Testing)

### Redis Cloud (Free Tier)

1. **Sign up**: https://redis.com/try-free/
2. **Create database** (free 30MB)
3. **Get connection details**:
   - Host: `redis-xxxxx.cloud.redislabs.com`
   - Port: `12345`
   - Password: `your-password`

4. **Update `.env`**:
   ```env
   REDIS_HOST=redis-xxxxx.cloud.redislabs.com
   REDIS_PORT=12345
   REDIS_PASSWORD=your-password
   ```

5. **Update queue config**:
   ```javascript
   // backend/queues/notificationQueue.js
   const connection = new Redis({
     host: process.env.REDIS_HOST,
     port: parseInt(process.env.REDIS_PORT),
     password: process.env.REDIS_PASSWORD, // Add this line
     maxRetriesPerRequest: null,
     enableReadyCheck: false
   });
   ```

---

## 🎯 Option 4: Skip Redis (Development Only)

For development/testing without Redis, you can use in-memory queue:

### Create Mock Queue

Create `backend/queues/mockQueue.js`:

```javascript
/**
 * Mock Queue for Development (No Redis Required)
 * WARNING: Jobs are not persisted, use only for testing
 */

const notificationService = require('../services/notificationService');
const { logger } = require('../src/config/logger');

// In-memory job storage
const jobs = [];
let jobIdCounter = 1;

// Process jobs immediately (no background processing)
const processJob = async (type, data) => {
  try {
    let result;

    switch (type) {
      case 'ad_created':
        result = await notificationService.sendAdCreatedNotification(data.user, data.ad);
        break;
      case 'ad_approved':
        result = await notificationService.sendAdApprovedNotification(data.user, data.ad);
        break;
      // ... other cases
      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    return result;
  } catch (error) {
    logger.error(`Mock queue job failed: ${type}`, error);
    throw error;
  }
};

// Mock queue functions
const queueNotification = async (type, data) => {
  const jobId = jobIdCounter++;
  logger.info(`[MOCK QUEUE] Processing job ${jobId}: ${type}`);
  
  try {
    const result = await processJob(type, data);
    logger.info(`[MOCK QUEUE] Job ${jobId} completed`);
    return { id: jobId, result };
  } catch (error) {
    logger.error(`[MOCK QUEUE] Job ${jobId} failed`, error);
    throw error;
  }
};

// Export same interface as real queue
module.exports = {
  queueNotification,
  queueAdCreatedNotification: async (userId, adId) => {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const ad = await prisma.ad.findUnique({ where: { id: adId } });
    return queueNotification('ad_created', { user, ad });
  },
  // ... other queue functions
  getQueueStats: async () => ({
    waiting: 0,
    active: 0,
    completed: jobs.length,
    failed: 0,
    delayed: 0
  })
};
```

### Use Mock Queue

In `backend/server.js`:

```javascript
// Use mock queue if Redis is not available
const USE_REDIS = process.env.REDIS_HOST && process.env.REDIS_HOST !== 'localhost';

if (USE_REDIS) {
  require('./queues/notificationQueue');
  console.log('✅ Using Redis queue');
} else {
  console.log('⚠️  Using mock queue (development only)');
}
```

---

## ✅ Recommended Solution

**For Production**: Use **Option 1** (Docker) or **Option 3** (Redis Cloud)

**For Development**: Use **Option 2** (WSL) - Most reliable on Windows

**For Quick Testing**: Use **Option 4** (Mock Queue) - No Redis needed

---

## 🧪 Test Redis Connection

After starting Redis, test the connection:

```javascript
// test-redis.js
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis');
  redis.set('test', 'Hello Redis!');
  redis.get('test', (err, result) => {
    console.log('Test value:', result);
    redis.quit();
  });
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});
```

Run:
```bash
node test-redis.js
```

---

## 🔍 Troubleshooting

### Docker Desktop Not Starting

1. **Enable Virtualization** in BIOS
2. **Enable Hyper-V** in Windows Features
3. **Restart** Windows
4. **Reinstall** Docker Desktop

### Redis Connection Refused

1. Check if Redis is running: `redis-cli ping`
2. Check port 6379 is not blocked
3. Check firewall settings

### WSL Redis Not Working

1. Start Redis: `sudo service redis-server start`
2. Check status: `sudo service redis-server status`
3. Check logs: `sudo tail -f /var/log/redis/redis-server.log`

---

## 📚 Next Steps

Once Redis is running:

1. ✅ Verify connection: `redis-cli ping` (should return `PONG`)
2. ✅ Install dependencies: `npm install bullmq ioredis node-cron`
3. ✅ Update server.js with notification routes
4. ✅ Test notification system

---

**Choose the option that works best for your setup!**
