import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // redeploy-module.sh builds to a staging dir, then swaps — keeps CSS alive during builds
  distDir: process.env.NEXT_DIST_DIR?.trim() || '.next',
  outputFileTracingRoot: path.join(__dirname),
  transpilePackages: ['@shuleplus/ui'],
  // Production server builds must not fail on local lint/type drift
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [],
  },
  webpack: (config, { dev, isServer }) => {
    // Avoid "Loading chunk app/layout failed (timeout)" while dev compiles large routes.
    if (dev && !isServer) {
      config.output = config.output ?? {};
      config.output.chunkLoadTimeout = 300_000;
    }
    return config;
  },
};

export default nextConfig;
