# How to Use Redis - Step by Step Guide

## 🎯 Quick Start (3 Steps)

### Step 1: Install Redis

**Windows:**
```powershell
# Using Chocolatey
choco install redis-64

# Or download from:
# https://github.com/microsoftarchive/redis/releases
```

**Linux:**
```bash
sudo apt-get update
sudo apt-get install redis-server
```

**macOS:**
```bash
brew install redis
```

**Docker (Any OS):**
```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

### Step 2: Start Redis

**Windows:**
```powershell
redis-server
# Or if installed as service, it starts automatically
```

**Linux:**
```bash
sudo systemctl start redis-server
```

**macOS:**
```bash
brew services start redis
```

**Docker:**
```bash
docker start redis
```

### Step 3: Verify It Works

```bash
# Test Redis
redis-cli ping
# Should return: PONG

# Test from Node.js
cd backend
node scripts/test-redis.js
# Should show: ✅ Redis is connected and ready!
```

---

## 🚀 Using Redis in Your Application

### It's Already Working!

Redis is **automatically** used by the cache middleware. You don't need to change any code!

**Example:**
```javascript
// In routes/ads.js (already done)
router.get('/',
  cacheMiddleware(60), // Cache for 60 seconds
  async (req, res) => {
    // Your handler code
  }
);
```

**What happens:**
1. First request → Fetches from database → Caches in Redis → Returns response
2. Next requests (within 60 seconds) → Returns from Redis (fast!)
3. After 60 seconds → Cache expires → Fetches fresh data

---

## 📋 Common Tasks

### 1. Check if Redis is Working

```bash
# Method 1: Test script
cd backend
node scripts/test-redis.js

# Method 2: Health endpoint
curl http://localhost:5000/api/redis/health

# Method 3: Direct Redis
redis-cli ping
```

### 2. View Cached Data

```bash
# See all cache keys
redis-cli keys "*"

# See specific cache (e.g., ads)
redis-cli keys "ads:*"

# Get a specific value
redis-cli get "categories:GET:/api/categories?"
```

### 3. Clear Cache

```bash
# Clear all cache
redis-cli FLUSHDB

# Clear specific cache (e.g., all ads)
redis-cli --scan --pattern "ads:*" | xargs redis-cli del
```

### 4. Monitor Redis (Real-time)

```bash
# See all commands in real-time
redis-cli MONITOR
```

---

## 🔧 Using Redis Helpers in Code

### Cache Ads

```javascript
const { cacheAds, getCachedAds, clearAdsCache } = require('./utils/redis-helpers');

// Cache ads
await cacheAds('query-key', adsData, 60); // 60 seconds TTL

// Get cached ads
const cached = await getCachedAds('query-key');

// Clear all ads cache
await clearAdsCache();
```

### Cache Search Results

```javascript
const { cacheSearch, getCachedSearch } = require('./utils/redis-helpers');

// Cache search
await cacheSearch('mobile phones', searchResults, 60);

// Get cached search
const cached = await getCachedSearch('mobile phones');
```

### Cache OTP

```javascript
const { cacheOTP, getCachedOTP, deleteCachedOTP } = require('./utils/redis-helpers');

// Cache OTP (5 minutes default)
await cacheOTP('+1234567890', '123456', 300);

// Get OTP
const otp = await getCachedOTP('+1234567890');

// Delete OTP after use
await deleteCachedOTP('+1234567890');
```

### Rate Limiting

```javascript
const { incrementRateLimit, getCachedRateLimit } = require('./utils/redis-helpers');

// Increment rate limit counter
const count = await incrementRateLimit('user-123', 60); // 60 seconds window

if (count > 10) {
  // Rate limit exceeded
  return res.status(429).json({ error: 'Too many requests' });
}
```

---

## 🎨 Cache Key Prefixes

All cache keys use prefixes for organization:

| Prefix | Usage | Example |
|--------|-------|---------|
| `ads:` | Ads listings | `ads:GET:/api/ads?category=mobile` |
| `search:` | Search results | `search:abc123` (hashed query) |
| `categories:` | Categories | `categories:GET:/api/categories?` |
| `locations:` | Locations | `locations:GET:/api/locations?` |
| `session:` | User sessions | `session:abc123` |
| `otp:` | OTP codes | `otp:+1234567890` |
| `ratelimit:` | Rate limiting | `ratelimit:user-123` |
| `filters:` | Filter schemas | `filters:category-123` |

---

## ⚙️ Configuration

### Environment Variables

Add to `backend/.env` (optional - defaults work for localhost):

```env
# Redis Configuration
REDIS_HOST=localhost        # Default: localhost
REDIS_PORT=6379            # Default: 6379
REDIS_PASSWORD=            # Optional, leave empty if no password
REDIS_DB=0                 # Database number (0-15)
```

**Note:** If Redis is on `localhost:6379` with no password, you don't need to add these!

---

## 🐛 Troubleshooting

### Problem: "Redis not available"

**Solution:**
1. Check if Redis is running:
   ```bash
   redis-cli ping
   ```
   Should return: `PONG`

2. If not, start Redis:
   ```bash
   redis-server
   ```

3. Check backend logs for connection status

### Problem: Connection refused

**Solution:**
1. Verify Redis is listening:
   ```bash
   # Windows
   netstat -an | findstr 6379
   
   # Linux/macOS
   lsof -i :6379
   ```

2. Check `.env` configuration:
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

### Problem: Cache not working

**Solution:**
1. Test Redis connection:
   ```bash
   node backend/scripts/test-redis.js
   ```

2. Check health endpoint:
   ```bash
   curl http://localhost:5000/api/redis/health
   ```

3. Check if keys are created:
   ```bash
   redis-cli keys "*"
   ```

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
redis-cli DBSIZE
```

### Check Cache Performance

1. Make API requests
2. Check Redis keys: `redis-cli keys "*"`
3. Monitor commands: `redis-cli MONITOR`

---

## 🎯 Best Practices

### 1. Use Appropriate TTL

- **Frequently changing:** 60 seconds (ads, search)
- **Rarely changing:** 600 seconds (categories, locations)
- **Static data:** 1800+ seconds (30+ minutes)

### 2. Clear Cache When Data Changes

```javascript
// After creating/updating/deleting an ad
const { clearAdsCache } = require('./utils/redis-helpers');
await clearAdsCache();
```

### 3. Monitor Memory Usage

```bash
redis-cli INFO memory
```

### 4. Use Prefixes

Always use prefixes for cache keys:
```javascript
// ✅ Good
await setCache('ads:', 'query-key', data, 60);

// ❌ Bad
await setCache('', 'query-key', data, 60);
```

---

## 🚀 Production Setup

### Using Redis Cloud (Free Tier)

1. Sign up: https://redis.com/try-free/
2. Create database
3. Get connection details
4. Update `.env`:
   ```env
   REDIS_HOST=your-redis-host.redis.cloud
   REDIS_PORT=12345
   REDIS_PASSWORD=your-password
   ```

### Using AWS ElastiCache

1. Create ElastiCache Redis cluster
2. Get endpoint
3. Update `.env`:
   ```env
   REDIS_HOST=your-cluster.cache.amazonaws.com
   REDIS_PORT=6379
   ```

---

## ✅ Quick Checklist

- [ ] Redis installed
- [ ] Redis running (`redis-cli ping` returns PONG)
- [ ] Test script works: `node backend/scripts/test-redis.js`
- [ ] Backend server shows: `✅ Redis: Connected and ready`
- [ ] Health check works: `GET /api/redis/health`
- [ ] Cache keys visible: `redis-cli keys "*"`

**If all checked, Redis is working perfectly! 🎉**

---

## 📚 More Information

- **Quick Start Guide:** See `REDIS_QUICK_START.md`
- **Setup Guide:** See `REDIS_SETUP.md`
- **Redis Docs:** https://redis.io/docs/
- **ioredis Docs:** https://github.com/redis/ioredis

---

## 💡 Tips

1. **Redis works automatically** - No code changes needed!
2. **Cache expires automatically** - TTL handles expiration
3. **Graceful fallback** - App works even if Redis is down
4. **Monitor regularly** - Use `/api/redis/stats` endpoint
5. **Clear cache when needed** - Use helper functions

---

**That's it! Redis is now working in your application! 🚀**
