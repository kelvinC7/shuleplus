const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Monorepo module/CSS resolution fix — prevents Next from using the wrong workspace root.
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

module.exports = nextConfig;
