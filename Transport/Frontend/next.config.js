/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
  async redirects() {
    const removed = [
      'trips',
      'live-scan',
      'fees',
      'reports',
      'settings',
      'operations',
      'missing',
      'maintenance',
      'incidents',
      'fuel',
      'emergencies',
      'documents',
      'devices',
      'crew',
      'cards',
      'boarding',
      'analytics',
      'alerts',
      'permissions',
    ];
    return removed.map((path) => ({
      source: `/${path}`,
      destination: '/dashboard',
      permanent: false,
    }));
  },
  webpack: (config, { dev }) => {
    // Heavy Leaflet/map chunks can exceed default load timeout in dev after HMR.
    if (dev && config.output) {
      config.output.chunkLoadTimeout = 120000;
    }
    return config;
  },
};

module.exports = nextConfig;
