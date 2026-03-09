# Redis Quick Start Guide

## Redis start cheyyanam (Start Redis)

**Fastest – if Docker is installed and Docker Desktop is running:**

```bash
cd backend
npm run redis:start
```

This starts a Redis container on port 6379. Then verify: `docker exec redis redis-cli ping` (should return `PONG`).

**If Docker Desktop is not running:** Start Docker Desktop first, then run `npm run redis:start`.

**Without Docker (Windows):** Install Redis, then start it:

- **Chocolatey:** `choco install redis-64` (then Redis may start as a service, or run `redis-server`).
- **MSI:** Download from [Redis for Windows](https://github.com/microsoftarchive/redis/releases), install, then start the Redis service or run `redis-server`.

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Install Redis

#### Windows:
```powershell
# Option 1: Using Chocolatey (recommended)
choco install redis-64

# Option 2: Download installer
# Visit: https://github.com/microsoftarchive/redis/releases
# Download: Redis-x64-3.0.504.msi
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt-get update
sudo apt-get install redis-server
```

#### macOS:
```bash
brew install redis
```

#### Docker (Any OS):
```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

### Step 2: Start Redis

#### Windows:
```powershell
# Redis should start automatically after installation
# Or start manually:
redis-server
```

#### Linux:
```bash
sudo systemctl start redis-server
sudo systemctl enable redis-server  # Auto-start on boot
```

#### macOS:
```bash
brew services start redis
```

#### Docker:
```bash
docker start redis
```

### Step 3: Verify Redis is Running

```bash
# Test connection
redis-cli ping

# Should return: PONG
```

### Step 4: Configure Backend

Add to `backend/.env`:

```env
# Redis Configuration (Optional - defaults work for localhost)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

**Note:** If Redis is on localhost:6379, you don't need to add these (defaults work).

### Step 5: Start Backend Server

```bash
cd backend
npm run dev
```

**Look for this in console:**
```
✅ Redis: Connected and ready
```

If you see this, Redis is working! 🎉

---

## ✅ How to Verify It's Working

### 1. Check Backend Logs

When you start the server, you should see:
```
🟢 Redis: Connecting...
✅ Redis: Connected and ready
```

### 2. Test Health Endpoint

Open browser or use curl:
```bash
# Browser
http://localhost:5000/api/redis/health

# Or curl
curl http://localhost:5000/api/redis/health
```

**Expected Response:**
```json
{
  "success": true,
  "redis": {
    "available": true,
    "status": "connected"
  }
}
```

### 3. Test Cache

1. Make an API request (e.g., get categories):
   ```bash
   curl http://localhost:5000/api/categories
   ```

2. Check Redis for cached data:
   ```bash
   redis-cli keys "*"
   ```

   You should see keys like:
   ```
   categories:GET:/api/categories?
   ```

3. Make the same request again - it should be faster (served from cache)

---

## 📝 How It Works

### Automatic Caching

The cache middleware **automatically** caches API responses:

```javascript
// In your routes (already done)
router.get('/endpoint', cacheMiddleware(60), handler);
//                                    ^^
//                          Cache for 60 seconds
```

**What happens:**
1. First request → Fetches from database → Stores in Redis → Returns response
2. Next requests (within 60 seconds) → Returns from Redis (fast!)
3. After 60 seconds → Cache expires → Fetches fresh data

### Cache Keys

All cache keys use prefixes:
- `ads:GET:/api/ads?category=mobile` - Ads listings
- `categories:GET:/api/categories?` - Categories
- `locations:GET:/api/locations?` - Locations
- `search:abc123` - Search results (hashed)

### TTL (Time To Live)

Different endpoints have different cache times:
- **Ads listings:** 60 seconds (1 minute)
- **Categories:** 600 seconds (10 minutes)
- **Locations:** 600 seconds (10 minutes)
- **Home feed:** 60 seconds (1 minute)

---

## 🛠️ Common Operations

### View All Cache Keys

```bash
redis-cli keys "*"
```

### View Specific Cache

```bash
# View ads cache
redis-cli keys "ads:*"

# View categories cache
redis-cli keys "categories:*"
```

### Get Cache Value

```bash
redis-cli get "categories:GET:/api/categories?"
```

### Clear All Cache

```bash
redis-cli FLUSHDB
```

### Clear Specific Cache

```bash
# Clear all ads cache
redis-cli --scan --pattern "ads:*" | xargs redis-cli del

# Clear all categories cache
redis-cli --scan --pattern "categories:*" | xargs redis-cli del
```

### Monitor Redis Commands (Real-time)

```bash
redis-cli MONITOR
```

---

## 🔧 Troubleshooting

### Problem: "Redis not available" in logs

**Solution:**
1. Check if Redis is running:
   ```bash
   redis-cli ping
   ```
   Should return: `PONG`

2. If not running, start Redis:
   ```bash
   # Windows
   redis-server
   
   # Linux
   sudo systemctl start redis-server
   
   # macOS
   brew services start redis
   ```

### Problem: Connection refused

**Solution:**
1. Check Redis is listening on port 6379:
   ```bash
   # Windows
   netstat -an | findstr 6379
   
   # Linux/macOS
   lsof -i :6379
   ```

2. Check firewall settings (port 6379 should be open)

3. Verify `.env` configuration:
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

### Problem: Cache not working

**Solution:**
1. Check Redis health:
   ```bash
   curl http://localhost:5000/api/redis/health
   ```

2. Check if keys are being created:
   ```bash
   redis-cli keys "*"
   ```

3. Check backend logs for errors

### Problem: "Cannot find module 'ioredis'"

**Solution:**
```bash
cd backend
npm install ioredis
```

---

## 📊 Monitoring

### Check Redis Stats

```bash
# Via API
curl http://localhost:5000/api/redis/stats

# Via CLI
redis-cli INFO stats
redis-cli INFO memory
```

### Check Cache Hit Rate

1. Make API requests
2. Check Redis keys: `redis-cli keys "*"`
3. Monitor with: `redis-cli MONITOR`

---

## 🎯 Best Practices

### 1. Use Appropriate TTL

- **Frequently changing data:** 60 seconds (ads, search)
- **Rarely changing data:** 600 seconds (categories, locations)
- **Static data:** 1800+ seconds (30+ minutes)

### 2. Clear Cache When Needed

When data changes, clear relevant cache:

```javascript
const { clearAdsCache } = require('./utils/redis-helpers');

// After creating/updating/deleting an ad
await clearAdsCache();
```

### 3. Monitor Performance

- Use `/api/redis/stats` to monitor
- Check memory usage
- Adjust TTL based on usage patterns

### 4. Production Setup

For production, use:
- **Redis Cloud** (free tier available)
- **AWS ElastiCache**
- **DigitalOcean Managed Redis**

Update `.env`:
```env
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-password
```

---

## 🚀 Production Deployment

### Using Redis Cloud (Free Tier)

1. Sign up at: https://redis.com/try-free/
2. Create a database
3. Get connection details
4. Update `.env`:
   ```env
   REDIS_HOST=your-redis-host.redis.cloud
   REDIS_PORT=12345
   REDIS_PASSWORD=your-password
   ```

### Using Docker Compose

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  redis:
    image: redis:latest
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

volumes:
  redis-data:
```

Start:
```bash
docker-compose up -d redis
```

---

## 📚 Additional Resources

- **Redis Documentation:** https://redis.io/docs/
- **ioredis Documentation:** https://github.com/redis/ioredis
- **Setup Guide:** See `REDIS_SETUP.md`

---

## ✅ Quick Checklist

- [ ] Redis installed
- [ ] Redis running (`redis-cli ping` returns PONG)
- [ ] Backend `.env` configured (optional)
- [ ] Backend server started
- [ ] See "✅ Redis: Connected and ready" in logs
- [ ] Health check works: `/api/redis/health`
- [ ] Cache keys visible: `redis-cli keys "*"`

**If all checked, Redis is working! 🎉**
