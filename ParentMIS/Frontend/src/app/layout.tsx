import type { Metadata, Viewport } from 'next';
import { TokenBootstrapSuspense } from '@/components/token-bootstrap';
import { AuthProvider } from '@/contexts/auth-context';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';
import { MainLayout } from '@/layouts/main-layout';
import { PwaInstall } from '@/components/pwa-install';

export const metadata: Metadata = {
  title: 'yoShule Parent · ShulePlus',
  description: 'Installable ParentMIS app for marks, fees, attendance, and school communication.',
  applicationName: 'yoShule Parent',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icon.png' },
    ],
    apple: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    shortcut: ['/icon.png'],
  },
  appleWebApp: {
    capable: true,
    title: 'yoShule Parent',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#13213D',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <TokenBootstrapSuspense />
        <AuthProvider>
          <MainLayout>{children}</MainLayout>
        </AuthProvider>
        <PwaInstall />
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
