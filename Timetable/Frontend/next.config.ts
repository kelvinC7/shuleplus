import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /** jsPDF pulls browser-only deps; keep them off the server bundle. */
  serverExternalPackages: ['jspdf', 'jspdf-autotable'],
};

export default nextConfig;
