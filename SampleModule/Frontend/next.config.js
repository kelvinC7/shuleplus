const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fix monorepo module/CSS resolution — prevents Next from using wrong workspace root
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

module.exports = nextConfig;
