/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/ticha-avance',
        destination: '/salary-advance',
        permanent: true,
      },
      {
        source: '/ticha-avance/:path*',
        destination: '/salary-advance/:path*',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;