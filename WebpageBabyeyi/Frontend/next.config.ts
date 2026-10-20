import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../..'),
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  /** Public marketing site — licensed school console lives on babyeyi.shuleplus.rw */
  async redirects() {
    return [
      { source: '/dashboard', destination: '/', permanent: false },
      { source: '/dashboard/:path*', destination: '/', permanent: false },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
      config.optimization = {
        ...config.optimization,
        moduleIds: 'named',
        chunkIds: 'named',
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
