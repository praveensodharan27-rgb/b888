# Redis Setup Guide

## Overview

This application uses **Redis** with **ioredis** for production-ready caching, replacing in-memory cache. Redis provides:
- ✅ Persistent cache (survives server restarts)
- ✅ Multi-user load handling
- ✅ Easy scaling
- ✅ Better performance

## Installation

### 1. Install Redis

#### Windows:
```bash
# Using Chocolatey
choco install redis-64

# Or download from: https://github.com/microsoftarchive/redis/releases
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### macOS:
```bash
brew install redis
brew services start redis
```

#### Docker:
```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

### 2. Install ioredis (Already done)
```bash
cd backend
npm install ioredis
```

## Configuration

### Environment Variables

Add to `backend/.env`:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=          # Optional, leave empty if no password
REDIS_DB=0              # Database number (0-15)
```

### Production Setup

For production (Redis Cloud, AWS ElastiCache, etc.):

```env
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password
REDIS_DB=0
```

## Usage

### Cache Middleware

The cache middleware automatically uses Redis:

```javascript
const { cacheMiddleware } = require('./middleware/cache');

// Cache for 60 seconds
router.get('/endpoint', cacheMiddleware(60), handler);

// Cache for 10 minutes (600 seconds)
router.get('/static-data', cacheMiddleware(600), handler);
```

### Direct Redis Helpers

```javascript
const {
  cacheAds,
  getCachedAds,
  clearAdsCache,
  cacheSearch,
  getCachedSearch,
  cacheOTP,
  getCachedOTP,
  incrementRateLimit,
  // ... more helpers
} = require('./utils/redis-helpers');

// Cache ads
await cacheAds('query-key', adsData, 60); // 60 seconds TTL

// Get cached ads
const cached = await getCachedAds('query-key');

// Clear cache
await clearAdsCache();
```

### Key Prefixes

All cache keys use prefixes for organization:

- `ads:` - Ads listings
- `search:` - Search results
- `categories:` - Categories data
- `locations:` - Locations data
- `session:` - User sessions
- `otp:` - OTP codes
- `ratelimit:` - Rate limiting
- `filters:` - Filter schemas

## Health Checks

### Check Redis Status

```bash
# API endpoint
GET /api/redis/health

# Response
{
  "success": true,
  "redis": {
    "available": true,
    "status": "connected"
  }
}
```

### Get Redis Stats

```bash
GET /api/redis/stats

# Response includes:
# - Connection status
# - Database size
# - Memory usage
# - Detailed info
```

## Features

### ✅ Automatic Fallback

If Redis is unavailable, the application:
- Logs warnings
- Continues without caching
- No errors or crashes

### ✅ TTL Management

All cache entries have TTL (Time To Live):
- Default: 60 seconds
- Static data: 10 minutes (600 seconds)
- Long cache: 30 minutes (1800 seconds)

### ✅ Error Handling

- Graceful degradation
- Automatic reconnection
- Connection health monitoring

### ✅ Production Ready

- Connection pooling
- Retry strategies
- Graceful shutdown
- Memory management

## Testing

### Test Redis Connection

```bash
# Start Redis (if not running)
redis-server

# Test connection
redis-cli ping
# Should return: PONG
```

### Test in Application

1. Start backend server
2. Check logs for: `✅ Redis: Connected and ready`
3. Make API requests
4. Check Redis: `redis-cli keys "*"`

## Troubleshooting

### Redis Not Connecting

1. **Check Redis is running:**
   ```bash
   redis-cli ping
   ```

2. **Check environment variables:**
   ```bash
   # In backend/.env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

3. **Check firewall:**
   - Port 6379 should be open

4. **Check logs:**
   - Backend console will show connection status

### Cache Not Working

1. **Check Redis availability:**
   ```bash
   GET /api/redis/health
   ```

2. **Check cache keys:**
   ```bash
   redis-cli keys "*"
   ```

3. **Clear cache:**
   ```bash
   redis-cli FLUSHDB
   ```

### Performance Issues

1. **Monitor Redis:**
   ```bash
   redis-cli INFO stats
   redis-cli INFO memory
   ```

2. **Check cache hit rate:**
   - Use Redis stats endpoint
   - Monitor application logs

3. **Optimize TTL:**
   - Adjust TTL based on data change frequency
   - Use longer TTL for static data

## Migration from In-Memory Cache

The migration is **automatic**:
- ✅ Old in-memory cache removed
- ✅ All routes use Redis
- ✅ No code changes needed in routes
- ✅ Backward compatible

## Best Practices

1. **Always set TTL:**
   - Never cache indefinitely
   - Use appropriate TTL for data type

2. **Use key prefixes:**
   - Organize cache keys
   - Easy to clear by pattern

3. **Monitor cache size:**
   - Use `/api/redis/stats`
   - Set memory limits in Redis config

4. **Handle errors gracefully:**
   - Application continues if Redis fails
   - Log errors for debugging

5. **Test in production:**
   - Monitor Redis performance
   - Adjust TTL based on usage

## Production Deployment

### Redis Cloud / AWS ElastiCache

1. Create Redis instance
2. Get connection details
3. Update `.env`:
   ```env
   REDIS_HOST=your-redis-endpoint.cache.amazonaws.com
   REDIS_PORT=6379
   REDIS_PASSWORD=your-password
   ```

### Docker Compose

```yaml
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

## Support

For issues:
1. Check Redis logs
2. Check backend logs
3. Use health endpoint
4. Verify configuration

---

**Status:** ✅ Redis implementation complete
**Version:** 1.0.0
**Last Updated:** 2024
