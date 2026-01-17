/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure Next treats this folder as root (monorepo-safe)
  outputFileTracingRoot: __dirname,
  // Enable compression
  compress: true,
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year for optimized images
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    domains: [
      'localhost',
      '127.0.0.1',
      'images.unsplash.com',
      'i.pravatar.cc',
      'via.placeholder.com',
      'picsum.photos', // Placeholder images for dummy ads
      'lh3.googleusercontent.com', // Google profile images
      'graph.facebook.com', // Facebook profile images
      process.env.NEXT_PUBLIC_S3_BUCKET?.replace('https://', '').replace('http://', '').split('/')[0],
      'res.cloudinary.com'
    ].filter(Boolean),
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '5000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos', // Placeholder images for dummy ads
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google profile images
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com', // All Google CDN subdomains
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'graph.facebook.com', // Facebook profile images
        pathname: '/**',
      }
    ]
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000'
  },
  // Performance optimizations
  experimental: {
    optimizeCss: true,
    // NOTE: Disabling optimizePackageImports entirely because Next 15 dev can emit
    // missing server vendor chunks (e.g. "./vendor-chunks/react-icons.js") on Windows.
  },
  // Compress output
  compress: true,
  // Production source maps (disable for better performance)
  productionBrowserSourceMaps: false,
  // Webpack configuration to handle chunk loading errors
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Avoid overriding Next's dev chunking behavior (can cause stale/mismatched chunks in dev).
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    } else {
      // Handle Firebase modules during SSR
      config.externals = config.externals || [];
      config.externals.push({
        'firebase/app': 'commonjs firebase/app',
        'firebase/messaging': 'commonjs firebase/messaging',
        'firebase/analytics': 'commonjs firebase/analytics',
      });
    }
    return config;
  },
  // Headers for caching
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig

