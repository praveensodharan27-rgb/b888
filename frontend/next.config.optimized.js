/** @type {import('next').NextConfig} */
const nextConfig = {
  // ============================================================================
  // PERFORMANCE OPTIMIZATIONS
  // ============================================================================
  
  // React Strict Mode
  reactStrictMode: process.env.NEXT_PUBLIC_DISABLE_STRICT_MODE !== 'true',
  
  // Ensure Next treats this folder as root (monorepo-safe)
  outputFileTracingRoot: __dirname,
  
  // Enable compression
  compress: true,
  
  // ============================================================================
  // EXPERIMENTAL FEATURES - TURBOPACK & OPTIMIZATIONS
  // ============================================================================
  experimental: {
    // Optimize CSS (disable if causing issues)
    optimizeCss: false,
    
    // ⚡ TURBOPACK OPTIMIZATION - Faster compilation
    // Automatically enabled when using --turbo flag
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
      resolveAlias: {
        // Optimize common imports
        '@': './src',
      },
    },
    
    // ⚡ PACKAGE IMPORT OPTIMIZATION - Tree-shaking for large libraries
    // This dramatically reduces compilation time by only importing what's needed
    optimizePackageImports: [
      'react-icons',
      'react-icons/fi',
      'react-icons/fa',
      'react-icons/md',
      'react-icons/io',
      '@tanstack/react-query',
      'react-select',
      'date-fns',
      'lottie-react',
      'firebase',
      'socket.io-client',
      'axios',
      'react-hook-form',
    ],
    
    // Server actions for better performance
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  // ============================================================================
  // MODULARIZE IMPORTS - Prevent importing entire libraries
  // ============================================================================
  modularizeImports: {
    // React Icons - Import only specific icons
    'react-icons/fi': {
      transform: 'react-icons/fi/{{member}}',
      skipDefaultConversion: true,
    },
    'react-icons/fa': {
      transform: 'react-icons/fa/{{member}}',
      skipDefaultConversion: true,
    },
    'react-icons/md': {
      transform: 'react-icons/md/{{member}}',
      skipDefaultConversion: true,
    },
    'react-icons': {
      transform: 'react-icons/{{member}}',
      skipDefaultConversion: true,
    },
    // Date-fns - Import only specific functions
    'date-fns': {
      transform: 'date-fns/{{member}}',
    },
  },
  
  // ============================================================================
  // IMAGE OPTIMIZATION
  // ============================================================================
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
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        pathname: '/**',
      },
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
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'graph.facebook.com',
        pathname: '/**',
      }
    ]
  },
  
  // ============================================================================
  // ENVIRONMENT VARIABLES
  // ============================================================================
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000'
  },
  
  // ============================================================================
  // PRODUCTION OPTIMIZATIONS
  // ============================================================================
  // Disable source maps in production for better performance
  productionBrowserSourceMaps: false,
  
  // Compiler options
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // ============================================================================
  // WEBPACK CONFIGURATION
  // ============================================================================
  webpack: (config, { isServer, dev }) => {
    // Client-side optimizations
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
      
      // Optimize bundle splitting in production
      if (!dev) {
        config.optimization = {
          ...config.optimization,
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              default: false,
              vendors: false,
              // Vendor chunk for node_modules
              vendor: {
                name: 'vendor',
                chunks: 'all',
                test: /node_modules/,
                priority: 20,
              },
              // Common chunk for shared code
              common: {
                name: 'common',
                minChunks: 2,
                chunks: 'all',
                priority: 10,
                reuseExistingChunk: true,
                enforce: true,
              },
              // React chunk
              react: {
                name: 'react',
                chunks: 'all',
                test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                priority: 30,
              },
              // Icons chunk
              icons: {
                name: 'icons',
                chunks: 'all',
                test: /[\\/]node_modules[\\/]react-icons[\\/]/,
                priority: 25,
              },
            },
          },
        };
      }
    } else {
      // Server-side: Handle Firebase modules during SSR
      config.externals = config.externals || [];
      config.externals.push({
        'firebase/app': 'commonjs firebase/app',
        'firebase/messaging': 'commonjs firebase/messaging',
        'firebase/analytics': 'commonjs firebase/analytics',
      });
    }
    
    return config;
  },
  
  // ============================================================================
  // CACHING HEADERS
  // ============================================================================
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
