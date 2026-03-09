# 🏠 Home Feed Integration Example

## Quick Integration (Copy & Paste)

### Option 1: Simple Integration

Replace your existing home page content with:

```tsx
// app/page.tsx
import HomeFeedGrid from '@/components/home/HomeFeedGrid';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Browse All Ads
          </h1>
          <p className="text-gray-600 mt-1">
            Find great deals near you
          </p>
        </div>
      </div>

      {/* Home Feed */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <HomeFeedGrid enableLocation={true} limit={20} />
      </div>
    </div>
  );
}
```

---

### Option 2: With Categories Section

```tsx
// app/page.tsx
import HomeFeedGrid from '@/components/home/HomeFeedGrid';
import CategoriesSection from '@/components/home/CategoriesSection'; // Your existing component

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4">
            Find Anything You Need
          </h1>
          <p className="text-xl mb-8">
            Buy and sell locally with millions of listings
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <CategoriesSection />
      </section>

      {/* Home Feed */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Latest Ads
          </h2>
        </div>
        <HomeFeedGrid enableLocation={true} limit={20} />
      </section>
    </div>
  );
}
```

---

### Option 3: With Sections (OLX-style)

```tsx
'use client';

// app/page.tsx
import { useHomeFeed } from '@/hooks/useHomeFeed';
import HomeFeedCard from '@/components/home/HomeFeedCard';

export default function HomePage() {
  const { ads, loading, hasUserLocation, userLocation } = useHomeFeed({
    autoLoad: true,
    limit: 40,
    enableLocation: true,
  });

  if (loading) return <div>Loading...</div>;

  // Split ads into sections
  const topAds = ads.filter(ad => ad.isTopAdActive).slice(0, 8);
  const featuredAds = ads.filter(ad => ad.isFeaturedActive && !ad.isTopAdActive).slice(0, 8);
  const nearbyAds = hasUserLocation 
    ? ads.filter(ad => !ad.isTopAdActive && !ad.isFeaturedActive && ad.distance && ad.distance < 10000).slice(0, 12)
    : [];
  const latestAds = ads.filter(ad => !ad.isTopAdActive && !ad.isFeaturedActive).slice(0, 12);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        
        {/* Top Ads Section */}
        {topAds.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <div className="px-3 py-1 bg-red-600 text-white text-sm font-bold rounded">
                TOP ADS
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Premium Listings
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {topAds.map(ad => (
                <HomeFeedCard key={ad.id} ad={ad} />
              ))}
            </div>
          </section>
        )}

        {/* Featured Section */}
        {featuredAds.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <div className="px-3 py-1 bg-yellow-500 text-white text-sm font-bold rounded">
                FEATURED
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Featured Ads
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {featuredAds.map(ad => (
                <HomeFeedCard key={ad.id} ad={ad} />
              ))}
            </div>
          </section>
        )}

        {/* Nearby Section */}
        {nearbyAds.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <h2 className="text-2xl font-bold text-gray-900">
                Near You ({userLocation?.city})
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {nearbyAds.map(ad => (
                <HomeFeedCard key={ad.id} ad={ad} />
              ))}
            </div>
          </section>
        )}

        {/* Latest Section */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Latest Ads
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {latestAds.map(ad => (
              <HomeFeedCard key={ad.id} ad={ad} />
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
```

---

## 🎨 Styling Customization

### Change Card Border Color

```tsx
// components/home/HomeFeedCard.tsx

// Find this line:
className={`bg-white rounded-lg overflow-hidden shadow hover:shadow-xl transition-all cursor-pointer border-2 ${
  ad.isTopAdActive
    ? 'border-red-500'
    : ad.isFeaturedActive
    ? 'border-yellow-500'
    : 'border-gray-200 hover:border-blue-300'
}`}

// Change to your colors:
className={`bg-white rounded-lg overflow-hidden shadow hover:shadow-xl transition-all cursor-pointer border-2 ${
  ad.isTopAdActive
    ? 'border-purple-500'  // Your color
    : ad.isFeaturedActive
    ? 'border-orange-500'  // Your color
    : 'border-gray-200 hover:border-green-300'  // Your color
}`}
```

### Change Badge Colors

```tsx
// In HomeFeedCard.tsx, find the badges array:

if (ad.isTopAdActive) {
  badges.push({
    text: 'TOP AD',
    color: 'bg-red-600',  // Change this
    priority: 1,
  });
}
```

### Change Grid Columns

```tsx
// In HomeFeedGrid.tsx, find:
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

// Change to:
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
// Or any other breakpoints
```

---

## 🔧 Configuration Options

### Disable Location Detection

```tsx
<HomeFeedGrid enableLocation={false} limit={20} />
```

### Change Items Per Page

```tsx
<HomeFeedGrid enableLocation={true} limit={30} />
```

### Custom Hook with Options

```tsx
const { ads, loading } = useHomeFeed({
  autoLoad: true,           // Auto-load on mount
  limit: 20,                // Items per page
  enableLocation: true,     // Enable geo-location
});
```

---

## 📱 Mobile Optimization

The components are already mobile-optimized with:
- ✅ Responsive grid (1-4 columns)
- ✅ Touch-friendly cards
- ✅ Infinite scroll
- ✅ Lazy loading images
- ✅ Optimized for 3G/4G

No additional changes needed!

---

## 🎯 Testing

### 1. Test Without Location

Open in incognito mode or deny location permission:
```
http://localhost:3000
```

**Expected:** Paid ads first, then latest ads

### 2. Test With Location

Allow location permission:
```
http://localhost:3000
```

**Expected:** Paid ads + nearest distance first

### 3. Test Infinite Scroll

Scroll to bottom:

**Expected:** More ads load automatically

---

## 🐛 Troubleshooting

### Ads Not Loading

**Check:**
1. Backend server is running
2. Meilisearch is running
3. Ads are indexed
4. API endpoint is accessible

```bash
curl "http://localhost:5000/api/home-feed"
```

### Location Not Working

**Check:**
1. Browser supports geolocation
2. User granted permission
3. HTTPS (required for production)
4. Check browser console for errors

### Distance Not Showing

**Check:**
1. Ads have `_geo` field in Meilisearch
2. User location is detected
3. Both coordinates are valid

---

## ✅ Quick Checklist

- [ ] Backend route registered
- [ ] Server restarted
- [ ] Components imported
- [ ] Home page updated
- [ ] Tested without location
- [ ] Tested with location
- [ ] Badges displaying correctly
- [ ] Distance showing
- [ ] Infinite scroll working
- [ ] Mobile responsive

---

## 🎉 You're Done!

Your OLX-style home feed is now live! 🚀

**Next Steps:**
1. Customize styling
2. Add more sections
3. Monitor performance
4. Gather user feedback

**Need Help?** Check `OLX_HOME_FEED_COMPLETE.md` for full documentation.
