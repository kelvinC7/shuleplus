const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep tracing rooted at this app — monorepo root breaks Next builds on the VPS
  outputFileTracingRoot: path.join(__dirname),
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
