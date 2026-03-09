import { NextResponse } from 'next/server';
import { getBaseUrl, getApiUrl } from '@/lib/seo';

const API_URL = getApiUrl();
const BASE_URL = getBaseUrl();

/** Fetch recent approved ads for sitemap (id + updatedAt). Cap total to avoid huge sitemaps. */
async function getRecentAds(maxUrls: number = 2000): Promise<{ id: string; updatedAt?: string }[]> {
  const limit = 100;
  const pages = Math.ceil(maxUrls / limit);
  const all: { id: string; updatedAt?: string }[] = [];
  try {
    for (let page = 1; page <= pages; page++) {
      const res = await fetch(
        `${API_URL}/ads?page=${page}&limit=${limit}&sort=newest`,
        { next: { revalidate: 3600 } }
      );
      if (!res.ok) break;
      const data = await res.json();
      const list = data?.ads ?? data?.data ?? [];
      if (!Array.isArray(list) || list.length === 0) break;
      for (const ad of list) {
        if (ad?.id) all.push({ id: ad.id, updatedAt: ad.updatedAt ?? ad.createdAt });
      }
      if (list.length < limit) break;
    }
  } catch (e) {
    console.error('getRecentAds error:', e);
  }
  return all.slice(0, maxUrls);
}

async function getCategories() {
  try {
    const res = await fetch(`${API_URL}/categories`, {
      next: { revalidate: 3600 } // Revalidate every hour
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.categories : [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

async function getSubcategories(categoryId: string) {
  try {
    const res = await fetch(`${API_URL}/categories/${categoryId}/subcategories`, {
      next: { revalidate: 3600 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.subcategories : [];
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    return [];
  }
}

async function getProducts(categorySlug: string, subcategorySlug: string, page: number = 1, limit: number = 100) {
  try {
    const res = await fetch(`${API_URL}/categories/${categorySlug}/${subcategorySlug}?page=${page}&limit=${limit}`, {
      next: { revalidate: 3600 }
    });
    if (!res.ok) return { listings: [], pagination: { pages: 0 } };
    const data = await res.json();
    return data.success ? { listings: data.listings || [], pagination: data.pagination || { pages: 0 } } : { listings: [], pagination: { pages: 0 } };
  } catch (error) {
    console.error('Error fetching products:', error);
    return { listings: [], pagination: { pages: 0 } };
  }
}

function generateSitemapEntry(url: string, lastmod?: string, changefreq: string = 'weekly', priority: string = '0.8') {
  return `  <url>
    <loc>${url}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export async function GET() {
  try {
    const categories = await getCategories();
    const now = new Date().toISOString().split('T')[0];
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  ${generateSitemapEntry(`${BASE_URL}`, now, 'daily', '1.0')}
  <!-- All ads listing -->
  ${generateSitemapEntry(`${BASE_URL}/ads`, now, 'daily', '0.9')}`;

    // Recent ad detail pages (for discovery; cap size)
    const recentAds = await getRecentAds(2000);
    for (const ad of recentAds) {
      const lastmod = ad.updatedAt ? new Date(ad.updatedAt).toISOString().split('T')[0] : now;
      sitemap += `\n${generateSitemapEntry(`${BASE_URL}/ads/${ad.id}`, lastmod, 'weekly', '0.7')}`;
    }

    // Add category pages
    for (const category of categories) {
      if (!category.isActive) continue;
      
      sitemap += `\n  <!-- Category: ${category.name} -->`;
      sitemap += `\n${generateSitemapEntry(`${BASE_URL}/${category.slug}`, now, 'daily', '0.9')}`;

      // Add subcategory pages
      if (category.subcategories && category.subcategories.length > 0) {
        for (const subcategory of category.subcategories) {
          if (!subcategory.isActive) continue;
          
          sitemap += `\n  <!-- Subcategory: ${subcategory.name} -->`;
          sitemap += `\n${generateSitemapEntry(`${BASE_URL}/${category.slug}/${subcategory.slug}`, now, 'daily', '0.8')}`;

          // Add product pages (first page only to avoid too many URLs)
          try {
            const productsData = await getProducts(category.slug, subcategory.slug, 1, 50);
            if (productsData.listings && productsData.listings.length > 0) {
              for (const product of productsData.listings) {
                const productSlug = product.slug || product.id;
                const productUrl = `${BASE_URL}/${category.slug}/${subcategory.slug}/${productSlug}`;
                const productLastmod = product.updatedAt 
                  ? new Date(product.updatedAt).toISOString().split('T')[0]
                  : now;
                sitemap += `\n${generateSitemapEntry(productUrl, productLastmod, 'weekly', '0.7')}`;
              }
            }
          } catch (error) {
            console.error(`Error fetching products for ${category.slug}/${subcategory.slug}:`, error);
          }
        }
      }
    }

    // Business directory India: /in, /in/[state], /in/[state]/[city], category, business, blog
    try {
      const dirRes = await fetch(`${API_URL}/directory/sitemap-urls`, {
        next: { revalidate: 3600 },
        headers: { 'X-Forwarded-Proto': BASE_URL.startsWith('https') ? 'https' : 'http', 'X-Forwarded-Host': new URL(BASE_URL).host },
      });
      if (dirRes.ok) {
        const dirData = await dirRes.json();
        if (dirData.urls && Array.isArray(dirData.urls)) {
          sitemap += `\n  <!-- Business Directory (root-level: /state, /state/city, etc.) -->`;
          for (const u of dirData.urls) {
            const lastmod = u.lastmod ? new Date(u.lastmod).toISOString().split('T')[0] : now;
            sitemap += `\n${generateSitemapEntry(u.url, lastmod, u.changefreq || 'weekly', u.priority || '0.7')}`;
          }
        }
      }
    } catch (dirErr) {
      console.error('Directory sitemap error:', dirErr);
      sitemap += `\n${generateSitemapEntry(`${BASE_URL}/in`, now, 'daily', '0.9')}`;
    }

    sitemap += `\n</urlset>`;

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new NextResponse('Error generating sitemap', { status: 500 });
  }
}

