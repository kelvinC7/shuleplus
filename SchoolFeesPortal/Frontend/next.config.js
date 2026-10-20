const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Avoid picking the monorepo root lockfile as the workspace root
  outputFileTracingRoot: path.join(__dirname),
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  async rewrites() {
    const apiPort = process.env.SCHOOL_FEES_API_PORT || '4004';
    return [
      {
        source: '/api/:path*',
        destination: `http://127.0.0.1:${apiPort}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
