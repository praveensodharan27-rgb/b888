/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable compression
  compress: true,
  // Optimize production builds
  swcMinify: true,
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
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
  },
  // Webpack configuration to handle chunk loading errors
  webpack: (config, { isServer }) => {
    // Fix for "Cannot read properties of undefined (reading 'call')" error
    // Ensure proper module factory handling
    if (!isServer) {
      // Handle chunk loading errors on client side
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
      };
      
      // Fix for "originalFactory is undefined" error
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

