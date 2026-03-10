/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router is default in Next.js 13+ when app/ directory exists (SSR supported)
  // Set NEXT_PUBLIC_DISABLE_STRICT_MODE=true in .env to avoid double mount in dev (reduces duplicate API calls)
  reactStrictMode: process.env.NEXT_PUBLIC_DISABLE_STRICT_MODE !== 'true',
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
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/**',
      },
      // Allow backend uploads from API origin (configured via env at runtime)
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/uploads/**',
      },
      // Note: production image host should be set via domain (e.g. 148.230.67.118)
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
        hostname: 'picsum.photos',
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
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://148.230.67.118:5000/api',
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://148.230.67.118:5000'
  },
  // Performance optimizations
  experimental: {
    optimizeCss: false,
    // ⚡ PACKAGE IMPORT OPTIMIZATION - Tree-shaking for large libraries
    optimizePackageImports: [
      'react-icons',
      '@tanstack/react-query',
      'react-select',
      'date-fns',
      'lottie-react',
      'firebase',
      'socket.io-client',
    ],
    // ⚡ TURBOPACK FEATURES
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Production source maps (disable for better performance)
  productionBrowserSourceMaps: false,
  // Webpack configuration
  webpack: (config, { isServer }) => {
    if (!isServer) {
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

