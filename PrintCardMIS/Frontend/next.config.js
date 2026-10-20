/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  async rewrites() {
    const printCardApi =
      process.env.PRINT_CARD_API_PROXY_TARGET || 'https://printcard-api.shuleplus.rw/api';
    return [{ source: '/proxy/print-card/:path*', destination: `${printCardApi}/:path*` }];
  },
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: true },
  outputFileTracingRoot: path.join(__dirname, '../../'),
  webpack: (config) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    return config;
  },
};

module.exports = nextConfig;
