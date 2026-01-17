# Search Intelligence & Clustering System

## Overview

This is an advanced AI-powered search intelligence and clustering system designed for an Indian OLX-like marketplace platform. The system automatically understands Indian user search behavior, dynamically groups ads into meaningful lists, auto-updates those lists in real-time, and generates SEO-optimized pages that can rank on top of Google search results.

## Features

### 🔍 Indian Search Behavior Understanding

- Handles Indian-style queries like:
  - "car under 5 lakh in kochi"
  - "second hand mobile near me"
  - "used bike kerala"
  - "cheap iphone"
  - "house rent trivandrum"

- Intelligently handles:
  - Spelling mistakes (mobail → mobile, byke → bike)
  - Short/mixed language queries (English + local intent)
  - Price-based intent (under, below, cheap, budget)
  - Location-first or product-first searches

### 🧠 Hierarchical Clustering (4 Levels)

1. **Level 1 - Category**: Groups ads by category (Cars, Mobiles, Properties, etc.)
2. **Level 2 - Location**: Adds location hierarchy (Country → State → City → Area)
3. **Level 3 - Attributes**: Category-specific attributes (Brand, model, price range, year, condition)
4. **Level 4 - Intent**: User intent (Buy, Sell, Price, Location, Urgency)

### 📋 Auto List Generation

Automatically generates and maintains lists such as:
- "Used cars in Kochi"
- "Cars under ₹5 lakh in Kerala"
- "Second hand mobiles near me"
- "Featured properties in Trivandrum"

Lists automatically:
- Update when new ads are posted
- Remove expired/inactive ads
- Re-rank ads based on freshness, priority, and relevance

### 🌐 SEO-First Output

For every valid cluster/list, automatically generates:
- **SEO Title**: "Used Cars Under ₹5 Lakh in Kochi | Buy & Sell"
- **Meta Description**: "Browse verified used cars under ₹5 lakh in Kochi. Post free ads and get best deals today."
- **SEO-friendly URL**: `/lists/used-cars-under-5-lakh-in-kochi`

These pages are optimized for:
- Google indexing
- Long-tail Indian keywords
- Local SEO ("near me", city-based searches)

## Database Schema

### New Models

1. **AdCluster**: Stores cluster information
   - `clusterKey`: Unique identifier
   - `clusterType`: category, location, attribute, intent, combined
   - `level`: 1-4 (hierarchical level)
   - `adIds`: Array of ad IDs in cluster
   - `popularityScore`: Based on views, searches, clicks

2. **AutoList**: SEO-optimized lists
   - `slug`: SEO-friendly URL
   - `metaTitle`: Full SEO title
   - `metaDescription`: SEO description
   - `keywords`: SEO keywords array
   - `searchVolume`: Estimated search volume

3. **SearchQueryPattern**: Tracks search patterns
   - `pattern`: Original search query
   - `normalizedQuery`: Normalized version
   - `priceIntent`: under, below, cheap, etc.
   - `locationIntent`: near me, in [city], etc.
   - `searchCount`: How many times searched

## API Endpoints

### Search Intelligence

```
POST /api/clusters/parse-query
Body: { "query": "car under 5 lakh in kochi" }
Response: Parsed query with intent, category, location, price, etc.
```

### Clusters

```
GET /api/clusters
Query params: categoryId, locationId, level, limit, minAdCount
Response: List of clusters

GET /api/clusters/:id
Response: Cluster details with ads

PUT /api/clusters/:id/update
Updates cluster (refreshes ad list)
```

### Auto Lists

```
GET /api/clusters/lists
Query params: limit, offset, sortBy
Response: List of active auto-generated lists

GET /api/clusters/lists/:slug
Response: List details with ads (for SEO pages)

GET /api/clusters/lists/:slug/ads
Query params: page, limit
Response: Paginated ads for a list

POST /api/clusters/lists/generate
Body: { categoryId?, limit?, minAdCount? }
Response: Generation results (admin endpoint)
```

## Frontend Pages

### List Pages

- `/lists` - Browse all auto-generated lists
- `/lists/[slug]` - Individual list page with SEO optimization

Each list page includes:
- SEO-optimized title and meta description
- Breadcrumb navigation
- Ad grid with pagination
- SEO content section

## Auto-Update Mechanism

The system automatically updates clusters when:
- New ads are created
- Ads are updated
- Ads are deleted
- Ads expire

### Scheduled Tasks

1. **Daily at 3:30 AM**: Cleanup expired ads from clusters
2. **Daily at 4 AM**: Refresh all clusters
3. **Weekly (Sunday 5 AM)**: Merge low-volume clusters

## Usage Examples

### Parse a Search Query

```javascript
const response = await fetch('/api/clusters/parse-query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'car under 5 lakh in kochi' })
});

const { parsed } = await response.json();
// Returns: category, location, priceIntent, minPrice, maxPrice, condition, intent
```

### Get Clusters for a Category

```javascript
const response = await fetch('/api/clusters?categoryId=xxx&level=2');
const { clusters } = await response.json();
```

### Generate Lists for All Clusters

```javascript
const response = await fetch('/api/clusters/lists/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ limit: 100, minAdCount: 5 })
});
```

## Integration with Existing Search

The clustering system integrates with the existing Meilisearch-based search:

1. When users search, the query is parsed using `parseIndianQuery()`
2. The parsed query is used to find or create relevant clusters
3. Search results can be enhanced with cluster-based recommendations
4. Auto-generated lists appear in search suggestions

## SEO Benefits

1. **Long-tail Keywords**: Captures queries like "used cars under 5 lakh in kochi"
2. **Local SEO**: City and state-based pages rank for local searches
3. **Fresh Content**: Auto-updated lists keep content fresh for search engines
4. **Internal Linking**: Lists link to each other and to ads
5. **Structured Data**: Ready for schema.org markup

## Performance Considerations

- Clusters are updated asynchronously (non-blocking)
- Lists are cached and regenerated daily
- Low-volume clusters are merged weekly to reduce database size
- Expired ads are cleaned up automatically

## Future Enhancements

1. **Machine Learning**: Use ML to improve clustering accuracy
2. **Trending Detection**: Identify trending clusters and boost them
3. **User Behavior**: Track clicks and conversions to improve ranking
4. **A/B Testing**: Test different list titles and descriptions
5. **Multi-language**: Support for regional languages (Hindi, Tamil, etc.)

## Setup Instructions

1. **Run Prisma Migration**:
   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate dev --name add_clustering_system
   ```

2. **Generate Initial Lists**:
   ```bash
   # Via API
   POST /api/clusters/lists/generate
   ```

3. **Monitor Logs**:
   - Check cluster update logs in server console
   - Monitor cron job execution
   - Track search pattern analytics

## Troubleshooting

### Clusters not updating?
- Check if ads are in APPROVED status
- Verify cron jobs are running
- Check database connection

### Lists not generating?
- Ensure clusters have minimum ad count (default: 5)
- Check cluster popularity scores
- Verify category and location data

### Search queries not parsing correctly?
- Check spelling correction dictionary
- Verify location names in database
- Review price intent keywords

## Support

For issues or questions, check:
- Server logs for error messages
- Database for cluster/list data
- API responses for detailed error information

